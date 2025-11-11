from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from app.admin.models import Profesional
from app.auth.routes import get_current_user
from app.database.mongo import collection_user  # colección donde guardas usuarios
from app.database.mongo import collection_locales  # validar que la sede existe


router = APIRouter(prefix="/admin/profesionales", tags=["Admin - Profesionales"])


# ===================================================
# Helper: Convertir ObjectId a string
# ===================================================
def profesional_to_dict(p):
    p["_id"] = str(p["_id"])
    return p


# ===================================================
# ✅ Crear profesional
# ===================================================
@router.post("/", response_model=dict)
async def crear_profesional(
    profesional: Profesional,
    current_user: dict = Depends(get_current_user)
):
    if current_user["rol"] not in ["super_admin", "admin_franquicia", "admin_sede"]:
        raise HTTPException(status_code=403, detail="No autorizado para crear profesionales")

    # ✅ Validar que la sede exista
    sede = await collection_locales.find_one({"_id": ObjectId(profesional.sede_id)})
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")

    # ✅ Validar email único
    existe = await collection_user.find_one({"email": profesional.email})
    if existe:
        raise HTTPException(status_code=400, detail="El profesional ya está registrado con ese email")

    # ✅ Crear usuario con rol estilista
    data = profesional.dict()
    data["rol"] = "estilista"
    data["creado_por"] = current_user["email"]

    result = await collection_user.insert_one(data)

    return {
        "msg": "Profesional creado exitosamente",
        "profesional_id": str(result.inserted_id)
    }


# ===================================================
# 📌 Listar profesionales
# ===================================================
@router.get("/", response_model=list)
async def listar_profesionales(
    current_user: dict = Depends(get_current_user)
):
    query = {"rol": "estilista"}

    # admin_sede solo ve los profesionales de su sede
    if current_user["rol"] == "admin_sede":
        query["sede_id"] = current_user["sede_id"]

    profesionales = await collection_user.find(query).to_list(None)

    return [profesional_to_dict(p) for p in profesionales]


# ===================================================
# 🔍 Obtener profesional por ID
# ===================================================
@router.get("/{profesional_id}", response_model=dict)
async def obtener_profesional(
    profesional_id: str,
    current_user: dict = Depends(get_current_user)
):
    profesional = await collection_user.find_one({"_id": ObjectId(profesional_id), "rol": "estilista"})

    if not profesional:
        raise HTTPException(status_code=404, detail="Profesional no encontrado")

    return profesional_to_dict(profesional)


# ===================================================
# ✏️ Editar profesional
# ===================================================
@router.put("/{profesional_id}", response_model=dict)
async def actualizar_profesional(
    profesional_id: str,
    data: Profesional,
    current_user: dict = Depends(get_current_user)
):
    if current_user["rol"] not in ["super_admin", "admin_franquicia", "admin_sede"]:
        raise HTTPException(status_code=403, detail="No autorizado para editar profesionales")

    update_data = {k: v for k, v in data.dict().items() if v is not None}

    result = await collection_user.update_one(
        {"_id": ObjectId(profesional_id), "rol": "estilista"},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profesional no encontrado")

    return {"msg": "Profesional actualizado correctamente"}


# ===================================================
# ❌ Eliminar profesional
# ===================================================
@router.delete("/{profesional_id}", response_model=dict)
async def eliminar_profesional(
    profesional_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user["rol"] not in ["super_admin", "admin_franquicia"]:
        raise HTTPException(status_code=403, detail="No autorizado para eliminar profesionales")

    result = await collection_user.delete_one(
        {"_id": ObjectId(profesional_id), "rol": "estilista"}
    )

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Profesional no encontrado")

    return {"msg": "Profesional eliminado correctamente"}
