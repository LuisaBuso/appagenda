from pydantic import BaseModel, Field, field_validator
from datetime import datetime, time, date
from typing import Optional, List

# === SERVICIO ===
class Servicio(BaseModel):
    nombre: str
    duracion_minutos: int
    precio: float
    categoria: Optional[str] = None
    comision_estilista: Optional[float] = 0
    requiere_producto: Optional[bool] = False
    descripcion: Optional[str] = None
    sede_id: str

    
# === SUBMODELO: Día de la semana ===
class DiaDisponible(BaseModel):
    dia_semana: int = Field(..., ge=1, le=7, description="1=lunes ... 7=domingo")
    hora_inicio: str = Field(..., description="Hora inicio HH:MM")
    hora_fin: str = Field(..., description="Hora fin HH:MM")
    activo: bool = Field(default=True)

    @field_validator("hora_inicio", "hora_fin")
    @classmethod
    def validar_formato_hora(cls, v: str):
        try:
            time.fromisoformat(v)
        except Exception:
            raise ValueError("El formato debe ser HH:MM (24h)")
        return v

# === HORARIO (usa profesional_id) ===
class Horario(BaseModel):
    profesional_id: str = Field(..., description="ID del profesional ej: P001")
    sede_id: str = Field(..., description="ID de sede ej: 001") 
    disponibilidad: List[DiaDisponible]

# === BLOQUEO ===
class Bloqueo(BaseModel):
    profesional_id: str
    sede_id: str
    fecha: date
    hora_inicio: str
    hora_fin: str
    motivo: Optional[str] = None

# === CITA ===
class Cita(BaseModel):
    sede_id: str
    cliente_id: str
    profesional_id: str    # <── CORREGIDO
    servicio_id: str
    fecha: date
    hora_inicio: str
    hora_fin: str
    estado: str
    abono: Optional[float] = 0
