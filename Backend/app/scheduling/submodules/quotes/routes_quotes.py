from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, time
from typing import Optional, List
from email.message import EmailMessage
import smtplib, ssl, os
from bson import ObjectId

from app.scheduling.models import Cita
from app.database.mongo import (
    collection_citas,
    collection_horarios,
    collection_servicios,
    collection_estilista,
    collection_clients,
    collection_locales,
    collection_block,  # si no existe en tu proyecto elimínalo del import
)
from app.auth.routes import get_current_user

router = APIRouter(prefix="/citas")

# -----------------------
# EMAIL (config desde env)
# -----------------------
EMAIL_SENDER = os.getenv("EMAIL_REMITENTE")
EMAIL_PASSWORD = os.getenv("EMAIL_CONTRASENA")
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 465

def enviar_correo(destinatario: str, asunto: str, mensaje: str):
    """Envía correo HTML (SSL)."""
    try:
        msg = EmailMessage()
        msg["Subject"] = asunto
        msg["From"] = EMAIL_SENDER
        msg["To"] = destinatario
        msg.set_content(mensaje, subtype="html")

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context) as server:
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.send_message(msg)

        print(f"📧 Correo enviado a {destinatario}")
    except Exception as e:
        print("Error enviando email:", e)


# -----------------------
# HELPERS
# -----------------------
def normalize_cita_doc(doc: dict) -> dict:
    """Convierte _id a str y normaliza fecha si viene como datetime."""
    doc["_id"] = str(doc["_id"])
    if isinstance(doc.get("fecha"), datetime):
        doc["fecha"] = doc["fecha"].strftime("%Y-%m-%d")
    return doc

async def resolve_cita_by_id(cita_id: str) -> Optional[dict]:
    """
    Intenta resolver una cita por:
      1) campo cita_id (string de negocio)
      2) _id (ObjectId)
    Devuelve el documento o None.
    """
    # intentar por campo de negocio
    cita = await collection_citas.find_one({"cita_id": cita_id})
    if cita:
        return cita
    # intentar por ObjectId
    try:
        cita = await collection_citas.find_one({"_id": ObjectId(cita_id)})
        return cita
    except Exception:
        return None


