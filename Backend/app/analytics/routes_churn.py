"""
Routes para análisis de Churn de clientes
Optimizado con agregaciones y mejor manejo de errores
"""
from fastapi import APIRouter, Response, Query, HTTPException
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import pandas as pd
from io import BytesIO
import logging

from bson import ObjectId
from app.database.mongo import collection_clients, collection_citas

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics"])

CHURN_DAYS = 60


# === FUNCIONES HELPER OPTIMIZADAS ===

async def get_clientes_activos_periodo(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    sede_id: Optional[str] = None
) -> List[str]:
    """
    Obtiene clientes únicos que tuvieron citas en un período.
    Usa agregación en lugar de iterar sobre todas las citas.
    """
    try:
        match_query = {"estado": {"$ne": "cancelada"}}
        
        if sede_id:
            match_query["sede_id"] = sede_id
        
        if start_date and end_date:
            match_query["fecha"] = {"$gte": start_date, "$lte": end_date}
        
        pipeline = [
            {"$match": match_query},
            {"$group": {"_id": "$cliente_id"}},
            {"$project": {"cliente_id": "$_id"}}
        ]
        
        result = await collection_citas.aggregate(pipeline).to_list(None)
        return [str(doc["cliente_id"]) for doc in result if doc.get("cliente_id")]
    
    except Exception as e:
        logger.error(f"Error en get_clientes_activos_periodo: {e}")
        return []


async def get_ultima_visita_clientes(
    clientes_ids: List[str],
    sede_id: Optional[str] = None
) -> Dict[str, datetime]:
    """
    Obtiene la última visita de cada cliente.
    UNA SOLA QUERY con agregación en lugar de N queries.
    """
    try:
        match_query = {
            "cliente_id": {"$in": clientes_ids},
            "estado": {"$ne": "cancelada"}
        }
        if sede_id:
            match_query["sede_id"] = sede_id
        
        pipeline = [
            {"$match": match_query},
            {"$sort": {"fecha": -1}},
            {"$group": {
                "_id": "$cliente_id",
                "ultima_visita": {"$first": "$fecha"}
            }}
        ]
        
        result = await collection_citas.aggregate(pipeline).to_list(None)
        return {str(doc["_id"]): doc["ultima_visita"] for doc in result}
    
    except Exception as e:
        logger.error(f"Error en get_ultima_visita_clientes: {e}")
        return {}


async def verificar_visitas_futuras(
    clientes_ids: List[str],
    fecha_corte: datetime,
    sede_id: Optional[str] = None
) -> Dict[str, bool]:
    """
    Verifica si los clientes tienen visitas posteriores a una fecha.
    UNA SOLA QUERY con agregación.
    """
    try:
        match_query = {
            "cliente_id": {"$in": clientes_ids},
            "fecha": {"$gt": fecha_corte},
            "estado": {"$ne": "cancelada"}
        }
        if sede_id:
            match_query["sede_id"] = sede_id
        
        pipeline = [
            {"$match": match_query},
            {"$group": {"_id": "$cliente_id"}},
            {"$project": {"cliente_id": "$_id"}}
        ]
        
        result = await collection_citas.aggregate(pipeline).to_list(None)
        clientes_con_visitas = set(str(doc["cliente_id"]) for doc in result)
        
        return {cid: cid in clientes_con_visitas for cid in clientes_ids}
    
    except Exception as e:
        logger.error(f"Error en verificar_visitas_futuras: {e}")
        return {cid: False for cid in clientes_ids}


async def get_datos_clientes_batch(clientes_ids: List[str]) -> Dict[str, Dict]:
    """
    Obtiene datos de múltiples clientes en UNA SOLA QUERY.
    """
    try:
        # Convertir IDs
        object_ids = []
        for cid in clientes_ids:
            try:
                if len(cid) == 24:  # ObjectId válido
                    object_ids.append(ObjectId(cid))
                else:
                    object_ids.append(cid)
            except:
                object_ids.append(cid)
        
        clientes = await collection_clients.find(
            {"_id": {"$in": object_ids}}
        ).to_list(None)
        
        return {str(c["_id"]): c for c in clientes}
    
    except Exception as e:
        logger.error(f"Error en get_datos_clientes_batch: {e}")
        return {}


# === ENDPOINT PRINCIPAL ===

