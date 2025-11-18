from fastapi import APIRouter, HTTPException, Depends, status
from bson import ObjectId
from datetime import datetime

from app.admin.models import ServicioAdmin
from app.auth.routes import get_current_user
from app.database.mongo import collection_servicios
from app.id_generator.generator import generar_id, validar_id  # ⭐ Importar generador


router = APIRouter(prefix="/admin/servicios", tags=["Admin - Servicios"])


# ===================================================
# Helper: convertir ObjectId a string
# ===================================================
def servicio_to_dict(s):
    """Convierte ObjectId a string para respuesta JSON."""
    s["_id"] = str(s["_id"])
    return s


# ===================================================
# ✅ Crear servicio CON ID NUMÉRICO
# ===================================================
@router.post("/", response_model=dict)
async def crear_servicio(
    servicio: ServicioAdmin,
    current_user: dict = Depends(get_current_user)
):
    """
    Crea un servicio con ID legible numérico tipo SV-231370287946194340.
    
    Permisos: super_admin, admin_franquicia, admin_sede
    """
    # Validar permisos
    if current_user["rol"] not in ["super_admin", "admin_franquicia", "admin_sede"]:
        raise HTTPException(
            status_code=403, 
            detail="No autorizado para crear servicios"
        )

    # ⭐ GENERAR ID NUMÉRICO ÚNICO
    try:
        servicio_id = await generar_id(
            entidad="servicio",
            franquicia_id=current_user.get("franquicia_id"),
            sede_id=current_user.get("sede_id"),
            metadata={
                "nombre": servicio.nombre,
                "creado_por": current_user["email"]
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar ID del servicio: {str(e)}"
        )

    # Preparar datos del servicio
    data = servicio.dict()
    data["servicio_id"] = servicio_id
    data["activo"] = True
    data["creado_por"] = current_user["email"]
    data["created_at"] = datetime.now()

    # 🚀 HEREDAR SEDE AUTOMÁTICAMENTE
    if current_user["rol"] == "admin_sede":
        data["sede_id"] = current_user.get("sede_id")

    # Guardar en base de datos
    result = await collection_servicios.insert_one(data)

    return {
        "msg": "Servicio creado exitosamente",
        "servicio_id": servicio_id,  # ⭐ ID numérico legible
        "_id": str(result.inserted_id)
    }


# ===================================================
# 📌 Listar servicios
# ===================================================
@router.get("/", response_model=list)
async def listar_servicios(
    activo: bool = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Lista todos los servicios.
    
    Query params:
    - activo: Filtrar por estado (true/false)
    """
    query = {}
    
    # Filtrar por estado si se especifica
    if activo is not None:
        query["activo"] = activo
    
    # Filtrar según permisos
    if current_user["rol"] == "admin_sede":
        query["sede_id"] = current_user["sede_id"]
    elif current_user["rol"] == "admin_franquicia":
        query["franquicia_id"] = current_user["franquicia_id"]

    servicios = await collection_servicios.find(query).to_list(None)
    
    return [servicio_to_dict(s) for s in servicios]


# ===================================================
# 🔍 Obtener servicio por ID (DUAL: legible o ObjectId)
# ===================================================
@router.get("/{servicio_id}", response_model=dict)
async def obtener_servicio(
    servicio_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene un servicio por su ID legible (SV-2313702) o MongoDB ObjectId.
    Esto permite compatibilidad con IDs antiguos.
    """
    # ⭐ BUSCAR POR ID LEGIBLE PRIMERO
    servicio = await collection_servicios.find_one({
        "servicio_id": servicio_id
    })
    
    # Si no se encuentra, intentar con ObjectId (compatibilidad)
    if not servicio:
        try:
            servicio = await collection_servicios.find_one({
                "_id": ObjectId(servicio_id)
            })
        except Exception:
            pass

    if not servicio:
        raise HTTPException(
            status_code=404, 
            detail=f"Servicio no encontrado con ID: {servicio_id}"
        )

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
    """
    Actualiza los datos de un servicio.
    
    Permisos: super_admin, admin_franquicia, admin_sede
    """
    if current_user["rol"] not in ["super_admin", "admin_franquicia", "admin_sede"]:
        raise HTTPException(
            status_code=403, 
            detail="No autorizado para editar servicios"
        )

    # Preparar datos a actualizar (excluir None)
    update_data = {k: v for k, v in servicio_data.dict().items() if v is not None}
    
    # No permitir cambiar el ID
    update_data.pop("servicio_id", None)
    
    # Agregar metadata de actualización
    update_data["updated_at"] = datetime.now()
    update_data["updated_by"] = current_user["email"]

    # ⭐ ACTUALIZAR POR ID LEGIBLE PRIMERO
    result = await collection_servicios.update_one(
        {"servicio_id": servicio_id},
        {"$set": update_data}
    )
    
    # Si no se encuentra, intentar con ObjectId
    if result.matched_count == 0:
        try:
            result = await collection_servicios.update_one(
                {"_id": ObjectId(servicio_id)},
                {"$set": update_data}
            )
        except Exception:
            pass

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404, 
            detail=f"Servicio no encontrado con ID: {servicio_id}"
        )

    return {
        "msg": "Servicio actualizado correctamente",
        "servicio_id": servicio_id
    }


# ===================================================
# ❌ Eliminar servicio (SOFT DELETE)
# ===================================================
@router.delete("/{servicio_id}", response_model=dict)
async def eliminar_servicio(
    servicio_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Desactiva un servicio (soft delete).
    No lo elimina físicamente, solo marca como inactivo.
    
    Permisos: super_admin, admin_franquicia
    """
    if current_user["rol"] not in ["super_admin", "admin_franquicia"]:
        raise HTTPException(
            status_code=403, 
            detail="No autorizado para eliminar servicios"
        )

    # ⭐ SOFT DELETE: marcar como inactivo
    update_data = {
        "activo": False,
        "deleted_at": datetime.now(),
        "deleted_by": current_user["email"]
    }

    # Intentar por ID legible
    result = await collection_servicios.update_one(
        {"servicio_id": servicio_id},
        {"$set": update_data}
    )
    
    # Si no se encuentra, intentar con ObjectId
    if result.matched_count == 0:
        try:
            result = await collection_servicios.update_one(
                {"_id": ObjectId(servicio_id)},
                {"$set": update_data}
            )
        except Exception:
            pass

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404, 
            detail=f"Servicio no encontrado con ID: {servicio_id}"
        )

    return {
        "msg": "Servicio eliminado correctamente",
        "servicio_id": servicio_id
    }


# ===================================================
# 🔍 VALIDAR ID (Endpoint útil para frontend)
# ===================================================
@router.get("/validar/{servicio_id}", response_model=dict)
async def validar_servicio_id(
    servicio_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Valida que un ID de servicio sea válido y exista.
    Útil antes de crear relaciones (asignar a citas, etc.)
    """
    # Validar formato
    es_valido_formato = await validar_id(servicio_id, entidad="servicio")
    
    if not es_valido_formato:
        raise HTTPException(
            status_code=400, 
            detail=f"Formato de ID inválido. Debe ser: SV-[números]"
        )
    
    # Validar que existe y está activo
    servicio = await collection_servicios.find_one({
        "servicio_id": servicio_id,
        "activo": True
    })

    if not servicio:
        raise HTTPException(
            status_code=404, 
            detail=f"No existe servicio activo con ID: {servicio_id}"
        )

    return {
        "valido": True,
        "servicio_id": servicio_id,
        "nombre": servicio.get("nombre"),
        "duracion": servicio.get("duracion"),
        "precio": servicio.get("precio")
    }


# ===================================================
# 📊 Listar servicios por categoría
# ===================================================
@router.get("/categoria/{categoria}", response_model=list)
async def listar_servicios_por_categoria(
    categoria: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Lista servicios filtrados por categoría.
    
    Ejemplos de categorías: corte, color, tratamiento, manicure, etc.
    """
    query = {
        "categoria": categoria,
        "activo": True
    }
    
    # Filtrar según permisos
    if current_user["rol"] == "admin_sede":
        query["sede_id"] = current_user["sede_id"]
    elif current_user["rol"] == "admin_franquicia":
        query["franquicia_id"] = current_user["franquicia_id"]

    servicios = await collection_servicios.find(query).to_list(None)
    
    return [servicio_to_dict(s) for s in servicios]