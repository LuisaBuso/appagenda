from fastapi import APIRouter, HTTPException, Depends
from app.scheduling.models import Cita
from app.database.mongo import collection_citas, collection_horarios, collection_block
from app.auth.routes import get_current_user
from datetime import datetime
from typing import List
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
@router.get("/", response_model=List[dict])
async def listar_citas(
    sede_id: str = None,
    estilista_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]
    query = {}

    if rol == "estilista":
        query["estilista_id"] = current_user["email"]
    elif rol in ["admin_sede", "admin_franquicia", "super_admin"]:
        if sede_id:
            query["sede_id"] = sede_id
        if estilista_id:
            query["estilista_id"] = estilista_id
    else:
        raise HTTPException(status_code=403, detail="No autorizado para ver citas")

    citas = await collection_citas.find(query).to_list(None)
    return [cita_to_dict(c) for c in citas]


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

    # ✅ Validar que la cita esté dentro del horario laboral del estilista
    dia_semana = cita.fecha.strftime("%A").capitalize()  # Ej: Lunes, Martes, etc.
    print(f"🔍 Día de la semana: {dia_semana}")
    horario = await collection_horarios.find_one({
        "estilista_id": cita.estilista_id,
        "dia_semana": dia_semana
    })
    print(f"🔍 Horario encontrado: {horario}")

    if not horario:
        raise HTTPException(status_code=400, detail="El estilista no tiene horario asignado para ese día")

    hora_inicio_horario = datetime.strptime(horario["hora_inicio"], "%H:%M").time()
    hora_fin_horario = datetime.strptime(horario["hora_fin"], "%H:%M").time()
    print(f"🔍 Horario laboral: {hora_inicio_horario} - {hora_fin_horario}")

    if not (hora_inicio_horario <= cita.hora_inicio <= hora_fin_horario and
            hora_inicio_horario <= cita.hora_fin <= hora_fin_horario):
        raise HTTPException(status_code=400, detail="La cita está fuera del horario laboral del estilista")

    # ✅ Validar que la cita no se solape con otra cita del mismo estilista
    solape = await collection_citas.find_one({
        "estilista_id": cita.estilista_id,
        "fecha": cita.fecha,
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
        "fecha": cita.fecha,
        "hora_inicio": {"$lt": cita.hora_fin},
        "hora_fin": {"$gt": cita.hora_inicio}
    })
    print(f"🔍 Bloqueo encontrado: {bloqueo}")
    if bloqueo:
        raise HTTPException(status_code=400, detail="El horario está bloqueado por el estilista")

    # Crear cita
    data = cita.dict()
    data["creada_por"] = current_user["email"]
    data["fecha_creacion"] = datetime.now().strftime("%Y-%m-%d %H:%M")
    print(f"🔍 Datos de la cita a insertar: {data}")

    result = await collection_citas.insert_one(data)
    data["_id"] = str(result.inserted_id)
    print(f"🟢 Cita creada con ID: {data['_id']}")

    # (Opcional) emitir evento cita.created
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
