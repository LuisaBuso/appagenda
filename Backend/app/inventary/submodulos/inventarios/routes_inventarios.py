from fastapi import APIRouter, HTTPException, Depends, Query
from app.inventary.submodulos.inventarios.models import AjusteInventario, Inventario
from app.database.mongo import collection_inventarios, collection_productos
from app.auth.routes import get_current_user
from datetime import datetime
from typing import List, Optional
from bson import ObjectId

router = APIRouter(prefix="/inventarios")


# =========================================================
# 🧩 Helper para convertir ObjectId
# =========================================================
def inventario_to_dict(inv):
    inv["_id"] = str(inv["_id"])
    return inv


# =========================================================
# 📊 Listar inventario (con lógica multi-sede)
# =========================================================
@router.get("/", response_model=List[dict])
async def listar_inventario(
    sede_id: Optional[str] = Query(None, description="Filtrar por sede específica"),
    stock_bajo: Optional[bool] = Query(None, description="Solo productos con stock bajo"),
    current_user: dict = Depends(get_current_user)
):
    """
    Lista el inventario según el rol:
    - admin_sede: Ve solo el inventario de SU sede (filtro automático)
    - super_admin: Ve inventario consolidado de todas las sedes o filtra por sede_id
    """
    rol = current_user.get("rol")
    
    if rol not in ["admin_sede", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para consultar inventario")
    
    # 🔐 Filtro automático por sede para admin_sede
    query = {}
    if rol == "admin_sede":
        user_sede_id = current_user.get("sede_id")
        if not user_sede_id:
            raise HTTPException(status_code=403, detail="Usuario sin sede asignada")
        query["sede_id"] = user_sede_id
    elif sede_id:  # super_admin puede filtrar por sede
        query["sede_id"] = sede_id
    
    # Filtro de stock bajo
    if stock_bajo:
        inventarios = await collection_inventarios.find(query).to_list(None)
        inventarios = [inv for inv in inventarios if inv["stock_actual"] < inv["stock_minimo"]]
    else:
        inventarios = await collection_inventarios.find(query).to_list(None)
    
    # Enriquecer con info del producto
    resultado = []
    for inv in inventarios:
        inv_dict = inventario_to_dict(inv)
        
        # Buscar info del producto usando 'id'
        producto = await collection_productos.find_one({"id": inv["producto_id"]})
        if producto:
            inv_dict["producto_nombre"] = producto.get("nombre")
            inv_dict["producto_codigo"] = producto.get("tipo_codigo")
            inv_dict["categoria"] = producto.get("categoria")
        
        resultado.append(inv_dict)
    
    return resultado


# =========================================================
# 📊 Ver inventario consolidado (SOLO SUPER_ADMIN)
# =========================================================
@router.get("/consolidado", response_model=List[dict])
async def inventario_consolidado(
    current_user: dict = Depends(get_current_user)
):
    """
    Muestra el stock total de cada producto sumando todas las sedes.
    Solo super_admin puede ver esto.
    """
    rol = current_user.get("rol")
    
    if rol != "super_admin":
        raise HTTPException(status_code=403, detail="Solo super_admin puede ver inventario consolidado")
    
    # Agregación: suma stock por producto_id
    pipeline = [
        {
            "$group": {
                "_id": "$producto_id",
                "stock_total": {"$sum": "$stock_actual"},
                "stock_minimo_promedio": {"$avg": "$stock_minimo"},
                "sedes": {"$addToSet": "$sede_id"}
            }
        }
    ]
    
    resultado = await collection_inventarios.aggregate(pipeline).to_list(None)
    
    # Enriquecer con info del producto
    consolidado = []
    for item in resultado:
        producto = await collection_productos.find_one({"id": item["_id"]})
        if producto:
            consolidado.append({
                "producto_id": item["_id"],
                "producto_nombre": producto.get("nombre"),
                "producto_codigo": producto.get("tipo_codigo"),
                "stock_total": item["stock_total"],
                "stock_minimo_promedio": round(item["stock_minimo_promedio"], 2),
                "numero_sedes": len(item["sedes"]),
                "sedes": item["sedes"]
            })
    
    return consolidado


# =========================================================
# ➕ Crear inventario inicial (admin_sede y super_admin)
# =========================================================
@router.post("/", response_model=dict)
async def crear_inventario(
    inventario: Inventario,
    current_user: dict = Depends(get_current_user)
):
    """
    Crea el registro inicial de inventario para un producto en una sede.
    admin_sede: Solo puede crear para SU sede (filtro automático)
    super_admin: Puede crear para cualquier sede
    """
    rol = current_user.get("rol")
    
    if rol not in ["admin_sede", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para crear inventario")
    
    data = inventario.dict()
    
    # 🔐 Filtro automático: admin_sede solo puede crear para su sede
    if rol == "admin_sede":
        user_sede_id = current_user.get("sede_id")
        if not user_sede_id:
            raise HTTPException(status_code=403, detail="Usuario sin sede asignada")
        data["sede_id"] = user_sede_id  # Forzar sede del usuario
    elif not data.get("sede_id"):
        raise HTTPException(status_code=400, detail="Debe especificar sede_id")
    
    # Validar que el producto existe
    producto = await collection_productos.find_one({"id": data["producto_id"]})
    if not producto:
        raise HTTPException(status_code=404, detail=f"Producto {data['producto_id']} no encontrado")
    
    # Validar que no exista ya un inventario para ese producto en esa sede
    existe = await collection_inventarios.find_one({
        "producto_id": data["producto_id"],
        "sede_id": data["sede_id"]
    })
    
    if existe:
        raise HTTPException(
            status_code=400, 
            detail=f"Ya existe inventario para {producto['nombre']} en la sede {data['sede_id']}. Use el endpoint de ajuste para modificar el stock."
        )
    
    # Construir documento en el orden correcto
    documento = {
        "nombre": producto["nombre"],
        "producto_id": data["producto_id"],
        "sede_id": data["sede_id"],
        "stock_actual": data["stock_actual"],
        "stock_minimo": data["stock_minimo"],
        "fecha_creacion": datetime.now(),
        "fecha_ultima_actualizacion": datetime.now(),
        "creado_por": current_user["email"]
    }
    
    # Insertar
    result = await collection_inventarios.insert_one(documento)
    documento["_id"] = str(result.inserted_id)
    
    print(f"✅ Inventario creado: {producto['nombre']} - Sede {documento['sede_id']} - Stock inicial: {documento['stock_actual']}")
    
    return {
        "msg": "Inventario creado exitosamente",
        "inventario": documento
    }


# =========================================================
# 🔧 Ajuste manual de inventario (admin_sede y super_admin)
# =========================================================
@router.patch("/{inventario_id}/ajustar", response_model=dict)
async def ajustar_inventario(
    inventario_id: str,
    ajuste: AjusteInventario,
    current_user: dict = Depends(get_current_user)
):
    """
    Permite ajustes manuales de stock (sumar o restar).
    admin_sede: Solo puede ajustar inventario de SU sede
    super_admin: Puede ajustar cualquier sede
    
    Nota: Los ajustes NO se registran en inventory_motions para mantener
    esa colección limpia solo con movimientos operacionales (ventas, pedidos).
    """
    rol = current_user.get("rol")
    
    if rol not in ["admin_sede", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para ajustar inventario")
    
    # Buscar inventario
    inventario = await collection_inventarios.find_one({"_id": ObjectId(inventario_id)})
    if not inventario:
        raise HTTPException(status_code=404, detail="Inventario no encontrado")
    
    # 🔐 Validar que admin_sede solo ajuste su propia sede
    if rol == "admin_sede":
        user_sede_id = current_user.get("sede_id")
        if not user_sede_id:
            raise HTTPException(status_code=403, detail="Usuario sin sede asignada")
        if inventario["sede_id"] != user_sede_id:
            raise HTTPException(
                status_code=403, 
                detail="No puede ajustar inventario de otra sede"
            )
    
    # Calcular nuevo stock
    nuevo_stock = inventario["stock_actual"] + ajuste.cantidad_ajuste
    
    if nuevo_stock < 0:
        raise HTTPException(
            status_code=400, 
            detail=f"El ajuste resultaría en stock negativo ({nuevo_stock})"
        )
    
    # Actualizar
    await collection_inventarios.update_one(
        {"_id": ObjectId(inventario_id)},
        {
            "$set": {
                "stock_actual": nuevo_stock,
                "fecha_ultima_actualizacion": datetime.now()
            }
        }
    )
    
    operacion = "agregó" if ajuste.cantidad_ajuste > 0 else "restó"
    print(f"🔧 AJUSTE MANUAL: {inventario['sede_id']} - {inventario.get('nombre', 'N/A')} - Se {operacion} {abs(ajuste.cantidad_ajuste)} unidades (Usuario: {current_user['email']})")
    
    return {
        "msg": "Ajuste aplicado correctamente",
        "producto_nombre": inventario.get("nombre"),
        "stock_anterior": inventario["stock_actual"],
        "stock_nuevo": nuevo_stock,
        "ajuste_realizado": ajuste.cantidad_ajuste
    }


# =========================================================
# ⚠️ Alertas de stock bajo
# =========================================================
@router.get("/alertas/stock-bajo", response_model=List[dict])
async def alertas_stock_bajo(
    current_user: dict = Depends(get_current_user)
):
    """
    Lista productos con stock bajo en la sede del usuario.
    admin_sede: Solo su sede
    super_admin: Todas las sedes
    """
    rol = current_user.get("rol")
    
    if rol not in ["admin_sede", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Filtro por sede si es admin_sede
    query = {}
    if rol == "admin_sede":
        user_sede_id = current_user.get("sede_id")
        if not user_sede_id:
            raise HTTPException(status_code=403, detail="Usuario sin sede asignada")
        query["sede_id"] = user_sede_id
    
    # Buscar productos con stock bajo
    inventarios = await collection_inventarios.find(query).to_list(None)
    alertas = []
    
    for inv in inventarios:
        if inv["stock_actual"] < inv["stock_minimo"]:
            inv_dict = inventario_to_dict(inv)
            
            # Enriquecer con info del producto usando 'id'
            producto = await collection_productos.find_one({"id": inv["producto_id"]})
            if producto:
                inv_dict["producto_nombre"] = producto.get("nombre")
                inv_dict["producto_codigo"] = producto.get("tipo_codigo")
                inv_dict["diferencia"] = inv["stock_minimo"] - inv["stock_actual"]
            
            alertas.append(inv_dict)
            print(f"⚠️ ALERTA STOCK BAJO: {inv['sede_id']} - {producto.get('nombre', 'N/A')} ({inv['stock_actual']}/{inv['stock_minimo']})")
    
    return alertas


# =========================================================
# 📦 Obtener inventario específico por producto y sede
# =========================================================
@router.get("/producto/{producto_id}", response_model=dict)
async def obtener_inventario_producto(
    producto_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el inventario de un producto específico en la sede del usuario.
    """
    rol = current_user.get("rol")
    
    if rol not in ["admin_sede", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Construir query
    query = {"producto_id": producto_id}
    
    if rol == "admin_sede":
        user_sede_id = current_user.get("sede_id")
        if not user_sede_id:
            raise HTTPException(status_code=403, detail="Usuario sin sede asignada")
        query["sede_id"] = user_sede_id
    
    inventario = await collection_inventarios.find_one(query)
    
    if not inventario:
        return {
            "producto_id": producto_id,
            "sede_id": current_user.get("sede_id") if rol == "admin_sede" else None,
            "stock_actual": 0,
            "stock_minimo": 0,
            "existe_registro": False
        }
    
    inv_dict = inventario_to_dict(inventario)
    inv_dict["existe_registro"] = True
    
    # Agregar info del producto usando 'id'
    producto = await collection_productos.find_one({"id": producto_id})
    if producto:
        inv_dict["producto_nombre"] = producto.get("nombre")
        inv_dict["producto_codigo"] = producto.get("tipo_codigo")
    
    return inv_dict