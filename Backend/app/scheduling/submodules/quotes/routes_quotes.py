from fastapi import APIRouter, HTTPException, Depends
from app.scheduling.models import Cita
from app.database.mongo import collection_citas, collection_horarios, collection_block
from app.auth.routes import get_current_user
from app.id_generator.generator import generar_id, validar_id  # ⭐ Importar generador
from datetime import datetime
from typing import List
from bson import ObjectId

router = APIRouter(prefix="/citas")


# =========================================================
# 🧩 Helper para formatear ObjectId
# =========================================================
def cita_to_dict(c):
    c["_id"] = str(c["_id"])
    return c


# =========================================================
# 🔹 Obtener todas las citas (por sede o estilista)
# =========================================================
@router.get("/", response_model=List[dict])
async def listar_citas(
    sede_id: str = None,
    estilista_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    rol = current_user["rol"]
    query = {}

    if rol == "estilista":
        query["estilista_id"] = current_user["email"]
    elif rol in ["admin_sede", "admin_franquicia", "super_admin"]:
        if sede_id:
            query["sede_id"] = sede_id
        if estilista_id:
            query["estilista_id"] = estilista_id
    else:
        raise HTTPException(status_code=403, detail="No autorizado para ver citas")

    citas = await collection_citas.find(query).to_list(None)
    return [cita_to_dict(c) for c in citas]


# =========================================================
# 🔹 Crear cita CON ID CORTO NO SECUENCIAL
# =========================================================
@router.post("/", response_model=dict)
async def crear_cita(
    cita: Cita,
    current_user: dict = Depends(get_current_user)
):
    """
    Crea una cita con ID corto NO secuencial: CT-00247
    """
    rol = current_user["rol"]
    print(f"🔍 Rol del usuario: {rol}")

    if rol not in ["usuario", "admin_sede", "super_admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para crear citas")

    # ========= VALIDACIONES DE NEGOCIO =========
    
    # ✅ Validar que la cita esté dentro del horario laboral del estilista
    dia_semana = cita.fecha.strftime("%A").capitalize()  # Ej: Lunes, Martes, etc.
    print(f"🔍 Día de la semana: {dia_semana}")
    
    horario = await collection_horarios.find_one({
        "estilista_id": cita.estilista_id,
        "dia_semana": dia_semana
    })
    print(f"🔍 Horario encontrado: {horario}")

    if not horario:
        raise HTTPException(
            status_code=400, 
            detail="El estilista no tiene horario asignado para ese día"
        )

    hora_inicio_horario = datetime.strptime(horario["hora_inicio"], "%H:%M").time()
    hora_fin_horario = datetime.strptime(horario["hora_fin"], "%H:%M").time()
    print(f"🔍 Horario laboral: {hora_inicio_horario} - {hora_fin_horario}")

    if not (hora_inicio_horario <= cita.hora_inicio <= hora_fin_horario and
            hora_inicio_horario <= cita.hora_fin <= hora_fin_horario):
        raise HTTPException(
            status_code=400, 
            detail="La cita está fuera del horario laboral del estilista"
        )

    # ✅ Validar que la cita no se solape con otra cita del mismo estilista
    solape = await collection_citas.find_one({
        "estilista_id": cita.estilista_id,
        "fecha": cita.fecha,
        "hora_inicio": {"$lt": cita.hora_fin},
        "hora_fin": {"$gt": cita.hora_inicio},
        "estado": {"$ne": "cancelada"}
    })
    print(f"🔍 Solape encontrado: {solape}")
    
    if solape:
        raise HTTPException(
            status_code=400, 
            detail="El estilista ya tiene una cita en ese horario"
        )

    # ✅ Validar bloqueos del estilista
    bloqueo = await collection_block.find_one({
        "estilista_id": cita.estilista_id,
        "fecha": cita.fecha,
        "hora_inicio": {"$lt": cita.hora_fin},
        "hora_fin": {"$gt": cita.hora_inicio}
    })
    print(f"🔍 Bloqueo encontrado: {bloqueo}")
    
    if bloqueo:
        raise HTTPException(
            status_code=400, 
            detail="El horario está bloqueado por el estilista"
        )

    # ========= GENERAR ID CORTO NO SECUENCIAL =========
    try:
        cita_id = await generar_id(
            entidad="cita",
            franquicia_id=current_user.get("franquicia_id"),
            sede_id=cita.sede_id,
            metadata={
                "cliente_id": cita.cliente_id,
                "estilista_id": cita.estilista_id,
                "creado_por": current_user["email"]
            }
        )
    except Exception as e:
        print(f"❌ Error al generar ID de cita: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error al generar ID de cita: {str(e)}"
        )
    
    print(f"✨ ID de cita generado: {cita_id}")  # CT-00247

    # ========= PREPARAR DATOS =========
    data = cita.dict()
    data["cita_id"] = cita_id  # ⭐ ID corto: CT-00247
    data["creada_por"] = current_user["email"]
    data["fecha_creacion"] = datetime.now()
    data["estado"] = data.get("estado", "pendiente")
    
    print(f"🔍 Datos de la cita a insertar: {data}")

    # ========= INSERTAR EN BD =========
    result = await collection_citas.insert_one(data)
    data["_id"] = str(result.inserted_id)
    
    print(f"🟢 Cita creada con ID: {cita_id}")

    # (Opcional) emitir evento cita.created
    print(f"🟢 EVENTO: cita.created -> {cita_id}")

    return {
        "msg": "Cita creada exitosamente",
        "cita_id": cita_id,  # ⭐ ID corto NO secuencial
        "cita": data
    }


# =========================================================
# 🔹 Obtener cita por ID (DUAL: legible o ObjectId)
# =========================================================
@router.get("/{cita_id}", response_model=dict)
async def obtener_cita(
    cita_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene una cita por su cita_id (CT-00247) o MongoDB ObjectId.
    """
    # ⭐ BUSCAR POR cita_id LEGIBLE PRIMERO
    cita = await collection_citas.find_one({"cita_id": cita_id})
    
    # Si no se encuentra, intentar como ObjectId (compatibilidad)
    if not cita:
        try:
            cita = await collection_citas.find_one({"_id": ObjectId(cita_id)})
        except Exception:
            pass
    
    if not cita:
        raise HTTPException(
            status_code=404, 
            detail=f"Cita no encontrada: {cita_id}"
        )
    
    # Validar permisos
    rol = current_user["rol"]
    if rol == "estilista":
        if cita["estilista_id"] != current_user["email"]:
            raise HTTPException(
                status_code=403, 
                detail="No tiene permisos para ver esta cita"
            )
    elif rol == "usuario":
        if cita["cliente_id"] != current_user.get("user_id"):
            raise HTTPException(
                status_code=403, 
                detail="No tiene permisos para ver esta cita"
            )
    
    return cita_to_dict(cita)


# =========================================================
# 🔹 Editar cita (solo admin_sede o super_admin)
# =========================================================
@router.put("/{cita_id}", response_model=dict)
async def editar_cita(
    cita_id: str,
    cita_data: Cita,
    current_user: dict = Depends(get_current_user)
):
    """
    Actualiza una cita existente.
    Acepta cita_id (CT-00247) o ObjectId.
    """
    rol = current_user["rol"]
    if rol not in ["admin_sede", "super_admin"]:
        raise HTTPException(
            status_code=403, 
            detail="No autorizado para editar citas"
        )

    # Preparar datos a actualizar
    update_data = {k: v for k, v in cita_data.dict().items() if v is not None}
    
    # No permitir cambiar el cita_id
    update_data.pop("cita_id", None)
    
    update_data["modificado_por"] = current_user["email"]
    update_data["fecha_modificacion"] = datetime.now()

    # ⭐ ACTUALIZAR POR cita_id PRIMERO
    result = await collection_citas.update_one(
        {"cita_id": cita_id},
        {"$set": update_data}
    )
    
    # Si no se encuentra, intentar con ObjectId
    if result.matched_count == 0:
        try:
            result = await collection_citas.update_one(
                {"_id": ObjectId(cita_id)},
                {"$set": update_data}
            )
        except Exception:
            pass

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404, 
            detail=f"Cita no encontrada: {cita_id}"
        )

    return {
        "msg": "Cita actualizada correctamente",
        "cita_id": cita_id
    }


# =========================================================
# 🔹 Cancelar cita (usuario o admin_sede)
# =========================================================
@router.patch("/{cita_id}/cancelar", response_model=dict)
async def cancelar_cita(
    cita_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Cancela una cita.
    Acepta cita_id (CT-00247) o ObjectId.
    """
    rol = current_user["rol"]

    if rol not in ["usuario", "admin_sede", "super_admin"]:
        raise HTTPException(
            status_code=403, 
            detail="No autorizado para cancelar citas"
        )

    # Buscar cita
    cita = await collection_citas.find_one({"cita_id": cita_id})
    
    if not cita:
        try:
            cita = await collection_citas.find_one({"_id": ObjectId(cita_id)})
        except Exception:
            pass
    
    if not cita:
        raise HTTPException(
            status_code=404, 
            detail=f"Cita no encontrada: {cita_id}"
        )

    if cita["estado"] == "cancelada":
        raise HTTPException(
            status_code=400, 
            detail="La cita ya está cancelada"
        )

    # Validar que el usuario pueda cancelar esta cita
    if rol == "usuario":
        if cita["cliente_id"] != current_user.get("user_id"):
            raise HTTPException(
                status_code=403, 
                detail="Solo puede cancelar sus propias citas"
            )

    await collection_citas.update_one(
        {"_id": cita["_id"]},
        {"$set": {
            "estado": "cancelada",
            "fecha_cancelacion": datetime.now(),
            "cancelada_por": current_user["email"]
        }}
    )

    # (Opcional) emitir evento cita.cancelled
    print(f"🔴 EVENTO: cita.cancelled -> {cita.get('cita_id', cita_id)}")

    return {
        "msg": "Cita cancelada correctamente",
        "cita_id": cita.get("cita_id", cita_id)
    }


# =========================================================
# 🔹 Cambiar estado de cita (solo admin_sede o super_admin)
# =========================================================
@router.patch("/{cita_id}/estado", response_model=dict)
async def cambiar_estado_cita(
    cita_id: str,
    nuevo_estado: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Cambia el estado de una cita.
    Acepta cita_id (CT-00247) o ObjectId.
    """
    rol = current_user["rol"]

    if rol not in ["admin_sede", "super_admin"]:
        raise HTTPException(
            status_code=403, 
            detail="No autorizado para cambiar el estado de citas"
        )

    if nuevo_estado not in ["pendiente", "confirmada", "asistida", "cancelada"]:
        raise HTTPException(
            status_code=400, 
            detail="Estado inválido"
        )

    # Buscar cita
    cita = await collection_citas.find_one({"cita_id": cita_id})
    
    if not cita:
        try:
            cita = await collection_citas.find_one({"_id": ObjectId(cita_id)})
        except Exception:
            pass
    
    if not cita:
        raise HTTPException(
            status_code=404, 
            detail=f"Cita no encontrada: {cita_id}"
        )

    await collection_citas.update_one(
        {"_id": cita["_id"]},
        {"$set": {
            "estado": nuevo_estado,
            "modificado_por": current_user["email"],
            "fecha_modificacion": datetime.now()
        }}
    )

    # (Opcional) emitir evento cita.completed
    if nuevo_estado == "asistida":
        print(f"✅ EVENTO: cita.completed -> {cita.get('cita_id', cita_id)}")

    return {
        "msg": f"Estado de cita actualizado a '{nuevo_estado}'",
        "cita_id": cita.get("cita_id", cita_id)
    }


# =========================================================
# 🔍 VALIDAR cita_id (Endpoint útil para frontend)
# =========================================================
@router.get("/validar/{cita_id}", response_model=dict)
async def validar_cita_id(
    cita_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Valida que un cita_id sea válido y exista.
    """
    # Validar formato
    es_valido_formato = await validar_id(cita_id, entidad="cita")
    
    if not es_valido_formato:
        raise HTTPException(
            status_code=400, 
            detail=f"Formato de ID inválido. Debe ser: CT-[números]"
        )
    
    # Validar que existe
    cita = await collection_citas.find_one({"cita_id": cita_id})

    if not cita:
        raise HTTPException(
            status_code=404, 
            detail=f"No existe cita con ID: {cita_id}"
        )

    return {
        "valido": True,
        "cita_id": cita_id,
        "estado": cita.get("estado"),
        "fecha": cita.get("fecha"),
        "estilista_id": cita.get("estilista_id")
    }