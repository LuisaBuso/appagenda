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
# ✅ Crear Local (Sede) — genera unique_id automáticamente
# ================================================
@router.post("/", response_model=dict)
async def crear_local(
    local: Local,
    current_user: dict = Depends(get_current_user)
):
    """
    Crea un nuevo local (sede) con ID corto NO secuencial.
    
    Genera automáticamente un sede_id: SD-00247
    
    Requiere rol: super_admin o admin_sede
    """
    try:
        # ========= VALIDACIÓN DE PERMISOS =========
        rol = current_user.get("rol")
        if rol not in ["super_admin"]:
            raise HTTPException(
                status_code=403,
                detail="No autorizado para crear sedes"
            )
        
        # ========= GENERAR ID CORTO NO SECUENCIAL =========
        try:
            sede_id = await generar_id(
                entidad="sede",
                metadata={
                    "nombre": local.nombre,
                    "creado_por": current_user.get("email")
                }
            )
        except Exception as e:
            logger.error(f"Error al generar ID de sede: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Error al generar ID de sede: {str(e)}"
            )
        
        logger.info(f"✨ ID de sede generado: {sede_id}")  # SD-00247
        
        # ========= PREPARAR DATOS =========
        local_data = local.dict(exclude_none=True)
        local_data["sede_id"] = sede_id  # ⭐ ID corto: SD-00247
        local_data["fecha_creacion"] = datetime.now()
        local_data["creado_por"] = current_user.get("email")
        local_data["activa"] = True
        
        # ========= INSERTAR EN BD =========
        result = await collection_locales.insert_one(local_data)
        local_data["_id"] = str(result.inserted_id)
        
        logger.info(
            f"✅ Local creado: {sede_id} ({local.nombre}) "
            f"por {current_user.get('email')}"
        )
        
        return {
            "success": True,
            "msg": "Local creado exitosamente",
            "sede_id": sede_id,  # ⭐ ID corto NO secuencial
            "local": local_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error al crear local: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error al crear local: {str(e)}"
        )


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
# 🔍 Obtener Local por ID (DUAL: legible o ObjectId)
# ================================================
@router.get("/{sede_id}", response_model=dict)
async def obtener_local(
    sede_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene un local por su sede_id (SD-00247) o MongoDB ObjectId.
    """
    try:
        # ⭐ BUSCAR POR sede_id LEGIBLE PRIMERO
        query = {"sede_id": sede_id}
        sede = await collection_locales.find_one(query)
        
        # Si no se encuentra, intentar como ObjectId (compatibilidad)
        if not sede:
            try:
                query = {"_id": ObjectId(sede_id)}
                sede = await collection_locales.find_one(query)
            except Exception:
                pass
        
        if not sede:
            raise HTTPException(
                status_code=404,
                detail=f"Local no encontrado: {sede_id}"
            )
        
        return local_to_dict(sede)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error al obtener local: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error al obtener local"
        )


# ================================================
# ✏️ Update Local by unique_id
# ================================================
@router.put("/{sede_id}", response_model=dict)
async def actualizar_local(
    sede_id: str,
    data: Local,
    current_user: dict = Depends(get_current_user)
):
    """
    Actualiza un local existente.
    
    Requiere rol: super_admin o admin_sede
    """
    try:
        # ========= VALIDACIÓN DE PERMISOS =========
        rol = current_user.get("rol")
        if rol not in ["super_admin", "admin_sede"]:
            raise HTTPException(
                status_code=403,
                detail="No autorizado para editar sedes"
            )
        
        # ========= BUSCAR LOCAL =========
        query = {"sede_id": sede_id}
        sede_actual = await collection_locales.find_one(query)
        
        if not sede_actual:
            try:
                query = {"_id": ObjectId(sede_id)}
                sede_actual = await collection_locales.find_one(query)
            except Exception:
                pass
        
        if not sede_actual:
            raise HTTPException(
                status_code=404,
                detail=f"Local no encontrado: {sede_id}"
            )
        
        # ========= ACTUALIZAR DATOS =========
        update_data = data.dict(exclude_none=True)
        
        # No permitir cambiar sede_id
        update_data.pop("sede_id", None)
        
        update_data["modificado_por"] = current_user.get("email")
        update_data["fecha_modificacion"] = datetime.now()
        
        result = await collection_locales.update_one(
            {"_id": sede_actual["_id"]},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=404,
                detail="Local no encontrado"
            )
        
        logger.info(
            f"✏️ Local {sede_actual.get('sede_id')} actualizado "
            f"por {current_user.get('email')}"
        )
        
        return {
            "success": True,
            "msg": "Local actualizado correctamente",
            "sede_id": sede_actual.get("sede_id")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error al actualizar local: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error al actualizar local"
        )


# ================================================
# ❌ Eliminar Local (SOFT DELETE)
# ================================================
@router.delete("/{sede_id}", response_model=dict)
async def eliminar_local(
    sede_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Desactiva un local (soft delete).
    
    Solo super_admin puede eliminar sedes.
    """
    try:
        # ========= VALIDACIÓN DE PERMISOS =========
        if current_user.get("rol") != "super_admin":
            raise HTTPException(
                status_code=403,
                detail="Solo super_admin puede eliminar sedes"
            )
        
        # ========= BUSCAR LOCAL =========
        query = {"sede_id": sede_id}
        sede = await collection_locales.find_one(query)
        
        if not sede:
            try:
                query = {"_id": ObjectId(sede_id)}
                sede = await collection_locales.find_one(query)
            except Exception:
                pass
        
        if not sede:
            raise HTTPException(
                status_code=404,
                detail=f"Local no encontrado: {sede_id}"
            )
        
        # ========= SOFT DELETE =========
        result = await collection_locales.update_one(
            {"_id": sede["_id"]},
            {
                "$set": {
                    "activa": False,
                    "deleted_at": datetime.now(),
                    "deleted_by": current_user.get("email")
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=404,
                detail="Local no encontrado"
            )
        
        logger.warning(
            f"🗑️ Local {sede.get('sede_id')} eliminado (soft delete) "
            f"por {current_user.get('email')}"
        )
        
        return {
            "success": True,
            "msg": "Local eliminado correctamente",
            "sede_id": sede.get("sede_id")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error al eliminar local: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error al eliminar local"
        )


# ================================================
# 🔄 Toggle Estado (Activar/Desactivar)
# ================================================
@router.patch("/{sede_id}/toggle-estado", response_model=dict)
async def toggle_estado_local(
    sede_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Activa o desactiva un local.
    
    Requiere rol: super_admin o admin_sede
    """
    try:
        rol = current_user.get("rol")
        if rol not in ["super_admin", "admin_sede"]:
            raise HTTPException(
                status_code=403,
                detail="No autorizado para cambiar el estado"
            )
        
        # Buscar local
        query = {"sede_id": sede_id}
        sede = await collection_locales.find_one(query)
        
        if not sede:
            try:
                query = {"_id": ObjectId(sede_id)}
                sede = await collection_locales.find_one(query)
            except Exception:
                pass
        
        if not sede:
            raise HTTPException(
                status_code=404,
                detail=f"Local no encontrado: {sede_id}"
            )
        
        # Toggle estado
        nuevo_estado = not sede.get("activa", True)
        
        await collection_locales.update_one(
            {"_id": sede["_id"]},
            {
                "$set": {
                    "activa": nuevo_estado,
                    "modificado_por": current_user.get("email"),
                    "fecha_modificacion": datetime.now()
                }
            }
        )
        
        estado_texto = "activada" if nuevo_estado else "desactivada"
        
        logger.info(
            f"🔄 Sede {sede.get('sede_id')} {estado_texto} "
            f"por {current_user.get('email')}"
        )
        
        return {
            "success": True,
            "msg": f"Sede {estado_texto} correctamente",
            "sede_id": sede.get("sede_id"),
            "activa": nuevo_estado
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error al cambiar estado: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error al cambiar estado"
        )


# ================================================
# 🔍 VALIDAR sede_id (Endpoint útil para frontend)
# ================================================
@router.get("/validar/{sede_id}", response_model=dict)
async def validar_sede_id(
    sede_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Valida que un sede_id sea válido y exista.
    Útil antes de crear relaciones.
    """
    # Validar formato
    es_valido_formato = await validar_id(sede_id, entidad="sede")
    
    if not es_valido_formato:
        raise HTTPException(
            status_code=400,
            detail=f"Formato de ID inválido. Debe ser: SD-[números]"
        )
    
    # Validar que existe y está activo
    sede = await collection_locales.find_one({
        "sede_id": sede_id,
        "activa": True
    })

    if not sede:
        raise HTTPException(
            status_code=404,
            detail=f"No existe local activo con ID: {sede_id}"
        )

    return {
        "valido": True,
        "sede_id": sede_id,
        "nombre": sede.get("nombre"),
        "zona_horaria": sede.get("zona_horaria")
    }
