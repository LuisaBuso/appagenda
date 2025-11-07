from fastapi import APIRouter, HTTPException, Depends
from app.inventary.submodulos.orders.models import Pedido
from app.database.mongo import collection_pedidos, collection_productos
from app.auth.routes import get_current_user
from datetime import datetime
from typing import List
from bson import ObjectId

router = APIRouter(prefix="/pedidos")


# =========================================================
# 🧩 Helper para convertir ObjectId
# =========================================================
def pedido_to_dict(p):
    p["_id"] = str(p["_id"])
    return p


# =========================================================
# 🔹 Crear pedido
# =========================================================
@router.post("/", response_model=dict)
async def crear_pedido(
    pedido: Pedido,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]

    if rol not in ["admin_sede", "admin_franquicia", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para crear pedidos")

    data = pedido.dict()
    data["fecha_creacion"] = datetime.now()
    data["creado_por"] = current_user["email"]

    result = await collection_pedidos.insert_one(data)
    data["_id"] = str(result.inserted_id)

    # 🟢 Evento: pedido.created
    print(f"🟢 EVENTO: pedido.created -> {data['_id']}")

    return {"msg": "Pedido creado exitosamente", "pedido": data}


# =========================================================
# 🔹 Listar pedidos
# =========================================================
@router.get("/", response_model=List[dict])
async def listar_pedidos(
    sede_id: str = None,
    franquicia_id: str = None,
    estado: str = None,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]

    if rol not in ["admin_sede", "admin_franquicia", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para listar pedidos")

    query = {}
    if sede_id:
        query["sede_id"] = sede_id
    if franquicia_id:
        query["franquicia_id"] = franquicia_id
    if estado:
        query["estado"] = estado

    pedidos = await collection_pedidos.find(query).to_list(None)
    return [pedido_to_dict(p) for p in pedidos]


# =========================================================
# 🔹 Obtener pedido por ID
# =========================================================
@router.get("/{pedido_id}", response_model=dict)
async def obtener_pedido(
    pedido_id: str,
    current_user: dict = Depends(get_current_user)
):
    pedido = await collection_pedidos.find_one({"_id": ObjectId(pedido_id)})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    return pedido_to_dict(pedido)


# =========================================================
# 🔹 Actualizar estado de pedido
# =========================================================
@router.patch("/{pedido_id}/estado", response_model=dict)
async def actualizar_estado_pedido(
    pedido_id: str,
    nuevo_estado: str,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]

    if rol not in ["admin_sede", "admin_franquicia", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para actualizar pedidos")

    pedido = await collection_pedidos.find_one({"_id": ObjectId(pedido_id)})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    if nuevo_estado not in ["pendiente", "recibido", "cancelado"]:
        raise HTTPException(status_code=400, detail="Estado inválido")

    await collection_pedidos.update_one(
        {"_id": ObjectId(pedido_id)},
        {"$set": {"estado": nuevo_estado}}
    )

    # 🟡 Evento: pedido.received
    if nuevo_estado == "recibido":
        for item in pedido["items"]:
            producto = await collection_productos.find_one({"_id": ObjectId(item["producto_id"])})
            if producto:
                nuevo_stock = producto["stock_actual"] + item["cantidad"]
                await collection_productos.update_one(
                    {"_id": ObjectId(item["producto_id"])},
                    {"$set": {"stock_actual": nuevo_stock}}
                )
                print(f"📦 Stock actualizado -> {producto['nombre']}: +{item['cantidad']} unidades")
        print(f"🟡 EVENTO: pedido.received -> {pedido_id}")

    return {"msg": f"Pedido actualizado a estado '{nuevo_estado}'"}


# =========================================================
# 🔹 Eliminar pedido
# =========================================================
@router.delete("/{pedido_id}", response_model=dict)
async def eliminar_pedido(
    pedido_id: str,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]

    if rol not in ["admin_sede", "admin_franquicia", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para eliminar pedidos")

    result = await collection_pedidos.delete_one({"_id": ObjectId(pedido_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    return {"msg": "Pedido eliminado correctamente"}
