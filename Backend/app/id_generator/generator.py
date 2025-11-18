"""
Generador de IDs Universal Multi-tenant (Sistema Híbrido)
==========================================================

Sistema robusto que genera IDs cortos NO secuenciales con expansión automática.
Formato: <PREFIJO>-<NUMERO>
Ejemplos: CL-00247, SV-04891, ES-123456

✅ Características:
- IDs cortos inicialmente (5 dígitos): CL-00001 a CL-99999
- Expansión automática cuando se agota: CL-000001 (6 dígitos)
- NO secuenciales (usa shuffle aleatorio para seguridad)
- Compatible con IDs antiguos largos (13-18 dígitos)
- Thread-safe con MongoDB

📦 USO:
    from app.id_generator.generator import generar_id
    
    id_cliente = await generar_id("cliente")      # CL-00247
    id_servicio = await generar_id("servicio")    # SV-04891
    id_estilista = await generar_id("estilista")  # ES-12456
"""
from datetime import datetime
from typing import Optional, Literal
import logging
import secrets
import random
from app.database.mongo import db

logger = logging.getLogger(__name__)

# ====================================================================
# CONFIGURACIÓN CENTRAL
# ====================================================================

# Colección MongoDB para secuencias y tracking
collection_ids = db["generated_ids"]
collection_sequences = db["id_sequences"]

# Configuración de longitud inicial y expansión
INITIAL_LENGTH = 5  # CL-00001 a CL-99999 (99,999 IDs)
MAX_LENGTH = 10     # Máximo: CL-0000000001 (10 mil millones)

# Reintentos máximos ante colisión
MAX_RETRIES = 10


# ====================================================================
# PREFIJOS POR ENTIDAD
# ====================================================================

PREFIJOS_VALIDOS = {
    # Core Business
    "cliente": "CL",
    "cita": "CT",
    "servicio": "SV",
    "producto": "PR",
    "estilista": "ES",
    "profesional": "ES",
    
    # Ventas y Finanzas
    "factura": "FC",
    "venta": "VT",
    "pago": "PG",
    
    # Inventario
    "inventario": "IN",
    "pedido": "PD",
    "movimiento": "MV",
    "proveedor": "PV",
    
    # Organización
    "sede": "SD",
    "local": "SD",
    
    # Adicionales
    "promocion": "PM",
    "descuento": "DC",
    "categoria": "CG",
    "nota": "NT",
    "recordatorio": "RC",
    "notificacion": "NF",
    "reporte": "RP",
    "usuario": "US",
}

TipoEntidad = Literal[
    "cliente", "cita", "servicio", "producto", "estilista", "profesional",
    "factura", "venta", "pago", "inventario", "pedido", "movimiento", "proveedor",
    "sede", "local", "promocion", "descuento", "categoria",
    "nota", "recordatorio", "notificacion", "reporte", "usuario"
]


# ====================================================================
# GENERADOR DE NÚMEROS NO SECUENCIALES
# ====================================================================

async def _obtener_siguiente_numero(prefijo: str, longitud: int) -> Optional[int]:
    """
    Obtiene el siguiente número disponible NO secuencial para un prefijo.
    
    Usa un pool de números aleatorios pre-generado y los va consumiendo.
    Cuando se agota, expande a más dígitos.
    
    Args:
        prefijo: Prefijo de la entidad (CL, SV, etc.)
        longitud: Longitud actual de números (5, 6, 7, etc.)
    
    Returns:
        Siguiente número disponible o None si se agotó el rango
    """
    key = f"{prefijo}-{longitud}"
    
    # Buscar o crear el pool de números
    pool_doc = await collection_sequences.find_one({"_id": key})
    
    if not pool_doc:
        # Crear nuevo pool de números aleatorios
        max_num = 10 ** longitud - 1  # 99999 para longitud 5
        min_num = 10 ** (longitud - 1) if longitud > 1 else 1  # 10000 para longitud 5
        
        # Generar todos los números posibles y mezclarlos
        numeros = list(range(min_num, max_num + 1))
        random.shuffle(numeros)  # Aleatorizar para seguridad
        
        pool_doc = {
            "_id": key,
            "prefijo": prefijo,
            "longitud": longitud,
            "pool": numeros,
            "usado_count": 0,
            "created_at": datetime.now()
        }
        
        await collection_sequences.insert_one(pool_doc)
        logger.info(f"✨ Nuevo pool creado para {key}: {len(numeros)} números")
    
    # Obtener siguiente número del pool
    pool = pool_doc.get("pool", [])
    
    if not pool:
        # Pool agotado, necesita expansión
        logger.warning(f"⚠️ Pool agotado para {key}, necesita expansión")
        return None
    
    # Tomar el primer número disponible (ya está aleatorizado)
    numero = pool[0]
    
    # Remover número del pool atómicamente
    result = await collection_sequences.update_one(
        {"_id": key},
        {
            "$pop": {"pool": -1},  # Remover primer elemento
            "$inc": {"usado_count": 1}
        }
    )
    
    if result.modified_count > 0:
        return numero
    
    return None


