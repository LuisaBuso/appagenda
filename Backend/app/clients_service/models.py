from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime

class Cliente(BaseModel):
    cliente_id: Optional[str] = None
    nombre: str
    correo: Optional[EmailStr] = None
    telefono: Optional[str] = None
    cedula: Optional[str] = None
    ciudad: Optional[str] = None
    fecha_de_nacimiento: Optional[str] = "1990-06-01"  # ISO string
    sede_id: Optional[str] = None
    notas: Optional[str] = None
    fecha_creacion: Optional[datetime] = None

    @field_validator("fecha_de_nacimiento")
    def validar_fecha(cls, v):
        if v is None:
            return v
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except:
            raise ValueError("Formato de fecha inválido. Use YYYY-MM-DD")
        return v


class NotaCliente(BaseModel):
    nota: str
    fecha: datetime
    autor: str
