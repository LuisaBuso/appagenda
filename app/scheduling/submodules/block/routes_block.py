from fastapi import APIRouter, HTTPException, Depends, status
from app.scheduling.models import Bloqueo
from app.database.mongo import collection_block
from app.auth.routes import get_current_user
from datetime import datetime
from typing import List
from bson import ObjectId

router = APIRouter()


# =========================================================
# 🧩 Helper para convertir ObjectId a string
# =========================================================
def bloqueo_to_dict(b):
    b["_id"] = str(b["_id"])
    return b


# =========================================================
# 🔹 Crear bloqueo (solo admin_sede, admin_franquicia o estilista)
# =========================================================
@router.post("/", response_model=dict)
async def crear_bloqueo(
    bloqueo: Bloqueo,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]

    if rol not in ["admin_sede", "admin_franquicia", "super_admin", "estilista"]:
        raise HTTPException(status_code=403, detail="No autorizado para crear bloqueos")

    # Validar solapamiento con otros bloqueos
    existing = await collection_block.find_one({
        "estilista_id": bloqueo.estilista_id,
        "fecha": bloqueo.fecha,
        "hora_inicio": {"$lte": bloqueo.hora_fin},
        "hora_fin": {"$gte": bloqueo.hora_inicio}
    })

    if existing:
        raise HTTPException(status_code=400, detail="El horario se cruza con otro bloqueo existente")

    data = bloqueo.dict()
    data["creado_por"] = current_user["email"]
    data["fecha_creacion"] = datetime.now().strftime("%Y-%m-%d %H:%M")

    result = await collection_block.insert_one(data)
    data["_id"] = str(result.inserted_id)
    return {"msg": "Bloqueo creado exitosamente", "bloqueo": data}


# =========================================================
# 🔹 Listar bloqueos de un estilista
# =========================================================
@router.get("/estilista/{estilista_id}", response_model=List[dict])
async def listar_bloqueos_estilista(
    estilista_id: str,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]

    # El estilista solo puede ver sus propios bloqueos
    if rol == "estilista" and current_user["email"] != estilista_id:
        raise HTTPException(status_code=403, detail="No autorizado para ver otros bloqueos")

    bloqueos = await collection_block.find({"estilista_id": estilista_id}).to_list(None)
    return [bloqueo_to_dict(b) for b in bloqueos]


# =========================================================
# 🔹 Eliminar bloqueo (solo admin_sede, admin_franquicia o super_admin)
# =========================================================
@router.delete("/{bloqueo_id}", response_model=dict)
async def eliminar_bloqueo(
    bloqueo_id: str,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]

    if rol not in ["admin_sede", "admin_franquicia", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para eliminar bloqueos")

    result = await collection_block.delete_one({"_id": ObjectId(bloqueo_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bloqueo no encontrado")

    return {"msg": "Bloqueo eliminado correctamente"}
