from fastapi import APIRouter, HTTPException, Depends, Query
from app.inventary.submodulos.products.models import Producto
from app.database.mongo import collection_productos
from app.auth.routes import get_current_user
from datetime import datetime
from typing import List, Optional,Dict
from bson import ObjectId

router = APIRouter(prefix="/productos")


# =========================================================
# 🧩 Helper para convertir ObjectId
# =========================================================
def producto_to_dict(p):
    p["_id"] = str(p["_id"])
    return p


# =========================================================
# 🧩 Obtener precio según moneda
# =========================================================
def get_precio_moneda(producto: dict, moneda: str = "COP") -> float:
    """
    Obtiene el precio del producto en la moneda especificada.
    Si no existe esa moneda, retorna 0.
    """
    precios = producto.get("precios", {})
    if precios and isinstance(precios, dict):
        return precios.get(moneda, 0)
    
    return 0


# =========================================================
# 🔹 Crear producto (SOLO SUPER_ADMIN)
# =========================================================
@router.post("/", response_model=dict)
async def crear_producto(
    producto: Producto,
    current_user: dict = Depends(get_current_user)
):
    """
    Crea un producto global con precios en múltiples monedas.
    Solo super_admin puede crear productos.
    """
    rol = current_user.get("rol")

    # ⚠️ SOLO super_admin puede crear productos
    if rol != "super_admin":
        raise HTTPException(
            status_code=403, 
            detail="Solo super_admin puede crear productos"
        )

    # Evitar duplicados por nombre o código
    filtro = {"nombre": producto.nombre}
    if producto.codigo:
        filtro["codigo"] = producto.codigo

    existente = await collection_productos.find_one(filtro)
    if existente:
        raise HTTPException(
            status_code=400, 
            detail="Ya existe un producto con ese nombre o código"
        )

    # Preparar datos
    data = producto.dict(exclude_none=True)
    data["fecha_creacion"] = datetime.now()
    data["creado_por"] = current_user["email"]

    result = await collection_productos.insert_one(data)
    data["_id"] = str(result.inserted_id)

    return {"msg": "Producto creado exitosamente", "producto": data}


