from typing import List, Dict
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ItemSalida(BaseModel):
    producto_id: str
    cantidad: int

class Salida(BaseModel):
    motivo: str  # venta | uso_interno | ajuste
    sede_id: Optional[str] = None
    items: List[ItemSalida]
    fecha_creacion: Optional[datetime] = None
