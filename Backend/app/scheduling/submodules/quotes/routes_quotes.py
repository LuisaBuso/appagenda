from fastapi import APIRouter, HTTPException, Depends, Query
from app.scheduling.models import Cita
from app.database.mongo import collection_citas, collection_horarios, collection_block, collection_servicios
from app.auth.routes import get_current_user
from datetime import datetime, time
from typing import List, Optional
from bson import ObjectId

router = APIRouter(prefix="/citas")


# =========================================================
# 🧩 Helper para formatear ObjectId
# =========================================================
def cita_to_dict(c):
    c["_id"] = str(c["_id"])
    return c


# =========================================================
# 🔹 Obtener todas las citas (por sede o estilista)
# =========================================================
@router.get("/", response_model=dict)
async def obtener_citas(
    sede_id: Optional[str] = Query(None),
    estilista_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]
    print(f"👤 Usuario: {current_user['email']} ({rol})")

    # 🔍 Construir filtro dinámico
    filtro = {}
    if sede_id:
        filtro["sede_id"] = sede_id
    if estilista_id:
        filtro["estilista_id"] = estilista_id

    print(f"📊 Filtros recibidos: {filtro}")

    # ✅ Buscar citas
    citas_cursor = collection_citas.find(filtro).sort("fecha", 1)
    citas = await citas_cursor.to_list(length=None)

    # ✅ Procesar cada cita
    for cita in citas:
        cita["_id"] = str(cita["_id"])

        # Asegurar formato de fecha
        if isinstance(cita.get("fecha"), datetime):
            cita["fecha"] = cita["fecha"].strftime("%Y-%m-%d")

        servicio_id = cita.get("servicio_id")
        if servicio_id:
            # Buscar servicio por ObjectId o por unique_id
            filtro_servicio = {
                "$or": []
            }

            if ObjectId.is_valid(servicio_id):
                filtro_servicio["$or"].append({"_id": ObjectId(servicio_id)})
            filtro_servicio["$or"].append({"unique_id": servicio_id})

            servicio = await collection_servicios.find_one(filtro_servicio)

            if servicio:
                cita["servicio"] = {
                    "nombre": servicio.get("nombre"),
                    "duracion_minutos": servicio.get("duracion_minutos"),
                    "precio": servicio.get("precio"),
                    "comision_estilista": servicio.get("comision_estilista"),
                    "categoria": servicio.get("categoria"),
                    "requiere_producto": servicio.get("requiere_producto")
                }
            else:
                cita["servicio"] = {"nombre": "Desconocido"}

    print(f"📅 Total de citas encontradas: {len(citas)}")

    return {"citas": citas}

