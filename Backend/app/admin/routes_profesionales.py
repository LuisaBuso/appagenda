from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from bson import ObjectId

from app.admin.models import Profesional
from app.auth.routes import get_current_user
from app.database.mongo import (
    collection_estilista,  # ⭐ Usar stylist
    collection_locales,
    collection_servicios,
)
from app.id_generator.generator import generar_id, validar_id  # ⭐ Generador de IDs

router = APIRouter(prefix="/admin/profesionales", tags=["Admin - Profesionales"])

# ===================================================
# Helper: convertir ObjectId a string
# ===================================================
def profesional_to_dict(p):
    """Convierte ObjectId a string para respuesta JSON"""
    if "_id" in p:
        p["_id"] = str(p["_id"])
    return p


# ===================================================
# ✅ Crear profesional CON ID CORTO NO SECUENCIAL
# ===================================================
@router.post("/", response_model=dict)
async def create_profesional(
    profesional: Profesional,
    current_user: dict = Depends(get_current_user)
):
    """
    Crea un profesional/estilista con ID corto NO secuencial: ES-00247
    
    Permisos: super_admin, admin_sede
    """
    rol = current_user["rol"]
    
    if rol not in ["super_admin", "admin_sede"]:
        raise HTTPException(
            status_code=403, 
            detail="No autorizado para crear profesionales"
        )

    # ⭐ OBTENER sede_id DEL USUARIO LOGUEADO
    sede_id = current_user.get("sede_id")
    
    if not sede_id:
        raise HTTPException(
            status_code=400, 
            detail="Usuario no tiene sede asignada. Contacte al administrador."
        )
    
    # ✅ VALIDAR QUE LA SEDE EXISTE (buscar por sede_id, no por _id)
    sede = await collection_locales.find_one({"sede_id": sede_id})
    
    if not sede:
        raise HTTPException(
            status_code=404, 
            detail=f"Sede no encontrada: {sede_id}"
        )

    # ⚙️ Validar email único en collection_estilista
    exists = await collection_estilista.find_one({"email": profesional.email})
    if exists:
        raise HTTPException(
            status_code=400, 
            detail="Ya existe un profesional con ese email"
        )

    # ⭐ GENERAR ID CORTO NO SECUENCIAL
    try:
        profesional_id = await generar_id(
            entidad="estilista",
            sede_id=sede_id,
            metadata={
                "email": profesional.email,
                "nombre": profesional.nombre,
                "creado_por": current_user["email"]
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error al generar ID del profesional: {str(e)}"
        )

    # ✅ Preparar datos del profesional
    data = profesional.dict()
    data.update({
        "profesional_id": profesional_id,  # ⭐ ID corto: ES-00247
        "rol": "estilista",
        "sede_id": sede_id,  # ⭐ Asignar sede del usuario
        "created_by": current_user["email"],
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
    })

    # ⭐ Guardar en collection_estilista (stylist)
    result = await collection_estilista.insert_one(data)

    return {
        "msg": "✅ Profesional creado exitosamente",
        "profesional_id": profesional_id,  # ⭐ ID corto NO secuencial
        "_id": str(result.inserted_id),
        "sede_id": sede_id,
        "sede_nombre": sede.get("nombre")
    }


# ===================================================
# 📋 Listar profesionales (con nombres de servicios)
# ===================================================
@router.get("/", response_model=list)
async def list_professionals(
    activo: bool = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Lista profesionales según permisos del usuario.
    
    Incluye nombres de servicios según especialidades.
    """
    query = {"rol": "estilista"}

    # Filtrar por sede si es admin_sede
    if current_user["rol"] == "admin_sede":
        query["sede_id"] = current_user["sede_id"]
    
    # Filtrar por estado activo
    if activo is not None:
        query["activo"] = activo

    # ⭐ Buscar en collection_estilista (stylist)
    professionals = await collection_estilista.find(query).to_list(None)

    # ⭐ Agregar nombres de servicios según especialidades
    for p in professionals:
        if "especialidades" in p and isinstance(p["especialidades"], list):
            nombres_servicios = []
            for servicio_id in p["especialidades"]:
                # Buscar por servicio_id (nuevo) o unique_id (antiguo)
                servicio = await collection_servicios.find_one({
                    "$or": [
                        {"servicio_id": servicio_id},
                        {"unique_id": servicio_id}
                    ]
                })
                if servicio:
                    nombres_servicios.append({
                        "id": servicio.get("servicio_id") or servicio.get("unique_id"),
                        "nombre": servicio.get("nombre", "Desconocido")
                    })
            p["especialidades_detalle"] = nombres_servicios
        
        profesional_to_dict(p)

    return professionals


# ===================================================
# 🔍 Obtener profesional por ID (DUAL: legible o ObjectId)
# ===================================================
@router.get("/{profesional_id}", response_model=dict)
async def get_professional(
    profesional_id: str, 
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene un profesional por su profesional_id (ES-00247) o MongoDB ObjectId.
    
    Incluye nombres de servicios según especialidades.
    """
    # ⭐ BUSCAR POR profesional_id LEGIBLE PRIMERO
    professional = await collection_estilista.find_one({
        "profesional_id": profesional_id, 
        "rol": "estilista"
    })
    
    # Si no se encuentra, intentar con ObjectId (compatibilidad)
    if not professional:
        try:
            professional = await collection_estilista.find_one({
                "_id": ObjectId(profesional_id), 
                "rol": "estilista"
            })
        except Exception:
            pass
    
    # Si aún no se encuentra, intentar con unique_id (compatibilidad antigua)
    if not professional:
        professional = await collection_estilista.find_one({
            "unique_id": profesional_id, 
            "rol": "estilista"
        })
    
    if not professional:
        raise HTTPException(
            status_code=404, 
            detail=f"Profesional no encontrado: {profesional_id}"
        )

    # ⭐ Agregar nombres de servicios
    servicios = []
    for servicio_id in professional.get("especialidades", []):
        servicio = await collection_servicios.find_one({
            "$or": [
                {"servicio_id": servicio_id},
                {"unique_id": servicio_id}
            ]
        })
        if servicio:
            servicios.append({
                "id": servicio.get("servicio_id") or servicio.get("unique_id"),
                "nombre": servicio.get("nombre", "Desconocido")
            })
    
    professional["especialidades_detalle"] = servicios

    return profesional_to_dict(professional)


# ===================================================
# ✏️ Actualizar profesional
# ===================================================
@router.put("/{profesional_id}", response_model=dict)
async def update_professional(
    profesional_id: str,
    data: Profesional,
    current_user: dict = Depends(get_current_user)
):
    """
    Actualiza los datos de un profesional.
    
    Acepta profesional_id (ES-00247), ObjectId o unique_id.
    
    Permisos: super_admin, admin_sede
    """
    if current_user["rol"] not in ["super_admin", "admin_sede"]:
        raise HTTPException(
            status_code=403, 
            detail="No autorizado para editar profesionales"
        )

    # Preparar datos a actualizar
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    
    # No permitir cambiar profesional_id ni rol
    update_data.pop("profesional_id", None)
    update_data.pop("rol", None)
    
    update_data["updated_at"] = datetime.now()
    update_data["updated_by"] = current_user["email"]

    # ⭐ ACTUALIZAR POR profesional_id PRIMERO
    result = await collection_estilista.update_one(
        {"profesional_id": profesional_id, "rol": "estilista"},
        {"$set": update_data}
    )
    
    # Si no se encuentra, intentar con ObjectId
    if result.matched_count == 0:
        try:
            result = await collection_estilista.update_one(
                {"_id": ObjectId(profesional_id), "rol": "estilista"},
                {"$set": update_data}
            )
        except Exception:
            pass
    
    # Si no se encuentra, intentar con unique_id (compatibilidad)
    if result.matched_count == 0:
        result = await collection_estilista.update_one(
            {"unique_id": profesional_id, "rol": "estilista"},
            {"$set": update_data}
        )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404, 
            detail=f"Profesional no encontrado: {profesional_id}"
        )

    return {
        "msg": "✅ Profesional actualizado correctamente",
        "profesional_id": profesional_id
    }


# ===================================================
# ❌ Eliminar profesional (SOFT DELETE)
# ===================================================
@router.delete("/{profesional_id}", response_model=dict)
async def delete_professional(
    profesional_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Desactiva un profesional (soft delete).
    
    Acepta profesional_id (ES-00247), ObjectId o unique_id.
    
    Solo super_admin puede eliminar profesionales.
    """
    if current_user["rol"] != "super_admin":
        raise HTTPException(
            status_code=403, 
            detail="Solo super_admin puede eliminar profesionales"
        )

    # ⭐ SOFT DELETE: marcar como inactivo
    update_data = {
        "activo": False,
        "deleted_at": datetime.now(),
        "deleted_by": current_user["email"]
    }

    # Intentar por profesional_id
    result = await collection_estilista.update_one(
        {"profesional_id": profesional_id, "rol": "estilista"},
        {"$set": update_data}
    )
    
    # Si no se encuentra, intentar con ObjectId
    if result.matched_count == 0:
        try:
            result = await collection_estilista.update_one(
                {"_id": ObjectId(profesional_id), "rol": "estilista"},
                {"$set": update_data}
            )
        except Exception:
            pass
    
    # Si no se encuentra, intentar con unique_id
    if result.matched_count == 0:
        result = await collection_estilista.update_one(
            {"unique_id": profesional_id, "rol": "estilista"},
            {"$set": update_data}
        )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404, 
            detail=f"Profesional no encontrado: {profesional_id}"
        )

    return {
        "msg": "🗑️ Profesional eliminado correctamente",
        "profesional_id": profesional_id
    }


# ===================================================
# 🔍 VALIDAR profesional_id
# ===================================================
@router.get("/validar/{profesional_id}", response_model=dict)
async def validar_profesional_id(
    profesional_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Valida que un profesional_id sea válido y exista.
    Útil antes de crear relaciones (asignar a citas, etc.)
    """
    # Validar formato
    es_valido_formato = await validar_id(profesional_id, entidad="estilista")
    
    if not es_valido_formato:
        raise HTTPException(
            status_code=400, 
            detail=f"Formato de ID inválido. Debe ser: ES-[números]"
        )
    
    # Validar que existe y está activo
    profesional = await collection_estilista.find_one({
        "profesional_id": profesional_id,
        "rol": "estilista",
        "activo": True
    })

    if not profesional:
        raise HTTPException(
            status_code=404, 
            detail=f"No existe profesional activo con ID: {profesional_id}"
        )

    return {
        "valido": True,
        "profesional_id": profesional_id,
        "nombre": profesional.get("nombre"),
        "email": profesional.get("email"),
        "especialidades": profesional.get("especialidades", []),
        "comision": profesional.get("comision")
    }