async def _generar_numero_no_secuencial(prefijo: str) -> str:
    """
    Genera un número NO secuencial con expansión automática.
    
    Proceso:
    1. Intenta con longitud actual (5 dígitos)
    2. Si se agota, expande a 6 dígitos
    3. Y así sucesivamente hasta MAX_LENGTH
    
    Returns:
        Número como string: "00247", "004891", etc.
    """
    for longitud in range(INITIAL_LENGTH, MAX_LENGTH + 1):
        numero = await _obtener_siguiente_numero(prefijo, longitud)
        
        if numero is not None:
            # Formatear con ceros a la izquierda
            return str(numero).zfill(longitud)
        
        # Pool agotado, intentar con siguiente longitud
        logger.info(f"📈 Expandiendo {prefijo} a {longitud + 1} dígitos")
    
    # Si llegamos aquí, se agotaron TODAS las combinaciones (muy improbable)
    raise RuntimeError(
        f"Se agotaron todas las combinaciones para {prefijo} "
        f"(hasta {MAX_LENGTH} dígitos)"
    )


# ====================================================================
# FUNCIONES PRINCIPALES
# ====================================================================

async def generar_id(
    entidad: TipoEntidad,
    franquicia_id: Optional[str] = None,
    sede_id: Optional[str] = None,
    metadata: Optional[dict] = None
) -> str:
    """
    Genera un ID único corto NO secuencial.
    
    Args:
        entidad: Tipo de entidad (cliente, cita, servicio, etc.)
        franquicia_id: ID de franquicia (opcional, para metadata)
        sede_id: ID de sede (opcional, para metadata)
        metadata: Datos adicionales para guardar (opcional)
    
    Returns:
        str: ID formato "PREFIJO-NUMERO" (ej: "CL-00247")
    
    Raises:
        ValueError: Si la entidad no es válida
        RuntimeError: Si no se pudo generar ID después de reintentos
    
    Examples:
        >>> await generar_id("cliente")
        "CL-00247"
        
        >>> await generar_id("servicio")
        "SV-04891"
        
        >>> await generar_id("estilista")
        "ES-12456"
    """
    try:
        # Validar entidad
        entidad_lower = entidad.lower()
        if entidad_lower not in PREFIJOS_VALIDOS:
            entidades_validas = ", ".join(sorted(PREFIJOS_VALIDOS.keys()))
            raise ValueError(
                f"Entidad '{entidad}' no válida. "
                f"Entidades disponibles: {entidades_validas}"
            )
        
        prefijo = PREFIJOS_VALIDOS[entidad_lower]
        
        # Intentar generar ID único con sistema de retry
        for intento in range(1, MAX_RETRIES + 1):
            # Generar número NO secuencial
            numero = await _generar_numero_no_secuencial(prefijo)
            id_completo = f"{prefijo}-{numero}"
            
            # Verificar unicidad e insertar atómicamente
            try:
                documento = {
                    "_id": id_completo,
                    "entidad": entidad_lower,
                    "prefijo": prefijo,
                    "numero": numero,
                    "franquicia_id": franquicia_id,
                    "sede_id": sede_id,
                    "created_at": datetime.now(),
                    "metadata": metadata or {}
                }
                
                await collection_ids.insert_one(documento)
                
                logger.info(
                    f"✅ ID generado: {id_completo} | "
                    f"Entidad: {entidad} | Intento: {intento}"
                )
                
                return id_completo
                
            except Exception as e:
                # Si es error de duplicado, reintentar
                if "duplicate key" in str(e).lower():
                    logger.warning(
                        f"⚠️ Colisión detectada: {id_completo} | "
                        f"Intento {intento}/{MAX_RETRIES}"
                    )
                    continue
                else:
                    raise
        
        # Si llegamos aquí, agotamos los reintentos
        raise RuntimeError(
            f"No se pudo generar ID único para '{entidad}' "
            f"después de {MAX_RETRIES} intentos"
        )
    
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"❌ Error crítico al generar ID para {entidad}: {e}")
        raise


