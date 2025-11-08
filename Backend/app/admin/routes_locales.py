from fastapi import APIRouter, HTTPException, Depends, status
from bson import ObjectId

from app.admin.models import Local
from app.database.mongo import collection_locales  # ➜ asegúrate que esta colección exista
from app.auth.routes import get_current_user

router = APIRouter(prefix="/admin/locales", tags=["Admin - Locales"])


# ================================================
# Helper: Convertir ObjectId a string
# ================================================
def local_to_dict(local):
    local["_id"] = str(local["_id"])
    return local


# ================================================
# ✅ Crear Local (Sede)
# ================================================
@router.post("/", response_model=dict)
async def crear_local(
    local: Local,
    current_user: dict = Depends(get_current_user)
):
    if current_user["rol"] not in ["super_admin", "admin_franquicia"]:
        raise HTTPException(status_code=403, detail="No autorizado para crear sedes")

    data = local.dict()
    data["creado_por"] = current_user["email"]

    result = await collection_locales.insert_one(data)
    
    return {
        "msg": "Local creado exitosamente",
        "local_id": str(result.inserted_id)
    }


# ================================================
# 📌 Listar Locales
# ================================================
@router.get("/", response_model=list)
async def listar_locales(
    current_user: dict = Depends(get_current_user)
):
    # Admin sede solo ve su sede
    if current_user["rol"] == "admin_sede":
        sedes = await collection_locales.find({"_id": ObjectId(current_user["sede_id"])}).to_list(None)
    else:
        sedes = await collection_locales.find().to_list(None)

    return [local_to_dict(s) for s in sedes]


# ================================================
# 🔍 Obtener Local por ID
# ================================================
@router.get("/{local_id}", response_model=dict)
async def obtener_local(local_id: str, current_user: dict = Depends(get_current_user)):

    sede = await collection_locales.find_one({"_id": ObjectId(local_id)})
    if not sede:
        raise HTTPException(status_code=404, detail="Local no encontrado")

    return local_to_dict(sede)


# ================================================
# ✏️ Actualizar Local
# ================================================
@router.put("/{local_id}", response_model=dict)
async def actualizar_local(
    local_id: str,
    data: Local,
    current_user: dict = Depends(get_current_user)
):
    if current_user["rol"] not in ["super_admin", "admin_franquicia"]:
        raise HTTPException(status_code=403, detail="No autorizado para editar sedes")

    update_data = {k: v for k, v in data.dict().items() if v is not None}

    result = await collection_locales.update_one(
        {"_id": ObjectId(local_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Local no encontrado")

    return {"msg": "Local actualizado correctamente"}


# ================================================
# ❌ Eliminar Local
# ================================================
@router.delete("/{local_id}", response_model=dict)
async def eliminar_local(local_id: str, current_user: dict = Depends(get_current_user)):

    if current_user["rol"] != "super_admin":
        raise HTTPException(status_code=403, detail="Solo super_admin puede eliminar sedes")

    result = await collection_locales.delete_one({"_id": ObjectId(local_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Local no encontrado")

    return {"msg": "Local eliminado correctamente"}
