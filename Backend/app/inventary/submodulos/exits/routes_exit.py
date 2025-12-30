from fastapi import APIRouter, HTTPException, Depends
from app.inventary.submodulos.exits.models import Salida
from app.database.mongo import collection_salidas, collection_productos, collection_inventarios
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
# 📤 Crear salida de stock (DESCUENTA DE INVENTARIOS)
# =========================================================
@router.post("/", response_model=dict)
async def crear_salida(
    salida: Salida,
    current_user: dict = Depends(get_current_user)
):
    """
    Registra una salida de stock (venta, uso interno, ajuste).
    Descuenta del inventario de la sede.
    admin_sede: Solo puede crear salidas para SU sede (filtro automático)
    super_admin: Puede crear salidas para cualquier sede
    """
    rol = current_user["rol"]

    if rol not in ["admin_sede", "admin_franquicia", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para registrar salidas")

    data = salida.dict()
    
    # 🔐 Filtro automático: admin_sede solo puede crear salidas para su sede
    if rol == "admin_sede":
        user_sede_id = current_user.get("sede_id")
        if not user_sede_id:
            raise HTTPException(status_code=403, detail="Usuario sin sede asignada")
        data["sede_id"] = user_sede_id  # Forzar sede del usuario
    elif not data.get("sede_id"):
        raise HTTPException(status_code=400, detail="Debe especificar sede_id")
    
    data["fecha_creacion"] = datetime.now()
    data["creado_por"] = current_user["email"]

    # 📉 Descontar stock del INVENTARIO de la sede (no de productos)
    for item in salida.items:
        # Validar que el producto existe
        producto = await collection_productos.find_one({"_id": ObjectId(item.producto_id)})
        if not producto:
            raise HTTPException(
                status_code=404, 
                detail=f"Producto no encontrado ({item.producto_id})"
            )

        # Buscar inventario de la sede
        inventario = await collection_inventarios.find_one({
            "producto_id": item.producto_id,
            "sede_id": data["sede_id"]
        })
        
        if not inventario:
            raise HTTPException(
                status_code=404,
                detail=f"No existe inventario para {producto['nombre']} en esta sede. Debe crear un pedido primero."
            )

        nuevo_stock = inventario["stock_actual"] - item.cantidad
        if nuevo_stock < 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Stock insuficiente para {producto['nombre']} en esta sede (disponible: {inventario['stock_actual']})"
            )

        # Actualizar inventario
        await collection_inventarios.update_one(
            {"_id": inventario["_id"]},
            {
                "$set": {
                    "stock_actual": nuevo_stock,
                    "fecha_ultima_actualizacion": datetime.now()
                }
            }
        )

        print(f"📉 Stock actualizado en inventario -> {data['sede_id']} - {producto['nombre']}: -{item.cantidad} unidades")

    result = await collection_salidas.insert_one(data)
    data["_id"] = str(result.inserted_id)

    print(f"🔴 EVENTO: salida.created -> {data['_id']} (motivo: {data['motivo']}, sede: {data['sede_id']})")

    return {"msg": "Salida registrada exitosamente", "salida": data}


# =========================================================
# 📤 Listar salidas (FILTRO AUTOMÁTICO POR SEDE)
# =========================================================
@router.get("/", response_model=List[dict])
async def listar_salidas(
    sede_id: str = None,
    franquicia_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Lista salidas:
    - admin_sede: Solo ve salidas de SU sede (filtro automático)
    - super_admin: Ve todas las salidas o filtra por sede_id/franquicia_id
    """
    rol = current_user["rol"]
    
    if rol not in ["admin_sede", "admin_franquicia", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para listar salidas")

    query = {}
    
    # 🔐 Filtro automático por sede para admin_sede
    if rol == "admin_sede":
        user_sede_id = current_user.get("sede_id")
        if not user_sede_id:
            raise HTTPException(status_code=403, detail="Usuario sin sede asignada")
        query["sede_id"] = user_sede_id
    else:
        # super_admin puede filtrar manualmente
        if sede_id:
            query["sede_id"] = sede_id
        if franquicia_id:
            query["franquicia_id"] = franquicia_id

    salidas = await collection_salidas.find(query).to_list(None)
    return [salida_to_dict(s) for s in salidas]


# =========================================================
# 📤 Obtener salida por ID
# =========================================================
@router.get("/{salida_id}", response_model=dict)
async def obtener_salida(
    salida_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene una salida específica.
    admin_sede: Solo puede ver salidas de su sede
    """
    rol = current_user.get("rol")
    
    salida = await collection_salidas.find_one({"_id": ObjectId(salida_id)})
    if not salida:
        raise HTTPException(status_code=404, detail="Salida no encontrada")
    
    # 🔐 Validar que admin_sede solo vea salidas de su sede
    if rol == "admin_sede":
        user_sede_id = current_user.get("sede_id")
        if salida.get("sede_id") != user_sede_id:
            raise HTTPException(status_code=403, detail="No autorizado para ver esta salida")

    return salida_to_dict(salida)


# =========================================================
# 📤 Eliminar salida (SOLO SUPER_ADMIN)
# =========================================================
@router.delete("/{salida_id}", response_model=dict)
async def eliminar_salida(
    salida_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Elimina una salida.
    Solo super_admin puede eliminar salidas.
    ⚠️ No revierte el stock automáticamente (debe hacerse manualmente).
    """
    rol = current_user["rol"]

    if rol != "super_admin":
        raise HTTPException(status_code=403, detail="Solo super_admin puede eliminar salidas")

    result = await collection_salidas.delete_one({"_id": ObjectId(salida_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Salida no encontrada")

    print(f"🗑️ Salida eliminada -> {salida_id}")

    return {"msg": "Salida eliminada correctamente (stock NO revertido automáticamente)"}