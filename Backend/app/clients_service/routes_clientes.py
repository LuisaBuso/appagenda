"""
Routes para gestión de clientes
Con IDs legibles multi-tenant y validaciones optimizadas
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from app.clients_service.models import Cliente, NotaCliente
from app.database.mongo import collection_clients, collection_citas
from app.auth.routes import get_current_user
from app.id_generator.generator import generar_id, validar_id
from datetime import datetime
from typing import List, Optional
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/clientes", tags=["Clientes"])


# =========================================================
# 🧩 Helpers
# =========================================================

def cliente_to_dict(c: dict) -> dict:
    """Convierte cliente de MongoDB a dict serializable"""
    c["_id"] = str(c["_id"])
    
    # Fallback para clientes antiguos sin cliente_id
    if "cliente_id" not in c or not c["cliente_id"]:
        c["cliente_id"] = str(c["_id"])
    
    return c


def cita_to_dict(c: dict) -> dict:
    """Convierte cita de MongoDB a dict serializable"""
    c["_id"] = str(c["_id"])
    return c


async def verificar_duplicado_cliente(
    correo: Optional[str] = None,
    telefono: Optional[str] = None,
    exclude_id: Optional[str] = None
) -> Optional[dict]:
    """
    Verifica si ya existe un cliente con el mismo correo o teléfono.
    
    Args:
        correo: Email a verificar
        telefono: Teléfono a verificar
        exclude_id: ID a excluir de la búsqueda (para ediciones)
    
    Returns:
        Cliente existente si lo encuentra, None en caso contrario
    """
    if not correo and not telefono:
        return None
    
    query = {"$or": []}
    
    if correo:
        query["$or"].append({"correo": correo})
    if telefono:
        query["$or"].append({"telefono": telefono})
    
    # Excluir el propio cliente si es una edición
    if exclude_id:
        try:
            query["_id"] = {"$ne": ObjectId(exclude_id)}
        except:
            pass
    
    return await collection_clients.find_one(query)


# =========================================================
# 📍 CRUD Endpoints
# =========================================================

@router.post("/", response_model=dict)
async def crear_cliente(
    cliente: Cliente,
    current_user: dict = Depends(get_current_user)
):
    """
    Crea un nuevo cliente con ID legible multi-tenant.
    
    Requiere rol: admin_sede, admin_franquicia, super_admin
    
    El ID generado sigue el formato:
    CL-<FRANQUICIA>-<SEDE>-<YYYYMM>-<SECUENCIA>
    
    Ejemplo: CL-MDE-001-202411-000123
    """
    try:
        # ========= VALIDACIÓN DE PERMISOS =========
        rol = current_user.get("rol")
        allowed_roles = ["admin_sede", "admin_franquicia", "super_admin"]
        
        if rol not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="No autorizado. Se requiere rol de administrador para crear clientes."
            )
        
        # ========= VALIDACIÓN DE DUPLICADOS =========
        existing = await verificar_duplicado_cliente(
            correo=cliente.correo,
            telefono=cliente.telefono
        )
        
        if existing:
            campo_duplicado = "correo" if cliente.correo == existing.get("correo") else "teléfono"
            raise HTTPException(
                status_code=400,
                detail=f"Ya existe un cliente con este {campo_duplicado}"
            )
        
        # ========= GENERAR ID LEGIBLE =========
        sede_id = current_user.get("sede_id", "000")
        
        try:
            cliente_id = await generar_id("cliente", sede_id)
        except Exception as e:
            logger.error(f"Error al generar ID de cliente: {e}")
            raise HTTPException(
                status_code=500,
                detail="Error al generar ID de cliente"
            )
        
        # ========= PREPARAR DATOS =========
        data = cliente.dict(exclude_none=True)
        data["cliente_id"] = cliente_id
        data["fecha_creacion"] = datetime.now()
        data["creado_por"] = current_user.get("email", "unknown")
        data["sede_id"] = sede_id
        
        # Inicializar arrays vacíos
        if "notas_historial" not in data:
            data["notas_historial"] = []
        
        # ========= INSERTAR EN BD =========
        result = await collection_clients.insert_one(data)
        data["_id"] = str(result.inserted_id)
        
        logger.info(f"Cliente creado: {cliente_id} por {current_user.get('email')}")
        
        return {
            "success": True,
            "msg": "Cliente creado exitosamente",
            "cliente": data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al crear cliente: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error al crear cliente: {str(e)}"
        )


@router.get("/", response_model=List[dict])
async def listar_clientes(
    sede_id: Optional[str] = Query(None, description="Filtrar por sede"),
    buscar: Optional[str] = Query(None, description="Buscar por nombre, correo o teléfono"),
    limite: int = Query(100, ge=1, le=500, description="Límite de resultados"),
    current_user: dict = Depends(get_current_user)
):
    """
    Lista todos los clientes con filtros opcionales.
    
    Permisos por rol:
    - super_admin: Ve todos los clientes
    - admin_franquicia: Ve solo clientes de su franquicia
    - admin_sede: Ve solo clientes de su sede
    """
    try:
        # ========= VALIDACIÓN DE PERMISOS =========
        rol = current_user.get("rol")
        allowed_roles = ["admin_sede", "admin_franquicia", "super_admin", "estilista"]
        
        if rol not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="No autorizado para listar clientes"
            )
        
        # ========= CONSTRUIR QUERY SEGÚN ROL =========
        query = {}
        
        # Super admin puede filtrar por cualquier sede/franquicia
        if rol == "super_admin":
            if sede_id:
                query["sede_id"] = sede_id

        
        # Admin franquicia solo ve su franquicia
        elif rol == "admin_franquicia":
            if sede_id:
                query["sede_id"] = sede_id
        
        # Admin sede y estilista solo ven su sede
        else:
            query["sede_id"] = current_user.get("sede_id")
        
        # ========= BÚSQUEDA POR TEXTO =========
        if buscar:
            query["$or"] = [
                {"nombre": {"$regex": buscar, "$options": "i"}},
                {"correo": {"$regex": buscar, "$options": "i"}},
                {"telefono": {"$regex": buscar, "$options": "i"}},
                {"cliente_id": {"$regex": buscar, "$options": "i"}}
            ]
        
        # ========= OBTENER CLIENTES =========
        clientes = await collection_clients.find(query).limit(limite).to_list(None)
        
        logger.info(
            f"Listado de {len(clientes)} clientes por {current_user.get('email')} "
            f"con filtros: {query}"
        )
        
        return [cliente_to_dict(c) for c in clientes]
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al listar clientes: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error al listar clientes"
        )


@router.get("/{cliente_id}", response_model=dict)
async def obtener_cliente(
    cliente_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene un cliente por su ID (MongoDB _id o cliente_id legible).
    
    Acepta ambos formatos:
    - ObjectId de MongoDB: "507f1f77bcf86cd799439011"
    - ID legible: "CL-MDE-001-202411-000123"
    """
    try:
        # ========= VALIDACIÓN DE PERMISOS =========
        rol = current_user.get("rol")
        allowed_roles = ["admin_sede", "admin_franquicia", "super_admin", "estilista"]
        
        if rol not in allowed_roles:
            raise HTTPException(status_code=403, detail="No autorizado")
        
        # ========= BUSCAR CLIENTE =========
        # Intentar primero como ID legible
        query = {"cliente_id": cliente_id}
        cliente = await collection_clients.find_one(query)
        
        # Si no se encuentra, intentar como ObjectId
        if not cliente:
            try:
                query = {"_id": ObjectId(cliente_id)}
                cliente = await collection_clients.find_one(query)
            except:
                pass
        
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
        # ========= VERIFICAR PERMISOS DE SEDE =========
        if rol == "admin_sede" or rol == "estilista":
            if cliente.get("sede_id") != current_user.get("sede_id"):
                raise HTTPException(
                    status_code=403,
                    detail="No tiene permisos para ver este cliente"
                )
        
        return cliente_to_dict(cliente)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener cliente {cliente_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener cliente")


@router.put("/{cliente_id}", response_model=dict)
async def editar_cliente(
    cliente_id: str,
    cliente_data: Cliente,
    current_user: dict = Depends(get_current_user)
):
    """
    Edita un cliente existente.
    
    Solo admin_sede, admin_franquicia y super_admin pueden editar.
    """
    try:
        # ========= VALIDACIÓN DE PERMISOS =========
        rol = current_user.get("rol")
        allowed_roles = ["admin_sede", "admin_franquicia", "super_admin"]
        
        if rol not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="No autorizado para editar clientes"
            )
        
        # ========= BUSCAR CLIENTE =========
        query = {"cliente_id": cliente_id}
        cliente_actual = await collection_clients.find_one(query)
        
        if not cliente_actual:
            try:
                query = {"_id": ObjectId(cliente_id)}
                cliente_actual = await collection_clients.find_one(query)
            except:
                pass
        
        if not cliente_actual:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
        # ========= VERIFICAR PERMISOS DE SEDE =========
        if rol == "admin_sede":
            if cliente_actual.get("sede_id") != current_user.get("sede_id"):
                raise HTTPException(
                    status_code=403,
                    detail="No tiene permisos para editar este cliente"
                )
        
        
        # ========= VALIDAR DUPLICADOS =========
        if cliente_data.correo or cliente_data.telefono:
            existing = await verificar_duplicado_cliente(
                correo=cliente_data.correo,
                telefono=cliente_data.telefono,
                exclude_id=str(cliente_actual["_id"])
            )
            
            if existing:
                campo = "correo" if cliente_data.correo == existing.get("correo") else "teléfono"
                raise HTTPException(
                    status_code=400,
                    detail=f"Ya existe otro cliente con este {campo}"
                )
        
        # ========= ACTUALIZAR DATOS =========
        update_data = {k: v for k, v in cliente_data.dict(exclude_none=True).items()}
        update_data["modificado_por"] = current_user.get("email")
        update_data["fecha_modificacion"] = datetime.now()
        
        # No permitir cambiar el cliente_id
        update_data.pop("cliente_id", None)
        
        result = await collection_clients.update_one(
            {"_id": cliente_actual["_id"]},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
        logger.info(
            f"Cliente {cliente_actual.get('cliente_id')} editado por "
            f"{current_user.get('email')}"
        )
        
        return {
            "success": True,
            "msg": "Cliente actualizado correctamente"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al editar cliente: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al editar cliente")


@router.post("/{cliente_id}/notas", response_model=dict)
async def agregar_nota_cliente(
    cliente_id: str,
    nota: NotaCliente,
    current_user: dict = Depends(get_current_user)
):
    """
    Agrega una nota al historial del cliente.
    
    Cualquier usuario autenticado puede agregar notas.
    """
    try:
        # Buscar cliente
        query = {"cliente_id": cliente_id}
        cliente = await collection_clients.find_one(query)
        
        if not cliente:
            try:
                query = {"_id": ObjectId(cliente_id)}
                cliente = await collection_clients.find_one(query)
            except:
                pass
        
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
        # Preparar nota
        nota_dict = nota.dict()
        nota_dict["fecha"] = datetime.now()
        nota_dict["autor"] = current_user.get("email", "unknown")
        
        # Agregar nota
        result = await collection_clients.update_one(
            {"_id": cliente["_id"]},
            {"$push": {"notas_historial": nota_dict}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
        logger.info(
            f"Nota agregada a cliente {cliente.get('cliente_id')} "
            f"por {current_user.get('email')}"
        )
        
        return {
            "success": True,
            "msg": "Nota agregada correctamente"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al agregar nota: {e}")
        raise HTTPException(status_code=500, detail="Error al agregar nota")


@router.get("/{cliente_id}/historial", response_model=List[dict])
async def historial_cliente(
    cliente_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el historial de citas de un cliente.
    
    Ordenado por fecha descendente (más recientes primero).
    """
    try:
        # ========= VALIDAR PERMISOS =========
        rol = current_user.get("rol")
        allowed_roles = ["admin_sede", "admin_franquicia", "super_admin", "estilista"]
        
        if rol not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="No autorizado para ver historial"
            )
        
        # ========= BUSCAR CITAS =========
        citas = await collection_citas.find({
            "cliente_id": cliente_id
        }).sort("fecha", -1).to_list(None)
        
        return [cita_to_dict(c) for c in citas]
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener historial: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener historial")