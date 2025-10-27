from pydantic import BaseModel, Field
from datetime import datetime, time
from typing import Optional, List

# === SERVICIO ===
class Servicio(BaseModel):
    nombre: str
    duracion_minutos: int
    precio: float
    descripcion: Optional[str] = None
    sede_id: str

# === HORARIO ===
class Horario(BaseModel):
    estilista_id: str
    sede_id: str
    dia_semana: str  # Lunes, Martes, ...
    hora_inicio: time
    hora_fin: time

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
    cliente_id: str
    estilista_id: str
    sede_id: str
    servicio_id: str
    fecha: datetime
    hora_inicio: time
    hora_fin: time
    estado: str = "pendiente"  # pendiente | confirmada | asistida | cancelada
