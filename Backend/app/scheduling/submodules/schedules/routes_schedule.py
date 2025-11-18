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
# 🕓 Crear horario base (lunes a domingo) con unique_id
# =========================================================
@router.post("/", response_model=dict)
async def crear_horario(
    horario: Horario,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]

    if rol not in ["admin_sede", "admin_franquicia", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para crear horarios")

    # 🔍 Verificar si el estilista ya tiene un horario
    existing = await collection_horarios.find_one({
        "estilista_id": horario.estilista_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="El estilista ya tiene un horario base registrado")

    # 🧮 Generar unique_id incremental tipo H001, H002...
    last_horario = await collection_horarios.find_one(
        sort=[("unique_id", -1)]
    )
    if not last_horario or "unique_id" not in last_horario:
        unique_id = "H001"
    else:
        try:
            last_num = int(last_horario["unique_id"][1:])
            unique_id = f"H{str(last_num + 1).zfill(3)}"
        except Exception:
            unique_id = "H001"

    # 🧱 Preparar datos
    data = horario.dict()
    data["unique_id"] = unique_id
    data["creado_por"] = current_user["email"]
    data["fecha_creacion"] = datetime.now().strftime("%Y-%m-%d %H:%M")

    # 💾 Guardar en MongoDB
    result = await collection_horarios.insert_one(data)
    data["_id"] = str(result.inserted_id)

    return {
        "msg": f"✅ Horario base creado exitosamente con ID {unique_id}",
        "unique_id": unique_id,
        "horario": data
    }
    

# =========================================================
# 📋 Listar horarios de un estilista
# =========================================================
@router.get("/stylist/{estilista_id}", response_model=dict)
async def listar_horarios_estilista(
    estilista_id: str,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]

    # El estilista solo puede ver su propio horario
    if rol == "estilista" and current_user["email"] != estilista_id:
        raise HTTPException(status_code=403, detail="No autorizado para ver otros horarios")

    horario = await collection_horarios.find_one({"estilista_id": estilista_id})
    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")

    return horario_to_dict(horario)


# =========================================================
# ✏️ Editar horario completo o su disponibilidad
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

    return {"msg": "✅ Horario actualizado correctamente"}


# =========================================================
# ❌ Eliminar horario base
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

    return {"msg": "🗑️ Horario eliminado correctamente"}
