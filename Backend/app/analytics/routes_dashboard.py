"""
Routes para Dashboard de Analytics
Optimizado con validaciones y manejo de errores

✅ REVISADO: No necesita cambios para IDs cortos
Este archivo solo orquesta llamadas a services_analytics y routes_churn
"""
from fastapi import APIRouter, Query, HTTPException
from datetime import datetime, timedelta
from typing import Tuple
import logging

from app.analytics.services_analytics import get_kpi_overview
from app.analytics.routes_churn import obtener_churn_clientes

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics Dashboard"])


def get_date_range(period: str) -> Tuple[datetime, datetime]:
    """
    Calcula el rango de fechas según el período solicitado.
    
    ✅ COMPATIBLE: No depende de IDs, solo calcula fechas
    
    Args:
        period: "today", "week", "month"
    
    Returns:
        Tupla (start_date, end_date)
    
    Raises:
        ValueError: Si el período no es soportado
    """
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    if period == "today":
        return today, today + timedelta(days=1)

    if period == "week":
        start = today - timedelta(days=today.weekday())  # lunes de la semana
        return start, today + timedelta(days=1)

    if period == "month":
        start = today.replace(day=1)  # primer día del mes
        return start, today + timedelta(days=1)

    raise ValueError(f"Período no soportado: {period}. Use 'today', 'week' o 'month'")


@router.get("/dashboard")
async def analytics_dashboard(
    period: str = Query("today", enum=["today", "week", "month"], description="Período de análisis"),
    sede_id: str = Query(None, description="Filtrar por sede específica")
):
    """
    Dashboard consolidado con KPIs y churn para períodos predefinidos.
    
    ✅ COMPATIBLE: Funciona con IDs cortos sin cambios
    Las funciones subyacentes ya están adaptadas
    
    Períodos disponibles:
    - today: Día actual (00:00 a 23:59 de hoy)
    - week: Semana actual (lunes a hoy)
    - month: Mes actual (día 1 a hoy)
    
    Respuesta incluye:
    - period: Período solicitado
    - range: Rango de fechas calculado
    - sede_id: Sede filtrada (si aplica)
    - kpis: Nuevos clientes, recurrencia, churn rate, ticket promedio
    - churn_actual: Número total de clientes en churn
    
    OPTIMIZADO: Usa caché en services_analytics y queries optimizadas
    """
    try:
        # Validar y calcular rango de fechas
        try:
            start_date, end_date = get_date_range(period)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        logger.info(
            f"📊 Dashboard solicitado - Period: {period}, "
            f"Sede: {sede_id or 'TODAS'}, "
            f"Range: {start_date.date()} to {end_date.date()}"
        )
        
        # ✅ Obtener KPIs (ya adaptado para IDs cortos)
        kpis = await get_kpi_overview(start_date, end_date, sede_id)
        
        # ✅ Obtener churn actual (ya adaptado para IDs cortos)
        churn_response = await obtener_churn_clientes(
            export=False,
            sede_id=sede_id,
            start_date=None,  # Churn actual sin filtro de fechas
            end_date=None
        )
        
        logger.info(
            f"✅ Dashboard generado - KPIs calculados, "
            f"Churn: {churn_response.get('total_churn', 0)} clientes"
        )
        
        return {
            "success": True,
            "period": period,
            "range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "sede_id": sede_id,
            "kpis": kpis,
            "churn_actual": churn_response.get("total_churn", 0)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en analytics_dashboard: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar dashboard: {str(e)}"
        )
    