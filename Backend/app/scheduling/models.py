from pydantic import BaseModel, Field, field_validator
from datetime import datetime, time, date
from typing import Optional, List

# === SERVICIO ===
class Servicio(BaseModel):
    nombre: str
    duracion_minutos: int
    precio: float
    descripcion: Optional[str] = None
    sede_id: str

# === SUBMODELO: Día de la semana ===
class DiaDisponible(BaseModel):
    dia_semana: int = Field(..., ge=1, le=7, description="Número del día (1=lunes ... 7=domingo)")
    hora_inicio: str = Field(..., description="Hora de inicio (HH:MM)")
    hora_fin: str = Field(..., description="Hora de fin (HH:MM)")
    activo: bool = Field(default=True, description="Si el estilista trabaja ese día")

    @field_validator("hora_inicio", "hora_fin")
    @classmethod
    def validar_formato_hora(cls, v: str):
        try:
            time.fromisoformat(v)
        except Exception:
            raise ValueError("El formato de hora debe ser HH:MM (24h)")
        return v


# === MODELO PRINCIPAL ===
class Horario(BaseModel):
    estilista_id: str = Field(..., description="Unique ID del estilista, ej: P001")
    sede_id: str = Field(..., description="Unique ID de la sede, ej: 001")
    disponibilidad: List[DiaDisponible] = Field(..., description="Lista de disponibilidad (1-7)")
    creado_por: Optional[str] = None
    fecha_creacion: Optional[str] = None

    
# === BLOQUEO ===
class Bloqueo(BaseModel):
    estilista_id: str
    sede_id: str
    fecha: datetime
    hora_inicio: time
    hora_fin: time
    motivo: Optional[str] = None

# === CITA ===
class Cita(BaseModel):
    sede_id: str
    cliente_id: str
    estilista_id: str
    servicio_id: str
    fecha: date          # ✅ debe ser date
    hora_inicio: str
    hora_fin: str
    estado: str