async def validar_id(
    id_completo: str,
    entidad: Optional[TipoEntidad] = None,
    estricto: bool = False
) -> bool:
    """
    Valida el formato y existencia de un ID.
    
    Acepta tanto IDs cortos (CL-00247) como largos (CL-231370287946194340).
    
    Args:
        id_completo: ID a validar
        entidad: Validar que coincida con entidad específica (opcional)
        estricto: Si True, verifica que el ID exista en BD (opcional)
    
    Returns:
        bool: True si el ID es válido
    
    Examples:
        >>> await validar_id("CL-00247")
        True
        
        >>> await validar_id("CL-231370287946194340")  # ID antiguo
        True
        
        >>> await validar_id("SV-04891", entidad="servicio")
        True
    """
    try:
        if not id_completo or not isinstance(id_completo, str):
            return False
        
        partes = id_completo.split("-")
        if len(partes) != 2:
            return False
        
        prefijo, numero = partes
        
        # Validar prefijo
        if entidad:
            entidad_lower = entidad.lower()
            if entidad_lower in PREFIJOS_VALIDOS:
                if prefijo != PREFIJOS_VALIDOS[entidad_lower]:
                    return False
        else:
            if prefijo not in PREFIJOS_VALIDOS.values():
                return False
        
        # Validar que el número sea numérico
        if not numero.isdigit():
            return False
        
        # Aceptar números de cualquier longitud razonable (1-20 dígitos)
        # Esto permite tanto IDs nuevos cortos como antiguos largos
        if not (1 <= len(numero) <= 20):
            return False
        
        # Validación estricta: verificar existencia en BD
        if estricto:
            existe = await collection_ids.find_one({"_id": id_completo})
            return existe is not None
        
        return True
    
    except Exception as e:
        logger.error(f"Error al validar ID {id_completo}: {e}")
        return False


async def existe_id(id_completo: str) -> bool:
    """Verifica si un ID existe en el sistema."""
    try:
        resultado = await collection_ids.find_one({"_id": id_completo})
        return resultado is not None
    except Exception as e:
        logger.error(f"Error al verificar existencia de ID {id_completo}: {e}")
        return False


async def obtener_metadata_id(id_completo: str) -> Optional[dict]:
    """Obtiene toda la metadata asociada a un ID."""
    try:
        if not await validar_id(id_completo):
            logger.warning(f"ID inválido al obtener metadata: {id_completo}")
            return None
        
        return await collection_ids.find_one({"_id": id_completo})
    
    except Exception as e:
        logger.error(f"Error al obtener metadata de {id_completo}: {e}")
        return None


async def obtener_entidad_desde_id(id_completo: str) -> Optional[str]:
    """Extrae el tipo de entidad desde un ID."""
    try:
        metadata = await obtener_metadata_id(id_completo)
        return metadata.get("entidad") if metadata else None
    except Exception as e:
        logger.error(f"Error al obtener entidad de {id_completo}: {e}")
        return None


# ====================================================================
# ESTADÍSTICAS Y MONITOREO
# ====================================================================

