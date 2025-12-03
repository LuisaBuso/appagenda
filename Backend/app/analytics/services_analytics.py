from app.database.mongo import collection_citas, collection_clients
from datetime import timedelta, datetime
from typing import Optional, Dict, List, Set
import logging

logger = logging.getLogger(__name__)

# === CONFIGURACIÓN ===
CHURN_DAYS = 60

# === CACHE SIMPLE EN MEMORIA ===
_cache = {}
_cache_ttl = {}
CACHE_DURATION = 300  # 5 minutos

def get_cache_key(prefix: str, **kwargs) -> str:
    """Genera una clave única para caché"""
    params = "_".join(f"{k}={v}" for k, v in sorted(kwargs.items()) if v is not None)
    return f"{prefix}_{params}"

def get_from_cache(key: str):
    """Obtiene valor del caché si existe y no expiró"""
    if key in _cache and key in _cache_ttl:
        if datetime.now() < _cache_ttl[key]:
            return _cache[key]
        else:
            del _cache[key]
            del _cache_ttl[key]
    return None

def set_cache(key: str, value, ttl_seconds: int = CACHE_DURATION):
    """Guarda valor en caché con TTL"""
    _cache[key] = value
    _cache_ttl[key] = datetime.now() + timedelta(seconds=ttl_seconds)


# === FUNCIONES AUXILIARES OPTIMIZADAS ===

async def get_clientes_periodo(
    start_date: datetime, 
    end_date: datetime, 
    sede_id: Optional[str] = None
) -> Set[str]:
    """
    Obtiene clientes únicos que tuvieron citas en un período.
    OPTIMIZADO: Una sola query con agregación.
    
    ✅ ADAPTADO: Ahora maneja cliente_id como string (CL-00247)
    """
    try:
        match_query = {
            "fecha": {"$gte": start_date, "$lte": end_date},
            "estado": {"$ne": "cancelada"},
            "cliente_id": {"$exists": True, "$ne": None}  # Asegurar que existe
        }
        if sede_id:
            match_query["sede_id"] = sede_id

        pipeline = [
            {"$match": match_query},
            {"$group": {"_id": "$cliente_id"}},
            {"$project": {"cliente_id": "$_id"}}
        ]

        result = await collection_citas.aggregate(pipeline).to_list(None)
        
        # ✅ CAMBIO: Ya no convertimos a string con str(), porque cliente_id YA es string
        clientes_ids = set()
        for doc in result:
            cliente_id = doc.get("cliente_id")
            if cliente_id and isinstance(cliente_id, str):
                clientes_ids.add(cliente_id)
        
        return clientes_ids
    
    except Exception as e:
        logger.error(f"Error en get_clientes_periodo: {e}")
        return set()


async def get_primeras_citas_clientes(
    clientes_ids: Set[str],
    sede_id: Optional[str] = None
) -> Dict[str, datetime]:
    """
    Obtiene la primera cita de cada cliente.
    OPTIMIZADO: UNA SOLA QUERY en lugar de N queries.
    
    ✅ ADAPTADO: cliente_id ya es string (CL-00247)
    """
    try:
        match_query = {
            "cliente_id": {"$in": list(clientes_ids)},
            "estado": {"$ne": "cancelada"}
        }
        if sede_id:
            match_query["sede_id"] = sede_id

        pipeline = [
            {"$match": match_query},
            {"$sort": {"fecha": 1}},
            {"$group": {
                "_id": "$cliente_id",
                "primera_cita": {"$first": "$fecha"}
            }}
        ]

        result = await collection_citas.aggregate(pipeline).to_list(None)
        
        # ✅ CAMBIO: Ya no necesitamos str() porque _id ya es string
        return {doc["_id"]: doc["primera_cita"] for doc in result}
    
    except Exception as e:
        logger.error(f"Error en get_primeras_citas_clientes: {e}")
        return {}


async def get_ultimas_citas_clientes(
    clientes_ids: Set[str],
    sede_id: Optional[str] = None
) -> Dict[str, datetime]:
    """
    Obtiene la última cita de cada cliente.
    OPTIMIZADO: UNA SOLA QUERY con agregación.
    
    ✅ ADAPTADO: cliente_id ya es string (CL-00247)
    """
    try:
        match_query = {
            "cliente_id": {"$in": list(clientes_ids)},
            "estado": {"$ne": "cancelada"}
        }
        if sede_id:
            match_query["sede_id"] = sede_id

        pipeline = [
            {"$match": match_query},
            {"$sort": {"fecha": -1}},
            {"$group": {
                "_id": "$cliente_id",
                "ultima_cita": {"$first": "$fecha"}
            }}
        ]

        result = await collection_citas.aggregate(pipeline).to_list(None)
        
        # ✅ CAMBIO: Ya no necesitamos str() porque _id ya es string
        return {doc["_id"]: doc["ultima_cita"] for doc in result}
    
    except Exception as e:
        logger.error(f"Error en get_ultimas_citas_clientes: {e}")
        return {}