# =========================================================
# 🔹 Crear cita (usuario o admin_sede)
# =========================================================
@router.post("/", response_model=dict)
async def crear_cita(
    cita: Cita,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]
    print(f"🔍 Rol del usuario: {rol}")

    if rol not in ["usuario", "admin_sede", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para crear citas")

    # ✅ Convertir fecha a string ISO (YYYY-MM-DD)
    fecha_str = cita.fecha.strftime("%Y-%m-%d")
    print("📩 Datos recibidos:", cita.dict())
    print(f"📅 Fecha convertida a string: {fecha_str} (tipo: {type(fecha_str)})")

    # ✅ Determinar día numérico (1=lunes ... 7=domingo)
    dia_semana_num = cita.fecha.isoweekday()
    print(f"🔍 Día numérico del horario: {dia_semana_num}")

    # ✅ Buscar horario del estilista
    horario = await collection_horarios.find_one({
        "estilista_id": cita.estilista_id,
        "disponibilidad": {
            "$elemMatch": {
                "dia_semana": dia_semana_num,
                "activo": True
            }
        }
    })
    print(f"🔍 Horario encontrado: {horario}")

    if not horario:
        raise HTTPException(status_code=400, detail="El estilista no tiene horario asignado para ese día")

    # ✅ Extraer disponibilidad del día
    dia_info = next((d for d in horario["disponibilidad"] if d["dia_semana"] == dia_semana_num), None)
    if not dia_info:
        raise HTTPException(status_code=400, detail="El estilista no trabaja este día")

    hora_inicio_horario = datetime.strptime(dia_info["hora_inicio"], "%H:%M").time()
    hora_fin_horario = datetime.strptime(dia_info["hora_fin"], "%H:%M").time()

    print(f"🔍 Horario laboral del día {dia_semana_num}: {hora_inicio_horario} - {hora_fin_horario}")

    # ✅ Validar que la cita esté dentro del horario laboral
    cita_inicio = time.fromisoformat(cita.hora_inicio)
    cita_fin = time.fromisoformat(cita.hora_fin)

    if not (hora_inicio_horario <= cita_inicio <= hora_fin_horario and
            hora_inicio_horario <= cita_fin <= hora_fin_horario):
        raise HTTPException(status_code=400, detail="La cita está fuera del horario laboral del estilista")

    # ✅ Validar que no se solape con otra cita
    solape = await collection_citas.find_one({
        "estilista_id": cita.estilista_id,
        "fecha": fecha_str,  # 🔥 ahora string, no datetime.date
        "hora_inicio": {"$lt": cita.hora_fin},
        "hora_fin": {"$gt": cita.hora_inicio},
        "estado": {"$ne": "cancelada"}
    })
    print(f"🔍 Solape encontrado: {solape}")
    if solape:
        raise HTTPException(status_code=400, detail="El estilista ya tiene una cita en ese horario")

    # ✅ Validar bloqueos del estilista
    bloqueo = await collection_block.find_one({
        "estilista_id": cita.estilista_id,
        "fecha": fecha_str,  # 🔥 igual aquí
        "hora_inicio": {"$lt": cita.hora_fin},
        "hora_fin": {"$gt": cita.hora_inicio}
    })
    print(f"🔍 Bloqueo encontrado: {bloqueo}")
    if bloqueo:
        raise HTTPException(status_code=400, detail="El horario está bloqueado por el estilista")

    # ✅ Crear cita
    data = cita.dict()
    data["fecha"] = fecha_str  # 🔥 Guardar como string ISO
    data["creada_por"] = current_user["email"]
    data["fecha_creacion"] = datetime.now().strftime("%Y-%m-%d %H:%M")

    result = await collection_citas.insert_one(data)
    data["_id"] = str(result.inserted_id)

    print(f"🟢 Cita creada con ID: {data['_id']}")
    print(f"🟢 EVENTO: cita.created -> {data['_id']}")

    return {"msg": "Cita creada exitosamente", "cita": data}

# =========================================================
# 🔹 Editar cita (solo admin_sede o super_admin)
# =========================================================
@router.put("/{cita_id}", response_model=dict)
async def editar_cita(
    cita_id: str,
    cita_data: Cita,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]
    if rol not in ["admin_sede", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para editar citas")

    update_data = {k: v for k, v in cita_data.dict().items() if v is not None}

    result = await collection_citas.update_one(
        {"_id": ObjectId(cita_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    return {"msg": "Cita actualizada correctamente"}


# =========================================================
# 🔹 Cancelar cita (usuario o admin_sede)
# =========================================================
@router.patch("/{cita_id}/cancelar", response_model=dict)
async def cancelar_cita(
    cita_id: str,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]

    if rol not in ["usuario", "admin_sede", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para cancelar citas")

    cita = await collection_citas.find_one({"_id": ObjectId(cita_id)})
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    if cita["estado"] == "cancelada":
        raise HTTPException(status_code=400, detail="La cita ya está cancelada")

    await collection_citas.update_one(
        {"_id": ObjectId(cita_id)},
        {"$set": {
            "estado": "cancelada",
            "fecha_cancelacion": datetime.now().strftime("%Y-%m-%d %H:%M")
        }}
    )

    # (Opcional) emitir evento cita.cancelled
    print(f"🔴 EVENTO: cita.cancelled -> {cita_id}")

    return {"msg": "Cita cancelada correctamente"}


# =========================================================
# 🔹 Cambiar estado de cita (solo admin_sede o super_admin)
# =========================================================
@router.patch("/{cita_id}/estado", response_model=dict)
async def cambiar_estado_cita(
    cita_id: str,
    nuevo_estado: str,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]

    if rol not in ["admin_sede", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para cambiar el estado de citas")

    if nuevo_estado not in ["pendiente", "confirmada", "asistida", "cancelada"]:
        raise HTTPException(status_code=400, detail="Estado inválido")

    cita = await collection_citas.find_one({"_id": ObjectId(cita_id)})
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    await collection_citas.update_one(
        {"_id": ObjectId(cita_id)},
        {"$set": {"estado": nuevo_estado}}
    )

    # (Opcional) emitir evento cita.completed
    if nuevo_estado == "asistida":
        print(f"✅ EVENTO: cita.completed -> {cita_id}")

    return {"msg": f"Estado de cita actualizado a '{nuevo_estado}'"}
