# ============================================================
# routes_cash.py - Endpoints para cierre de caja
# Ubicación: app/cash/routes_cash.py
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
from datetime import datetime, timedelta

# ============================================================
# IMPORTACIONES CORREGIDAS PARA TU PROYECTO
# ============================================================

# Importar modelos y utilidades del mismo paquete
from .models_cash import (
    AperturaCajaRequest, RegistroEgresoRequest, CierreCajaRequest,
    ResumenEfectivoResponse, EgresoResponse, CierreResponse,
    DetalleIngresos, DetalleEgresos
)
from .utils_cash import (
    generar_cierre_id, generar_egreso_id, generar_apertura_id,
    obtener_rango_fecha, calcular_diferencia, agrupar_egresos_por_tipo,
    validar_diferencia_aceptable, construir_filtro_fecha, convertir_mongo_a_json
)

# Importar autenticación desde tu módulo de auth
from app.auth.routes import get_current_user

# Importar colecciones directamente desde database
from app.database.mongo import (
    db,
    collection_citas as appointments,
    collection_sales as sales,
    collection_locales as locales
)

router = APIRouter(prefix="/cash", tags=["Cash Management"])

# ============================================================
# COLECCIONES NUEVAS (crear referencias)
# ============================================================

# Nuevas colecciones para el módulo de caja
cash_expenses = db["cash_expenses"]
cash_closures = db["cash_closures"]

# ============================================================
# 1. CALCULAR EFECTIVO DEL DÍA (Consulta en tiempo real)
# ============================================================