# =========================================================
# 🔹 Listar productos (con conversión de moneda opcional)
# =========================================================
@router.get("/", response_model=List[dict])
async def listar_productos(
    sede_id: Optional[str] = None,
    franquicia_id: Optional[str] = None,
    moneda: Optional[str] = Query(None, description="Moneda para mostrar precio (COP, USD, MXN)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Lista productos disponibles.
    Si se especifica 'moneda', agrega el campo 'precio_local' con el precio convertido.
    """
    rol = current_user.get("rol")
    if rol not in ["admin_sede", "admin_franquicia", "super_admin", "estilista"]:
        raise HTTPException(
            status_code=403, 
            detail="No autorizado para listar productos"
        )

    query = {}
    if sede_id:
        query["sede_id"] = sede_id
    if franquicia_id:
        query["franquicia_id"] = franquicia_id

    productos = await collection_productos.find(query).to_list(None)
    resultado = []
    
    for p in productos:
        p_dict = producto_to_dict(p)
        
        # Si se especifica moneda, agregar precio_local
        if moneda:
            p_dict["precio_local"] = get_precio_moneda(p, moneda)
            p_dict["moneda_local"] = moneda
        
        resultado.append(p_dict)
    
    return resultado


# =========================================================
# 🔹 Obtener producto por ID
# =========================================================
@router.get("/{producto_id}", response_model=dict)
async def obtener_producto(
    producto_id: str,
    moneda: Optional[str] = Query(None, description="Moneda para mostrar precio"),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene un producto específico por ID.
    Puede incluir conversión de moneda.
    """
    producto = await collection_productos.find_one({"_id": ObjectId(producto_id)})
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    p_dict = producto_to_dict(producto)
    
    # Si se especifica moneda, agregar precio_local
    if moneda:
        p_dict["precio_local"] = get_precio_moneda(producto, moneda)
        p_dict["moneda_local"] = moneda
    
    return p_dict


# =========================================================
# 🔹 Editar producto (SOLO SUPER_ADMIN)
# =========================================================
@router.put("/{producto_id}", response_model=dict)
async def editar_producto(
    producto_id: str,
    producto_data: Producto,
    current_user: dict = Depends(get_current_user)
):
    """
    Edita un producto.
    Solo super_admin puede editar productos.
    """
    rol = current_user.get("rol")
    if rol != "super_admin":
        raise HTTPException(
            status_code=403, 
            detail="Solo super_admin puede editar productos"
        )

    update_data = {k: v for k, v in producto_data.dict(exclude_none=True).items() if v is not None}

    result = await collection_productos.update_one(
        {"_id": ObjectId(producto_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    return {"msg": "Producto actualizado correctamente"}


# =========================================================
# 🔹 Eliminar producto (SOLO SUPER_ADMIN)
# =========================================================
@router.delete("/{producto_id}", response_model=dict)
async def eliminar_producto(
    producto_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Elimina un producto.
    Solo super_admin puede eliminar productos.
    """
    rol = current_user.get("rol")
    if rol != "super_admin":
        raise HTTPException(
            status_code=403, 
            detail="Solo super_admin puede eliminar productos"
        )

    result = await collection_productos.delete_one({"_id": ObjectId(producto_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    return {"msg": "Producto eliminado correctamente"}


# =========================================================
# 🔹 Productos con stock bajo
# =========================================================
@router.get("/alertas/stock-bajo", response_model=List[dict])
async def productos_stock_bajo(
    moneda: Optional[str] = Query(None, description="Moneda para mostrar precios"),
    current_user: dict = Depends(get_current_user)
):
    """
    Lista productos con stock bajo (stock_actual < stock_minimo).
    """
    rol = current_user.get("rol")
    if rol not in ["admin_sede", "admin_franquicia", "super_admin"]:
        raise HTTPException(
            status_code=403, 
            detail="No autorizado para consultar stock bajo"
        )

    productos = await collection_productos.find({
        "$expr": {"$lt": ["$stock_actual", "$stock_minimo"]}
    }).to_list(None)

    resultado = []
    for p in productos:
        p_dict = producto_to_dict(p)
        
        # Agregar precio en moneda solicitada
        if moneda:
            p_dict["precio_local"] = get_precio_moneda(p, moneda)
            p_dict["moneda_local"] = moneda
        
        # Emitir evento
        print(f"⚠️ ALERTA: {p['nombre']} - Stock: {p['stock_actual']}/{p['stock_minimo']}")
        
        resultado.append(p_dict)

    return resultado


# =========================================================
# 🔹 Actualizar precios de un producto (SUPER_ADMIN)
# =========================================================
@router.patch("/{producto_id}/precios", response_model=dict)
async def actualizar_precios(
    producto_id: str,
    precios: Dict[str, float],
    current_user: dict = Depends(get_current_user)
):
    """
    Actualiza solo los precios de un producto.
    Permite agregar nuevas monedas sin afectar las existentes.
    
    Ejemplo: {"USD": 65.00, "EUR": 58.00}
    """
    rol = current_user.get("rol")
    if rol != "super_admin":
        raise HTTPException(
            status_code=403, 
            detail="Solo super_admin puede actualizar precios"
        )

    # Obtener producto actual
    producto = await collection_productos.find_one({"_id": ObjectId(producto_id)})
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Merge de precios existentes con nuevos
    precios_actuales = producto.get("precios", {}) or {}
    precios_actuales.update(precios)

    result = await collection_productos.update_one(
        {"_id": ObjectId(producto_id)},
        {"$set": {"precios": precios_actuales}}
    )

    return {
        "msg": "Precios actualizados correctamente",
        "precios": precios_actuales
    }