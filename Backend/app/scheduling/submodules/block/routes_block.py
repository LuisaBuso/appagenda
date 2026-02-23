from fastapi import APIRouter, HTTPException, Depends, status
from app.scheduling.models import Bloqueo
from app.database.mongo import collection_block
from app.auth.routes import get_current_user
from datetime import datetime, time
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
# 🔹 Crear bloqueo (admin_sede, admin_franquicia, super_admin, estilista)
# =========================================================
@router.post("/", response_model=dict)
async def crear_bloqueo(
    bloqueo: Bloqueo,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]

    if rol not in ["admin_sede", "admin_franquicia", "super_admin", "estilista"]:
        raise HTTPException(status_code=403, detail="No autorizado para crear bloqueos")

    # Convertir `fecha` de date → datetime (Mongo solo acepta datetime)
    fecha_dt = datetime.combine(bloqueo.fecha, time.min)

    # Validar solapamientos
    existing = await collection_block.find_one({
        "profesional_id": bloqueo.profesional_id,
        "fecha": fecha_dt,
        "hora_inicio": {"$lte": bloqueo.hora_fin},
        "hora_fin": {"$gte": bloqueo.hora_inicio}
    })

    if existing:
        raise HTTPException(status_code=400, detail="El horario se cruza con otro bloqueo existente")

    # Preparar data para guardar
    data = bloqueo.dict()
    data["fecha"] = fecha_dt  # Guardar fecha como datetime correcto
    data["creado_por"] = current_user["email"]
    data["fecha_creacion"] = datetime.now()

    result = await collection_block.insert_one(data)
    data["_id"] = str(result.inserted_id)

    return {"msg": "Bloqueo creado exitosamente", "bloqueo": data}


# =========================================================
# 🔹 Listar bloqueos de un profesional
# =========================================================
@router.get("/{profesional_id}", response_model=List[dict])
async def listar_bloqueos_profesional(
    profesional_id: str,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]

    # 🔐 El estilista solo puede ver sus propios bloqueos
    if rol == "estilista" and current_user["profesional_id"] != profesional_id:
        raise HTTPException(status_code=403, detail="No autorizado para ver otros bloqueos")

    # 🔎 Obtener bloqueos por profesional_id
    bloqueos = await collection_block.find({
        "profesional_id": profesional_id
    }).to_list(None)

    return [bloqueo_to_dict(b) for b in bloqueos]


# =========================================================
# 🔹 Eliminar bloqueo
# =========================================================
@router.delete("/{bloqueo_id}", response_model=dict)
async def eliminar_bloqueo(
    bloqueo_id: str,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]

    # 🔎 Buscar el bloqueo primero
    bloqueo = await collection_block.find_one({"_id": ObjectId(bloqueo_id)})

    if not bloqueo:
        raise HTTPException(status_code=404, detail="Bloqueo no encontrado")

    # =====================================================
    # 🔐 1. SUPER ADMIN → puede eliminar cualquier bloqueo
    # =====================================================
    if rol == "super_admin":
        pass  # permitido

    # =====================================================
    # 🔐 2. ADMIN SEDE → solo bloqueos de su misma sede
    # =====================================================
    elif rol == "admin_sede":
        if bloqueo.get("sede_id") != current_user.get("sede_id"):
            raise HTTPException(status_code=403, detail="No autorizado para eliminar este bloqueo")

    # =====================================================
    # 🔐 3. ESTILISTA → solo sus propios bloqueos
    # =====================================================
    elif rol == "estilista":
        if bloqueo.get("profesional_id") != current_user.get("profesional_id"):
            raise HTTPException(status_code=403, detail="No autorizado para eliminar este bloqueo")

    # =====================================================
    # ❌ Otros roles no permitidos
    # =====================================================
    else:
        raise HTTPException(status_code=403, detail="No autorizado para eliminar bloqueos")

    # =====================================================
    # 🗑️  Eliminar bloqueo
    # =====================================================
    result = await collection_block.delete_one({"_id": ObjectId(bloqueo_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bloqueo no encontrado")

    return {"msg": "Bloqueo eliminado correctamente"}

