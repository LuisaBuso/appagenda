from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime
from typing import Optional, List
from bson import ObjectId
import random
import asyncio
from datetime import timedelta

from app.database.mongo import (
    collection_citas,
    collection_servicios,
    collection_commissions,
    collection_clients,
    collection_locales,
    collection_invoices,
    collection_sales,
    collection_inventarios,           # 🆕
    collection_inventory_motions
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
    if estado_pago not in ["pagado", "abonado", "pendiente"]:
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
        "tipo_comision": tipo_comision,
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
        "profesional_id": cita["profesional_id"],
        "profesional_nombre": cita.get("profesional_nombre", ""),
        "metodo_pago": cita.get("metodo_pago_actual", "efectivo"),
        "facturado_por": current_user.get("email"),
        "estado": "pagado"
    }

    # ====================================
    # 🔟 CREAR DOCUMENTO DE VENTA (SALES)
    # ====================================
    desglose_pagos = {}
    metodo_pago = (
    cita.get("metodo_pago_actual")
    or cita.get("metodo_pago")
    or "efectivo"
)

    historial_pagos = [{
    "fecha": fecha_actual,
    "monto": round(total_final, 2),
    "metodo": metodo_pago,
    "tipo": "pago_total",
    "registrado_por": current_user.get("email"),
    "saldo_despues": 0,
    "notas": "Pago total al facturar"
}]

    desglose_pagos = {
    metodo_pago: round(total_final, 2),
    "total": round(total_final, 2)
}

    venta = {
        "identificador": identificador,
        "fecha_pago": fecha_actual,
        "local": sede.get("nombre"),
        "sede_id": cita["sede_id"],
        "moneda": moneda_sede,
        "tipo_comision": tipo_comision,
        "cliente_id": cita["cliente_id"],
        "nombre_cliente": cliente.get("nombre", "") + " " + cliente.get("apellido", ""),
        "cedula_cliente": cliente.get("cedula", ""),
        "email_cliente": cliente.get("correo", ""),
        "telefono_cliente": cliente.get("telefono", ""),
        "items": items,
        "historial_pagos": historial_pagos,
        "desglose_pagos": desglose_pagos,
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
                "abono": cita["valor_total"],
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
        result_sale = await collection_sales.insert_one(venta)
        venta_id = str(result_sale.inserted_id)
        print(f"✅ Venta guardada en collection_sales con ID: {venta_id}")
    except Exception as e:
        print(f"⚠️ Error guardando venta: {e}")
        raise HTTPException(status_code=500, detail="Error al guardar la venta")

    # ====================================
    # 🆕 REGISTRAR MOVIMIENTOS DE INVENTARIO
    # ====================================
    movimientos_inventario = []

    for item in items:
        # Solo procesar productos (no servicios)
        if item["tipo"] == "producto":
            producto_id = item["producto_id"]
            cantidad = item["cantidad"]
        
            # Buscar inventario de la sede
            inventario = await collection_inventarios.find_one({
                "producto_id": producto_id,
                "sede_id": cita["sede_id"]
            })
        
            if not inventario:
                print(f"⚠️ No existe inventario para producto {item['nombre']} en sede {cita['sede_id']}")
                continue
        
            stock_anterior = inventario["stock_actual"]
            nuevo_stock = stock_anterior - cantidad
        
            if nuevo_stock < 0:
                print(f"⚠️ ALERTA: Stock negativo para {item['nombre']} (disponible: {stock_anterior}, vendido: {cantidad})")
                # Podrías decidir si bloquear aquí o solo alertar
        
            # Actualizar inventario
            await collection_inventarios.update_one(
                {"_id": inventario["_id"]},
                {
                    "$set": {
                        "stock_actual": nuevo_stock,
                        "fecha_ultima_actualizacion": fecha_actual
                    }
                }
            )
        
            # Preparar movimiento
            movimientos_inventario.append({
                "producto_id": producto_id,
                "nombre_producto": item["nombre"],
                "cantidad": -cantidad,  # Negativo para salidas
                "tipo_movimiento": "venta",
                "stock_anterior": stock_anterior,
                "stock_nuevo": nuevo_stock,
                "referencia_id": venta_id,
                "referencia_tipo": "venta",
                "numero_comprobante": numero_comprobante,
                "cliente_id": cita["cliente_id"],
                "profesional_id": cita["profesional_id"],
                "usuario": current_user.get("email")
            })
        
            print(f"📉 Inventario actualizado: {item['nombre']} ({stock_anterior} → {nuevo_stock})")

    # Registrar todos los movimientos en una sola operación
    if movimientos_inventario:
        motion_doc = {
            "sede_id": cita["sede_id"],
            "fecha": fecha_actual,
            "movimientos": movimientos_inventario,
            "creado_por": current_user.get("email")
        }
        
        try:
            await collection_inventory_motions.insert_one(motion_doc)
            print(f"✅ Movimientos de inventario registrados: {len(movimientos_inventario)} productos")
        except Exception as e:
            print(f"⚠️ Error registrando movimientos de inventario: {e}")
    else:
        print("ℹ️ No hay productos en esta venta, no se registran movimientos de inventario")

    # ====================================
    # 1️⃣3️⃣ ACUMULAR COMISIONES DEL ESTILISTA (SI APLICA)
    # ====================================
    comision_msg = "No aplica comisión para esta sede"

    if valor_comision_total > 0:
        profesional_id = cita["profesional_id"]
        print(f"👤 Profesional ID: {profesional_id}")

        # 🔍 Buscar documento de comisión PENDIENTE
        comision_document = await collection_commissions.find_one({
            "profesional_id": profesional_id,
            "sede_id": cita["sede_id"],
            "estado": "pendiente"
        })
        print(f"📂 Documento de comisión encontrado: {comision_document}")

        # ⭐ REDONDEAR COMISIONES A 2 DECIMALES
        valor_comision_servicio = round(valor_comision_servicio, 2)
        total_comision_productos = round(total_comision_productos, 2)
        valor_comision_total = round(valor_comision_total, 2)

        # Preparar detalle de comisión
        servicio_comision = {
            "servicio_id": cita["servicio_id"],
            "servicio_nombre": cita["servicio_nombre"],
            "valor_servicio": round(valor_servicio, 2),
            "porcentaje": comision_porcentaje,
            "valor_comision_servicio": valor_comision_servicio,
            "valor_comision_productos": total_comision_productos,
            "valor_comision_total": valor_comision_total,
            "fecha": cita["fecha"],
            "numero_comprobante": numero_comprobante,
            "tipo_comision_sede": tipo_comision
        }

        # ⭐ INICIALIZAR VARIABLES
        crear_nuevo_documento = False
        fecha_cita_actual = datetime.strptime(cita["fecha"], "%Y-%m-%d")

        # ⭐ VALIDAR SI SE DEBE CREAR NUEVO DOCUMENTO (15 DÍAS)
        if comision_document:
            servicios_existentes = comision_document.get("servicios_detalle", [])
            
            # ⭐ MIGRAR DOCUMENTOS ANTIGUOS SIN periodo_inicio
            if servicios_existentes and "periodo_inicio" not in comision_document:
                print("⚠️ Documento sin periodo_inicio detectado. Migrando...")
                fechas_migracion = []
                for s in servicios_existentes:
                    try:
                        fecha = datetime.strptime(s["fecha"], "%Y-%m-%d")
                        fechas_migracion.append(fecha)
                    except:
                        continue
                
                if fechas_migracion:
                    fecha_inicio_migracion = min(fechas_migracion).strftime("%Y-%m-%d")
                    fecha_fin_migracion = max(fechas_migracion).strftime("%Y-%m-%d")
                    
                    await collection_commissions.update_one(
                        {"_id": comision_document["_id"]},
                        {"$set": {
                            "periodo_inicio": fecha_inicio_migracion,
                            "periodo_fin": fecha_fin_migracion
                        }}
                    )
                    print(f"✅ Documento migrado: {fecha_inicio_migracion} a {fecha_fin_migracion}")
                    
                    # Actualizar variable local
                    comision_document["periodo_inicio"] = fecha_inicio_migracion
                    comision_document["periodo_fin"] = fecha_fin_migracion
            
            # ⭐ VALIDAR RANGO DE 15 DÍAS
            if servicios_existentes:
                fechas = []
                for s in servicios_existentes:
                    try:
                        fecha = datetime.strptime(s["fecha"], "%Y-%m-%d")
                        fechas.append(fecha)
                    except Exception as e:
                        print(f"⚠️ Error parseando fecha: {e}")
                        continue
                
                if fechas:
                    fecha_mas_antigua = min(fechas)
                    fecha_mas_reciente = max(fechas)
                    
                    # Calcular cuántos días abarcaría si agregamos esta cita
                    fecha_inicio_rango = min(fecha_mas_antigua, fecha_cita_actual)
                    fecha_fin_rango = max(fecha_mas_reciente, fecha_cita_actual)
                    dias_totales = (fecha_fin_rango - fecha_inicio_rango).days + 1
                    
                    print(f"📅 Rango actual: {dias_totales} días ({fecha_inicio_rango.strftime('%Y-%m-%d')} a {fecha_fin_rango.strftime('%Y-%m-%d')})")
                    
                    # ⭐ Si supera 15 días, cerrar el actual y crear nuevo
                    if dias_totales > 15:
                        print(f"⚠️ El rango superaría los 15 días ({dias_totales}). Cerrando documento actual.")
                        crear_nuevo_documento = True
                        
                        # Actualizar períodos en el documento que se va a cerrar
                        await collection_commissions.update_one(
                            {"_id": comision_document["_id"]},
                            {"$set": {
                                "periodo_inicio": fecha_mas_antigua.strftime("%Y-%m-%d"),
                                "periodo_fin": fecha_mas_reciente.strftime("%Y-%m-%d")
                            }}
                        )
                        print(f"✅ Documento cerrado. Período: {fecha_mas_antigua.strftime('%Y-%m-%d')} a {fecha_mas_reciente.strftime('%Y-%m-%d')}")
                else:
                    print("⚠️ No se pudieron parsear fechas, se actualizará el documento existente")
            else:
                print("⚠️ Documento sin servicios previos, se actualizará")

        # ⭐ Decidir: Actualizar o Crear
        if comision_document and not crear_nuevo_documento:
            # Ya existe y NO supera 15 días → incrementar
            print("🔄 Actualizando documento de comisión existente...")
            
            update_operations = {
                "$inc": {
                    "total_servicios": 1,
                    "total_comisiones": valor_comision_total
                },
                "$set": {
                    "estado": "pendiente",
                    "periodo_fin": cita["fecha"]
                },
                "$push": {
                    "servicios_detalle": servicio_comision
                }
            }
            
            # ⭐ Si no tiene periodo_inicio, agregarlo
            if "periodo_inicio" not in comision_document:
                update_operations["$set"]["periodo_inicio"] = cita["fecha"]
            
            await collection_commissions.update_one(
                {
                    "profesional_id": profesional_id,
                    "sede_id": cita["sede_id"],
                    "estado": "pendiente"
                },
                update_operations
            )
            
            # ⭐ REDONDEAR total_comisiones del documento
            doc_actualizado = await collection_commissions.find_one({
                "profesional_id": profesional_id,
                "sede_id": cita["sede_id"],
                "estado": "pendiente"
            })
            
            if doc_actualizado:
                total_redondeado = round(doc_actualizado.get("total_comisiones", 0), 2)
                await collection_commissions.update_one(
                    {"_id": doc_actualizado["_id"]},
                    {"$set": {"total_comisiones": total_redondeado}}
                )
            
            comision_msg = f"Comisión actualizada (+{valor_comision_total} {moneda_sede})"
            print(f"✅ Comisión actualizada: +{valor_comision_total} {moneda_sede}")
        else:
            # No existe O superó 15 días → crear registro nuevo
            print("🆕 Creando nuevo documento de comisión...")
            nuevo_doc = {
                "profesional_id": profesional_id,
                "profesional_nombre": cita["profesional_nombre"],
                "sede_id": cita["sede_id"],
                "moneda": moneda_sede,
                "tipo_comision": tipo_comision,
                "total_servicios": 1,
                "total_comisiones": round(valor_comision_total, 2),
                "servicios_detalle": [servicio_comision],
                "periodo_inicio": cita["fecha"],
                "periodo_fin": cita["fecha"],
                "estado": "pendiente",
                "creado_en": datetime.now()
            }
            await collection_commissions.insert_one(nuevo_doc)
            comision_msg = f"Comisión creada ({valor_comision_total} {moneda_sede})"
            print(f"✅ Nuevo documento creado: {valor_comision_total} {moneda_sede}")
    else:
        print("⚠️ No se generó comisión (valor_comision_total = 0)")

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
        "tipo_comision_sede": tipo_comision,
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
# 📄 Obtener facturas
# ============================================================
@router.get("/invoices/{cliente_id}")
async def obtener_facturas_cliente(
    cliente_id: str,
    current_user: dict = Depends(get_current_user)
):
    facturas = await collection_invoices.find({
        "cliente_id": cliente_id
    }).sort("fecha_pago", -1).to_list(None)

    for factura in facturas:
        factura["_id"] = str(factura["_id"])

    return {
        "success": True,
        "total": len(facturas),
        "facturas": facturas
    }


# ============================================================
# 🔹 Obtener ventas con paginación y filtros
# ============================================================
@router.get("/sales/{sede_id}")
async def obtener_ventas_sede(
    sede_id: str,
    # Parámetros de paginación
    page: int = Query(1, ge=1, description="Número de página (inicia en 1)"),
    limit: int = Query(50, ge=1, le=200, description="Registros por página (máx 200)"),
    
    # Filtros de fecha
    fecha_desde: Optional[str] = Query(
        None, 
        description="Fecha inicio (formato: YYYY-MM-DD)",
        regex=r"^\d{4}-\d{2}-\d{2}$"
    ),
    fecha_hasta: Optional[str] = Query(
        None,
        description="Fecha fin (formato: YYYY-MM-DD)",
        regex=r"^\d{4}-\d{2}-\d{2}$"
    ),
    
    # Filtros adicionales
    profesional_id: Optional[str] = Query(None, description="Filtrar por profesional"),
    search: Optional[str] = Query(None, description="Buscar en nombre, cédula o email del cliente"),
    
    # Ordenamiento
    sort_order: str = Query("desc", regex=r"^(asc|desc)$", description="Orden ascendente o descendente"),
    
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene ventas paginadas con múltiples filtros
    
    Parámetros:
    - **sede_id**: ID de la sede (SD-XXXXX)
    - **page**: Número de página (default: 1)
    - **limit**: Registros por página (default: 50, max: 200)
    - **fecha_desde**: Filtro fecha inicio (YYYY-MM-DD)
    - **fecha_hasta**: Filtro fecha fin (YYYY-MM-DD)
    - **profesional_id**: ID del profesional
    - **search**: Buscar en nombre, cédula o email del cliente
    
    Ejemplo de uso:
    /sales/SD-88809?page=1&limit=50&fecha_desde=2025-12-01&fecha_hasta=2025-12-31
    """
    
    # Validar permisos
    if current_user["rol"] not in ["admin_sede", "superadmin"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    try:
        from datetime import timedelta
        
        # ============================================================
        # 🔹 Construir filtros dinámicos
        # ============================================================
        filtros = {"sede_id": sede_id}
        
        # DEBUG: Log para ver qué estamos buscando
        print(f"🔍 Buscando ventas para sede_id: {sede_id}")
        
        # Filtro de fechas (usando ISODate para MongoDB)
        if fecha_desde or fecha_hasta:
            filtros["fecha_pago"] = {}
            
            if fecha_desde:
                # Convertir a inicio del día en UTC
                fecha_inicio = datetime.strptime(fecha_desde, "%Y-%m-%d")
                filtros["fecha_pago"]["$gte"] = fecha_inicio
                print(f"📅 Filtro fecha_desde: {fecha_inicio}")
            
            if fecha_hasta:
                # Convertir a fin del día en UTC
                fecha_fin = datetime.strptime(fecha_hasta, "%Y-%m-%d")
                fecha_fin = fecha_fin.replace(hour=23, minute=59, second=59)
                filtros["fecha_pago"]["$lte"] = fecha_fin
                print(f"📅 Filtro fecha_hasta: {fecha_fin}")
        else:
            # Si NO hay filtros de fecha, buscar últimos 7 días por defecto
            if not profesional_id and not search:
                fecha_fin = datetime.now()
                fecha_inicio = fecha_fin - timedelta(days=7)
                filtros["fecha_pago"] = {
                    "$gte": fecha_inicio,
                    "$lte": fecha_fin
                }
                print(f"📅 Filtro automático (últimos 7 días): {fecha_inicio} a {fecha_fin}")
        
        # DEBUG: Imprimir filtros aplicados
        print(f"🔎 Filtros aplicados: {filtros}")
        
        # ============================================================
        # 🔹 Filtros adicionales (manejo especial de $or)
        # ============================================================
        condiciones_or = []
        
        # Filtro por profesional (búsqueda híbrida)
        if profesional_id:
            condiciones_or.extend([
                {"profesional_id": profesional_id},  # Sistema actual
                {"items.profesional_id": profesional_id}  # Data migrada
            ])
        
        # Búsqueda de texto en datos del cliente
        if search:
            condiciones_or.extend([
                {"nombre_cliente": {"$regex": search, "$options": "i"}},
                {"cedula_cliente": {"$regex": search, "$options": "i"}},
                {"email_cliente": {"$regex": search, "$options": "i"}},
                {"telefono_cliente": {"$regex": search, "$options": "i"}}
            ])
        
        # Si hay condiciones OR, agregarlas al filtro
        if condiciones_or:
            # Si solo hay un tipo de filtro OR, usar directamente
            if profesional_id and not search:
                filtros["$or"] = condiciones_or
            elif search and not profesional_id:
                filtros["$or"] = condiciones_or
            # Si hay ambos filtros, combinarlos con $and
            else:
                filtros["$and"] = [
                    {
                        "$or": [
                            {"profesional_id": profesional_id},
                            {"items.profesional_id": profesional_id}
                        ]
                    },
                    {
                        "$or": [
                            {"nombre_cliente": {"$regex": search, "$options": "i"}},
                            {"cedula_cliente": {"$regex": search, "$options": "i"}},
                            {"email_cliente": {"$regex": search, "$options": "i"}},
                            {"telefono_cliente": {"$regex": search, "$options": "i"}}
                        ]
                    }
                ]
        
        # DEBUG: Imprimir filtros finales
        print(f"🔎 Filtros finales completos: {filtros}")
        
        # ============================================================
        # 🔹 Contar total de registros (con timeout)
        # ============================================================
        try:
            total_ventas = await asyncio.wait_for(
                collection_sales.count_documents(filtros),
                timeout=10.0  # 10 segundos máximo
            )
        except asyncio.TimeoutError:
            # Si tarda mucho, retornar -1 (frontend puede manejarlo)
            total_ventas = -1
        
        # ============================================================
        # 🔹 Calcular paginación
        # ============================================================
        skip = (page - 1) * limit
        total_pages = (total_ventas + limit - 1) // limit if total_ventas > 0 else 0
        
        # ============================================================
        # 🔹 Ordenamiento (fijo por fecha descendente)
        # ============================================================
        sort_by = "fecha_pago"
        sort_direction = -1  # Descendente (más recientes primero)
        
        # ============================================================
        # 🔹 Proyección optimizada (campos de tu schema)
        # ============================================================
        projection = {
            "_id": 1,
            "identificador": 1,
            "fecha_pago": 1,
            "moneda": 1,
            "local": 1,
            "sede_id": 1,
            "cliente_id": 1,
            "nombre_cliente": 1,
            "cedula_cliente": 1,
            "email_cliente": 1,
            "telefono_cliente": 1,
            "items": 1,
            "desglose_pagos": 1,
            "facturado_por": 1,
            "numero_comprobante": 1,
            "tipo_comision": 1,
            "profesional_id": 1,
            "profesional_nombre": 1,
            "historial_pagos": 1
        }
        
        # ============================================================
        # 🔹 Obtener ventas paginadas
        # ============================================================
        ventas = await collection_sales.find(filtros, projection)\
            .sort(sort_by, sort_direction,)\
            .skip(skip)\
            .limit(limit)\
            .to_list(limit)
        
        # ============================================================
        # 🔹 Procesar datos y convertir ObjectIds RECURSIVAMENTE
        # ============================================================
        from bson import ObjectId
        
        def limpiar_objectids(obj):
            """
            Convierte recursivamente TODOS los ObjectId a string
            Funciona con diccionarios, listas y valores anidados
            """
            if isinstance(obj, ObjectId):
                return str(obj)
            elif isinstance(obj, dict):
                return {key: limpiar_objectids(value) for key, value in obj.items()}
            elif isinstance(obj, list):
                return [limpiar_objectids(item) for item in obj]
            elif isinstance(obj, datetime):
                return obj.isoformat()
            else:
                return obj
        
        # Limpiar TODAS las ventas recursivamente
        ventas = [limpiar_objectids(venta) for venta in ventas]

        
        # ============================================================
        # 🔹 Respuesta estructurada
        # ============================================================
        return {
            "success": True,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_ventas,
                "total_pages": total_pages,
                "has_next": skip + limit < total_ventas if total_ventas > 0 else False,
                "has_prev": page > 1,
                "showing": len(ventas),
                "from": skip + 1 if len(ventas) > 0 else 0,
                "to": skip + len(ventas)
            },
            "filters_applied": {
                "sede_id": sede_id,
                "fecha_desde": fecha_desde,
                "fecha_hasta": fecha_hasta,
                "profesional_id": profesional_id,
                "search": search
            },
            "ventas": ventas
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener ventas: {str(e)}"
        )


# ============================================================
# 🔹 Endpoint para obtener detalle de una venta específica
# ============================================================
@router.get("/sales/{sede_id}/{venta_id}")
async def obtener_detalle_venta(
    sede_id: str,
    venta_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el detalle completo de una venta específica
    """
    
    if current_user["rol"] not in ["admin_sede", "superadmin"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    try:
        from bson import ObjectId
        
        # Función reutilizable para limpiar ObjectIds
        def limpiar_objectids(obj):
            """Convierte recursivamente TODOS los ObjectId a string"""
            if isinstance(obj, ObjectId):
                return str(obj)
            elif isinstance(obj, dict):
                return {key: limpiar_objectids(value) for key, value in obj.items()}
            elif isinstance(obj, list):
                return [limpiar_objectids(item) for item in obj]
            elif isinstance(obj, datetime):
                return obj.isoformat()
            else:
                return obj
        
        venta = await collection_sales.find_one({
            "_id": ObjectId(venta_id),
            "sede_id": sede_id
        })
        
        if not venta:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        
        # Limpiar todos los ObjectIds recursivamente
        venta = limpiar_objectids(venta)
        
        return {
            "success": True,
            "venta": venta
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener detalle de venta: {str(e)}"
        )