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
# ✅ Crear Local (Sede) — con sede_id tipo SD-XXXXX
# ================================================
@router.post("/", response_model=dict)
async def crear_local(
    local: Local,
    current_user: dict = Depends(get_current_user)
):
    # 🔐 Validar permisos
    if current_user["rol"] not in ["super_admin", "admin_franquicia"]:
        raise HTTPException(status_code=403, detail="No autorizado para crear sedes")

    # 🆔 Generar sede_id tipo SD-89958
    import random
    random_number = random.randint(10000, 99999)
    sede_id = f"SD-{random_number}"

    # ⏳ Fecha actual
    from datetime import datetime
    fecha_actual = datetime.utcnow()

    # 📦 Construir documento a insertar
    data = {
        "nombre": local.nombre,
        "direccion": local.direccion,
        "informacion_adicional": local.informacion_adicional,
        "zona_horaria": local.zona_horaria,
        "telefono": local.telefono,
        "email": local.email,
        "sede_id": sede_id,
        "fecha_creacion": fecha_actual,
        "creado_por": current_user["email"],
        "activa": True,
    }

    # 💾 Insertar en Mongo
    result = await collection_locales.insert_one(data)

    return {
        "msg": "✅ Local creado exitosamente",
        "mongo_id": str(result.inserted_id),
        "sede_id": sede_id
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
# 🔍 Get Local by sede_id
# ================================================
@router.get("/{sede_id}", response_model=dict)
async def get_local(sede_id: str, current_user: dict = Depends(get_current_user)):
    local = await collection_locales.find_one({"sede_id": sede_id})
    if not local:
        raise HTTPException(status_code=404, detail="Local not found")
    return local_to_dict(local)


# ================================================
# ✏️ Update Local by sede_id
# ================================================
@router.put("/{sede_id}", response_model=dict)
async def update_local(
    sede_id: str,
    data: Local,
    current_user: dict = Depends(get_current_user)
):
    if current_user["rol"] not in ["super_admin", "admin_franquicia"]:
        raise HTTPException(status_code=403, detail="Not authorized to update branches")

    update_data = {k: v for k, v in data.dict().items() if v is not None}

    result = await collection_locales.update_one(
        {"sede_id": sede_id},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Local not found")

    # 🔍 Obtener el local actualizado
    updated_local = await collection_locales.find_one({"sede_id": sede_id})

    return {
        "msg": "✅ Local updated successfully",
        "local": local_to_dict(updated_local)
    }


# ================================================
# ❌ Delete Local by sede_id
# ================================================
@router.delete("/{sede_id}", response_model=dict)
async def delete_local(sede_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only super_admin can delete branches")

    result = await collection_locales.delete_one({"sede_id": sede_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Local not found")

    return {"msg": "🗑️ Local deleted successfully"}

