from fastapi import APIRouter, HTTPException, Depends
from app.inventary.submodulos.products.models import Producto
from app.database.mongo import collection_productos
from app.auth.routes import get_current_user
from datetime import datetime
from typing import List
from bson import ObjectId

router = APIRouter(prefix="/productos")


# =========================================================
# 🧩 Helper para convertir ObjectId
# =========================================================
def producto_to_dict(p):
    p["_id"] = str(p["_id"])
    return p


# =========================================================
# 🔹 Crear producto
# =========================================================
@router.post("/", response_model=dict)
async def crear_producto(
    producto: Producto,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]

    if rol not in ["admin_sede", "admin_franquicia", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para crear productos")

    # Evitar duplicados por nombre o código
    filtro = {"nombre": producto.nombre}
    if producto.codigo:
        filtro["codigo"] = producto.codigo

    existente = await collection_productos.find_one(filtro)
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe un producto con ese nombre o código")

    data = producto.dict()
    data["fecha_creacion"] = datetime.now()
    data["creado_por"] = current_user["email"]

    result = await collection_productos.insert_one(data)
    data["_id"] = str(result.inserted_id)

    return {"msg": "Producto creado exitosamente", "producto": data}


# =========================================================
# 🔹 Listar productos (por sede o franquicia)
# =========================================================
@router.get("/", response_model=List[dict])
async def listar_productos(
    sede_id: str = None,
    franquicia_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]
    if rol not in ["admin_sede", "admin_franquicia", "super_admin", "estilista"]:
        raise HTTPException(status_code=403, detail="No autorizado para listar productos")

    query = {}
    if sede_id:
        query["sede_id"] = sede_id
    if franquicia_id:
        query["franquicia_id"] = franquicia_id

    productos = await collection_productos.find(query).to_list(None)
    return [producto_to_dict(p) for p in productos]


# =========================================================
# 🔹 Obtener producto por ID
# =========================================================
@router.get("/{producto_id}", response_model=dict)
async def obtener_producto(
    producto_id: str,
    current_user: dict = Depends(get_current_user)
):
    producto = await collection_productos.find_one({"_id": ObjectId(producto_id)})
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    return producto_to_dict(producto)


# =========================================================
# 🔹 Editar producto
# =========================================================
@router.put("/{producto_id}", response_model=dict)
async def editar_producto(
    producto_id: str,
    producto_data: Producto,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]
    if rol not in ["admin_sede", "admin_franquicia", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para editar productos")

    update_data = {k: v for k, v in producto_data.dict().items() if v is not None}

    result = await collection_productos.update_one(
        {"_id": ObjectId(producto_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    return {"msg": "Producto actualizado correctamente"}


# =========================================================
# 🔹 Eliminar producto
# =========================================================
@router.delete("/{producto_id}", response_model=dict)
async def eliminar_producto(
    producto_id: str,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]
    if rol not in ["admin_sede", "admin_franquicia", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para eliminar productos")

    result = await collection_productos.delete_one({"_id": ObjectId(producto_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    return {"msg": "Producto eliminado correctamente"}


# =========================================================
# 🔹 Productos con stock bajo
# =========================================================
@router.get("/stock-bajo", response_model=List[dict])
async def productos_stock_bajo(
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]
    if rol not in ["admin_sede", "admin_franquicia", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para consultar stock bajo")

    productos = await collection_productos.find({
        "$expr": {"$lt": ["$stock_actual", "$stock_minimo"]}
    }).to_list(None)

    # Emitir evento simulado
    for p in productos:
        print(f"⚠️ EVENTO: stock.low -> {p['nombre']} (stock {p['stock_actual']})")

    return [producto_to_dict(p) for p in productos]
