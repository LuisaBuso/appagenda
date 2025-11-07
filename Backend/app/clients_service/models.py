from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class Cliente(BaseModel):
    nombre: str
    correo: Optional[EmailStr] = None
    telefono: Optional[str] = None
    franquicia_id: Optional[str] = None
    sede_id: Optional[str] = None
    notas: Optional[str] = None
    fecha_creacion: Optional[datetime] = None

class NotaCliente(BaseModel):
    nota: str
    fecha: datetime
    autor: str