@router.get("/efectivo-dia", response_model=ResumenEfectivoResponse)
async def calcular_efectivo_dia(
    sede_id: str = Query(..., description="ID de la sede"),
    fecha: Optional[str] = Query(None, description="Fecha (YYYY-MM-DD), default: hoy"),
    current_user: dict = Depends(get_current_user)
):
    """
    Calcula el efectivo del día consultando directamente appointments y sales.
    
    **Proceso:**
    1. Suma ingresos de citas pagadas en efectivo
    2. Suma ingresos de ventas pagadas en efectivo
    3. Suma productos vendidos en citas (efectivo)
    4. Suma egresos registrados manualmente
    5. Retorna resumen completo
    """
    
    # Fecha por defecto: hoy
    if not fecha:
        fecha = datetime.now().strftime("%Y-%m-%d")
    
    # === 1. OBTENER NOMBRE DE SEDE ===
    sede = await locales.find_one({"sede_id": sede_id})
    sede_nombre = sede.get("nombre") if sede else "Sede desconocida"
    moneda_sede = sede.get("moneda", "USD") if sede else "USD"
    
    # === 2. CALCULAR INGRESOS DE CITAS ===
    pipeline_citas = [
        {
            "$match": {
                "sede_id": sede_id,
                "fecha": fecha,
                "estado_pago": "pagado",
                "$or": [
                    {"metodo_pago_actual": "efectivo"},
                    {"metodo_pago_inicial": "efectivo"}
                ]
            }
        },
        {
            "$group": {
                "_id": None,
                "total": {"$sum": "$valor_total"},
                "cantidad": {"$sum": 1}
            }
        }
    ]
    
    resultado_citas = await appointments.aggregate(
        pipeline_citas,
        allowDiskUse=True
    ).to_list(None)
    
    total_citas = resultado_citas[0]["total"] if resultado_citas else 0
    cantidad_citas = resultado_citas[0]["cantidad"] if resultado_citas else 0
    
    # === 3. CALCULAR PRODUCTOS EN CITAS ===
    pipeline_productos = [
        {
            "$match": {
                "sede_id": sede_id,
                "fecha": fecha,
                "$or": [
                    {"metodo_pago_actual": "efectivo"},
                    {"metodo_pago_inicial": "efectivo"}
                ],
                "productos": {"$exists": True, "$ne": []}
            }
        },
        {
            "$unwind": "$productos"
        },
        {
            "$group": {
                "_id": None,
                "total": {"$sum": "$productos.subtotal"},
                "cantidad": {"$sum": 1}
            }
        }
    ]
    
    resultado_productos = await appointments.aggregate(
        pipeline_productos,
        allowDiskUse=True
    ).to_list(None)
    
    total_productos_citas = resultado_productos[0]["total"] if resultado_productos else 0
    cantidad_productos = resultado_productos[0]["cantidad"] if resultado_productos else 0
    
    # === 4. CALCULAR VENTAS DE PRODUCTOS (sin cita) ===
    fecha_inicio, fecha_fin = obtener_rango_fecha(fecha)
    
    pipeline_ventas = [
        {
            "$match": {
                "sede_id": sede_id,
                "fecha_pago": {
                    "$gte": fecha_inicio,
                    "$lte": fecha_fin
                }
            }
        },
        {
            "$unwind": "$historial_pagos"
        },
        {
            "$match": {
                "historial_pagos.metodo": "efectivo"
            }
        },
        {
            "$group": {
                "_id": None,
                "total": {"$sum": "$historial_pagos.monto"},
                "cantidad": {"$sum": 1}
            }
        }
    ]
    
    resultado_ventas = await sales.aggregate(
        pipeline_ventas,
        allowDiskUse=True
    ).to_list(None)
    
    total_ventas = resultado_ventas[0]["total"] if resultado_ventas else 0
    cantidad_ventas = resultado_ventas[0]["cantidad"] if resultado_ventas else 0
    
    # === 5. CALCULAR EGRESOS ===
    egresos = await cash_expenses.find({
        "sede_id": sede_id,
        "fecha": fecha
    }).to_list(None)
    
    egresos_agrupados = agrupar_egresos_por_tipo(egresos)
    total_egresos = sum(cat["total"] for cat in egresos_agrupados.values())
    
    # === 6. CALCULAR TOTALES ===
    total_ingresos = total_citas + total_ventas + total_productos_citas
    efectivo_esperado = total_ingresos - total_egresos
    
    # === 7. VERIFICAR SI HAY APERTURA DE CAJA ===
    apertura = await cash_closures.find_one({
        "sede_id": sede_id,
        "fecha": fecha,
        "tipo": "apertura"
    })
    
    efectivo_inicial = apertura.get("efectivo_inicial", 0) if apertura else 0
    efectivo_esperado_final = efectivo_inicial + efectivo_esperado
    
    # === 8. VERIFICAR SI YA HAY CIERRE ===
    cierre = await cash_closures.find_one({
        "sede_id": sede_id,
        "fecha": fecha,
        "tipo": "cierre"
    })
    
    efectivo_contado = cierre.get("efectivo_contado") if cierre else None
    diferencia = cierre.get("diferencia") if cierre else None
    estado = cierre.get("estado") if cierre else "abierto"
    
    # === 9. CONSTRUIR RESPUESTA ===
    return ResumenEfectivoResponse(
        sede_id=sede_id,
        sede_nombre=sede_nombre,
        fecha=fecha,
        moneda=moneda_sede,
        efectivo_inicial=efectivo_inicial,
        ingresos=DetalleIngresos(
            citas={"total": total_citas, "cantidad": cantidad_citas},
            ventas={"total": total_ventas, "cantidad": cantidad_ventas},
            productos_citas={"total": total_productos_citas, "cantidad": cantidad_productos},
            total=total_ingresos
        ),
        egresos=DetalleEgresos(
            compras_internas=egresos_agrupados["compras_internas"],
            gastos_operativos=egresos_agrupados["gastos_operativos"],
            retiros_caja=egresos_agrupados["retiros_caja"],
            otros=egresos_agrupados["otros"],
            total=total_egresos
        ),
        efectivo_esperado=efectivo_esperado_final,
        efectivo_contado=efectivo_contado,
        diferencia=diferencia,
        estado=estado
    )

# ============================================================
# 2. REGISTRAR EGRESO
# ============================================================

