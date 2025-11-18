"""
Routes para gestión de Locales (Sedes)
IDs cortos NO secuenciales: SD-00247
Sin franquicia_id (solo roles)
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from datetime import datetime
from typing import Optional
import logging

from fastapi import APIRouter, HTTPException, Depends
from app.admin.models import Local
from app.database.mongo import collection_locales
from app.auth.routes import get_current_user
from app.id_generator.generator import generar_id, validar_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/locales", tags=["Admin - Locales"])


# ================================================
# Helper: Convertir ObjectId a string y formatear
# ================================================
def local_to_dict(local: dict) -> dict:
    """Convierte local de MongoDB a dict serializable"""
    local["_id"] = str(local["_id"])
    
    # Fallback para locales sin sede_id
    if "sede_id" not in local or not local["sede_id"]:
        local["sede_id"] = str(local["_id"])
    
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
async def listar_locales(
    activa: Optional[bool] = Query(None, description="Filtrar por estado"),
    current_user: dict = Depends(get_current_user)
):
    """
    Lista todos los locales (sedes).
    
    Permisos:
    - super_admin: Ve todas las sedes
    - admin_sede: Ve todas las sedes (sin filtro por franquicia)
    """
    try:
        # ========= CONSTRUIR QUERY =========
        query = {}
        
        # Filtro de estado
        if activa is not None:
            query["activa"] = activa
        
        # ========= OBTENER SEDES =========
        sedes = await collection_locales.find(query).to_list(None)
        
        logger.info(
            f"📋 Listado de {len(sedes)} locales por {current_user.get('email')}"
        )
        
        return [local_to_dict(s) for s in sedes]
    
    except Exception as e:
        logger.error(f"❌ Error al listar locales: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error al listar locales"
        )

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

