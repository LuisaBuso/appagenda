from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# ==============================================================
# Modelo de detalle de servicio dentro de la comisión
# ==============================================================
class ServicioDetalle(BaseModel):
    servicio_id: str
    servicio_nombre: str
    valor_servicio: float
    porcentaje: float
    valor_comision: float
    fecha: str
    numero_comprobante: Optional[str] = None

# ==============================================================
# Modelo de comisión completa (estructura en DB)
# ==============================================================
class Comision(BaseModel):
    profesional_id: str
    profesional_nombre: str
    sede_id: str
    moneda: str  # ⭐ Sin default, debe venir de la sede
    total_servicios: int
    total_comisiones: float
    servicios_detalle: List[ServicioDetalle]
    creado_en: datetime
    periodo_inicio: str
    periodo_fin: str
    estado: str = "pendiente"
    liquidada_por: Optional[str] = None
    liquidada_en: Optional[datetime] = None

# ==============================================================
# Modelo para liquidar comisiones
# ==============================================================
class LiquidarComisionRequest(BaseModel):
    comision_id: str
    notas: Optional[str] = None

# ==============================================================
# Modelo de respuesta para listado de comisiones
# ==============================================================
class ComisionResponse(BaseModel):
    id: str
    profesional_id: str
    profesional_nombre: str
    sede_id: str
    moneda: Optional[str] = None  # ⭐ Opcional para comisiones viejas
    total_servicios: int
    total_comisiones: float
    periodo_inicio: str
    periodo_fin: str
    estado: str
    creado_en: datetime
    liquidada_por: Optional[str] = None
    liquidada_en: Optional[datetime] = None

# ==============================================================
# Modelo de respuesta detallada (incluye servicios)
# ==============================================================
class ComisionDetalleResponse(BaseModel):
    id: str
    profesional_id: str
    profesional_nombre: str
    sede_id: str
    moneda: Optional[str] = None  # ⭐ Opcional para comisiones viejas
    total_servicios: int
    total_comisiones: float
    servicios_detalle: List[ServicioDetalle]
    periodo_inicio: str
    periodo_fin: str
    estado: str
    creado_en: datetime
    liquidada_por: Optional[str] = None
    liquidada_en: Optional[datetime] = None

# ==============================================================
# Filtros para búsqueda de comisiones
# ==============================================================
class FiltrosComision(BaseModel):
    profesional_id: Optional[str] = None
    sede_id: Optional[str] = None
    estado: Optional[str] = None
    periodo_inicio: Optional[str] = None
    periodo_fin: Optional[str] = None