@router.post("/egreso", response_model=EgresoResponse, status_code=status.HTTP_201_CREATED)
async def registrar_egreso(
    egreso: RegistroEgresoRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Registra un egreso de efectivo (compra, gasto, retiro).
    
    **Tipos de egreso:**
    - `compra_interna`: Compra de insumos, papelería, etc.
    - `gasto_operativo`: Servicios, mantenimiento, etc.
    - `retiro_caja`: Retiro de efectivo de la caja
    - `otro`: Otros gastos
    """
    
    # Fecha por defecto: hoy
    fecha = egreso.fecha or datetime.now().strftime("%Y-%m-%d")
    
    # Obtener nombre de sede
    sede = await locales.find_one({"sede_id": egreso.sede_id})
    sede_nombre = sede.get("nombre") if sede else None
    
    # Crear documento
    egreso_doc = {
        "egreso_id": generar_egreso_id(),
        "sede_id": egreso.sede_id,
        "tipo": egreso.tipo.value,
        "concepto": egreso.concepto,
        "descripcion": egreso.descripcion,
        "monto": egreso.monto,
        "moneda": egreso.moneda.value,
        "fecha": fecha,
        "registrado_por": current_user["email"],
        "registrado_por_nombre": current_user.get("nombre"),
        "registrado_por_rol": current_user.get("rol"),
        "comprobante_numero": egreso.comprobante_numero,
        "comprobante_tipo": egreso.comprobante_tipo,
        "categoria": egreso.categoria,
        "creado_en": datetime.now(),
        "actualizado_en": datetime.now()
    }
    
    # Insertar en BD
    resultado = await cash_expenses.insert_one(egreso_doc)
    
    if not resultado.inserted_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al registrar el egreso"
        )
    
    # Retornar egreso creado
    return EgresoResponse(
        egreso_id=egreso_doc["egreso_id"],
        sede_id=egreso_doc["sede_id"],
        sede_nombre=sede_nombre,
        tipo=egreso_doc["tipo"],
        concepto=egreso_doc["concepto"],
        descripcion=egreso_doc["descripcion"],
        monto=egreso_doc["monto"],
        moneda=egreso_doc["moneda"],
        fecha=egreso_doc["fecha"],
        registrado_por=egreso_doc["registrado_por"],
        registrado_por_nombre=egreso_doc.get("registrado_por_nombre"),
        comprobante_numero=egreso_doc.get("comprobante_numero"),
        creado_en=egreso_doc["creado_en"]
    )

# ============================================================
# 3. LISTAR EGRESOS
# ============================================================

@router.get("/egresos", response_model=List[EgresoResponse])
async def listar_egresos(
    sede_id: str = Query(..., description="ID de la sede"),
    fecha: Optional[str] = Query(None, description="Fecha específica"),
    fecha_inicio: Optional[str] = Query(None, description="Fecha inicio"),
    fecha_fin: Optional[str] = Query(None, description="Fecha fin"),
    tipo: Optional[str] = Query(None, description="Filtrar por tipo"),
    current_user: dict = Depends(get_current_user)
):
    """
    Lista los egresos con filtros opcionales.
    """
    
    # Construir filtro
    filtro = {"sede_id": sede_id}
    
    # Filtro de fecha
    filtro.update(construir_filtro_fecha(fecha, fecha_inicio, fecha_fin))
    
    # Filtro de tipo
    if tipo:
        filtro["tipo"] = tipo
    
    # Consultar egresos
    egresos_list = await cash_expenses.find(filtro).sort("creado_en", -1).to_list(None)
    
    # Obtener nombre de sede
    sede = await locales.find_one({"sede_id": sede_id})
    sede_nombre = sede.get("nombre") if sede else None
    
    # Mapear a response
    return [
        EgresoResponse(
            egreso_id=e["egreso_id"],
            sede_id=e["sede_id"],
            sede_nombre=sede_nombre,
            tipo=e["tipo"],
            concepto=e["concepto"],
            descripcion=e.get("descripcion"),
            monto=e["monto"],
            moneda=e["moneda"],
            fecha=e["fecha"],
            registrado_por=e["registrado_por"],
            registrado_por_nombre=e.get("registrado_por_nombre"),
            comprobante_numero=e.get("comprobante_numero"),
            creado_en=e["creado_en"]
        )
        for e in egresos_list
    ]

# ============================================================
# 4. APERTURA DE CAJA
# ============================================================

@router.post("/apertura", status_code=status.HTTP_201_CREATED)
async def apertura_caja(
    apertura: AperturaCajaRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Registra la apertura de caja del día con el efectivo inicial.
    
    **Reglas:**
    - Solo se puede abrir una caja por sede por día
    - Registra el efectivo base con el que se inicia
    """
    
    # Verificar que no exista ya una apertura para esta sede/fecha
    apertura_existente = await cash_closures.find_one({
        "sede_id": apertura.sede_id,
        "fecha": apertura.fecha,
        "tipo": "apertura"
    })
    
    if apertura_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe una apertura de caja para {apertura.sede_id} el {apertura.fecha}"
        )
    
    # Obtener nombre de sede
    sede = await locales.find_one({"sede_id": apertura.sede_id})
    sede_nombre = sede.get("nombre") if sede else None
    
    # Crear documento de apertura
    apertura_doc = {
        "apertura_id": generar_apertura_id(apertura.sede_id, apertura.fecha),
        "tipo": "apertura",
        "sede_id": apertura.sede_id,
        "sede_nombre": sede_nombre,
        "fecha": apertura.fecha,
        "efectivo_inicial": apertura.efectivo_inicial,
        "moneda": apertura.moneda.value,
        "observaciones": apertura.observaciones,
        "abierto_por": current_user["email"],
        "abierto_por_nombre": current_user.get("nombre"),
        "abierto_por_rol": current_user.get("rol"),
        "creado_en": datetime.now()
    }
    
    # Insertar
    resultado = await cash_closures.insert_one(apertura_doc)
    
    if not resultado.inserted_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al registrar la apertura de caja"
        )
    
    return {
        "ok": True,
        "mensaje": f"Caja abierta exitosamente para {apertura.sede_id} el {apertura.fecha}",
        "apertura_id": apertura_doc["apertura_id"],
        "efectivo_inicial": apertura_doc["efectivo_inicial"]
    }

