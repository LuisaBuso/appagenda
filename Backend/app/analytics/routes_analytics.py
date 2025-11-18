"""
Routes principales para Analytics
Optimizado con validaciones, manejo de errores y seguridad

✅ REVISADO: No necesita cambios para IDs cortos
Este archivo solo valida permisos y llama a services_analytics.py
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime
from typing import Optional
import logging

from app.analytics.services_analytics import get_kpi_overview
from app.auth.routes import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
async def analytics_overview(
    start_date: str = Query(..., description="Fecha inicio (formato: YYYY-MM-DD)"),
    end_date: str = Query(..., description="Fecha fin (formato: YYYY-MM-DD)"),
    sede_id: Optional[str] = Query(None, description="Filtrar por sede específica"),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene KPIs generales para un rango de fechas personalizado.
    
    ✅ COMPATIBLE: Funciona con IDs cortos sin cambios
    Los IDs se manejan en services_analytics.py
    
    Requiere autenticación y uno de los siguientes roles:
    - admin_sede: Puede ver KPIs de su sede
    - super_admin: Puede ver KPIs de todo el sistema
    
    Parámetros:
    - start_date: Fecha de inicio en formato YYYY-MM-DD (ej: 2024-03-01)
    - end_date: Fecha de fin en formato YYYY-MM-DD (ej: 2024-03-07)
    - sede_id: Opcional. ID de la sede para filtrar resultados
    
    Respuesta incluye:
    - nuevos_clientes: Cantidad de clientes que tuvieron su primera cita en el período
    - tasa_recurrencia: % de clientes que ya habían visitado antes
    - tasa_churn: % de clientes que abandonaron (>60 días sin visitar)
    - ticket_promedio: Valor promedio por cita
    
    Cada KPI incluye su valor actual y % de crecimiento vs período anterior.
    
    OPTIMIZADO: Usa caché (5 min) y queries con agregaciones
    """
    try:
        # ========= VALIDACIÓN DE PERMISOS =========
        allowed_roles = ["admin_sede", "admin_franquicia", "super_admin"]
        
        if current_user.get("rol") not in allowed_roles:
            logger.warning(
                f"Usuario {current_user.get('username', 'unknown')} "
                f"con rol {current_user.get('rol')} intentó acceder a analytics"
            )
            raise HTTPException(
                status_code=403,
                detail="No autorizado. Se requiere rol de administrador."
            )
        
        # ========= VALIDACIÓN DE FECHAS =========
        try:
            start = datetime.fromisoformat(start_date)
            end = datetime.fromisoformat(end_date)
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Formato de fecha inválido. Use YYYY-MM-DD. Error: {str(e)}"
            )
        
        # Validar que start_date <= end_date
        if start > end:
            raise HTTPException(
                status_code=400,
                detail="La fecha de inicio debe ser anterior o igual a la fecha de fin"
            )
        
        # Validar que no sea un rango demasiado grande (opcional, para performance)
        dias_diferencia = (end - start).days
        if dias_diferencia > 365:
            logger.warning(
                f"Usuario {current_user.get('username')} solicitó rango de {dias_diferencia} días"
            )
            # Puedes descomentar esto si quieres limitar el rango:
            # raise HTTPException(
            #     status_code=400,
            #     detail="El rango de fechas no puede exceder 365 días"
            # )
        
        # ========= VALIDACIÓN DE SEDE (para admin_sede) =========
        if current_user.get("rol") == "admin_sede":
            user_sede_id = current_user.get("sede_id")
            
            # Si es admin_sede, solo puede ver su propia sede
            if sede_id and sede_id != user_sede_id:
                raise HTTPException(
                    status_code=403,
                    detail="No tiene permisos para ver KPIs de otra sede"
                )
            
            # Forzar sede_id a la del usuario
            sede_id = user_sede_id
        
        # ========= LOGGING =========
        logger.info(
            f"📊 Analytics overview - User: {current_user.get('username')}, "
            f"Role: {current_user.get('rol')}, "
            f"Sede: {sede_id or 'TODAS'}, "
            f"Range: {start_date} to {end_date}"
        )
        
        # ========= OBTENER KPIs =========
        # ✅ Esta función ya está adaptada para IDs cortos
        kpis = await get_kpi_overview(start, end, sede_id)
        
        return {
            "success": True,
            "usuario": {
                "username": current_user.get("username"),
                "rol": current_user.get("rol")
            },
            "periodo": {
                "inicio": start_date,
                "fin": end_date,
                "dias": dias_diferencia + 1
            },
            "sede_id": sede_id,
            "kpis": kpis
        }
    
    except HTTPException:
        # Re-lanzar excepciones HTTP ya manejadas
        raise
    
    except Exception as e:
        # Capturar cualquier otro error no esperado
        logger.error(
            f"❌ Error inesperado en analytics_overview: {str(e)}",
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail=f"Error interno al obtener KPIs. Por favor contacte al administrador."
        )