async def calcular_nuevos_clientes(
    clientes_actuales: Set[str],
    start_date: datetime,
    sede_id: Optional[str] = None
) -> List[str]:
    """
    Identifica clientes nuevos (primera cita en el período).
    OPTIMIZADO: Una query en lugar de N queries.
    
    ✅ ADAPTADO: Maneja IDs como strings
    """
    try:
        primeras_citas = await get_primeras_citas_clientes(clientes_actuales, sede_id)
        
        nuevos = [
            cliente_id for cliente_id, primera_fecha in primeras_citas.items()
            if primera_fecha >= start_date
        ]
        
        return nuevos
    
    except Exception as e:
        logger.error(f"Error en calcular_nuevos_clientes: {e}")
        return []


async def get_citas_periodo(
    start_date: datetime,
    end_date: datetime,
    sede_id: Optional[str] = None
) -> List[Dict]:
    """
    Obtiene todas las citas de un período.
    
    ✅ ADAPTADO: Sin cambios necesarios, solo documenta que cliente_id es string
    """
    try:
        query = {
            "fecha": {"$gte": start_date, "$lte": end_date},
            "estado": {"$ne": "cancelada"}
        }
        if sede_id:
            query["sede_id"] = sede_id

        citas = await collection_citas.find(query).to_list(None)
        return citas
    
    except Exception as e:
        logger.error(f"Error en get_citas_periodo: {e}")
        return []


def calcular_crecimiento(valor_anterior: float, valor_actual: float) -> float:
    """Calcula el % de crecimiento entre dos valores"""
    if valor_anterior == 0:
        return 100.0 if valor_actual > 0 else 0.0
    return round(((valor_actual - valor_anterior) / valor_anterior) * 100, 1)


# === FUNCIÓN PRINCIPAL ===

