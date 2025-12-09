from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict
from datetime import datetime

# =====================================================
# 🏢 MODELO: Local (Sede)
# =====================================================
class Local(BaseModel):
    nombre: str
    direccion: str
    informacion_adicional: Optional[str] = None
    zona_horaria: str
    pais: Optional[str] = None
    moneda: str = Field(..., description="Código de moneda: COP, USD, MXN")
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    
    @validator('moneda')
    def validar_moneda(cls, v):
        monedas_validas = ['COP', 'USD', 'MXN', 'EUR', 'PEN', 'ARS']
        if v and v.upper() not in monedas_validas:
            raise ValueError(f'Moneda debe ser: {", ".join(monedas_validas)}')
        return v.upper() if v else v


# =====================================================
# 💇‍♀️ MODELO: Profesional / Estilista
# =====================================================
class Profesional(BaseModel):
    nombre: str
    email: EmailStr
    sede_id: str
    especialidades: Optional[List[str]] = Field(default_factory=list)
    activo: bool = True
    comision: Optional[float] = None
    password: str


# ============================================
# 💅 MODELO: Servicio
# ============================================
class ServicioAdmin(BaseModel):
    nombre: str = Field(..., description="Nombre del servicio")
    duracion_minutos: int = Field(..., description="Duración en minutos")
    precios: Dict[str, float] = Field(
        ..., 
        description="Precios por moneda: {'COP': 50000, 'USD': 12.50}"
    )
    comision_estilista: Optional[float] = Field(
        None, 
        description="Porcentaje de comisión del estilista"
    )
    categoria: Optional[str] = Field(None, description="Categoría del servicio")
    requiere_producto: bool = Field(default=False)
    activo: bool = Field(default=True)
    
    # IDs relacionales
    sede_id: Optional[str] = None
    
    # Auditoría
    creado_por: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    @validator('precios')
    def validar_precios(cls, v):
        if not v:
            raise ValueError('Debe incluir al menos un precio')
        for moneda, precio in v.items():
            if precio <= 0:
                raise ValueError(f'Precio en {moneda} debe ser mayor a 0')
        return v
    
    @validator('comision_estilista')
    def validar_comision(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError('Comisión debe estar entre 0 y 100')
        return v


