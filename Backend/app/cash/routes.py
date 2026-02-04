from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from bson import ObjectId

from app.auth.routes import get_current_user
from app.database.mongo import (
    collection_citas,
    collection_sales,
    collection_locales,
    collection_cash_expenses,
    collection_cash_closures,
)

router = APIRouter(tags=["Cash Management"])

ALLOWED_ROLES = ["admin_sede", "admin_franquicia", "super_admin", "superadmin"]


# =========================
# Helpers
# =========================

def require_role(user: dict):
    if user.get("rol") not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="No autorizado")


def normalize_sede_id(user: dict, sede_id: Optional[str]) -> Optional[str]:
    if user.get("rol") == "admin_sede":
        user_sede = user.get("sede_id")
        if not user_sede:
            raise HTTPException(status_code=403, detail="Usuario sin sede asignada")
        return user_sede
    return sede_id


def parse_date(date_str: Optional[str]) -> str:
    if not date_str:
        return datetime.now().strftime("%Y-%m-%d")
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD")
    return date_str


def parse_date_range(start: Optional[str], end: Optional[str]) -> tuple[str, str]:
    start_str = parse_date(start)
    end_str = parse_date(end)

    if start_str > end_str:
        raise HTTPException(status_code=400, detail="La fecha inicio no puede ser mayor a la fecha fin")

    return start_str, end_str


def to_number(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.replace(",", ""))
        except Exception:
            return 0.0
    return 0.0



def get_day_range(date_str: str) -> tuple[datetime, datetime]:
    start = datetime.strptime(date_str, "%Y-%m-%d")
    end = start + timedelta(days=1) - timedelta(microseconds=1)
    return start, end


def pick_cash_method(cita: dict) -> Optional[str]:
    return (
        cita.get("metodo_pago_actual")
        or cita.get("metodo_pago_inicial")
        or cita.get("metodo_pago")
    )


# =========================
# Efectivo del día
# =========================

