from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from bson import ObjectId

from app.admin.models import Profesional
from app.auth.routes import get_current_user
from app.database.mongo import (
    collection_user,
    collection_locales,
    collection_superadmin,
    collection_admin_franquicia,
    collection_admin_sede,
    collection_servicios,
)

router = APIRouter(prefix="/admin/profesionales", tags=["Admin - Profesionales"])

# ===================================================
# Helper: convertir ObjectId a string
# ===================================================
def profesional_to_dict(p):
    if "_id" in p:
        p["_id"] = str(p["_id"])
    return p


# ===================================================
# ✅ Crear profesional
# ===================================================
@router.post("/", response_model=dict)
async def create_profesional(
    profesional: Profesional,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]
    email_actual = current_user["email"]

    if rol not in ["super_admin", "admin_franquicia", "admin_sede"]:
        raise HTTPException(status_code=403, detail="No autorizado para crear profesionales")

    # 🔍 Buscar el usuario creador según su rol
    role_collections = {
        "super_admin": collection_superadmin,
        "admin_franquicia": collection_admin_franquicia,
        "admin_sede": collection_admin_sede,
    }
    collection = role_collections.get(rol)
    creador = await collection.find_one({"correo_electronico": email_actual})
    if not creador:
        raise HTTPException(status_code=404, detail="Usuario autenticado no encontrado")

    franquicia_id = creador.get("franquicia_id")
    sede_id = creador.get("sede_id")

    if not sede_id:
        raise HTTPException(status_code=400, detail="El usuario no tiene una sede asignada")

    sede = await collection_locales.find_one({"unique_id": sede_id})
    if not sede:
        raise HTTPException(status_code=404, detail=f"La sede '{sede_id}' no existe")

    # ⚙️ Validar email único
    exists = await collection_user.find_one({"email": profesional.email})
    if exists:
        raise HTTPException(status_code=400, detail="Ya existe un profesional con ese email")

    # 🆔 Generar unique_id tipo P001, P002...
    last_prof = await collection_user.find_one({"rol": "estilista"}, sort=[("unique_id", -1)])
    if not last_prof or "unique_id" not in last_prof:
        unique_id = "P001"
    else:
        try:
            last_num = int(last_prof["unique_id"][1:])
            unique_id = f"P{str(last_num + 1).zfill(3)}"
        except Exception:
            unique_id = "P001"

    # ✅ Crear profesional con valores automáticos
    data = profesional.dict()
    data.update({
        "rol": "estilista",
        "unique_id": unique_id,
        "sede_id": sede_id,
        "franquicia_id": franquicia_id,
        "created_by": email_actual,
        "comision_porcentaje": 0,  # se crea automático
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })

    result = await collection_user.insert_one(data)

    return {
        "msg": f"✅ Profesional creado exitosamente en la sede {sede_id}",
        "unique_id": unique_id,
        "profesional_id": str(result.inserted_id),
        "sede_id": sede_id,
        "franquicia_id": franquicia_id
    }


# ===================================================
# 📋 Listar profesionales (con nombres de servicios)
# ===================================================
@router.get("/", response_model=list)
async def list_professionals(current_user: dict = Depends(get_current_user)):
    query = {"rol": "estilista"}

    if current_user["rol"] == "admin_sede":
        query["sede_id"] = current_user["sede_id"]

    professionals = await collection_user.find(query).to_list(None)

    for p in professionals:
        # Mostrar nombres de servicios según especialidades (unique_id)
        if "especialidades" in p and isinstance(p["especialidades"], list):
            nombres_servicios = []
            for unique_id in p["especialidades"]:
                servicio = await collection_servicios.find_one({"unique_id": unique_id})
                if servicio:
                    nombres_servicios.append(servicio.get("nombre", "Desconocido"))
            p["especialidades_detalle"] = nombres_servicios
        profesional_to_dict(p)

    return professionals


# ===================================================
# 🔍 Obtener profesional por unique_id
# ===================================================
@router.get("/{unique_id}", response_model=dict)
async def get_professional(unique_id: str, current_user: dict = Depends(get_current_user)):
    professional = await collection_user.find_one({"unique_id": unique_id, "rol": "estilista"})
    if not professional:
        raise HTTPException(status_code=404, detail="Profesional no encontrado")

    # Agregar nombres de servicios
    servicios = []
    for unique_id_serv in professional.get("especialidades", []):
        servicio = await collection_servicios.find_one({"unique_id": unique_id_serv})
        if servicio:
            servicios.append(servicio.get("nombre", "Desconocido"))
    professional["especialidades_detalle"] = servicios

    return profesional_to_dict(professional)


# ===================================================
# ✏️ Actualizar profesional
# ===================================================
@router.put("/{unique_id}", response_model=dict)
async def update_professional(
    unique_id: str,
    data: Profesional,
    current_user: dict = Depends(get_current_user)
):
    if current_user["rol"] not in ["super_admin", "admin_franquicia", "admin_sede"]:
        raise HTTPException(status_code=403, detail="No autorizado para editar profesionales")

    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()

    result = await collection_user.update_one(
        {"unique_id": unique_id, "rol": "estilista"},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profesional no encontrado")

    return {"msg": "✅ Profesional actualizado correctamente"}


# ===================================================
# ❌ Eliminar profesional
# ===================================================
@router.delete("/{unique_id}", response_model=dict)
async def delete_professional(
    unique_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user["rol"] not in ["super_admin", "admin_franquicia"]:
        raise HTTPException(status_code=403, detail="No autorizado para eliminar profesionales")

    result = await collection_user.delete_one({"unique_id": unique_id, "rol": "estilista"})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Profesional no encontrado")

    return {"msg": "🗑️ Profesional eliminado correctamente"}