# ============================================================
# 5. CERRAR CAJA
# ============================================================

@router.post("/cierre", response_model=CierreResponse, status_code=status.HTTP_201_CREATED)
async def cerrar_caja(
    cierre: CierreCajaRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Cierra la caja del día registrando el efectivo físico contado.
    
    **Proceso:**
    1. Calcula el efectivo esperado (ingresos - egresos)
    2. Compara con el efectivo contado
    3. Calcula la diferencia (sobrante/faltante)
    4. Guarda el cierre
    """
    
    # Verificar que no exista ya un cierre para esta sede/fecha
    cierre_existente = await cash_closures.find_one({
        "sede_id": cierre.sede_id,
        "fecha": cierre.fecha,
        "tipo": "cierre"
    })
    
    if cierre_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un cierre de caja para {cierre.sede_id} el {cierre.fecha}"
        )
    
    # Calcular efectivo esperado
    resumen = await calcular_efectivo_dia(
        sede_id=cierre.sede_id,
        fecha=cierre.fecha,
        current_user=current_user
    )
    
    # Calcular diferencia
    diferencia = calcular_diferencia(
        resumen.efectivo_esperado,
        cierre.efectivo_contado
    )
    
    # Validar diferencia
    es_aceptable, mensaje_validacion = validar_diferencia_aceptable(diferencia)
    
    # Calcular total del desglose físico si existe
    total_desglose = 0
    if cierre.desglose_fisico:
        total_desglose = sum(item.subtotal for item in cierre.desglose_fisico)
        
        # Verificar que el desglose coincida con el efectivo contado
        if abs(total_desglose - cierre.efectivo_contado) > 0.01:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El desglose físico (${total_desglose}) no coincide con el efectivo contado (${cierre.efectivo_contado})"
            )
    
    # Obtener nombre de sede
    sede = await locales.find_one({"sede_id": cierre.sede_id})
    sede_nombre = sede.get("nombre") if sede else None
    
    # Crear documento de cierre
    cierre_doc = {
        "cierre_id": generar_cierre_id(cierre.sede_id, cierre.fecha),
        "tipo": "cierre",
        "sede_id": cierre.sede_id,
        "sede_nombre": sede_nombre,
        "fecha": cierre.fecha,
        "moneda": cierre.moneda.value,
        
        # Efectivo
        "efectivo_inicial": resumen.efectivo_inicial,
        "total_ingresos": resumen.ingresos.total,
        "total_egresos": resumen.egresos.total,
        "efectivo_esperado": resumen.efectivo_esperado,
        "efectivo_contado": cierre.efectivo_contado,
        "diferencia": diferencia,
        
        # Desglose
        "ingresos_detalle": {
            "citas": resumen.ingresos.citas,
            "ventas": resumen.ingresos.ventas,
            "productos_citas": resumen.ingresos.productos_citas
        },
        "egresos_detalle": {
            "compras_internas": resumen.egresos.compras_internas,
            "gastos_operativos": resumen.egresos.gastos_operativos,
            "retiros_caja": resumen.egresos.retiros_caja,
            "otros": resumen.egresos.otros
        },
        
        # Desglose físico
        "desglose_fisico": [item.dict() for item in cierre.desglose_fisico] if cierre.desglose_fisico else None,
        
        # Estado
        "estado": "cerrado",
        "diferencia_aceptable": es_aceptable,
        "mensaje_validacion": mensaje_validacion,
        
        # Observaciones
        "observaciones": cierre.observaciones,
        
        # Auditoría
        "cerrado_por": current_user["email"],
        "cerrado_por_nombre": current_user.get("nombre"),
        "cerrado_por_rol": current_user.get("rol"),
        "creado_en": datetime.now(),
        "aprobado_por": None,
        "aprobado_en": None
    }
    
    # Insertar
    resultado = await cash_closures.insert_one(cierre_doc)
    
    if not resultado.inserted_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al registrar el cierre de caja"
        )
    
    # Retornar cierre creado
    return CierreResponse(
        cierre_id=cierre_doc["cierre_id"],
        sede_id=cierre_doc["sede_id"],
        sede_nombre=cierre_doc["sede_nombre"],
        fecha=cierre_doc["fecha"],
        moneda=cierre_doc["moneda"],
        efectivo_inicial=cierre_doc["efectivo_inicial"],
        total_ingresos=cierre_doc["total_ingresos"],
        total_egresos=cierre_doc["total_egresos"],
        efectivo_esperado=cierre_doc["efectivo_esperado"],
        efectivo_contado=cierre_doc["efectivo_contado"],
        diferencia=cierre_doc["diferencia"],
        estado=cierre_doc["estado"],
        observaciones=cierre_doc.get("observaciones"),
        cerrado_por=cierre_doc["cerrado_por"],
        cerrado_por_nombre=cierre_doc.get("cerrado_por_nombre"),
        creado_en=cierre_doc["creado_en"],
        aprobado_por=cierre_doc.get("aprobado_por"),
        aprobado_en=cierre_doc.get("aprobado_en")
    )

# ============================================================
# 6. LISTAR CIERRES
# ============================================================

@router.get("/cierres", response_model=List[CierreResponse])
async def listar_cierres(
    sede_id: str = Query(..., description="ID de la sede"),
    fecha: Optional[str] = Query(None, description="Fecha específica"),
    fecha_inicio: Optional[str] = Query(None, description="Fecha inicio"),
    fecha_fin: Optional[str] = Query(None, description="Fecha fin"),
    estado: Optional[str] = Query(None, description="Filtrar por estado"),
    current_user: dict = Depends(get_current_user)
):
    """
    Lista los cierres de caja con filtros opcionales.
    """
    
    # Construir filtro
    filtro = {
        "sede_id": sede_id,
        "tipo": "cierre"
    }
    
    # Filtro de fecha
    filtro.update(construir_filtro_fecha(fecha, fecha_inicio, fecha_fin))
    
    # Filtro de estado
    if estado:
        filtro["estado"] = estado
    
    # Consultar cierres
    cierres_list = await cash_closures.find(filtro).sort("creado_en", -1).to_list(None)
    
    # Mapear a response
    return [
        CierreResponse(
            cierre_id=c["cierre_id"],
            sede_id=c["sede_id"],
            sede_nombre=c.get("sede_nombre"),
            fecha=c["fecha"],
            moneda=c["moneda"],
            efectivo_inicial=c["efectivo_inicial"],
            total_ingresos=c["total_ingresos"],
            total_egresos=c["total_egresos"],
            efectivo_esperado=c["efectivo_esperado"],
            efectivo_contado=c["efectivo_contado"],
            diferencia=c["diferencia"],
            estado=c["estado"],
            observaciones=c.get("observaciones"),
            cerrado_por=c["cerrado_por"],
            cerrado_por_nombre=c.get("cerrado_por_nombre"),
            creado_en=c["creado_en"],
            aprobado_por=c.get("aprobado_por"),
            aprobado_en=c.get("aprobado_en")
        )
        for c in cierres_list
    ]

# ============================================================
# 7. VER DETALLE DE CIERRE
# ============================================================

@router.get("/cierres/{cierre_id}", response_model=dict)
async def obtener_cierre(
    cierre_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el detalle completo de un cierre incluyendo desglose físico.
    """
    
    cierre = await cash_closures.find_one({"cierre_id": cierre_id})
    
    if not cierre:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cierre {cierre_id} no encontrado"
        )
    
    # Convertir ObjectId a string
    cierre["_id"] = str(cierre["_id"])
    
    return cierre

