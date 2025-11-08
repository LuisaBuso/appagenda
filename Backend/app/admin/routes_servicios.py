from fastapi import APIRouter, HTTPException, Depends, status
from bson import ObjectId

from app.admin.models import ServicioAdmin
from app.auth.routes import get_current_user
from app.database.mongo import collection_servicios  # Asegúrate de agregar esta colección


router = APIRouter(prefix="/admin/servicios", tags=["Admin - Servicios"])


# ===================================================
# Helper: convertir ObjectId a string
# ===================================================
def servicio_to_dict(s):
    s["_id"] = str(s["_id"])
    return s


# ===================================================
# ✅ Crear servicio
# ===================================================
@router.post("/", response_model=dict)
async def crear_servicio(
    servicio: ServicioAdmin,
    current_user: dict = Depends(get_current_user)
):
    if current_user["rol"] not in ["super_admin", "admin_franquicia", "admin_sede"]:
        raise HTTPException(status_code=403, detail="No autorizado para crear servicios")

    data = servicio.dict()
    data["creado_por"] = current_user["email"]

    result = await collection_servicios.insert_one(data)

    return {
        "msg": "Servicio creado exitosamente",
        "servicio_id": str(result.inserted_id)
    }


# ===================================================
# 📌 Listar servicios
# ===================================================
@router.get("/", response_model=list)
async def listar_servicios(
    current_user: dict = Depends(get_current_user)
):
    servicios = await collection_servicios.find().to_list(None)
    return [servicio_to_dict(s) for s in servicios]


# ===================================================
# 🔍 Obtener servicio por ID
# ===================================================
@router.get("/{servicio_id}", response_model=dict)
async def obtener_servicio(
    servicio_id: str,
    current_user: dict = Depends(get_current_user)
):
    servicio = await collection_servicios.find_one({"_id": ObjectId(servicio_id)})

    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    return servicio_to_dict(servicio)


# ===================================================
# ✏️ Actualizar servicio
# ===================================================
@router.put("/{servicio_id}", response_model=dict)
async def actualizar_servicio(
    servicio_id: str,
    servicio_data: ServicioAdmin,
    current_user: dict = Depends(get_current_user)
):
    if current_user["rol"] not in ["super_admin", "admin_franquicia", "admin_sede"]:
        raise HTTPException(status_code=403, detail="No autorizado para editar servicios")

    update_data = {k: v for k, v in servicio_data.dict().items() if v is not None}

    result = await collection_servicios.update_one(
        {"_id": ObjectId(servicio_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    return {"msg": "Servicio actualizado correctamente"}


# ===================================================
# ❌ Eliminar servicio
# ===================================================
@router.delete("/{servicio_id}", response_model=dict)
async def eliminar_servicio(
    servicio_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user["rol"] not in ["super_admin", "admin_franquicia"]:
        raise HTTPException(status_code=403, detail="No autorizado para eliminar servicios")

    result = await collection_servicios.delete_one({"_id": ObjectId(servicio_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    return {"msg": "Servicio eliminado correctamente"}