async def estadisticas_ids(
    entidad: Optional[TipoEntidad] = None,
    franquicia_id: Optional[str] = None,
    sede_id: Optional[str] = None
) -> dict:
    """Obtiene estadísticas detalladas de IDs generados."""
    try:
        filtro = {}
        
        if entidad:
            filtro["entidad"] = entidad.lower()
        if franquicia_id:
            filtro["franquicia_id"] = franquicia_id
        if sede_id:
            filtro["sede_id"] = sede_id
        
        # Total de IDs
        total = await collection_ids.count_documents(filtro)
        
        # Por entidad
        pipeline = [
            {"$group": {
                "_id": "$entidad",
                "count": {"$sum": 1},
                "ultimo": {"$max": "$created_at"}
            }},
            {"$sort": {"count": -1}}
        ]
        
        if filtro:
            pipeline.insert(0, {"$match": filtro})
        
        por_entidad = await collection_ids.aggregate(pipeline).to_list(None)
        
        # Estado de pools
        pools = await collection_sequences.find().to_list(None)
        estado_pools = {}
        for pool in pools:
            key = pool["_id"]
            disponibles = len(pool.get("pool", []))
            usados = pool.get("usado_count", 0)
            total_pool = disponibles + usados
            
            estado_pools[key] = {
                "longitud": pool.get("longitud"),
                "disponibles": disponibles,
                "usados": usados,
                "total": total_pool,
                "porcentaje_usado": round((usados / total_pool * 100), 2) if total_pool > 0 else 0
            }
        
        # Último ID generado
        ultimo_doc = await collection_ids.find_one(
            filtro,
            sort=[("created_at", -1)]
        )
        
        return {
            "total_ids": total,
            "por_entidad": {
                item["_id"]: {
                    "cantidad": item["count"],
                    "ultimo_generado": item["ultimo"]
                }
                for item in por_entidad
            },
            "pools": estado_pools,
            "ultimo_generado": ultimo_doc["created_at"] if ultimo_doc else None,
            "tipo_sistema": "Secuencia NO secuencial con expansión automática"
        }
    
    except Exception as e:
        logger.error(f"Error al obtener estadísticas: {e}")
        return {"error": str(e)}


# ====================================================================
# INICIALIZACIÓN
# ====================================================================

async def inicializar_indices():
    """Crea índices optimizados en MongoDB."""
    try:
        # Índices en collection_ids
        await collection_ids.create_index(
            [("entidad", 1), ("created_at", -1)],
            name="idx_entidad_fecha"
        )
        
        await collection_ids.create_index(
            [("franquicia_id", 1), ("sede_id", 1)],
            name="idx_tenant"
        )
        
        await collection_ids.create_index("prefijo", name="idx_prefijo")
        
        # Índices en collection_sequences
        await collection_sequences.create_index("prefijo", name="idx_seq_prefijo")
        await collection_sequences.create_index("longitud", name="idx_seq_longitud")
        
        logger.info("✅ Índices del sistema de IDs creados correctamente")
        
    except Exception as e:
        logger.error(f"❌ Error al crear índices: {e}")
        raise


# ====================================================================
# UTILIDADES
# ====================================================================

def listar_entidades_disponibles() -> list:
    """Lista todas las entidades disponibles."""
    return sorted(set(PREFIJOS_VALIDOS.keys()))


def obtener_prefijo(entidad: str) -> Optional[str]:
    """Obtiene el prefijo de una entidad."""
    return PREFIJOS_VALIDOS.get(entidad.lower())


async def validar_sistema() -> dict:
    """Valida que el sistema de IDs esté funcionando correctamente."""
    try:
        test_id = await generar_id("nota", metadata={"test": True})
        es_valido = await validar_id(test_id, estricto=True)
        await collection_ids.delete_one({"_id": test_id})
        
        stats = await estadisticas_ids()
        
        return {
            "estado": "ok" if es_valido else "error",
            "test_id_generado": test_id,
            "test_validacion": es_valido,
            "total_ids": stats.get("total_ids", 0),
            "sistema": "NO secuencial con expansión automática",
            "timestamp": datetime.now()
        }
        
    except Exception as e:
        return {
            "estado": "error",
            "error": str(e),
            "timestamp": datetime.now()
        }