# ============================================================
# 8. ELIMINAR EGRESO
# ============================================================

@router.delete("/egresos/{egreso_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_egreso(
    egreso_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Elimina un egreso. Solo permitido para admin_sede y super_admin.
    """
    
    # Verificar permisos
    if current_user["rol"] not in ["admin_sede", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar egresos"
        )
    
    # Verificar que exista
    egreso = await cash_expenses.find_one({"egreso_id": egreso_id})
    
    if not egreso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Egreso {egreso_id} no encontrado"
        )
    
    # Eliminar
    resultado = await cash_expenses.delete_one({"egreso_id": egreso_id})
    
    if resultado.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar el egreso"
        )
    
    return None

# ============================================================
# 9. REPORTE DE PERIODO
# ============================================================

@router.get("/reporte-periodo")
async def reporte_periodo(
    sede_id: str = Query(..., description="ID de la sede"),
    fecha_inicio: str = Query(..., description="Fecha inicio (YYYY-MM-DD)"),
    fecha_fin: str = Query(..., description="Fecha fin (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Genera un reporte consolidado para un periodo de fechas.
    """
    
    # Obtener todos los cierres del periodo
    cierres_list = await cash_closures.find({
        "sede_id": sede_id,
        "fecha": {"$gte": fecha_inicio, "$lte": fecha_fin},
        "tipo": "cierre"
    }).sort("fecha", 1).to_list(None)
    
    # ✅ CONVERTIR ObjectId a string en todos los documentos
    cierres_list = [convertir_mongo_a_json(c) for c in cierres_list]

    # Calcular totales
    total_ingresos = sum(c.get("total_ingresos", 0) for c in cierres_list)
    total_egresos = sum(c.get("total_egresos", 0) for c in cierres_list)
    total_diferencias = sum(c.get("diferencia", 0) for c in cierres_list)
    
    return {
        "sede_id": sede_id,
        "periodo": {
            "inicio": fecha_inicio,
            "fin": fecha_fin,
            "dias": len(cierres_list)
        },
        "totales": {
            "ingresos": total_ingresos,
            "egresos": total_egresos,
            "neto": total_ingresos - total_egresos,
            "diferencias_acumuladas": total_diferencias
        },
        "cierres": cierres_list
    }
