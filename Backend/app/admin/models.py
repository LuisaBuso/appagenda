from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# ==========================
# 📍 MODELO: Local / Sede
# ==========================
class Local(BaseModel):
    nombre: str
    direccion: str
    informacion_adicional: Optional[str] = None
    zona_horaria: str
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None



# =====================================================
# 💇‍♀️ MODELO: Profesional / Estilista (Administración)
# =====================================================
class Profesional(BaseModel):
    nombre: str
    email: EmailStr
    especialidades: Optional[List[str]] = Field(default_factory=list, description="Lista de unique_id de servicios")
    activo: bool = True
    comision: Optional[float] = None  # porcentaje de comisión

# ============================================
# 💅 MODELO: Servicio (Administración)
# ============================================
class ServicioAdmin(BaseModel):
    nombre: str = Field(..., description="Nombre del servicio, ej: Corte de Caballero")
    duracion_minutos: int = Field(..., description="Duración en minutos del servicio")
    precio: float = Field(..., description="Precio del servicio")
    comision_estilista: Optional[float] = Field(None, description="Comisión asignada al estilista")
    categoria: Optional[str] = Field(None, description="Categoría del servicio, ej: corte, color, peinado")
    requiere_producto: bool = Field(default=False, description="Indica si el servicio requiere productos")
    activo: bool = Field(default=True, description="Indica si el servicio está activo")

    # IDs relacionales (por unique_id)
    franquicia_id: Optional[str] = Field(None, description="Unique ID de la franquicia (si aplica)")
    sede_id: Optional[str] = Field(None, description="Unique ID de la sede (si aplica)")

    # Auditoría
    creado_por: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None