from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Producto(BaseModel):
    nombre: str
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    precio: float
    stock_actual: int = 0
    stock_minimo: int = 5
    sede_id: Optional[str] = None
    franquicia_id: Optional[str] = None
    fecha_creacion: Optional[datetime] = None

