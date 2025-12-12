from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form
from datetime import datetime, time
from typing import Optional, List
from email.message import EmailMessage
import smtplib, ssl, os
from bson import ObjectId
import uuid
import boto3
import json

from app.scheduling.models import FichaCreate
from app.scheduling.models import Cita, ProductoItem
from app.database.mongo import (
    collection_citas,
    collection_horarios,
    collection_servicios,
    collection_estilista,
    collection_clients,
    collection_locales,
    collection_block,
    collection_card,
    collection_commissions,
    collection_products
)
from app.auth.routes import get_current_user

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION")

router = APIRouter()

s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION", "us-west-2")
)

def upload_to_s3(file: UploadFile, folder_path: str) -> str:
    try:
        # Extensión real
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        s3_key = f"{folder_path}/{unique_filename}"

        # Leer bytes del archivo
        file_bytes = file.file.read()

        # Obtener Content-Type correcto para que NO descargue
        content_type = file.content_type or "image/jpeg"

        # Subir correctamente al bucket con ContentType
        s3_client.put_object(
            Bucket=os.getenv("AWS_BUCKET_NAME"),
            Key=s3_key,
            Body=file_bytes,
            ContentType=content_type,
            ACL='public-read'  # ⭐️ Hace que la imagen sea accesible desde el navegador
        )

        # Generar URL pública
        bucket_name = os.getenv("AWS_BUCKET_NAME")
        region = os.getenv("AWS_REGION", "us-west-2")

        url = f"https://{bucket_name}.s3.{region}.amazonaws.com/{s3_key}"

        return url

    except Exception as e:
        print(f"Error subiendo archivo a S3: {e}")
        raise HTTPException(status_code=500, detail=f"Error subiendo archivo: {str(e)}")


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
    cita = await collection_citas.find_one({"cita_id": cita_id})
    if cita:
        return cita
    try:
        cita = await collection_citas.find_one({"_id": ObjectId(cita_id)})
        return cita
    except Exception:
        return None

