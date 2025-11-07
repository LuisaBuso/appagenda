from fastapi import APIRouter, HTTPException, Depends
from app.inventary.submodulos.exits.models import Salida
from app.database.mongo import collection_salidas, collection_productos
from app.auth.routes import get_current_user
from datetime import datetime
from typing import List
from bson import ObjectId

router = APIRouter(prefix="/salidas")


# =========================================================
# 🧩 Helper para formatear salida
# =========================================================
def salida_to_dict(s):
    s["_id"] = str(s["_id"])
    return s


# =========================================================
# 🔹 Crear salida de stock
# =========================================================
@router.post("/", response_model=dict)
async def crear_salida(
    salida: Salida,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]

    if rol not in ["admin_sede", "admin_franquicia", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para registrar salidas")

    data = salida.dict()
    data["fecha_creacion"] = datetime.now()
    data["creado_por"] = current_user["email"]

    # 🔻 Descontar stock por cada producto
    for item in salida.items:
        producto = await collection_productos.find_one({"_id": ObjectId(item["producto_id"])})
        if not producto:
            raise HTTPException(status_code=404, detail=f"Producto no encontrado ({item['producto_id']})")

        nuevo_stock = producto["stock_actual"] - item["cantidad"]
        if nuevo_stock < 0:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para {producto['nombre']}")

        await collection_productos.update_one(
            {"_id": ObjectId(item["producto_id"])},
            {"$set": {"stock_actual": nuevo_stock}}
        )

        print(f"📉 Stock actualizado -> {producto['nombre']}: -{item['cantidad']} unidades")

    result = await collection_salidas.insert_one(data)
    data["_id"] = str(result.inserted_id)

    print(f"🔴 EVENTO: salida.created -> {data['_id']} (motivo: {data['motivo']})")

    return {"msg": "Salida registrada exitosamente", "salida": data}


# =========================================================
# 🔹 Listar salidas
# =========================================================
@router.get("/", response_model=List[dict])
async def listar_salidas(
    sede_id: str = None,
    franquicia_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]
    if rol not in ["admin_sede", "admin_franquicia", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para listar salidas")

    query = {}
    if sede_id:
        query["sede_id"] = sede_id
    if franquicia_id:
        query["franquicia_id"] = franquicia_id

    salidas = await collection_salidas.find(query).to_list(None)
    return [salida_to_dict(s) for s in salidas]


# =========================================================
# 🔹 Obtener salida por ID
# =========================================================
@router.get("/{salida_id}", response_model=dict)
async def obtener_salida(
    salida_id: str,
    current_user: dict = Depends(get_current_user)
):
    salida = await collection_salidas.find_one({"_id": ObjectId(salida_id)})
    if not salida:
        raise HTTPException(status_code=404, detail="Salida no encontrada")

    return salida_to_dict(salida)


# =========================================================
# 🔹 Eliminar salida (reversión manual opcional)
# =========================================================
@router.delete("/{salida_id}", response_model=dict)
async def eliminar_salida(
    salida_id: str,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]

    if rol != "super_admin":
        raise HTTPException(status_code=403, detail="Solo super_admin puede eliminar salidas")

    result = await collection_salidas.delete_one({"_id": ObjectId(salida_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Salida no encontrada")

    print(f"🗑️ Salida eliminada -> {salida_id}")

    return {"msg": "Salida eliminada correctamente"}
