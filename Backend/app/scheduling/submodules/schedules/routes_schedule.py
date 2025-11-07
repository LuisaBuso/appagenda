from fastapi import APIRouter, HTTPException, Depends, status
from app.scheduling.models import Horario
from app.database.mongo import collection_horarios
from app.auth.routes import get_current_user
from datetime import datetime
from typing import List
from bson import ObjectId

router = APIRouter()


# =========================================================
# 🧩 Helper para convertir ObjectId a string
# =========================================================
def horario_to_dict(h):
    h["_id"] = str(h["_id"])
    return h


# =========================================================
# 🔹 Crear un horario (usa el modelo Horario)
# =========================================================
@router.post("/", response_model=dict)
async def crear_horario(
    horario: Horario,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]

    if rol not in ["admin_sede", "admin_franquicia", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para crear horarios")

    # Validar duplicado
    existing = await collection_horarios.find_one({
        "estilista_id": horario.estilista_id,
        "dia_semana": horario.dia_semana
    })
    if existing:
        raise HTTPException(status_code=400, detail="El estilista ya tiene un horario ese día")

    data = horario.dict()
    data["creado_por"] = current_user["email"]
    data["fecha_creacion"] = datetime.now().strftime("%Y-%m-%d %H:%M")

    result = await collection_horarios.insert_one(data)
    data["_id"] = str(result.inserted_id)
    return {"msg": "Horario creado exitosamente", "horario": data}


# =========================================================
# 🔹 Listar horarios de un estilista
# =========================================================
@router.get("/stylist/{estilista_id}", response_model=List[Horario])
async def listar_horarios_estilista(
    estilista_id: str,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]

    # El estilista solo puede ver los suyos
    if rol == "estilista" and current_user["email"] != estilista_id:
        raise HTTPException(status_code=403, detail="No autorizado para ver otros horarios")

    horarios = await collection_horarios.find({"estilista_id": estilista_id}).to_list(None)
    return [Horario(**h) for h in horarios]


# =========================================================
# 🔹 Editar horario
# =========================================================
@router.put("/{horario_id}", response_model=dict)
async def actualizar_horario(
    horario_id: str,
    horario_data: Horario,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]
    if rol not in ["admin_sede", "admin_franquicia", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para editar horarios")

    update_data = {k: v for k, v in horario_data.dict().items() if v is not None}

    result = await collection_horarios.update_one(
        {"_id": ObjectId(horario_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Horario no encontrado")

    return {"msg": "Horario actualizado correctamente"}


# =========================================================
# 🔹 Eliminar horario
# =========================================================
@router.delete("/{horario_id}", response_model=dict)
async def eliminar_horario(
    horario_id: str,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]
    if rol not in ["admin_sede", "admin_franquicia", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para eliminar horarios")

    result = await collection_horarios.delete_one({"_id": ObjectId(horario_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Horario no encontrado")

    return {"msg": "Horario eliminado correctamente"}