# =============================================================
# 🔹 OBTENER CITAS (filtro por sede o profesional) - OPTIMIZADO
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
        filtro["profesional_id"] = profesional_id

    citas = await collection_citas.find(filtro).sort("fecha", 1).to_list(None)

    if not citas:
        return {"citas": []}

    servicio_ids = list({c.get("servicio_id") for c in citas})
    profesional_ids = list({c.get("profesional_id") for c in citas})
    sede_ids = list({c.get("sede_id") for c in citas})

    servicios = await collection_servicios.find(
        {"servicio_id": {"$in": servicio_ids}}
    ).to_list(None)

    profesionales = await collection_estilista.find(
        {"profesional_id": {"$in": profesional_ids}}
    ).to_list(None)

    sedes = await collection_locales.find(
        {"sede_id": {"$in": sede_ids}}
    ).to_list(None)

    servicios_map = {s["servicio_id"]: s for s in servicios}
    profesionales_map = {p["profesional_id"]: p for p in profesionales}
    sedes_map = {s["sede_id"]: s for s in sedes}

    for cita in citas:
        normalize_cita_doc(cita)

        cita["servicio_nombre"] = servicios_map.get(
            cita.get("servicio_id"), {}
        ).get("nombre", "Desconocido")

        cita["profesional_nombre"] = profesionales_map.get(
            cita.get("profesional_id"), {}
        ).get("nombre", "No encontrado")

        cita["sede_nombre"] = sedes_map.get(
            cita.get("sede_id"), {}
        ).get("nombre", "No encontrada")

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

    if current_user.get("rol") not in ["usuario", "admin_sede", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para crear citas")

    fecha_str = cita.fecha.strftime("%Y-%m-%d")

    # === obtener datos relacionados ===
    cliente = await collection_clients.find_one({"cliente_id": cita.cliente_id})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    servicio = await collection_servicios.find_one({"servicio_id": cita.servicio_id})
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    profesional = await collection_estilista.find_one({"profesional_id": cita.profesional_id})
    if not profesional:
        raise HTTPException(status_code=404, detail="Profesional no encontrado")

    sede = await collection_locales.find_one({"sede_id": cita.sede_id})
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")

    # ⭐ OBTENER PRECIO SEGÚN MONEDA DE LA SEDE
    moneda_sede = sede.get("moneda", "COP")
    precios_servicio = servicio.get("precios", {})

    if moneda_sede not in precios_servicio:
        raise HTTPException(
            status_code=400,
            detail=f"El servicio '{servicio.get('nombre')}' no tiene precio configurado en {moneda_sede}"
        )

    valor_total = precios_servicio[moneda_sede]
    print(f"💵 Precio del servicio en {moneda_sede}: {valor_total}")

    # === pago / abono ===
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

    # === validar bloqueos ===
    bloqueo = await collection_block.find_one({
        "profesional_id": cita.profesional_id,
        "fecha": fecha_str,
        "hora_inicio": {"$lt": cita.hora_fin},
        "hora_fin": {"$gt": cita.hora_inicio}
    })
    if bloqueo:
        raise HTTPException(
            status_code=400, 
            detail=f"El profesional tiene un bloqueo en ese horario (Motivo: {bloqueo.get('motivo', 'No especificado')})"
        )

    # === validar solape con otras citas (SOLO para diferentes clientes) ===
    # 🔥 CORRECCIÓN: Permitir al mismo cliente múltiples citas, pero no a diferentes clientes con el mismo profesional
    solape = await collection_citas.find_one({
        "profesional_id": cita.profesional_id,
        "cliente_id": {"$ne": cita.cliente_id},  # Solo verificar citas de OTROS clientes
        "fecha": fecha_str,
        "hora_inicio": {"$lt": cita.hora_fin},
        "hora_fin": {"$gt": cita.hora_inicio},
        "estado": {"$ne": "cancelada"}
    })
    if solape:
        cliente_solape_nombre = solape.get("cliente_nombre", "Cliente")
        raise HTTPException(
            status_code=400, 
            detail=f"El profesional ya tiene una cita con {cliente_solape_nombre} en ese horario"
        )

    # === preparar documento y guardar ===
    data = cita.dict()
    data["fecha"] = fecha_str
    data["valor_total"] = float(valor_total)
    data["abono"] = float(abono)
    data["saldo_pendiente"] = float(saldo_pendiente)
    data["estado_pago"] = estado_pago
    data["moneda"] = moneda_sede
    data["estado"] = "confirmada"  # Estado por defecto

    # Campos denormalizados
    data["cliente_nombre"] = cliente.get("nombre")
    data["cliente_email"] = cliente.get("email") or cliente.get("correo")
    data["cliente_telefono"] = cliente.get("telefono") or cliente.get("celular")
    data["servicio_nombre"] = servicio.get("nombre")
    data["servicio_duracion"] = servicio.get("duracion_minutos")
    data["profesional_nombre"] = profesional.get("nombre")
    data["profesional_email"] = profesional.get("email")
    data["sede_nombre"] = sede.get("nombre")
    data["sede_direccion"] = sede.get("direccion")
    data["sede_telefono"] = sede.get("telefono")

    data["creada_por"] = current_user.get("email")
    data["creada_por_rol"] = current_user.get("rol")
    data["fecha_creacion"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    data["ultima_actualizacion"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    result = await collection_citas.insert_one(data)
    cita_id = str(result.inserted_id)
    data["_id"] = cita_id

    # === construir email HTML mejorado ===
    estilo = """
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Poppins', sans-serif;
            background-color: #f8f9fa;
            color: #333;
            line-height: 1.6;
        }
        
        .email-container {
            max-width: 700px;
            margin: 30px auto;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        }
        
        .email-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        
        .logo {
            width: 180px;
            margin-bottom: 20px;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }
        
        .header-title {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .header-subtitle {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 300;
        }
        
        .cita-id {
            background: rgba(255, 255, 255, 0.15);
            display: inline-block;
            padding: 8px 16px;
            border-radius: 50px;
            font-size: 14px;
            margin-top: 15px;
            letter-spacing: 1px;
        }
        
        .email-body {
            padding: 40px 30px;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #4a5568;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e9ecef;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .section-title i {
            color: #667eea;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .info-card {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            border-left: 4px solid #667eea;
        }
        
        .info-label {
            font-size: 13px;
            color: #718096;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        
        .info-value {
            font-size: 16px;
            font-weight: 500;
            color: #2d3748;
        }
        
        .pago-section {
            background: linear-gradient(135deg, #f6f9ff 0%, #f0f4ff 100%);
            border-radius: 15px;
            padding: 25px;
            margin: 30px 0;
            border: 1px solid #e2e8f0;
        }
        
        .pago-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .pago-item {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px dashed #cbd5e0;
        }
        
        .pago-item.total {
            border-bottom: 2px solid #4a5568;
            font-weight: 600;
            color: #2d3748;
        }
        
        .estado-pago {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 600;
            margin-top: 10px;
        }
        
        .estado-pagado {
            background: #c6f6d5;
            color: #22543d;
        }
        
        .estado-abonado {
            background: #fed7d7;
            color: #742a2a;
        }
        
        .estado-pendiente {
            background: #feebc8;
            color: #744210;
        }
        
        .instrucciones {
            background: #e6fffa;
            border-radius: 12px;
            padding: 25px;
            margin-top: 30px;
            border-left: 4px solid #38b2ac;
        }
        
        .instrucciones-title {
            font-size: 16px;
            font-weight: 600;
            color: #234e52;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .instrucciones-list {
            list-style: none;
        }
        
        .instrucciones-list li {
            padding: 8px 0;
            color: #4a5568;
        }
        
        .instrucciones-list li:before {
            content: "✓";
            color: #38b2ac;
            font-weight: bold;
            margin-right: 10px;
        }
        
        .email-footer {
            background: #2d3748;
            color: #cbd5e0;
            padding: 30px;
            text-align: center;
            font-size: 14px;
        }
        
        .footer-links {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin: 20px 0;
        }
        
        .footer-links a {
            color: #90cdf4;
            text-decoration: none;
        }
        
        .footer-links a:hover {
            text-decoration: underline;
        }
        
        .social-icons {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-top: 20px;
        }
        
        .social-icon {
            width: 36px;
            height: 36px;
            background: #4a5568;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            text-decoration: none;
            transition: all 0.3s ease;
        }
        
        .social-icon:hover {
            transform: translateY(-3px);
            background: #667eea;
        }
        
        @media (max-width: 600px) {
            .email-container {
                margin: 10px;
                border-radius: 15px;
            }
            
            .email-header {
                padding: 30px 20px;
            }
            
            .email-body {
                padding: 30px 20px;
            }
            
            .info-grid {
                grid-template-columns: 1fr;
            }
            
            .pago-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
    """

    # Símbolos de moneda
    simbolos = {
        "COP": {"simbolo": "$", "nombre": "COP"},
        "USD": {"simbolo": "US$", "nombre": "USD"},
        "MXN": {"simbolo": "MX$", "nombre": "MXN"},
        "EUR": {"simbolo": "€", "nombre": "EUR"}
    }
    moneda_info = simbolos.get(moneda_sede, {"simbolo": "$", "nombre": "COP"})
    
    # Determinar clase CSS para estado de pago
    estado_pago_class = {
        "pagado": "estado-pagado",
        "abonado": "estado-abonado",
        "pendiente": "estado-pendiente"
    }.get(estado_pago, "estado-pendiente")

    mensaje_html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmación de Cita - Rizos Felices</title>
        {estilo}
    </head>
    <body>
        <div class="email-container">
            <!-- Header -->
            <div class="email-header">
                <img class="logo" src="https://rizosfelicesdata.s3.us-east-2.amazonaws.com/logo+principal+rosado+letra+blanco_Mesa+de+tra+(1).png" alt="Rizos Felices">
                <h1 class="header-title">¡Cita Confirmada!</h1>
                <p class="header-subtitle">Tu reserva ha sido agendada exitosamente</p>
                <div class="cita-id">ID de cita: {cita_id[:8].upper()}</div>
            </div>
            
            <!-- Body -->
            <div class="email-body">
                <!-- Información de la cita -->
                <div class="section-title">
                    <span>📅 Detalles de la cita</span>
                </div>
                
                <div class="info-grid">
                    <div class="info-card">
                        <div class="info-label">Cliente</div>
                        <div class="info-value">{cliente.get('nombre')}</div>
                    </div>
                    
                    <div class="info-card">
                        <div class="info-label">Servicio</div>
                        <div class="info-value">{servicio.get('nombre')}</div>
                        <small>{servicio.get('duracion_minutos', 60)} minutos</small>
                    </div>
                    
                    <div class="info-card">
                        <div class="info-label">Profesional</div>
                        <div class="info-value">{profesional.get('nombre')}</div>
                    </div>
                    
                    <div class="info-card">
                        <div class="info-label">Sede</div>
                        <div class="info-value">{sede.get('nombre')}</div>
                        <small>{sede.get('direccion', '')}</small>
                    </div>
                    
                    <div class="info-card">
                        <div class="info-label">Fecha</div>
                        <div class="info-value">{fecha_str}</div>
                    </div>
                    
                    <div class="info-card">
                        <div class="info-label">Horario</div>
                        <div class="info-value">{cita.hora_inicio} - {cita.hora_fin}</div>
                    </div>
                </div>
                
                <!-- Información de pago -->
                <div class="section-title">
                    <span>💰 Información de pago</span>
                </div>
                
                <div class="pago-section">
                    <div class="pago-grid">
                        <div class="pago-item">
                            <span>Precio total:</span>
                            <span><strong>{moneda_info['simbolo']}{valor_total:,.2f} {moneda_info['nombre']}</strong></span>
                        </div>
                        
                        <div class="pago-item">
                            <span>Abono realizado:</span>
                            <span>{moneda_info['simbolo']}{abono:,.2f}</span>
                        </div>
                        
                        <div class="pago-item">
                            <span>Saldo pendiente:</span>
                            <span>{moneda_info['simbolo']}{saldo_pendiente:,.2f}</span>
                        </div>
                        
                        <div class="pago-item total">
                            <span>Estado:</span>
                            <span>
                                <span class="estado-pago {estado_pago_class}">
                                    {estado_pago.upper()}
                                </span>
                            </span>
                        </div>
                    </div>
                    
                    {f'<p style="margin-top: 15px; font-size: 14px; color: #4a5568;">Saldo pendiente por pagar al momento del servicio.</p>' if saldo_pendiente > 0 else ''}
                </div>
                
                <!-- Instrucciones -->
                <div class="instrucciones">
                    <div class="instrucciones-title">
                        <span>📋 Recomendaciones importantes</span>
                    </div>
                    <ul class="instrucciones-list">
                        <li>Llega 10 minutos antes de tu cita</li>
                        <li>Trae tu identificación para confirmar la reserva</li>
                        <li>Notifica cualquier cancelación con al menos 24 horas de anticipación</li>
                        <li>Usa mascarilla si lo consideras necesario</li>
                        <li>Consulta nuestras políticas en nuestro sitio web</li>
                    </ul>
                </div>
                
                <!-- Contacto de emergencia -->
                <div style="margin-top: 30px; padding: 20px; background: #fff7ed; border-radius: 12px; border-left: 4px solid #ed8936;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <span style="font-size: 16px; font-weight: 600; color: #9c4221;">📞 ¿Necesitas ayuda?</span>
                    </div>
                    <p style="color: #744210; margin-bottom: 5px;">
                        <strong>{sede.get('nombre')}:</strong> {sede.get('telefono', 'No disponible')}
                    </p>
                    <p style="color: #744210; font-size: 14px;">
                        Horario de atención: {dia_info['hora_inicio']} - {dia_info['hora_fin']}
                    </p>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="email-footer">
                <p>© {datetime.now().year} Rizos Felices. Todos los derechos reservados.</p>
                <div class="footer-links">
                    <a href="#">Políticas de privacidad</a>
                    <a href="#">Términos de servicio</a>
                    <a href="#">Contacto</a>
                </div>
                <div class="social-icons">
                    <a href="#" class="social-icon">FB</a>
                    <a href="#" class="social-icon">IG</a>
                    <a href="#" class="social-icon">TW</a>
                    <a href="#" class="social-icon">WA</a>
                </div>
                <p style="margin-top: 20px; font-size: 12px; opacity: 0.7;">
                    Este es un correo automático, por favor no responder.
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    # === enviar emails ===
    cliente_email = cliente.get("email") or cliente.get("correo")
    if cliente_email:
        try:
            enviar_correo(
                cliente_email, 
                f"✅ Confirmación de cita - {fecha_str} {cita.hora_inicio}", 
                mensaje_html
            )
            print(f"📧 Email enviado a cliente: {cliente_email}")
        except Exception as e:
            print(f"⚠️ Error enviando email al cliente: {e}")

    # Enviar al profesional si tiene email
    try:
        prof_email = profesional.get("email")
        if prof_email:
            # Modificar ligeramente el email para el profesional
            prof_subject = f"📅 Nueva cita asignada - {fecha_str} {cita.hora_inicio} - {cliente.get('nombre')}"
            enviar_correo(prof_email, prof_subject, mensaje_html)
            print(f"📧 Email enviado a profesional: {prof_email}")
    except Exception as e:
        print(f"⚠️ Error enviando email al profesional: {e}")

    # También enviar a admin de sede si es diferente del creador
    try:
        admin_sede_email = sede.get("email_contacto")
        if admin_sede_email and admin_sede_email != current_user.get("email"):
            admin_subject = f"📋 Nueva cita registrada - {fecha_str} - {cliente.get('nombre')}"
            enviar_correo(admin_sede_email, admin_subject, mensaje_html)
    except Exception as e:
        print(f"⚠️ Error enviando email a admin sede: {e}")

    return {
        "success": True, 
        "message": "Cita creada exitosamente", 
        "cita_id": cita_id,
        "data": {
            "cita_id": cita_id,
            "cliente": cliente.get("nombre"),
            "servicio": servicio.get("nombre"),
            "profesional": profesional.get("nombre"),
            "fecha": fecha_str,
            "horario": f"{cita.hora_inicio} - {cita.hora_fin}",
            "valor_total": valor_total,
            "estado_pago": estado_pago,
            "saldo_pendiente": saldo_pendiente,
            "emails_enviados": {
                "cliente": bool(cliente_email),
                "profesional": bool(prof_email)
            }
        }
    }
# =============================================================
# 🔹 EDITAR CITA
# =============================================================
@router.put("/{cita_id}", response_model=dict)
async def editar_cita(
    cita_id: str,
    cambios: dict,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("rol") not in ["admin_sede", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para editar citas")

    result = await collection_citas.update_one({"cita_id": cita_id}, {"$set": cambios})
    if result.matched_count == 0:
        try:
            oid = ObjectId(cita_id)
            result = await collection_citas.update_one({"_id": oid}, {"$set": cambios})
        except Exception:
            pass

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    cita = await resolve_cita_by_id(cita_id)
    if cita:
        normalize_cita_doc(cita)
    return {"success": True, "cita": cita}

# =============================================================
# 🔹 CANCELAR CITA
# =============================================================
@router.post("/{cita_id}/cancelar", response_model=dict)
async def cancelar_cita(cita_id: str, current_user: dict = Depends(get_current_user)):
    cita = await resolve_cita_by_id(cita_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    if current_user.get("rol") == "usuario":
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

    await collection_citas.update_one({"_id": ObjectId(cita["_id"])}, {"$set": {
        "estado": "confirmada",
        "confirmada_por": current_user.get("email"),
        "fecha_confirmacion": datetime.now()
    }})

    return {"success": True, "mensaje": "Cita confirmada", "cita_id": cita_id}

# =============================================================
# 🔹 MARCAR COMPLETADA (solo cuando se factura - ver routes_quotes)
# =============================================================
@router.post("/{cita_id}/completar", response_model=dict)
async def completar_cita(cita_id: str, current_user: dict = Depends(get_current_user)):
    """
    ⚠️ DEPRECADO: Usar el endpoint de facturación en routes_quotes.py
    Este endpoint se mantiene por compatibilidad pero no genera comisiones.
    """
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

# ... (resto de endpoints sin cambios: fichas, estilista, productos, etc.)
# Los mantengo igual porque no necesitan modificaciones para monedas


# =============================================================
# 🔹 OBTENER FICHAS POR CLIENTE (todas las fichas técnicas)
# =============================================================
@router.get("/fichas", response_model=dict)
async def obtener_fichas_por_cliente(
    cliente_id: str = Query(...),
    current_user: dict = Depends(get_current_user)
):

    # -----------------------------------------
    # 1. Validación de acceso
    # -----------------------------------------
    rol = current_user["rol"]
    if rol not in ["super_admin", "admin_franquicia", "admin_sede", "estilista"]:
        raise HTTPException(status_code=403, detail="No autorizado")

    # -----------------------------------------
    # 2. Buscar fichas reales (collection_card)
    # -----------------------------------------
    filtro = {"cliente_id": cliente_id}

    fichas = (
        await collection_card
        .find(filtro)
        .sort("fecha_ficha", -1)  # <-- CAMBIO CORRECTO
        .to_list(None)
    )

    if not fichas:
        return {"success": True, "total": 0, "fichas": []}

    resultado = []

    # -----------------------------------------
    # 3. Enriquecer ficha por ficha
    # -----------------------------------------
    for ficha in fichas:

        ficha_norm = {
            "id": str(ficha.get("_id")),
            "cliente_id": ficha.get("cliente_id"),
            "nombre": ficha.get("nombre"),
            "apellido": ficha.get("apellido"),
            "telefono": ficha.get("telefono"),
            "cedula": ficha.get("cedula"),

            "servicio_id": ficha.get("servicio_id"),
            "profesional_id": ficha.get("profesional_id"),
            "sede_id": ficha.get("sede_id"),

            "fecha_ficha": ficha.get("fecha_ficha"),
            "fecha_reserva": ficha.get("fecha_reserva"),

            "tipo_ficha": ficha.get("tipo_ficha"),
            "precio": ficha.get("precio"),
            "estado": ficha.get("estado"),
            "estado_pago": ficha.get("estado_pago"),

            "contenido": ficha.get("datos_especificos"),
        }

        # -----------------------------------------
        # Enriquecimiento
        # -----------------------------------------

        servicio = await collection_servicios.find_one(
            {"servicio_id": ficha.get("servicio_id")}
        )

        profesional = await collection_estilista.find_one(
            {"profesional_id": ficha.get("profesional_id")}
        )

        sede = await collection_locales.find_one(
            {"sede_id": ficha.get("sede_id")}
        )

        ficha_norm["servicio_nombre"] = servicio.get("nombre") if servicio else None
        ficha_norm["profesional_nombre"] = profesional.get("nombre") if profesional else None
        ficha_norm["sede_nombre"] = sede.get("nombre") if sede else None

        resultado.append(ficha_norm)

    # -----------------------------------------
    # 4. Respuesta final
    # -----------------------------------------
    return {
        "success": True,
        "total": len(resultado),
        "fichas": resultado
    }



# ============================================================
# 📅 Obtener todas las citas del estilista autenticado
# ============================================================
@router.get("/citas/estilista", response_model=list)
async def get_citas_estilista(
    current_user: dict = Depends(get_current_user)
):
    if current_user["rol"] != "estilista":
        raise HTTPException(
            status_code=403,
            detail="Solo los estilistas pueden ver sus citas"
        )

    email = current_user["email"]

    estilista = await collection_estilista.find_one({"email": email})

    if not estilista:
        raise HTTPException(
            status_code=404,
            detail="No se encontró el profesional asociado a este usuario"
        )

    profesional_id = estilista.get("profesional_id")
    sede_id = estilista.get("sede_id")

    # ===========================================
    # FILTRO CORREGIDO
    # ===========================================
    citas = await collection_citas.find({
        "$or": [
            {"estilista_id": profesional_id},
            {"profesional_id": profesional_id}
        ]
    }).sort("fecha", 1).to_list(None)

    respuesta = []

    for c in citas:

        cliente = await collection_clients.find_one({"cliente_id": c.get("cliente_id")})
        cliente_data = {
            "cliente_id": c.get("cliente_id"),
            "nombre": cliente.get("nombre") if cliente else "Desconocido",
            "apellido": cliente.get("apellido") if cliente else "",
            "telefono": cliente.get("telefono") if cliente else "",
            "email": cliente.get("email") if cliente else "",
        }

        servicio = await collection_servicios.find_one({
            "$or": [
                {"servicio_id": c.get("servicio_id")},
                {"unique_id": c.get("servicio_id")}
            ]
        })
        servicio_data = {
            "servicio_id": c.get("servicio_id"),
            "nombre": servicio.get("nombre") if servicio else "Desconocido",
            "precio": servicio.get("precio") if servicio else None
        }

        sede = await collection_locales.find_one({"sede_id": c.get("sede_id")})
        sede_data = {
            "sede_id": c.get("sede_id"),
            "nombre": sede.get("nombre") if sede else "Sede desconocida"
        }

        respuesta.append({
            "cita_id": str(c.get("_id")),
            "cliente": cliente_data,
            "servicio": servicio_data,
            "sede": sede_data,
            "estilista_id": profesional_id,
            "fecha": c.get("fecha"),
            "hora_inicio": c.get("hora_inicio"),
            "hora_fin": c.get("hora_fin"),
            "estado": c.get("estado"),
            "comentario": c.get("comentario", None)
        })

    return respuesta


def parse_ficha(data: str = Form(...)):
    try:
        parsed = json.loads(data)
        return FichaCreate(**parsed)
    except Exception as e:
        print("Error parseando JSON de ficha:", e)
        raise HTTPException(422, "Formato inválido en 'data'. Debe ser JSON válido.")   

# ============================================================
# 📌 Crear ficha 
# ============================================================
@router.post("/create-ficha", response_model=dict)
async def crear_ficha(
    data: FichaCreate = Depends(parse_ficha),
    fotos_antes: Optional[List[UploadFile]] = File(None),
    fotos_despues: Optional[List[UploadFile]] = File(None),
    current_user: dict = Depends(get_current_user)
):

    print("📸 Fotos antes recibidas:", fotos_antes)
    print("📸 Fotos después recibidas:", fotos_despues)
    print("📝 Data recibida:", data.dict())

    # ------------------------------
    # VALIDAR
    # ------------------------------
    if current_user.get("rol") not in ["estilista", "admin_sede", "super_admin"]:
        raise HTTPException(403, "No autorizado")

    cliente = await collection_clients.find_one({"cliente_id": data.cliente_id})
    if not cliente:
        raise HTTPException(404, "Cliente no encontrado")

    servicio = await collection_servicios.find_one({
        "$or": [
            {"servicio_id": data.servicio_id},
            {"unique_id": data.servicio_id}
        ]
    })
    if not servicio:
        raise HTTPException(404, "Servicio no encontrado")

    profesional = await collection_estilista.find_one({
        "profesional_id": data.profesional_id
    })
    if not profesional:
        raise HTTPException(404, "Profesional no encontrado")

    sede = await collection_locales.find_one({"sede_id": data.sede_id})
    if not sede:
        raise HTTPException(404, "Sede no encontrada")

    # ------------------------------
    # SUBIR FOTOS
    # ------------------------------
    urls_antes = []
    if fotos_antes:
        for foto in fotos_antes:
            print("⬆️ Subiendo foto ANTES:", foto.filename)
            url = upload_to_s3(
                foto,
                f"companies/{sede.get('company_id','default')}/clients/{data.cliente_id}/fichas/{data.tipo_ficha}/antes"
            )
            urls_antes.append(url)

    urls_despues = []
    if fotos_despues:
        for foto in fotos_despues:
            print("⬆️ Subiendo foto DESPUÉS:", foto.filename)
            url = upload_to_s3(
                foto,
                f"companies/{sede.get('company_id','default')}/clients/{data.cliente_id}/fichas/{data.tipo_ficha}/despues"
            )
            urls_despues.append(url)

    # ------------------------------
    # FIX RESPUESTAS
    # ------------------------------
    respuestas_final = data.respuestas

    # si vienen dentro de datos_especificos
    if "respuestas" in data.datos_especificos:
        respuestas_final = data.datos_especificos.get("respuestas", [])

    # ------------------------------
    # OBJETO FINAL
    # ------------------------------
    ficha = {
        "_id": ObjectId(),
        "cliente_id": data.cliente_id,
        "sede_id": data.sede_id,
        "servicio_id": data.servicio_id,
        "servicio_nombre": data.servicio_nombre or servicio.get("nombre"),
        "profesional_id": data.profesional_id,
        "profesional_nombre": data.profesional_nombre or profesional.get("nombre"),
        "sede_nombre": sede.get("nombre"),

        "fecha_ficha": data.fecha_ficha or datetime.utcnow().isoformat(),
        "fecha_reserva": data.fecha_reserva,

        "email": data.email or cliente.get("email"),
        "nombre": data.nombre or cliente.get("nombre"),
        "apellido": data.apellido or cliente.get("apellido"),
        "cedula": data.cedula or cliente.get("cedula"),
        "telefono": data.telefono or cliente.get("telefono"),

        "precio": data.precio or servicio.get("precio", 0),
        "estado": data.estado,
        "estado_pago": data.estado_pago,

        "tipo_ficha": data.tipo_ficha,

        "datos_especificos": data.datos_especificos,
        "descripcion_servicio": data.descripcion_servicio,
        "respuestas": respuestas_final,

        "fotos": {
            "antes": urls_antes,
            "despues": urls_despues,
            "antes_urls": data.fotos_antes,
            "despues_urls": data.fotos_despues
        },

        "autorizacion_publicacion": data.autorizacion_publicacion,
        "comentario_interno": data.comentario_interno,

        "created_at": datetime.utcnow(),
        "created_by": current_user.get("email"),
        "user_id": current_user.get("user_id"),

        "procesado_imagenes": bool(urls_antes or urls_despues),
        "origen": "manual"
    }

    await collection_card.insert_one(ficha)

    ficha["_id"] = str(ficha["_id"])

    return {
        "success": True,
        "message": "Ficha creada exitosamente",
        "ficha": ficha
    }

def fix_mongo_id(doc):
    doc["_id"] = str(doc["_id"])
    return doc

# ============================================================
# 📅 Obtener todas las citas de la sede del admin autenticado
# ============================================================
@router.get("/citas-sede", response_model=dict)
async def get_citas_sede(current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["admin_sede", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Solo los administradores de sede pueden ver esta información"
        )

    sede_id = current_user.get("sede_id")
    if not sede_id:
        raise HTTPException(
            status_code=400,
            detail="El administrador no tiene asignada una sede"
        )

    citas = await collection_citas.find({"sede_id": sede_id}).to_list(None)

    # 🔥 Convertir todos los ObjectId a string
    citas = [fix_mongo_id(c) for c in citas]

    return {
        "total": len(citas),
        "sede_id": sede_id,
        "citas": citas
    }


# ============================================================
# 📦 Agregar productos a una cita - CON MÚLTIPLES MONEDAS
# ============================================================
@router.post("/cita/{cita_id}/agregar-productos", response_model=dict)
async def agregar_productos_a_cita(
    cita_id: str,
    productos: List[ProductoItem],
    current_user: dict = Depends(get_current_user)
):
    """
    Agrega productos a una cita usando el precio según la moneda de la sede.
    """
    # Solo admin sede o admin
    if current_user["rol"] not in ["admin_sede", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="No tienes permisos para agregar productos"
        )

    # Buscar cita
    cita = await collection_citas.find_one({"_id": ObjectId(cita_id)})
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    # ⭐ OBTENER MONEDA DE LA CITA (que viene de la sede)
    moneda_cita = cita.get("moneda")
    if not moneda_cita:
        raise HTTPException(
            status_code=400,
            detail="Esta cita no tiene moneda asignada. Contacta soporte."
        )

    # Productos actuales
    productos_actuales = cita.get("productos", [])

    # Procesar nuevos productos
    nuevos_productos = []
    total_productos = 0

    for p in productos:
        # ⭐ BUSCAR PRODUCTO EN BD
        producto_db = await collection_products.find_one({"id": p.producto_id})
        
        if not producto_db:
            raise HTTPException(
                status_code=404,
                detail=f"Producto con ID '{p.producto_id}' no encontrado"
            )
        
        # ⭐ OBTENER PRECIO EN LA MONEDA CORRECTA
        precios_producto = producto_db.get("precios", {})
        
        if moneda_cita not in precios_producto:
            raise HTTPException(
                status_code=400,
                detail=f"El producto '{producto_db.get('nombre')}' no tiene precio configurado en {moneda_cita}"
            )
        
        precio_unitario = precios_producto[moneda_cita]
        subtotal = p.cantidad * precio_unitario
        
        nuevos_productos.append({
            "producto_id": p.producto_id,
            "nombre": producto_db.get("nombre"),  # ⭐ Tomar nombre de BD
            "cantidad": p.cantidad,
            "precio_unitario": precio_unitario,  # ⭐ Precio en moneda correcta
            "subtotal": subtotal,
            "moneda": moneda_cita  # ⭐ Guardar moneda
        })
        total_productos += subtotal

    # Agregar productos a la cita
    productos_final = productos_actuales + nuevos_productos

    # Recalcular totales
    nuevo_total = cita.get("valor_total", 0) + total_productos
    abono_actual = cita.get("abono", 0)
    nuevo_saldo = nuevo_total - abono_actual

    # ⭐ RECALCULAR ESTADO DE PAGO
    if nuevo_saldo <= 0:
        nuevo_estado_pago = "pagado"
    elif abono_actual > 0:
        nuevo_estado_pago = "abonado"
    else:
        nuevo_estado_pago = "pendiente"

    # Actualizar cita
    await collection_citas.update_one(
        {"_id": ObjectId(cita_id)},
        {
            "$set": {
                "productos": productos_final,
                "valor_total": nuevo_total,
                "saldo_pendiente": nuevo_saldo,
                "estado_pago": nuevo_estado_pago  # ⭐ ACTUALIZAR ESTADO
            }
        }
    )

    # Obtener cita actualizada
    cita_actualizada = await collection_citas.find_one({"_id": ObjectId(cita_id)})
    cita_actualizada["_id"] = str(cita_actualizada["_id"])

    return {
        "success": True,
        "message": "Productos agregados correctamente",
        "productos_agregados": len(nuevos_productos),
        "total_productos": total_productos,
        "moneda": moneda_cita,
        "cita": cita_actualizada
    }

# ============================================================
# 🧾 Facturar cita y calcular comisiones
# ============================================================
@router.post("/quotes/facturar/{cita_id}")
async def facturar_cita(
    cita_id: str,
    current_user: dict = Depends(get_current_user)
):
    print(f"🔍 Facturar cita invocada por {current_user.get('email')} (rol={current_user.get('rol')})")
    print(f"📋 Cita ID: {cita_id}")

    # Solo admin sede / superadmin
    if current_user["rol"] not in ["admin_sede", "superadmin"]:
        print("❌ Usuario no autorizado para facturar")
        raise HTTPException(status_code=403, detail="No autorizado para facturar")

    # Buscar cita
    cita = await collection_citas.find_one({"_id": ObjectId(cita_id)})
    if not cita:
        print("❌ Cita no encontrada")
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    print(f"📄 Cita encontrada: {cita}")

    if cita["estado_pago"] == "pagado":
        print("⚠️ La cita ya está pagada")
        raise HTTPException(status_code=400, detail="La cita ya está pagada")

    servicio = await collection_servicios.find_one({
        "servicio_id": cita["servicio_id"]
    })

    if not servicio:
        print("❌ Servicio no encontrado")
        raise HTTPException(status_code=404, detail="Servicio no encontrado")


    print(f"🛠 Servicio encontrado: {servicio}")

    # porcentaje de comisión (ej: 30)
    comision_porcentaje = servicio.get("comision_estilista", 0)
    print(f"📊 Porcentaje de comisión: {comision_porcentaje}%")

    # calcular comisión
    valor_servicio = cita["valor_total"]
    valor_comision = (valor_servicio * comision_porcentaje) / 100
    print(f"💰 Valor del servicio: {valor_servicio}, Valor de la comisión: {valor_comision}")

    # 1️⃣ ACTUALIZAR CITA
    await collection_citas.update_one(
        {"_id": ObjectId(cita_id)},
        {
            "$set": {
                "estado": "completada",
                "estado_pago": "pagado",
                "saldo_pendiente": 0
            }
        }
    )
    print("✅ Cita actualizada a estado 'completada' y 'pagado'")

    # 2️⃣ ACUMULAR COMISIONES DEL ESTILISTA
    profesional_id = cita["profesional_id"]
    print(f"👤 Profesional ID: {profesional_id}")

    comision_document = await collection_commissions.find_one({"profesional_id": profesional_id})
    print(f"📂 Documento de comisión encontrado: {comision_document}")

    servicio_comision = {
        "servicio_id": cita["servicio_id"],
        "servicio_nombre": cita["servicio_nombre"],
        "valor_servicio": valor_servicio,
        "porcentaje": comision_porcentaje,
        "valor_comision": valor_comision,
        "fecha": cita["fecha"]
    }

    if comision_document:
        # Ya existe → incrementar
        await collection_commissions.update_one(
            {"profesional_id": profesional_id},
            {
                "$inc": {
                    "total_servicios": 1,
                    "total_comisiones": valor_comision
                },
                "$push": {
                    "servicios_detalle": servicio_comision
                }
            }
        )
        comision_msg = "Comisión actualizada"
        print("🔄 Comisión actualizada en el documento existente")
    else:
        # No existe → crear registro nuevo
        nuevo_doc = {
            "profesional_id": profesional_id,
            "profesional_nombre": cita["profesional_nombre"],
            "sede_id": cita["sede_id"],
            "total_servicios": 1,
            "total_comisiones": valor_comision,
            "servicios_detalle": [servicio_comision],
            "creado_en": datetime.now()
        }
        await collection_commissions.insert_one(nuevo_doc)
        comision_msg = "Comisión creada"
        print("🆕 Nuevo documento de comisión creado")

    return {
        "message": "Cita facturada correctamente",
        "estado_cita": "actualizado",
        "comision": comision_msg,
        "valor_comision_generada": valor_comision
    }


# ============================================
# ✅ Finalizar servicio
# ============================================
@router.put("/citas/{cita_id}/finalizar", response_model=dict)
async def finalizar_servicio(
    cita_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Finaliza un servicio (NO factura, NO crea comisión).
    Solo cambia el estado a 'finalizado'.
    """

    # Verificar rol
    if current_user["rol"] not in ["admin_sede", "estilista"]:
        raise HTTPException(
            status_code=403,
            detail="No tienes permisos para finalizar servicios"
        )

    # Verificar que la cita exista
    cita = await collection_citas.find_one({"_id": cita_id})
    if not cita:
        raise HTTPException(
            status_code=404,
            detail="La cita no existe"
        )

    # No permitir finalizar si ya está finalizado
    if cita.get("estado") == "finalizado":
        raise HTTPException(
            status_code=400,
            detail="Esta cita ya fue finalizada"
        )

    # Actualización
    update_data = {
        "estado": "finalizado",
        "fecha_finalizacion": datetime.utcnow(),
        "finalizado_por": current_user.get("email"),
    }

    await collection_citas.update_one(
        {"_id": cita_id},
        {"$set": update_data}
    )

    return {
        "success": True,
        "message": "Servicio finalizado correctamente",
        "cita_id": cita_id,
        "estado": "finalizado"
    }

# ============================================================= 
# 📦 Obtener lista de productos activos
# =============================================================
@router.get("/products", response_model=dict)
async def obtener_productos():
    productos = await collection_products.find({"activo": True}).to_list(None)

    lista = []
    for p in productos:
        # Normalizar valores que vienen como string
        try:
            precio = float(p.get("precio", 0))
        except:
            precio = 0
        
        try:
            stock = int(p.get("stock", 0))
        except:
            stock = 0

        # Construcción del producto final con el FORMATO EXACTO
        item = {
            "id": p.get("id"),
            "nombre": p.get("nombre", ""),
            # Si quieres eliminar prefijo "SPECIAL " o "LINEA MEN ", usa esto:
            # "nombre": p.get("nombre", "").replace("SPECIAL ", "").replace("LINEA MEN ", ""),
            "categoria": p.get("categoria", ""),
            "descripcion": p.get("descripcion", ""),
            "imagen": p.get("imagen", ""),
            "activo": p.get("activo", True),
            "tipo_codigo": p.get("tipo_codigo", ""),
            "descuento": float(p.get("descuento", 0) or 0),
            "stock": stock,
            "precio": precio,
            "tipo_precio": "sin_iva_internacional"
        }
        lista.append(item)

    return {"productos": lista}