@router.get("/efectivo-dia")
async def calcular_efectivo_dia(
    fecha: Optional[str] = Query(None, description="YYYY-MM-DD"),
    sede_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    require_role(current_user)
    fecha_str = parse_date(fecha)
    sede_id = normalize_sede_id(current_user, sede_id)

    # ---- Citas pagadas en efectivo ----
    query_citas: Dict[str, Any] = {"fecha": fecha_str}
    if sede_id:
        query_citas["sede_id"] = sede_id

    citas = await collection_citas.find(query_citas).to_list(None)

    ingresos_citas = 0.0
    productos_citas = 0.0
    citas_contadas = 0

    for cita in citas:
        if cita.get("estado_pago") != "pagado":
            continue
        if (pick_cash_method(cita) or "").lower() != "efectivo":
            continue

        valor_total = to_number(cita.get("valor_total", 0))
        ingresos_citas += valor_total
        citas_contadas += 1

        productos = cita.get("productos", []) or []
        productos_citas += sum(to_number(p.get("subtotal", 0)) for p in productos)

    # ---- Ventas pagadas en efectivo ----
    start_dt, end_dt = get_day_range(fecha_str)
    query_sales: Dict[str, Any] = {
        "fecha_pago": {"$gte": start_dt, "$lte": end_dt}
    }
    if sede_id:
        query_sales["sede_id"] = sede_id

    ventas = await collection_sales.find(query_sales).to_list(None)

    ingresos_ventas = 0.0
    ventas_contadas = 0

    for venta in ventas:
        desglose = venta.get("desglose_pagos", {}) or {}
        efectivo = to_number(desglose.get("efectivo", 0))
        if efectivo <= 0:
            metodo = (venta.get("metodo_pago") or venta.get("metodo_pago_actual") or "").lower()
            if metodo == "efectivo":
                efectivo = to_number(desglose.get("total", 0))
        if efectivo > 0:
            ingresos_ventas += efectivo
            ventas_contadas += 1

    # ---- Egresos del día ----
    query_egresos: Dict[str, Any] = {"fecha": fecha_str}
    if sede_id:
        query_egresos["sede_id"] = sede_id

    egresos_docs = await collection_cash_expenses.find(query_egresos).to_list(None)
    egresos_total = sum(to_number(e.get("monto", 0)) for e in egresos_docs)

    ingresos_total = round(ingresos_citas + ingresos_ventas, 2)
    egresos_total = round(egresos_total, 2)
    balance = round(ingresos_total - egresos_total, 2)

    moneda = None
    if sede_id:
        sede = await collection_locales.find_one({"sede_id": sede_id})
        moneda = sede.get("moneda") if sede else None

    return {
        "success": True,
        "fecha": fecha_str,
        "sede_id": sede_id,
        "moneda": moneda,
        "ingresos_citas_efectivo": round(ingresos_citas, 2),
        "ingresos_ventas_efectivo": round(ingresos_ventas, 2),
        "productos_citas_efectivo": round(productos_citas, 2),
        "egresos_total": egresos_total,
        "ingresos_total": ingresos_total,
        "balance": balance,
        "conteo": {
            "citas": citas_contadas,
            "ventas": ventas_contadas,
            "egresos": len(egresos_docs),
        },
    }


# =========================
# Egresos
# =========================

@router.post("/egreso")
async def registrar_egreso(
    payload: Dict[str, Any],
    current_user: dict = Depends(get_current_user),
):
    require_role(current_user)

    sede_id = normalize_sede_id(current_user, payload.get("sede_id"))
    if not sede_id:
        raise HTTPException(status_code=400, detail="sede_id es obligatorio")

    monto = to_number(payload.get("monto") or payload.get("valor") or payload.get("efectivo"))
    motivo = (payload.get("motivo") or payload.get("descripcion") or payload.get("nota") or payload.get("concepto") or "").strip()
    tipo = (payload.get("tipo") or "egreso").strip().lower()
    concepto = (payload.get("concepto") or motivo).strip()
    fecha = parse_date(payload.get("fecha"))

    if monto <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")
    if not motivo:
        raise HTTPException(status_code=400, detail="El motivo es obligatorio")

    doc = {
        "sede_id": sede_id,
        "monto": monto,
        "motivo": motivo,
        "tipo": tipo,
        "concepto": concepto,
        "fecha": fecha,
        "creado_por": current_user.get("email"),
        "creado_en": datetime.utcnow(),
    }

    result = await collection_cash_expenses.insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    return {"success": True, "egreso": doc}


@router.get("/egresos")
async def listar_egresos(
    sede_id: Optional[str] = Query(None),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    require_role(current_user)
    sede_id = normalize_sede_id(current_user, sede_id)

    query: Dict[str, Any] = {}
    if sede_id:
        query["sede_id"] = sede_id

    if fecha_inicio or fecha_fin:
        start, end = parse_date_range(fecha_inicio, fecha_fin)
        query["fecha"] = {"$gte": start, "$lte": end}

    egresos = await collection_cash_expenses.find(query).sort("fecha", -1).to_list(None)

    for egreso in egresos:
        egreso["_id"] = str(egreso["_id"])

    return {"success": True, "egresos": egresos}


@router.delete("/egresos/{egreso_id}")
async def eliminar_egreso(
    egreso_id: str,
    sede_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    require_role(current_user)
    sede_id = normalize_sede_id(current_user, sede_id)

    if not ObjectId.is_valid(egreso_id):
        raise HTTPException(status_code=400, detail="ID inválido")

    query: Dict[str, Any] = {"_id": ObjectId(egreso_id)}
    if sede_id:
        query["sede_id"] = sede_id

    result = await collection_cash_expenses.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Egreso no encontrado")

    return {"success": True, "message": "Egreso eliminado"}


# =========================
# Apertura / Cierre
# =========================

@router.post("/apertura")
async def apertura_caja(
    payload: Dict[str, Any],
    current_user: dict = Depends(get_current_user),
):
    require_role(current_user)

    sede_id = normalize_sede_id(current_user, payload.get("sede_id"))
    if not sede_id:
        raise HTTPException(status_code=400, detail="sede_id es obligatorio")

    monto_inicial = to_number(
        payload.get("monto_inicial")
        or payload.get("efectivo_inicial")
        or payload.get("efectivo")
        or payload.get("monto")
    )
    fecha = parse_date(payload.get("fecha"))
    notas = (payload.get("notas") or "").strip() or None

    if monto_inicial <= 0:
        raise HTTPException(status_code=400, detail="El monto inicial debe ser mayor a 0")

    doc = {
        "sede_id": sede_id,
        "fecha_apertura": fecha,
        "monto_inicial": monto_inicial,
        "efectivo_inicial": monto_inicial,
        "notas": notas,
        "estado": "abierta",
        "creado_por": current_user.get("email"),
        "creado_en": datetime.utcnow(),
    }

    result = await collection_cash_closures.insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    return {"success": True, "apertura": doc}


@router.post("/cierre")
async def cierre_caja(
    payload: Dict[str, Any],
    current_user: dict = Depends(get_current_user),
):
    require_role(current_user)

    sede_id = normalize_sede_id(current_user, payload.get("sede_id"))
    if not sede_id:
        raise HTTPException(status_code=400, detail="sede_id es obligatorio")

    fecha = parse_date(payload.get("fecha"))
    notas = (payload.get("notas") or "").strip() or None
    ingresos_total = to_number(
        payload.get("ingresos_total")
        or payload.get("total_ingresos")
        or payload.get("efectivo_total")
        or payload.get("ingresos")
    )
    egresos_total = to_number(
        payload.get("egresos_total")
        or payload.get("total_egresos")
        or payload.get("egresos")
    )
    balance = to_number(
        payload.get("balance")
        or payload.get("saldo")
        or payload.get("efectivo_cierre")
        or payload.get("efectivo_final")
        or (ingresos_total - egresos_total)
    )

    cierre_doc = {
        "sede_id": sede_id,
        "fecha_cierre": fecha,
        "ingresos_total": ingresos_total,
        "egresos_total": egresos_total,
        "balance": balance,
        "efectivo_cierre": balance,
        "notas": notas,
        "estado": "cerrada",
        "cerrado_por": current_user.get("email"),
        "cerrado_en": datetime.utcnow(),
    }

    # Intentar cerrar la última apertura abierta
    apertura = await collection_cash_closures.find_one(
        {"sede_id": sede_id, "estado": "abierta"},
        sort=[("creado_en", -1)],
    )

    if apertura:
        await collection_cash_closures.update_one(
            {"_id": apertura["_id"]},
            {"$set": cierre_doc},
        )
        cierre_doc["_id"] = str(apertura["_id"])
    else:
        result = await collection_cash_closures.insert_one(cierre_doc)
        cierre_doc["_id"] = str(result.inserted_id)

    return {"success": True, "cierre": cierre_doc}


@router.get("/cierres")
async def listar_cierres(
    sede_id: Optional[str] = Query(None),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    require_role(current_user)
    sede_id = normalize_sede_id(current_user, sede_id)

    query: Dict[str, Any] = {}
    if sede_id:
        query["sede_id"] = sede_id

    if fecha_inicio or fecha_fin:
        start, end = parse_date_range(fecha_inicio, fecha_fin)
        query["fecha_cierre"] = {"$gte": start, "$lte": end}

    cierres = await collection_cash_closures.find(query).sort("fecha_cierre", -1).to_list(None)

    for cierre in cierres:
        cierre["_id"] = str(cierre["_id"])

    return {"success": True, "cierres": cierres}


@router.get("/cierres/{cierre_id}")
async def obtener_cierre(
    cierre_id: str,
    current_user: dict = Depends(get_current_user),
):
    require_role(current_user)

    if not ObjectId.is_valid(cierre_id):
        raise HTTPException(status_code=400, detail="ID inválido")

    cierre = await collection_cash_closures.find_one({"_id": ObjectId(cierre_id)})
    if not cierre:
        raise HTTPException(status_code=404, detail="Cierre no encontrado")

    cierre["_id"] = str(cierre["_id"])
    return {"success": True, "cierre": cierre}


# =========================
# Reporte de período
# =========================

@router.get("/reporte-periodo")
async def reporte_periodo(
    sede_id: Optional[str] = Query(None),
    fecha_inicio: Optional[str] = Query(None, description="YYYY-MM-DD"),
    fecha_fin: Optional[str] = Query(None, description="YYYY-MM-DD"),
    current_user: dict = Depends(get_current_user),
):
    require_role(current_user)
    sede_id = normalize_sede_id(current_user, sede_id)

    if not fecha_inicio or not fecha_fin:
        raise HTTPException(status_code=400, detail="fecha_inicio y fecha_fin son obligatorias")

    start_str, end_str = parse_date_range(fecha_inicio, fecha_fin)

    # ---- Citas pagadas en efectivo ----
    query_citas: Dict[str, Any] = {"fecha": {"$gte": start_str, "$lte": end_str}}
    if sede_id:
        query_citas["sede_id"] = sede_id

    citas = await collection_citas.find(query_citas).to_list(None)

    ingresos_citas = 0.0
    productos_citas = 0.0
    citas_contadas = 0

    for cita in citas:
        if cita.get("estado_pago") != "pagado":
            continue
        if (pick_cash_method(cita) or "").lower() != "efectivo":
            continue

        valor_total = to_number(cita.get("valor_total", 0))
        ingresos_citas += valor_total
        citas_contadas += 1

        productos = cita.get("productos", []) or []
        productos_citas += sum(to_number(p.get("subtotal", 0)) for p in productos)

    # ---- Ventas en efectivo ----
    start_dt = datetime.strptime(start_str, "%Y-%m-%d")
    end_dt = datetime.strptime(end_str, "%Y-%m-%d") + timedelta(days=1) - timedelta(microseconds=1)

    query_sales: Dict[str, Any] = {"fecha_pago": {"$gte": start_dt, "$lte": end_dt}}
    if sede_id:
        query_sales["sede_id"] = sede_id

    ventas = await collection_sales.find(query_sales).to_list(None)

    ingresos_ventas = 0.0
    ventas_contadas = 0

    for venta in ventas:
        desglose = venta.get("desglose_pagos", {}) or {}
        efectivo = to_number(desglose.get("efectivo", 0))
        if efectivo <= 0:
            metodo = (venta.get("metodo_pago") or venta.get("metodo_pago_actual") or "").lower()
            if metodo == "efectivo":
                efectivo = to_number(desglose.get("total", 0))
        if efectivo > 0:
            ingresos_ventas += efectivo
            ventas_contadas += 1

    # ---- Egresos del período ----
    query_egresos: Dict[str, Any] = {"fecha": {"$gte": start_str, "$lte": end_str}}
    if sede_id:
        query_egresos["sede_id"] = sede_id

    egresos_docs = await collection_cash_expenses.find(query_egresos).to_list(None)
    egresos_total = sum(to_number(e.get("monto", 0)) for e in egresos_docs)

    ingresos_total = round(ingresos_citas + ingresos_ventas, 2)
    egresos_total = round(egresos_total, 2)
    balance = round(ingresos_total - egresos_total, 2)

    moneda = None
    if sede_id:
        sede = await collection_locales.find_one({"sede_id": sede_id})
        moneda = sede.get("moneda") if sede else None

    return {
        "success": True,
        "sede_id": sede_id,
        "periodo": {
            "fecha_inicio": start_str,
            "fecha_fin": end_str,
        },
        "moneda": moneda,
        "ingresos_citas_efectivo": round(ingresos_citas, 2),
        "ingresos_ventas_efectivo": round(ingresos_ventas, 2),
        "productos_citas_efectivo": round(productos_citas, 2),
        "egresos_total": egresos_total,
        "ingresos_total": ingresos_total,
        "balance": balance,
        "conteo": {
            "citas": citas_contadas,
            "ventas": ventas_contadas,
            "egresos": len(egresos_docs),
        },
    }
