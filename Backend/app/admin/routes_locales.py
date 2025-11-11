from fastapi import APIRouter, HTTPException, Depends
from app.admin.models import Local
from app.database.mongo import collection_locales
from app.auth.routes import get_current_user

router = APIRouter(prefix="/admin/locales", tags=["Admin - Locales"])


# ================================================
# Helper: Convertir ObjectId a string y formatear
# ================================================
def local_to_dict(local):
    local["_id"] = str(local["_id"])
    return local


# ================================================
# Helper: Generar ID incremental tipo 001, 002, ...
# ================================================
async def generar_id_unico():
    # Buscamos el último local según el campo id_unico
    ultimo_local = await collection_locales.find_one(
        sort=[("id_unico", -1)]
    )
    if not ultimo_local:
        return "001"
    
    ultimo_id = int(ultimo_local["id_unico"])
    nuevo_id = str(ultimo_id + 1).zfill(3)
    return nuevo_id


# ================================================
# ✅ Crear Local (Sede) — genera unique_id automáticamente
# ================================================
@router.post("/", response_model=dict)
async def crear_local(
    local: Local,
    current_user: dict = Depends(get_current_user)
):
    if current_user["rol"] not in ["super_admin", "admin_franquicia"]:
        raise HTTPException(status_code=403, detail="No autorizado para crear sedes")

    # 🚫 Verificar si ya existe una sede con el mismo nombre o correo
    existente = await collection_locales.find_one({
        "$or": [
            {"nombre": local.nombre},
            {"email": local.email}
        ]
    })
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe una sede con ese nombre o correo")

    # ⚙️ Generar unique_id incremental tipo 001, 002, 003...
    ultimo_local = await collection_locales.find_one(sort=[("unique_id", -1)])
    if not ultimo_local:
        unique_id = "001"
    else:
        ultimo_id = int(ultimo_local["unique_id"])
        unique_id = str(ultimo_id + 1).zfill(3)

    # 📦 Insertar sede con su nuevo unique_id
    data = local.dict(exclude_unset=True)
    data["unique_id"] = unique_id
    data["created_by"] = current_user["email"]

    result = await collection_locales.insert_one(data)

    return {
        "msg": "✅ Local creado exitosamente",
        "unique_id": unique_id,
        "mongo_id": str(result.inserted_id)
    }


# ================================================
# 📋 List Locales
# ================================================
@router.get("/", response_model=list)
async def list_locals(current_user: dict = Depends(get_current_user)):
    # Admin_sede only sees their own branch
    if current_user["rol"] == "admin_sede":
        locales = await collection_locales.find({"unique_id": current_user["sede_id"]}).to_list(None)
    else:
        locales = await collection_locales.find().to_list(None)

    return [local_to_dict(l) for l in locales]


# ================================================
# 🔍 Get Local by unique_id
# ================================================
@router.get("/{unique_id}", response_model=dict)
async def get_local(unique_id: str, current_user: dict = Depends(get_current_user)):
    local = await collection_locales.find_one({"unique_id": unique_id})
    if not local:
        raise HTTPException(status_code=404, detail="Local not found")
    return local_to_dict(local)


# ================================================
# ✏️ Update Local by unique_id
# ================================================
@router.put("/{unique_id}", response_model=dict)
async def update_local(
    unique_id: str,
    data: Local,
    current_user: dict = Depends(get_current_user)
):
    if current_user["rol"] not in ["super_admin", "admin_franquicia"]:
        raise HTTPException(status_code=403, detail="Not authorized to update branches")

    update_data = {k: v for k, v in data.dict().items() if v is not None}

    result = await collection_locales.update_one(
        {"unique_id": unique_id},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Local not found")

    return {"msg": "✅ Local updated successfully"}


# ================================================
# ❌ Delete Local by unique_id
# ================================================
@router.delete("/{unique_id}", response_model=dict)
async def delete_local(unique_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only super_admin can delete branches")

    result = await collection_locales.delete_one({"unique_id": unique_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Local not found")

    return {"msg": "🗑️ Local deleted successfully"}



