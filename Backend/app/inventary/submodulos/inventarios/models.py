from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class Inventario(BaseModel):
    producto_id: str = Field(..., description="ID del producto del catálogo maestro")
    sede_id: str = Field(..., description="ID de la sede (ej: SD-88809)")
    stock_actual: int = Field(default=0, ge=0, description="Stock actual en esta sede")
    stock_minimo: int = Field(default=5, ge=0, description="Stock mínimo para alertas")
    fecha_creacion: Optional[datetime] = None
    fecha_ultima_actualizacion: Optional[datetime] = None
    creado_por: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "producto_id": "P001",
                "sede_id": "SD-88809",
                "stock_actual": 50,
                "stock_minimo": 10
            }
        }


class AjusteInventario(BaseModel):
    """Para ajustes manuales de stock por super_admin y admin_sede."""
    cantidad_ajuste: int = Field(..., description="Cantidad a sumar o restar (negativo para restar)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "cantidad_ajuste": -5
            }
        }