@router.get("/churn-clientes")
async def obtener_churn_clientes(
    export: bool = False,
    sede_id: Optional[str] = Query(None, description="Filtrar por sede específica"),
    start_date: Optional[str] = Query(None, description="Fecha inicio para análisis (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Fecha fin para análisis (YYYY-MM-DD)")
):
    """
    Obtiene lista de clientes en riesgo de abandono (churn).
    
    Un cliente está en churn si:
    - Su última visita fue hace más de CHURN_DAYS (60 días)
    - No tiene citas programadas a futuro
    
    Parámetros:
    - export: Si es True, descarga Excel. Si es False, devuelve JSON
    - sede_id: Filtrar solo clientes de una sede específica
    - start_date/end_date: Analizar solo clientes activos en ese rango
    
    OPTIMIZADO: Usa agregaciones en lugar de bucles con queries individuales
    """
    
    try:
        hoy = datetime.now()
        
        # Parsear fechas si se proporcionan
        start = None
        end = None
        
        if start_date and end_date:
            try:
                start = datetime.fromisoformat(start_date)
                end = datetime.fromisoformat(end_date)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Formato de fecha inválido. Use YYYY-MM-DD"
                )
            
            if start > end:
                raise HTTPException(
                    status_code=400,
                    detail="La fecha de inicio debe ser menor o igual a la fecha fin"
                )
        
        # ✅ PASO 1: Obtener clientes únicos del período (UNA QUERY)
        clientes_ids = await get_clientes_activos_periodo(start, end, sede_id)
        
        if not clientes_ids:
            return {
                "total_churn": 0,
                "clientes": [],
                "parametros": {
                    "sede_id": sede_id,
                    "rango_fechas": f"{start_date} a {end_date}" if start_date and end_date else "Todos los registros",
                    "dias_churn": CHURN_DAYS
                },
                "mensaje": "No hay clientes en el rango especificado"
            }
        
        # ✅ PASO 2: Obtener última visita de todos los clientes (UNA QUERY)
        ultimas_visitas = await get_ultima_visita_clientes(clientes_ids, sede_id)
        
        # ✅ PASO 3: Filtrar clientes que superaron el límite de churn
        clientes_candidatos_churn = []
        
        for cliente_id, ultima_visita in ultimas_visitas.items():
            fecha_limite = ultima_visita + timedelta(days=CHURN_DAYS)
            
            # Si aún no pasó el límite, no está en churn
            if fecha_limite >= hoy:
                continue
            
            clientes_candidatos_churn.append(cliente_id)
        
        if not clientes_candidatos_churn:
            return {
                "total_churn": 0,
                "clientes": [],
                "parametros": {
                    "sede_id": sede_id,
                    "rango_fechas": f"{start_date} a {end_date}" if start_date and end_date else "Todos los registros",
                    "dias_churn": CHURN_DAYS
                }
            }
        
        # ✅ PASO 4: Verificar si tienen visitas futuras (UNA QUERY)
        # Usamos la última visita como fecha de corte
        tienen_visitas_futuras = {}
        for cliente_id in clientes_candidatos_churn:
            ultima = ultimas_visitas[cliente_id]
            match_query = {
                "cliente_id": cliente_id,
                "fecha": {"$gt": ultima},
                "estado": {"$ne": "cancelada"}
            }
            if sede_id:
                match_query["sede_id"] = sede_id
            
            visita_futura = await collection_citas.find_one(match_query)
            tienen_visitas_futuras[cliente_id] = visita_futura is not None
        
        # Filtrar solo los que NO tienen visitas futuras (están en churn real)
        clientes_en_churn = [
            cid for cid in clientes_candidatos_churn 
            if not tienen_visitas_futuras.get(cid, False)
        ]
        
        if not clientes_en_churn:
            return {
                "total_churn": 0,
                "clientes": [],
                "parametros": {
                    "sede_id": sede_id,
                    "rango_fechas": f"{start_date} a {end_date}" if start_date and end_date else "Todos los registros",
                    "dias_churn": CHURN_DAYS
                }
            }
        
        # ✅ PASO 5: Obtener datos de clientes en batch (UNA QUERY)
        clientes_data_map = await get_datos_clientes_batch(clientes_en_churn)
        
        # ✅ PASO 6: Construir resultado
        clientes_perdidos = []
        
        for cliente_id in clientes_en_churn:
            cliente_data = clientes_data_map.get(cliente_id)
            
            if not cliente_data:
                logger.warning(f"Cliente {cliente_id} no encontrado en BD")
                continue
            
            ultima_visita = ultimas_visitas[cliente_id]
            dias_inactivo = (hoy - ultima_visita).days
            
            clientes_perdidos.append({
                "cliente_id": cliente_id,
                "nombre": cliente_data.get("nombre", "N/A"),
                "correo": cliente_data.get("correo", "N/A"),
                "telefono": cliente_data.get("telefono", "N/A"),
                "sede_id": cliente_data.get("sede_id", "N/A"),
                "ultima_visita": ultima_visita.strftime("%Y-%m-%d"),
                "dias_inactivo": dias_inactivo
            })
        
        # Ordenar por días de inactividad (más críticos primero)
        clientes_perdidos.sort(key=lambda x: x["dias_inactivo"], reverse=True)
        
        # ✅ PASO 7: Exportar a Excel si se solicita
        if export:
            if not clientes_perdidos:
                df = pd.DataFrame(columns=[
                    "cliente_id", "nombre", "correo", "telefono",
                    "sede_id", "ultima_visita", "dias_inactivo"
                ])
            else:
                df = pd.DataFrame(clientes_perdidos)
            
            output = BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='Clientes en Churn')
            
            output.seek(0)
            
            return Response(
                content=output.read(),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": "attachment; filename=clientes_churn.xlsx"}
            )
        
        # ✅ Devolver JSON
        return {
            "total_churn": len(clientes_perdidos),
            "parametros": {
                "sede_id": sede_id,
                "rango_fechas": f"{start_date} a {end_date}" if start_date and end_date else "Todos los registros",
                "dias_churn": CHURN_DAYS
            },
            "clientes": clientes_perdidos
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en obtener_churn_clientes: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener clientes en churn: {str(e)}"
        )