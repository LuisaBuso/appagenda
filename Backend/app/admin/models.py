from pydantic import BaseModel, EmailStr
from typing import Optional, List


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
    sede_id: str  # relación con Local


# ============================================
# 💅 MODELO: Servicio (Administración)
# ============================================
class ServicioAdmin(BaseModel):
    nombre: str
    precio: float
    duracion_minutos: int
    categoria: Optional[str] = None  # Ej: Corte, Uñas, Color, Peinado