# =============================================================
# 🔹 OBTENER CITAS (filtro por sede o profesional)
# =============================================================
@router.get("/", response_model=dict)
async def obtener_citas(
    sede_id: Optional[str] = Query(None),
    profesional_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    filtro = {}
    if sede_id:
        filtro["sede_id"] = sede_id
    if profesional_id:
        # el campo en las citas debe ser profesional_id (o estilista_id que guarda profesional_id)
        filtro["profesional_id"] = profesional_id

    cursor = collection_citas.find(filtro).sort("fecha", 1)
    citas = await cursor.to_list(length=None)

    # enrich
    for cita in citas:
        normalize_cita_doc(cita)

        # servicio
        servicio = await collection_servicios.find_one({"servicio_id": cita.get("servicio_id")})
        cita["servicio_nombre"] = servicio.get("nombre") if servicio else "Desconocido"

        # profesional / estilista
        prof = await collection_estilista.find_one({"profesional_id": cita.get("profesional_id")})
        cita["profesional_nombre"] = prof.get("nombre") if prof else "No encontrado"

        # sede
        sede = await collection_locales.find_one({"sede_id": cita.get("sede_id")})
        cita["sede_nombre"] = sede.get("nombre") if sede else "No encontrada"

    return {"citas": citas}


# =============================================================
# 🔹 CREAR CITA (con validaciones, guardado y email)
# =============================================================
@router.post("/", response_model=dict)
async def crear_cita(
    cita: Cita,
    current_user: dict = Depends(get_current_user)
):
    print(f"🔍 crear_cita invoked by {current_user.get('email')} (rol={current_user.get('rol')})")

    # permisos simples
    if current_user.get("rol") not in ["usuario", "admin_sede", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para crear citas")

    # convertir fecha a string ISO
    fecha_str = cita.fecha.strftime("%Y-%m-%d")

    # === obtener datos relacionados ===
    cliente = await collection_clients.find_one({"cliente_id": cita.cliente_id})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    servicio = await collection_servicios.find_one({"servicio_id": cita.servicio_id})
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    # profesional: usamos profesional_id en la colección de estilistas
    profesional = await collection_estilista.find_one({"profesional_id": cita.profesional_id})
    if not profesional:
        raise HTTPException(status_code=404, detail="Profesional no encontrado")

    sede = await collection_locales.find_one({"sede_id": cita.sede_id})
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")

    # === pago / abono ===
    valor_total = servicio.get("precio", 0) or 0
    abono = getattr(cita, "abono", 0) or 0

    if abono >= valor_total:
        estado_pago = "pagado"
    elif abono > 0:
        estado_pago = "abonado"
    else:
        estado_pago = "pendiente"

    saldo_pendiente = round(valor_total - abono, 2)

    # === validar horario del profesional ===
    dia_semana = cita.fecha.isoweekday()
    horario = await collection_horarios.find_one({
        "profesional_id": cita.profesional_id,
        "disponibilidad": {
            "$elemMatch": {"dia_semana": dia_semana, "activo": True}
        }
    })
    if not horario:
        raise HTTPException(status_code=400, detail="El profesional no trabaja este día")

    dia_info = next((d for d in horario["disponibilidad"] if d["dia_semana"] == dia_semana), None)
    if not dia_info:
        raise HTTPException(status_code=400, detail="El profesional no tiene disponibilidad para ese día")

    hora_inicio_hor = time.fromisoformat(dia_info["hora_inicio"])
    hora_fin_hor = time.fromisoformat(dia_info["hora_fin"])
    hora_inicio_cita = time.fromisoformat(cita.hora_inicio)
    hora_fin_cita = time.fromisoformat(cita.hora_fin)

    if not (hora_inicio_hor <= hora_inicio_cita < hora_fin_hor and hora_inicio_hor < hora_fin_cita <= hora_fin_hor):
        raise HTTPException(status_code=400, detail="La cita está fuera del horario laboral del profesional")

    # === validar bloqueos (si existe collection_block) ===
    try:
        bloqueo = await collection_block.find_one({
            "profesional_id": cita.profesional_id,
            "fecha": fecha_str,
            "hora_inicio": {"$lt": cita.hora_fin},
            "hora_fin": {"$gt": cita.hora_inicio}
        })
        if bloqueo:
            raise HTTPException(status_code=400, detail="El profesional tiene un bloqueo en ese horario")
    except Exception:
        # si no existe collection_block o falla, ignorar (no crítico)
        pass

    # === validar solape con otras citas ===
    solape = await collection_citas.find_one({
        "profesional_id": cita.profesional_id,
        "fecha": fecha_str,
        "hora_inicio": {"$lt": cita.hora_fin},
        "hora_fin": {"$gt": cita.hora_inicio},
        "estado": {"$ne": "cancelada"}
    })
    if solape:
        raise HTTPException(status_code=400, detail="El profesional ya tiene una cita en ese horario")

    # === preparar documento y guardar ===
    data = cita.dict()
    data["fecha"] = fecha_str
    data["valor_total"] = float(valor_total)
    data["abono"] = float(abono)
    data["saldo_pendiente"] = float(saldo_pendiente)
    data["estado_pago"] = estado_pago

    # Campos denormalizados para consumo frontend
    data["cliente_nombre"] = cliente.get("nombre")
    data["servicio_nombre"] = servicio.get("nombre")
    data["profesional_nombre"] = profesional.get("nombre")
    data["sede_nombre"] = sede.get("nombre")

    data["creada_por"] = current_user.get("email")
    data["fecha_creacion"] = datetime.now().strftime("%Y-%m-%d %H:%M")

    result = await collection_citas.insert_one(data)
    data["_id"] = str(result.inserted_id)

    # === construir email HTML bonito ===
    estilo = """
    <style>
        body { font-family: Arial, sans-serif; color:#333; }
        .card { max-width:700px; margin:auto; border:1px solid #eee; border-radius:10px; padding:20px; }
        .header { text-align:center; }
        .logo { max-width:160px; }
        .title { font-size:20px; margin-top:10px; font-weight:700; }
        .row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed #eee; }
        .label { color:#555; font-weight:600; }
        .value { color:#111; }
        .totals { margin-top:12px; padding-top:10px; border-top:2px solid #f0f0f0; }
        .cta { display:block; text-align:center; margin-top:18px; padding:10px 14px; background:#ff6f91; color:white; border-radius:8px; text-decoration:none; width:60%; margin-left:auto; margin-right:auto; }
    </style>
    """

    mensaje_html = f"""
    <html>
    {estilo}
    <body>
      <div class="card">
        <div class="header">
          <img class="logo" src="https://rizosfelicesdata.s3.us-east-2.amazonaws.com/logo+principal+rosado+letra+blanco_Mesa+de+tra+(1).png" alt="Rizos Felices">
          <div class="title">Confirmación de Cita</div>
        </div>

        <div style="padding:12px 0;">
          <div class="row"><div class="label">Cliente</div><div class="value">{cliente.get('nombre')}</div></div>
          <div class="row"><div class="label">Servicio</div><div class="value">{servicio.get('nombre')}</div></div>
          <div class="row"><div class="label">Profesional</div><div class="value">{profesional.get('nombre')}</div></div>
          <div class="row"><div class="label">Sede</div><div class="value">{sede.get('nombre')}</div></div>
          <div class="row"><div class="label">Fecha</div><div class="value">{fecha_str}</div></div>
          <div class="row"><div class="label">Hora</div><div class="value">{cita.hora_inicio} - {cita.hora_fin}</div></div>

          <div class="totals">
            <div class="row"><div class="label">Precio total</div><div class="value">${valor_total:,.0f}</div></div>
            <div class="row"><div class="label">Abono</div><div class="value">${abono:,.0f}</div></div>
            <div class="row"><div class="label">Saldo pendiente</div><div class="value">${saldo_pendiente:,.0f}</div></div>
            <div class="row"><div class="label">Estado de pago</div><div class="value">{estado_pago.upper()}</div></div>
          </div>

          <p style="text-align:center; margin-top:18px;">Gracias por agendar con nosotros 🤎</p>
        </div>
      </div>
    </body>
    </html>
    """

    # Enviar correo al cliente (si tiene email)
    cliente_email = cliente.get("email") or cliente.get("correo") or None
    if cliente_email:
        enviar_correo(cliente_email, f"Confirmación cita {data.get('_id')}", mensaje_html)

    # Opcional: enviar correo a profesional y administración
    try:
        prof_email = profesional.get("email")
        if prof_email:
            enviar_correo(prof_email, f"Nuevo turno asignado - {fecha_str} {cita.hora_inicio}", mensaje_html)
    except Exception:
        pass

    # respuesta
    return {"success": True, "message": "Cita creada exitosamente", "cita_id": data["_id"], "data": data}


# =============================================================
# 🔹 EDITAR CITA (por cita_id o ObjectId)
# =============================================================
@router.put("/{cita_id}", response_model=dict)
async def editar_cita(
    cita_id: str,
    cambios: dict,
    current_user: dict = Depends(get_current_user)
):
    # solo admin/editors permitidos
    if current_user.get("rol") not in ["admin_sede", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para editar citas")

    # intentar actualizar por cita_id (campo negocio)
    result = await collection_citas.update_one({"cita_id": cita_id}, {"$set": cambios})
    if result.matched_count == 0:
        # intentar por ObjectId
        try:
            oid = ObjectId(cita_id)
            result = await collection_citas.update_one({"_id": oid}, {"$set": cambios})
        except Exception:
            pass

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    # devolver documento actualizado
    cita = await resolve_cita_by_id(cita_id)
    if cita:
        normalize_cita_doc(cita)
    return {"success": True, "cita": cita}


# =============================================================
# 🔹 CANCELAR CITA
# =============================================================
@router.post("/{cita_id}/cancelar", response_model=dict)
async def cancelar_cita(cita_id: str, current_user: dict = Depends(get_current_user)):
    # permisos: usuario puede cancelar su propia cita; admin puede cualquiera
    cita = await resolve_cita_by_id(cita_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    if current_user.get("rol") == "usuario":
        # comparar ids (cliente_id vs user info). Ajusta si tu user id se llama diferente.
        if cita.get("cliente_id") != current_user.get("user_id") and cita.get("cliente_id") != current_user.get("cliente_id"):
            raise HTTPException(status_code=403, detail="Solo puedes cancelar tus propias citas")

    await collection_citas.update_one({"_id": ObjectId(cita["_id"])}, {"$set": {
        "estado": "cancelada",
        "fecha_cancelacion": datetime.now(),
        "cancelada_por": current_user.get("email")
    }})

    return {"success": True, "mensaje": "Cita cancelada", "cita_id": cita_id}


# =============================================================
# 🔹 CONFIRMAR CITA
# =============================================================
@router.post("/{cita_id}/confirmar", response_model=dict)
async def confirmar_cita(cita_id: str, current_user: dict = Depends(get_current_user)):
    cita = await resolve_cita_by_id(cita_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    # solo admin o profesional de la sede puede confirmar (simplificado)
    await collection_citas.update_one({"_id": ObjectId(cita["_id"])}, {"$set": {
        "estado": "confirmada",
        "confirmada_por": current_user.get("email"),
        "fecha_confirmacion": datetime.now()
    }})

    return {"success": True, "mensaje": "Cita confirmada", "cita_id": cita_id}


# =============================================================
# 🔹 MARCAR COMPLETADA
# =============================================================
@router.post("/{cita_id}/completar", response_model=dict)
async def completar_cita(cita_id: str, current_user: dict = Depends(get_current_user)):
    cita = await resolve_cita_by_id(cita_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    await collection_citas.update_one({"_id": ObjectId(cita["_id"])}, {"$set": {
        "estado": "completada",
        "completada_por": current_user.get("email"),
        "fecha_completada": datetime.now()
    }})

    return {"success": True, "mensaje": "Cita completada", "cita_id": cita_id}


# =============================================================
# 🔹 MARCAR NO ASISTIÓ
# =============================================================
@router.post("/{cita_id}/no-asistio", response_model=dict)
async def no_asistio(cita_id: str, current_user: dict = Depends(get_current_user)):
    cita = await resolve_cita_by_id(cita_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    await collection_citas.update_one({"_id": ObjectId(cita["_id"])}, {"$set": {
        "estado": "no_asistio",
        "marcada_no_asistio_por": current_user.get("email"),
        "fecha_no_asistio": datetime.now()
    }})

    return {"success": True, "mensaje": "Marcada como no asistió", "cita_id": cita_id}


# =============================================================
# 🔹 FICHAS DEL CLIENTE (por cliente_id)
# =============================================================
@router.get("/fichas", response_model=dict)
async def obtener_fichas_por_cliente(
    cliente_id: str = Query(...),
    current_user: dict = Depends(get_current_user)
):
    filtro = {"cliente_id": cliente_id}
    # si rol admin_sede o profesional se puede filtrar por sede en el futuro (si quieres)
    fichas = await collection_citas.find(filtro).sort("fecha", -1).to_list(None)

    if not fichas:
        return {"success": True, "total": 0, "fichas": []}

    resultado = []
    for ficha in fichas:
        # enriquecer
        servicio = await collection_servicios.find_one({"servicio_id": ficha.get("servicio_id")})
        profesional = await collection_estilista.find_one({"profesional_id": ficha.get("profesional_id")})
        sede = await collection_locales.find_one({"sede_id": ficha.get("sede_id")})

        ficha = normalize_cita_doc(ficha)
        ficha["servicio_nombre"] = servicio.get("nombre") if servicio else None
        ficha["profesional_nombre"] = profesional.get("nombre") if profesional else None
        ficha["sede_nombre"] = sede.get("nombre") if sede else None

        resultado.append(ficha)

    return {"success": True, "total": len(resultado), "fichas": resultado}



