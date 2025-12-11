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
    collection_invoices,
    collection_sales
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
# 🧾 Facturar cita - VERSIÓN CON MÚLTIPLES MONEDAS Y REGLAS DE COMISIÓN
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

    # ✅ Verificar si YA está facturada
    estado_factura = cita.get("estado_factura")
    if estado_factura == "facturado":
        print("⚠️ La cita ya está facturada")
        raise HTTPException(status_code=400, detail="La cita ya está facturada")

    # ✅ Verificar que esté pagada antes de facturar
    estado_pago = cita.get("estado_pago", "")
    if estado_pago != "pagado":
        print("⚠️ La cita debe estar pagada antes de facturar")
        raise HTTPException(status_code=400, detail="La cita debe estar pagada completamente antes de facturar")

    print("✅ Cita lista para facturar (pagada pero no facturada)")

    # ====================================
    # 2️⃣ OBTENER SEDE, MONEDA Y REGLAS DE COMISIÓN
    # ====================================
    sede = await collection_locales.find_one({
        "sede_id": cita["sede_id"]
    })
    if not sede:
        print("❌ Sede no encontrada")
        raise HTTPException(status_code=404, detail="Sede no encontrada")

    moneda_sede = sede.get("moneda", "COP")
    reglas_comision = sede.get("reglas_comision", {"tipo": "servicios"})
    tipo_comision = reglas_comision.get("tipo", "servicios")
    
    print(f"💰 Moneda de la sede: {moneda_sede}")
    print(f"📊 Tipo de comisión de la sede: {tipo_comision}")

    # ====================================
    # 3️⃣ OBTENER SERVICIO Y PRECIO EN MONEDA CORRECTA
    # ====================================
    servicio = await collection_servicios.find_one({
        "servicio_id": cita["servicio_id"]
    })
    if not servicio:
        print("❌ Servicio no encontrado")
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    # ⭐ OBTENER PRECIO EN LA MONEDA DE LA SEDE
    precios_servicio = servicio.get("precios", {})
    if moneda_sede not in precios_servicio:
        print(f"❌ El servicio no tiene precio en {moneda_sede}")
        raise HTTPException(
            status_code=400, 
            detail=f"El servicio '{servicio.get('nombre')}' no tiene precio configurado en {moneda_sede}"
        )

    valor_servicio = precios_servicio[moneda_sede]
    print(f"💵 Precio del servicio en {moneda_sede}: {valor_servicio}")

    # ====================================
    # 4️⃣ OBTENER CLIENTE
    # ====================================
    cliente = await collection_clients.find_one({
        "cliente_id": cita["cliente_id"]
    })
    if not cliente:
        print("❌ Cliente no encontrado")
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # ====================================
    # 5️⃣ CALCULAR COMISIÓN DEL SERVICIO (SI APLICA)
    # ====================================
    comision_porcentaje = 0
    valor_comision_servicio = 0
    
    # ⭐ SOLO CALCULAR COMISIÓN DE SERVICIO SI LA SEDE LO PERMITE
    if tipo_comision in ["servicios", "mixto"]:
        comision_porcentaje = servicio.get("comision_estilista", 0)
        valor_comision_servicio = (valor_servicio * comision_porcentaje) / 100
        print(f"✅ Comisión por servicio habilitada: {comision_porcentaje}% = {valor_comision_servicio}")
    else:
        print(f"⚠️ Comisión por servicio deshabilitada en esta sede (tipo={tipo_comision})")

    # ====================================
    # 6️⃣ PREPARAR ITEMS (SERVICIO + PRODUCTOS)
    # ====================================
    items = []
    total_comision_productos = 0
    
    # Item del servicio principal
    items.append({
        "tipo": "servicio",
        "servicio_id": cita["servicio_id"],
        "nombre": cita["servicio_nombre"],
        "cantidad": 1,
        "precio_unitario": valor_servicio,
        "subtotal": valor_servicio,
        "moneda": moneda_sede,
        "comision": valor_comision_servicio if tipo_comision in ["servicios", "mixto"] else 0
    })

    # Agregar productos si existen
    productos_cita = cita.get("productos", [])
    for producto in productos_cita:
        precio_producto = producto.get("precio_unitario", 0)
        cantidad = producto.get("cantidad", 1)
        subtotal_producto = producto.get("subtotal", precio_producto * cantidad)
        
        # ⭐ CALCULAR COMISIÓN DE PRODUCTO (SI APLICA)
        comision_producto = 0
        if tipo_comision in ["productos", "mixto"]:
            porcentaje_producto = producto.get("comision_porcentaje", 0)
            comision_producto = (subtotal_producto * porcentaje_producto) / 100
            total_comision_productos += comision_producto
            print(f"✅ Comisión por producto '{producto.get('nombre')}': {porcentaje_producto}% = {comision_producto}")
        
        items.append({
            "tipo": "producto",
            "producto_id": producto.get("producto_id"),
            "nombre": producto.get("nombre"),
            "cantidad": cantidad,
            "precio_unitario": precio_producto,
            "subtotal": subtotal_producto,
            "moneda": moneda_sede,
            "comision": comision_producto
        })

    # ====================================
    # 7️⃣ CALCULAR TOTAL FINAL Y COMISIÓN TOTAL
    # ====================================
    total_final = sum(item["subtotal"] for item in items)
    valor_comision_total = valor_comision_servicio + total_comision_productos
    
    print(f"💰 Total de la venta: {total_final} {moneda_sede}")
    print(f"💵 Comisión total generada: {valor_comision_total} {moneda_sede}")

    # ====================================
    # 8️⃣ GENERAR NÚMEROS ÚNICOS
    # ====================================
    numero_comprobante = generar_numero_comprobante()
    identificador = generar_identificador()
    fecha_actual = datetime.now()

    print(f"🔢 Número de comprobante: {numero_comprobante}")
    print(f"🔢 Identificador: {identificador}")

    # ====================================
    # 9️⃣ CREAR DOCUMENTO DE FACTURA (INVOICE)
    # ====================================
    factura = {
        "identificador": identificador,
        "fecha_pago": fecha_actual,
        "local": sede.get("nombre"),
        "sede_id": cita["sede_id"],
        "moneda": moneda_sede,
        "tipo_comision": tipo_comision,  # ⭐ NUEVO
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
    # 🔟 CREAR DOCUMENTO DE VENTA (SALES)
    # ====================================
    desglose_pagos = {
        cita.get("metodo_pago", "efectivo"): total_final,
        "total": total_final
    }

    venta = {
        "identificador": identificador,
        "fecha_pago": fecha_actual,
        "local": sede.get("nombre"),
        "sede_id": cita["sede_id"],
        "moneda": moneda_sede,
        "tipo_comision": tipo_comision,  # ⭐ NUEVO
        "cliente_id": cita["cliente_id"],
        "nombre_cliente": cliente.get("nombre", "") + " " + cliente.get("apellido", ""),
        "cedula_cliente": cliente.get("cedula", ""),
        "email_cliente": cliente.get("correo", ""),
        "telefono_cliente": cliente.get("telefono", ""),
        "items": items,
        "desglose_pagos": desglose_pagos,
        
        # Campos adicionales útiles
        "profesional_id": cita["profesional_id"],
        "profesional_nombre": cita.get("profesional_nombre", ""),
        "numero_comprobante": numero_comprobante,
        "facturado_por": current_user.get("email")
    }

    # ====================================
    # 1️⃣1️⃣ ACTUALIZAR CITA
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
                "facturado_por": current_user.get("email"),
                "estado_factura": "facturado"
            }
        }
    )
    print("✅ Cita actualizada a estado 'completada' y 'pagado'")

    # ====================================
    # 1️⃣2️⃣ GUARDAR FACTURA Y VENTA
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
    # 1️⃣3️⃣ ACUMULAR COMISIONES DEL ESTILISTA (SI APLICA)
    # ====================================
    comision_msg = "No aplica comisión para esta sede"
    
    # ⭐ SOLO GUARDAR COMISIONES SI HAY ALGO QUE COMISIONAR
    if valor_comision_total > 0:
        profesional_id = cita["profesional_id"]
        print(f"👤 Profesional ID: {profesional_id}")

        comision_document = await collection_commissions.find_one({
            "profesional_id": profesional_id,
            "sede_id": cita["sede_id"]
        })
        print(f"📂 Documento de comisión encontrado: {comision_document}")

        # Preparar detalle de comisión
        servicio_comision = {
            "servicio_id": cita["servicio_id"],
            "servicio_nombre": cita["servicio_nombre"],
            "valor_servicio": valor_servicio,
            "porcentaje": comision_porcentaje,
            "valor_comision_servicio": valor_comision_servicio,
            "valor_comision_productos": total_comision_productos,
            "valor_comision_total": valor_comision_total,
            "fecha": cita["fecha"],
            "numero_comprobante": numero_comprobante,
            "tipo_comision_sede": tipo_comision
        }

        if comision_document:
            # Ya existe → incrementar
            await collection_commissions.update_one(
                {
                    "profesional_id": profesional_id,
                    "sede_id": cita["sede_id"]
                },
                {
                    "$inc": {
                        "total_servicios": 1,
                        "total_comisiones": valor_comision_total
                    },
                    "$set": {
                        "estado": "pendiente"
                    },
                    "$push": {
                        "servicios_detalle": servicio_comision
                    }
                }
            )
            comision_msg = f"Comisión actualizada (+{valor_comision_total} {moneda_sede})"
            print("🔄 Comisión actualizada en el documento existente")
        else:
            # No existe → crear registro nuevo
            nuevo_doc = {
                "profesional_id": profesional_id,
                "profesional_nombre": cita["profesional_nombre"],
                "sede_id": cita["sede_id"],
                "moneda": moneda_sede,
                "tipo_comision": tipo_comision,  # ⭐ NUEVO
                "total_servicios": 1,
                "total_comisiones": valor_comision_total,
                "servicios_detalle": [servicio_comision],
                "estado": "pendiente",
                "creado_en": datetime.now()
            }
            await collection_commissions.insert_one(nuevo_doc)
            comision_msg = f"Comisión creada ({valor_comision_total} {moneda_sede})"
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
        "moneda": moneda_sede,
        "tipo_comision_sede": tipo_comision,  # ⭐ NUEVO
        "comision": comision_msg,
        "valor_comision_generada": valor_comision_total,
        "items_facturados": len(items),
        "detalles": {
            "servicio": valor_servicio,
            "comision_servicio": valor_comision_servicio,
            "productos": sum(p["subtotal"] for p in productos_cita),
            "comision_productos": total_comision_productos,
            "total": total_final,
            "comision_total": valor_comision_total,
            "moneda": moneda_sede
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