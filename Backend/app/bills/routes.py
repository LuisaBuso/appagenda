from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from typing import Optional, List
from bson import ObjectId
import random

from app.database.mongo import (
    collection_citas,
    collection_servicios,
    collection_commissions,
    collection_clients,
    collection_locales,
    collection_invoices,  # Nueva colección
    collection_sales      # Nueva colección
)
from app.auth.routes import get_current_user

router = APIRouter()

def generar_numero_comprobante() -> str:
    """
    Genera un número de comprobante único de 8 dígitos
    """
    return str(random.randint(10000000, 99999999))

def generar_identificador() -> str:
    """
    Genera un identificador único de 8 dígitos
    """
    return str(random.randint(10000000, 99999999))


# ============================================================
# 🧾 Facturar cita - VERSIÓN MEJORADA
# ============================================================
@router.post("/quotes/facturar/{cita_id}")
async def facturar_cita(
    cita_id: str,
    current_user: dict = Depends(get_current_user)
):
    print(f"🔍 Facturar cita invocada por {current_user.get('email')} (rol={current_user.get('rol')})")
    print(f"📋 Cita ID: {cita_id}")

    # Solo admin sede / superadmin
    if current_user["rol"] not in ["admin_sede", "superadmin"]:
        print("❌ Usuario no autorizado para facturar")
        raise HTTPException(status_code=403, detail="No autorizado para facturar")

    # ====================================
    # 1️⃣ BUSCAR Y VALIDAR CITA
    # ====================================
    cita = await collection_citas.find_one({"_id": ObjectId(cita_id)})
    if not cita:
        print("❌ Cita no encontrada")
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    print(f"📄 Cita encontrada: {cita}")

    if cita["estado_pago"] == "pagado":
        print("⚠️ La cita ya está pagada")
        raise HTTPException(status_code=400, detail="La cita ya está pagada")

    # ====================================
    # 2️⃣ OBTENER DATOS RELACIONADOS
    # ====================================
    servicio = await collection_servicios.find_one({
        "servicio_id": cita["servicio_id"]
    })
    if not servicio:
        print("❌ Servicio no encontrado")
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    cliente = await collection_clients.find_one({
        "cliente_id": cita["cliente_id"]
    })
    if not cliente:
        print("❌ Cliente no encontrado")
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    sede = await collection_locales.find_one({
        "sede_id": cita["sede_id"]
    })
    if not sede:
        print("❌ Sede no encontrada")
        raise HTTPException(status_code=404, detail="Sede no encontrada")

    print(f"🛠 Servicio encontrado: {servicio}")

    # ====================================
    # 3️⃣ CALCULAR COMISIÓN
    # ====================================
    comision_porcentaje = servicio.get("comision_estilista", 0)
    print(f"📊 Porcentaje de comisión: {comision_porcentaje}%")

    valor_servicio = cita["valor_total"]
    valor_comision = (valor_servicio * comision_porcentaje) / 100
    print(f"💰 Valor del servicio: {valor_servicio}, Valor de la comisión: {valor_comision}")

    # ====================================
    # 4️⃣ PREPARAR ITEMS (SERVICIO + PRODUCTOS)
    # ====================================
    items = []
    
    # Item del servicio principal
    items.append({
        "tipo": "servicio",
        "servicio_id": cita["servicio_id"],
        "nombre": cita["servicio_nombre"],
        "cantidad": 1,
        "precio_unitario": valor_servicio,
        "subtotal": valor_servicio
    })

    # Agregar productos si existen
    productos_cita = cita.get("productos", [])
    for producto in productos_cita:
        items.append({
            "tipo": "producto",
            "producto_id": producto.get("producto_id"),
            "nombre": producto.get("nombre"),
            "cantidad": producto.get("cantidad", 1),
            "precio_unitario": producto.get("precio_unitario", 0),
            "subtotal": producto.get("subtotal", 0)
        })

    # ====================================
    # 5️⃣ CALCULAR TOTAL FINAL
    # ====================================
    total_final = sum(item["subtotal"] for item in items)

    # ====================================
    # 6️⃣ GENERAR NÚMEROS ÚNICOS
    # ====================================
    numero_comprobante = generar_numero_comprobante()
    identificador = generar_identificador()
    fecha_actual = datetime.now()

    print(f"🔢 Número de comprobante: {numero_comprobante}")
    print(f"🔢 Identificador: {identificador}")

    # ====================================
    # 7️⃣ CREAR DOCUMENTO DE FACTURA (INVOICE)
    # ====================================
    factura = {
        "identificador": identificador,
        "fecha_pago": fecha_actual,
        "local": sede.get("nombre"),
        "sede_id": cita["sede_id"],
        "cliente_id": cita["cliente_id"],
        "nombre_cliente": cliente.get("nombre", "") + " " + cliente.get("apellido", ""),
        "cedula_cliente": cliente.get("cedula", ""),
        "email_cliente": cliente.get("correo", ""),
        "telefono_cliente": cliente.get("telefono", ""),
        "total": total_final,
        "comprobante_de_pago": "Factura",
        "numero_comprobante": numero_comprobante,
        "fecha_comprobante": fecha_actual,
        "monto": total_final,
        
        # Campos adicionales útiles
        "profesional_id": cita["profesional_id"],
        "profesional_nombre": cita.get("profesional_nombre", ""),
        "metodo_pago": cita.get("metodo_pago", "efectivo"),
        "facturado_por": current_user.get("email"),
        "estado": "pagado"
    }

    # ====================================
    # 8️⃣ CREAR DOCUMENTO DE VENTA (SALES)
    # ====================================
    # Determinar desglose de pagos (puedes ajustar esto según tu lógica)
    desglose_pagos = {
        cita.get("metodo_pago", "efectivo"): total_final,
        "total": total_final
    }

    venta = {
        "identificador": identificador,
        "fecha_pago": fecha_actual,
        "local": sede.get("nombre"),
        "sede_id": cita["sede_id"],
        "cliente_id": cita["cliente_id"],
        "nombre_cliente": cliente.get("nombre", "") + " " + cliente.get("apellido", ""),
        "cedula_cliente": cliente.get("cedula", ""),
        "email_cliente": cliente.get("correo", ""),
        "telefono_cliente": cliente.get("telefono", ""),
        "items": items,  # Array con servicio y productos
        "desglose_pagos": desglose_pagos,
        
        # Campos adicionales útiles
        "profesional_id": cita["profesional_id"],
        "profesional_nombre": cita.get("profesional_nombre", ""),
        "numero_comprobante": numero_comprobante,
        "facturado_por": current_user.get("email")
    }

    # ====================================
    # 9️⃣ ACTUALIZAR CITA
    # ====================================
    await collection_citas.update_one(
        {"_id": ObjectId(cita_id)},
        {
            "$set": {
                "estado": "completada",
                "estado_pago": "pagado",
                "saldo_pendiente": 0,
                "fecha_facturacion": fecha_actual,
                "numero_comprobante": numero_comprobante,
                "facturado_por": current_user.get("email")
            }
        }
    )
    print("✅ Cita actualizada a estado 'completada' y 'pagado'")

    # ====================================
    # 🔟 GUARDAR FACTURA Y VENTA
    # ====================================
    try:
        await collection_invoices.insert_one(factura)
        print("✅ Factura guardada en collection_invoices")
    except Exception as e:
        print(f"⚠️ Error guardando factura: {e}")

    try:
        await collection_sales.insert_one(venta)
        print("✅ Venta guardada en collection_sales")
    except Exception as e:
        print(f"⚠️ Error guardando venta: {e}")

    # ====================================
    # 1️⃣1️⃣ ACUMULAR COMISIONES DEL ESTILISTA
    # ====================================
    profesional_id = cita["profesional_id"]
    print(f"👤 Profesional ID: {profesional_id}")

    comision_document = await collection_commissions.find_one({
        "profesional_id": profesional_id
    })
    print(f"📂 Documento de comisión encontrado: {comision_document}")

    servicio_comision = {
        "servicio_id": cita["servicio_id"],
        "servicio_nombre": cita["servicio_nombre"],
        "valor_servicio": valor_servicio,
        "porcentaje": comision_porcentaje,
        "valor_comision": valor_comision,
        "fecha": cita["fecha"],
        "numero_comprobante": numero_comprobante
    }

    if comision_document:
        # Ya existe → incrementar
        await collection_commissions.update_one(
            {"profesional_id": profesional_id},
            {
                "$inc": {
                    "total_servicios": 1,
                    "total_comisiones": valor_comision
                },
                "$push": {
                    "servicios_detalle": servicio_comision
                }
            }
        )
        comision_msg = "Comisión actualizada"
        print("🔄 Comisión actualizada en el documento existente")
    else:
        # No existe → crear registro nuevo
        nuevo_doc = {
            "profesional_id": profesional_id,
            "profesional_nombre": cita["profesional_nombre"],
            "sede_id": cita["sede_id"],
            "total_servicios": 1,
            "total_comisiones": valor_comision,
            "servicios_detalle": [servicio_comision],
            "creado_en": datetime.now()
        }
        await collection_commissions.insert_one(nuevo_doc)
        comision_msg = "Comisión creada"
        print("🆕 Nuevo documento de comisión creado")

    # ====================================
    # RESPUESTA FINAL
    # ====================================
    return {
        "success": True,
        "message": "Cita facturada correctamente",
        "numero_comprobante": numero_comprobante,
        "identificador": identificador,
        "total": total_final,
        "comision": comision_msg,
        "valor_comision_generada": valor_comision,
        "items_facturados": len(items),
        "detalles": {
            "servicio": valor_servicio,
            "productos": sum(p["subtotal"] for p in productos_cita),
            "total": total_final
        }
    }


# ============================================================
# 📄 Obtener facturas (opcional - para consultar)
# ============================================================
@router.get("/invoices/{cliente_id}")
async def obtener_facturas_cliente(
    cliente_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene todas las facturas de un cliente
    """
    facturas = await collection_invoices.find({
        "cliente_id": cliente_id
    }).sort("fecha_pago", -1).to_list(None)

    # Convertir ObjectId a string
    for factura in facturas:
        factura["_id"] = str(factura["_id"])

    return {
        "success": True,
        "total": len(facturas),
        "facturas": facturas
    }


# ============================================================
# 📊 Obtener ventas (opcional - para reportes)
# ============================================================
@router.get("/sales/{sede_id}")
async def obtener_ventas_sede(
    sede_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene todas las ventas de una sede
    """
    if current_user["rol"] not in ["admin_sede", "superadmin"]:
        raise HTTPException(status_code=403, detail="No autorizado")

    ventas = await collection_sales.find({
        "sede_id": sede_id
    }).sort("fecha_pago", -1).to_list(None)

    # Convertir ObjectId a string
    for venta in ventas:
        venta["_id"] = str(venta["_id"])

    return {
        "success": True,
        "total": len(ventas),
        "ventas": ventas
    }