async def get_kpi_overview(start_date: datetime, end_date: datetime, sede_id=None):
    """
    Calcula KPIs de clientes para un período específico
    
    ✅ ADAPTADO: Funciona con IDs cortos (CL-00247) en lugar de ObjectIds
    
    Args:
        start_date: Fecha inicio del período (ej: 2024-03-01)
        end_date: Fecha fin del período (ej: 2024-03-07)
        sede_id: Filtro opcional por sede
    
    Returns:
        Dict con KPIs: nuevos_clientes, tasa_recurrencia, tasa_churn, ticket_promedio
    """
    
    # Verificar caché
    cache_key = get_cache_key(
        "kpi_overview",
        start=start_date.isoformat(),
        end=end_date.isoformat(),
        sede=sede_id
    )
    
    cached = get_from_cache(cache_key)
    if cached:
        logger.info(f"KPIs obtenidos de caché")
        return cached

    try:
        # ========= PERÍODO ACTUAL =========
        citas_actuales = await get_citas_periodo(start_date, end_date, sede_id)
        
        # ✅ CAMBIO: cliente_id ya es string, no necesitamos conversión
        clientes_actuales = set()
        for c in citas_actuales:
            cliente_id = c.get("cliente_id")
            if cliente_id and isinstance(cliente_id, str):
                clientes_actuales.add(cliente_id)
        
        # ========= PERÍODO ANTERIOR =========
        dias_diferencia = (end_date - start_date).days + 1
        start_anterior = start_date - timedelta(days=dias_diferencia)
        end_anterior = start_date - timedelta(days=1)
        
        citas_anteriores = await get_citas_periodo(start_anterior, end_anterior, sede_id)
        
        # ✅ CAMBIO: cliente_id ya es string
        clientes_anteriores = set()
        for c in citas_anteriores:
            cliente_id = c.get("cliente_id")
            if cliente_id and isinstance(cliente_id, str):
                clientes_anteriores.add(cliente_id)
        
        # ========= 1. NUEVOS CLIENTES =========
        nuevos_actuales = await calcular_nuevos_clientes(clientes_actuales, start_date, sede_id)
        nuevos_anteriores = await calcular_nuevos_clientes(clientes_anteriores, start_anterior, sede_id)
        
        crecimiento_nuevos = calcular_crecimiento(len(nuevos_anteriores), len(nuevos_actuales))
        
        # ========= 2. TASA DE RECURRENCIA =========
        recurrentes_actuales = len(clientes_actuales) - len(nuevos_actuales)
        tasa_recurrencia = (recurrentes_actuales / max(1, len(clientes_actuales))) * 100
        
        recurrentes_anteriores = len(clientes_anteriores) - len(nuevos_anteriores)
        tasa_recurrencia_anterior = (recurrentes_anteriores / max(1, len(clientes_anteriores))) * 100
        
        crecimiento_recurrencia = tasa_recurrencia - tasa_recurrencia_anterior
        
        # ========= 3. CHURN RATE =========
        # Clientes del período ANTERIOR que NO regresaron en el actual
        # y ya pasaron más de 60 días desde su última visita
        
        clientes_no_regresaron = clientes_anteriores - clientes_actuales
        
        if clientes_no_regresaron:
            # Obtener últimas citas de clientes que no regresaron (UNA SOLA QUERY)
            ultimas_citas = await get_ultimas_citas_clientes(clientes_no_regresaron, sede_id)
            
            # Filtrar por fecha límite
            clientes_perdidos = [
                cliente_id for cliente_id, ultima_fecha in ultimas_citas.items()
                if ultima_fecha + timedelta(days=CHURN_DAYS) < datetime.now()
            ]
        else:
            clientes_perdidos = []
        
        churn_rate = (len(clientes_perdidos) / max(1, len(clientes_anteriores))) * 100
        
        # Período muy anterior para comparación
        start_muy_anterior = start_anterior - timedelta(days=dias_diferencia)
        end_muy_anterior = end_anterior - timedelta(days=dias_diferencia)
        
        citas_muy_anteriores = await get_citas_periodo(start_muy_anterior, end_muy_anterior, sede_id)
        
        # ✅ CAMBIO: cliente_id ya es string
        clientes_muy_anteriores = set()
        for c in citas_muy_anteriores:
            cliente_id = c.get("cliente_id")
            if cliente_id and isinstance(cliente_id, str):
                clientes_muy_anteriores.add(cliente_id)
        
        clientes_no_regresaron_anterior = clientes_muy_anteriores - clientes_anteriores
        
        if clientes_no_regresaron_anterior:
            ultimas_citas_anterior = await get_ultimas_citas_clientes(clientes_no_regresaron_anterior, sede_id)
            
            clientes_perdidos_anterior = [
                cliente_id for cliente_id, ultima_fecha in ultimas_citas_anterior.items()
                if ultima_fecha + timedelta(days=CHURN_DAYS) < end_anterior
            ]
        else:
            clientes_perdidos_anterior = []
        
        churn_rate_anterior = (len(clientes_perdidos_anterior) / max(1, len(clientes_muy_anteriores))) * 100
        crecimiento_churn = churn_rate - churn_rate_anterior
        
        # ========= 4. TICKET PROMEDIO =========
        total_ingresos = sum(c.get("precio", 0) for c in citas_actuales)
        ticket_promedio = total_ingresos / max(1, len(citas_actuales))
        
        total_ingresos_anterior = sum(c.get("precio", 0) for c in citas_anteriores)
        ticket_promedio_anterior = total_ingresos_anterior / max(1, len(citas_anteriores))
        
        crecimiento_ticket = calcular_crecimiento(ticket_promedio_anterior, ticket_promedio)
        
        # ========= RESULTADO =========
        result = {
            "nuevos_clientes": {
                "valor": len(nuevos_actuales),
                "crecimiento": f"+{crecimiento_nuevos}%" if crecimiento_nuevos >= 0 else f"{crecimiento_nuevos}%"
            },
            "tasa_recurrencia": {
                "valor": f"{round(tasa_recurrencia)}%",
                "crecimiento": f"+{round(crecimiento_recurrencia)}%" if crecimiento_recurrencia >= 0 else f"{round(crecimiento_recurrencia)}%"
            },
            "tasa_churn": {
                "valor": f"{round(churn_rate)}%",
                "crecimiento": f"+{round(crecimiento_churn)}%" if crecimiento_churn >= 0 else f"{round(crecimiento_churn)}%"
            },
            "ticket_promedio": {
                "valor": f"{round(ticket_promedio, 2)} €",
                "crecimiento": f"+{crecimiento_ticket}%" if crecimiento_ticket >= 0 else f"{crecimiento_ticket}%"
            }
        }
        
        # Guardar en caché
        set_cache(cache_key, result)
        
        logger.info(f"✅ KPIs calculados: {len(clientes_actuales)} clientes, {len(nuevos_actuales)} nuevos")
        
        return result
    
    except Exception as e:
        logger.error(f"Error en get_kpi_overview: {e}", exc_info=True)
        # Retornar valores por defecto en caso de error
        return {
            "nuevos_clientes": {"valor": 0, "crecimiento": "0%"},
            "tasa_recurrencia": {"valor": "0%", "crecimiento": "0%"},
            "tasa_churn": {"valor": "0%", "crecimiento": "0%"},
            "ticket_promedio": {"valor": "0 €", "crecimiento": "0%"}
        }
    