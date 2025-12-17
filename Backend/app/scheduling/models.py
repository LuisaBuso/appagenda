from pydantic import BaseModel, Field, field_validator
from datetime import datetime, time, date
from typing import Optional, List, Dict, Any

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
    metodo_pago_inicial: Optional[str] = None
    abono: Optional[float] = 0

class FichaCreate(BaseModel):
    cliente_id: str
    servicio_id: str
    profesional_id: str
    sede_id: str
    tipo_ficha: str

    servicio_nombre: Optional[str] = None
    profesional_nombre: Optional[str] = None
    fecha_ficha: Optional[str] = None
    fecha_reserva: Optional[str] = None

    email: Optional[str] = None
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    cedula: Optional[str] = None
    telefono: Optional[str] = None

    precio: Optional[float] = 0
    estado: Optional[str] = "pendiente"
    estado_pago: Optional[str] = "pendiente"

    datos_especificos: Optional[Dict[str, Any]] = {}
    respuestas: Optional[List[Dict[str, Any]]] = []
    descripcion_servicio: Optional[str] = None

    fotos_antes: Optional[List[str]] = []
    fotos_despues: Optional[List[str]] = []

    autorizacion_publicacion: Optional[bool] = False
    comentario_interno: Optional[str] = None

    class Config:
        arbitrary_types_allowed = True


class ProductoItem(BaseModel):
    producto_id: str
    nombre: str
    cantidad: int
    precio_unitario: float

class PagoRequest(BaseModel):
    monto: float
    metodo_pago: Optional[str] = "efectivo"