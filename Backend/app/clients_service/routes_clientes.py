from fastapi import APIRouter, HTTPException, Depends
from app.clients_service.models import Cliente, NotaCliente
from app.database.mongo import collection_clients, collection_citas
from app.auth.routes import get_current_user
from datetime import datetime
from typing import List
from bson import ObjectId

router = APIRouter(prefix="/clientes", tags=["Clientes"])


# =========================================================
# 🧩 Helper para convertir ObjectId
# =========================================================
def cliente_to_dict(c):
    c["_id"] = str(c["_id"])
    return c

def cita_to_dict(c):
    c["_id"] = str(c["_id"])
    return c
# =========================================================
# 🔹 Crear cliente (admin_sede, admin_franquicia o super_admin)
# =========================================================
@router.post("/", response_model=dict)
async def crear_cliente(
    cliente: Cliente,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]
    if rol not in ["admin_sede", "admin_franquicia", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para crear clientes")

    # Evitar duplicados por correo o teléfono
    filtro = {}
    if cliente.correo:
        filtro["correo"] = cliente.correo
    elif cliente.telefono:
        filtro["telefono"] = cliente.telefono

    existing = await collection_clients.find_one(filtro)
    if existing:
        raise HTTPException(status_code=400, detail="Cliente ya registrado")

    data = cliente.dict()
    data["fecha_creacion"] = datetime.now()
    data["creado_por"] = current_user["email"]

    result = await collection_clients.insert_one(data)
    data["_id"] = str(result.inserted_id)

    return {"msg": "Cliente creado exitosamente", "cliente": data}


# =========================================================
# 🔹 Listar todos los clientes (por sede o franquicia)
# =========================================================
@router.get("/", response_model=List[dict])
async def listar_clientes(
    sede_id: str = None,
    franquicia_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]

    if rol not in ["admin_sede", "admin_franquicia", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para listar clientes")

    query = {}
    if sede_id:
        query["sede_id"] = sede_id
    if franquicia_id:
        query["franquicia_id"] = franquicia_id

    clientes = await collection_clients.find(query).to_list(None)
    return [cliente_to_dict(c) for c in clientes]


# =========================================================
# 🔹 Obtener cliente por ID
# =========================================================
@router.get("/{cliente_id}", response_model=dict)
async def obtener_cliente(
    cliente_id: str,
    current_user: dict = Depends(get_current_user)
):
    cliente = await collection_clients.find_one({"_id": ObjectId(cliente_id)})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente_to_dict(cliente)


# =========================================================
# 🔹 Editar cliente
# =========================================================
@router.put("/{cliente_id}", response_model=dict)
async def editar_cliente(
    cliente_id: str,
    cliente_data: Cliente,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]
    if rol not in ["admin_sede", "admin_franquicia", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para editar clientes")

    update_data = {k: v for k, v in cliente_data.dict().items() if v is not None}

    result = await collection_clients.update_one(
        {"_id": ObjectId(cliente_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    return {"msg": "Cliente actualizado correctamente"}


# =========================================================
# 🔹 Agregar nota a cliente
# =========================================================
@router.post("/{cliente_id}/notas", response_model=dict)
async def agregar_nota_cliente(
    cliente_id: str,
    nota: NotaCliente,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]
    if rol not in ["admin_sede", "admin_franquicia", "super_admin", "estilista"]:
        raise HTTPException(status_code=403, detail="No autorizado para agregar notas")

    nota_dict = nota.dict()
    nota_dict["fecha"] = datetime.now()
    nota_dict["autor"] = current_user["email"]

    result = await collection_clients.update_one(
        {"_id": ObjectId(cliente_id)},
        {"$push": {"notas_historial": nota_dict}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    return {"msg": "Nota agregada correctamente"}


# =========================================================
# 🔹 Historial de citas de un cliente
# =========================================================
@router.get("/{cliente_id}/historial", response_model=List[dict])
async def historial_cliente(
    cliente_id: str,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]

    if rol not in ["admin_sede", "admin_franquicia", "super_admin", "estilista"]:
        raise HTTPException(status_code=403, detail="No autorizado para ver historial")

    citas = await collection_citas.find({
        "cliente_id": cliente_id
    }).to_list(None)

    return [cita_to_dict(c) for c in citas]
