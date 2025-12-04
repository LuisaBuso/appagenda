// app/(protected)/admin-sede/ventas/service-protocol.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import {
  User, Scissors, Clock, X, Calendar, FileText, History,
  CheckCircle, Eye, Mail, Phone, IdCard, ShoppingCart, Plus,
  DollarSign, Trash2
} from "lucide-react"
import { useState, useEffect } from "react"
import { API_BASE_URL } from "../../../types/config"
import { ProductCatalogModal } from "./ProductCatalogModal"
import { Badge } from "../../../components/ui/badge"

interface Producto {
  id: string
  nombre: string
  categoria: string
  descripcion: string
  imagen: string
  activo: boolean
  tipo_codigo: string
  descuento: number
  stock: string | number
  precio: number
  tipo_precio: string
}

interface Appointment {
  _id: string
  cliente: string
  cliente_id?: string
  cliente_nombre?: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  servicio: string
  servicio_nombre?: string
  estilista?: string
  profesional_nombre?: string
  estado: string
  sede_id: string
  valor_total?: number
  estado_pago?: string
  abono?: number
  saldo_pendiente?: number
}

interface FichaCliente {
  id: string
  cliente_id: string
  nombre: string
  apellido: string | null
  telefono: string
  cedula: string
  servicio_id: string
  profesional_id: string
  sede_id: string
  fecha_ficha: string
  fecha_reserva: string
  tipo_ficha: string
  precio: number
  estado: string
  estado_pago: string
  contenido: {
    cita_id: string
    firma_profesional: boolean
    fecha_firma: string
    descripcion: string
    observaciones: string
    descripcion_servicio?: string
    autorizacion_publicacion?: boolean
    comentario_interno?: string
    created_at?: string
    created_by?: string
    user_id?: string
    procesado_imagenes?: boolean
    origen?: string
    respuestas?: Array<any>
    fotos?: {
      antes: string[]
      despues: string[]
      antes_urls: string[]
      despues_urls: string[]
    }
  }
  servicio_nombre: string
  profesional_nombre: string
  sede_nombre: string
}

interface ApiFichasResponse {
  success: boolean
  total: number
  fichas: FichaCliente[]
}

interface ServiceProtocolProps {
  selectedAppointment: Appointment | null
  onClose?: () => void
  onAppointmentUpdated?: (appointment: Appointment) => void
}

export function ServiceProtocol({ 
  selectedAppointment, 
  onClose, 
  onAppointmentUpdated 
}: ServiceProtocolProps) {
  const [fichasCliente, setFichasCliente] = useState<FichaCliente[]>([])
  const [loadingFichas, setLoadingFichas] = useState(false)
  const [errorFichas, setErrorFichas] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'nuevo' | 'historial'>('historial')
  const [selectedFicha, setSelectedFicha] = useState<FichaCliente | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list')
  const [showProductModal, setShowProductModal] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Producto[]>([])
  const [productsQuantities, setProductsQuantities] = useState<Record<string, number>>({})
  const [isFacturando, setIsFacturando] = useState(false)

  // Cargar fichas del cliente cuando se selecciona una cita
  useEffect(() => {
    if (selectedAppointment?.cliente_id) {
      fetchFichasCliente(selectedAppointment.cliente_id)
    } else {
      setFichasCliente([])
      setSelectedFicha(null)
      setViewMode('list')
      setSelectedProducts([])
      setProductsQuantities({})
    }
  }, [selectedAppointment])

  const fetchFichasCliente = async (clienteId: string) => {
    try {
      setLoadingFichas(true)
      setErrorFichas(null)

      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')

      if (!token) {
        setErrorFichas('No se encontró token de autenticación')
        return
      }

      const response = await fetch(
        `${API_BASE_URL}scheduling/quotes/fichas?cliente_id=${clienteId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          setFichasCliente([])
          return
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data: ApiFichasResponse = await response.json()

      if (data.success && data.fichas) {
        const fichasOrdenadas = [...data.fichas].sort((a, b) =>
          new Date(b.fecha_ficha).getTime() - new Date(a.fecha_ficha).getTime()
        )
        setFichasCliente(fichasOrdenadas)
      } else {
        setFichasCliente([])
      }
    } catch (err) {
      setErrorFichas(err instanceof Error ? err.message : 'Error al cargar fichas')
      console.error('Error cargando fichas:', err)
    } finally {
      setLoadingFichas(false)
    }
  }

  const handleViewFicha = (ficha: FichaCliente) => {
    setSelectedFicha(ficha)
    setViewMode('detail')
  }

  const handleBackToList = () => {
    setSelectedFicha(null)
    setViewMode('list')
  }

  const handleRetry = () => {
    if (selectedAppointment?.cliente_id) {
      fetchFichasCliente(selectedAppointment.cliente_id)
    }
  }

  const handleAddProducts = (products: Producto[]) => {
    setSelectedProducts(products)

    const newQuantities: Record<string, number> = {}
    products.forEach(product => {
      if (product && product.id) {
        newQuantities[product.id] = (newQuantities[product.id] || 0) + 1
      }
    })
    setProductsQuantities(newQuantities)
  }

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId))
    setProductsQuantities(prev => {
      const newQuantities = { ...prev }
      delete newQuantities[productId]
      return newQuantities
    })
  }

  const handleClearProducts = () => {
    setSelectedProducts([])
    setProductsQuantities({})
  }

  // Función para formatear dinero con separadores de miles y 2 decimales
  const formatMoney = (amount: number): string => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      amount = 0
    }
    return amount.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    })
  }

  const calculateProductsTotal = () => {
    return selectedProducts.reduce((sum, product) => {
      const precio = product.precio || 0
      return sum + precio
    }, 0)
  }

  const calculateAppointmentTotal = () => {
    const servicioTotal = selectedAppointment?.valor_total || 0
    const productosTotal = calculateProductsTotal()
    return servicioTotal + productosTotal
  }

  const handleFacturarCita = async () => {
    try {
      setIsFacturando(true)
      
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
      
      if (!token) {
        alert('❌ No se encontró token de autenticación')
        return
      }

      if (!selectedAppointment?._id) {
        alert('❌ No hay cita seleccionada para facturar')
        return
      }

      // Confirmar con el usuario
      const confirmMessage = 
        `¿Estás seguro de facturar esta cita?\n\n` +
        `👤 Cliente: ${nombreCliente}\n` +
        `✂️ Servicio: ${nombreServicio}\n` +
        `💰 Total: $${formatMoney(calculateAppointmentTotal())}\n\n` +
        `📦 Productos incluidos: ${selectedProducts.length}` +
        (selectedProducts.length > 0 ? 
          `\n${selectedProducts.map(p => `  • ${p.nombre} (${productsQuantities[p.id] || 1}x)`).join('\n')}` : 
          '')

      if (!window.confirm(confirmMessage)) {
        return
      }

      // Preparar datos para la facturación
      const productosParaFacturar = selectedProducts.map(product => ({
        producto_id: product.id,
        nombre: product.nombre,
        precio: product.precio,
        cantidad: productsQuantities[product.id] || 1,
        categoria: product.categoria
      }))

      // Llamar a la API de facturación
      const response = await fetch(
        `${API_BASE_URL}scheduling/quotes/quotes/facturar/${selectedAppointment._id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            productos: productosParaFacturar,
            total_productos: calculateProductsTotal(),
            total_final: calculateAppointmentTotal()
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Mostrar éxito
      alert(`✅ Facturación exitosa!\n\n` +
            `📋 Cita marcada como pagada\n` +
            `💵 Comisión generada: $${formatMoney(result.valor_comision_generada || 0)}\n` +
            `🔄 ${result.comision || 'Comisión registrada'}`)
      
      // Limpiar productos seleccionados
      handleClearProducts()
      
      // Actualizar el estado de la cita
      if (selectedAppointment) {
        const updatedAppointment = {
          ...selectedAppointment,
          estado: 'completada',
          estado_pago: 'pagado',
          saldo_pendiente: 0
        }
        
        // Notificar al componente padre
        onAppointmentUpdated?.(updatedAppointment)
      }

    } catch (error) {
      console.error('Error al facturar:', error)
      alert(`❌ Error al facturar: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setIsFacturando(false)
    }
  }

  const formatFechaHora = (fecha: string) => {
    try {
      const date = new Date(fecha)
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return fecha
    }
  }

  const formatFechaCorta = (fecha: string) => {
    try {
      const date = new Date(fecha)
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch {
      return fecha
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'completado':
      case 'completada':
        return 'bg-green-100 text-green-800'
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelado':
      case 'cancelada':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEstadoPagoColor = (estadoPago: string) => {
    switch (estadoPago.toLowerCase()) {
      case 'pagado':
        return 'text-green-600'
      case 'pendiente':
        return 'text-yellow-600'
      case 'cancelado':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  // Si no hay cita seleccionada
  if (!selectedAppointment) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-xl">Protocolo de servicio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-gray-100 p-4">
              <Scissors className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Selecciona una cita</h3>
            <p className="text-gray-500">
              Haz clic en "Ver protocolo" en una cita para ver su protocolo de atención
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const nombreCliente = selectedAppointment.cliente_nombre || selectedAppointment.cliente || "No especificado"
  const nombreServicio = selectedAppointment.servicio_nombre || selectedAppointment.servicio
  const isCitaPagada = selectedAppointment.estado_pago === 'pagado'

  return (
    <>
      <ProductCatalogModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onAddProducts={handleAddProducts}
        selectedProducts={selectedProducts}
      />
      
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Protocolo de Atención</CardTitle>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <User className="h-4 w-4" />
              <span className="font-medium">{nombreCliente}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{selectedAppointment.hora_inicio} - {selectedAppointment.hora_fin}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Scissors className="h-4 w-4" />
              <span>{nombreServicio}</span>
            </div>
            {selectedAppointment.valor_total !== undefined && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <DollarSign className="h-4 w-4" />
                <span>Servicio: ${formatMoney(selectedAppointment.valor_total)}</span>
              </div>
            )}
            {isCitaPagada && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">CITA FACTURADA</span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="mt-4 flex border-b">
            <button
              className={`flex-1 py-2 text-sm font-medium ${activeTab === 'historial'
                  ? 'border-b-2 border-[oklch(0.55_0.25_280)] text-[oklch(0.55_0.25_280)]'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
              onClick={() => {
                setActiveTab('historial')
                setViewMode('list')
                setSelectedFicha(null)
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <History className="h-4 w-4" />
                Historial {fichasCliente.length > 0 && `(${fichasCliente.length})`}
              </div>
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Sección de Productos Agregados */}
          {selectedProducts.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Productos para Facturar</h3>
                  <Badge variant="secondary" className="ml-2">
                    {selectedProducts.length} producto{selectedProducts.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearProducts}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpiar
                </Button>
              </div>

              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                {Object.entries(productsQuantities).map(([productId, quantity]) => {
                  const product = selectedProducts.find(p => p.id === productId)
                  if (!product) return null

                  return (
                    <div key={productId} className="bg-white rounded p-3 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{product.nombre}</span>
                          <Badge variant="outline" className="text-xs">
                            {product.categoria}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span>Cantidad: {quantity}</span>
                          <span>${formatMoney(product.precio || 0)} c/u</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold">${formatMoney((product.precio || 0) * quantity)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleRemoveProduct(productId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-blue-200 mt-3">
                <div className="text-sm text-blue-800">
                  Total productos: ${formatMoney(calculateProductsTotal())}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProductModal(true)}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  disabled={isCitaPagada}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isCitaPagada ? 'Cita ya facturada' : 'Agregar más productos'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'historial' ? (
            viewMode === 'list' ? (
              // LISTA DE FICHAS
              <div className="space-y-6">
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="h-5 w-5 text-gray-500" />
                      <h3 className="font-semibold">Historial de Fichas</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        Total: {fichasCliente.length}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRetry}
                        disabled={loadingFichas}
                      >
                        {loadingFichas ? 'Cargando...' : 'Actualizar'}
                      </Button>
                    </div>
                  </div>

                  {loadingFichas ? (
                    <div className="text-center py-8">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                      <p className="mt-2 text-gray-500">Cargando fichas...</p>
                    </div>
                  ) : errorFichas ? (
                    <div className="text-center py-4">
                      <p className="text-red-500">{errorFichas}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={handleRetry}
                      >
                        Reintentar
                      </Button>
                    </div>
                  ) : fichasCliente.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="mb-4 rounded-full bg-gray-100 p-4 inline-block">
                        <FileText className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="mb-2 text-lg font-semibold">No hay fichas registradas</h3>
                      <p className="text-gray-500">
                        Este cliente no tiene fichas de servicio registradas
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                      {fichasCliente.map((ficha) => (
                        <div
                          key={ficha.id}
                          className="rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleViewFicha(ficha)}
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <div>
                                <span className="font-medium">
                                  {formatFechaCorta(ficha.fecha_ficha)}
                                </span>
                                <span className="text-xs text-gray-500 ml-2">
                                  {ficha.fecha_reserva && `Reserva: ${formatFechaCorta(ficha.fecha_reserva)}`}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-3 py-1 text-xs font-medium ${getEstadoColor(ficha.estado)}`}>
                                {ficha.estado.toUpperCase()}
                              </span>
                              <Eye className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                            <div>
                              <span className="text-gray-500">Servicio:</span>
                              <p className="font-medium truncate">{ficha.servicio_nombre}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Profesional:</span>
                              <p className="font-medium truncate">{ficha.profesional_nombre}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Sede:</span>
                              <p className="font-medium truncate">{ficha.sede_nombre}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Precio:</span>
                              <p className="font-medium">${formatMoney(ficha.precio)}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-gray-500">
                              <CheckCircle className="h-4 w-4" />
                              {ficha.contenido.firma_profesional ? (
                                <span>Firmado por profesional</span>
                              ) : (
                                <span>Sin firma de profesional</span>
                              )}
                            </div>
                            <span className={`font-medium ${getEstadoPagoColor(ficha.estado_pago)}`}>
                              {ficha.estado_pago.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Botones de acción */}
                <div className="space-y-4">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => setShowProductModal(true)}
                    variant={selectedProducts.length > 0 ? "default" : "outline"}
                    disabled={isCitaPagada}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {isCitaPagada 
                      ? 'Cita ya facturada' 
                      : selectedProducts.length > 0 
                        ? 'Modificar Productos' 
                        : 'Agregar Productos'
                    }
                    {selectedProducts.length > 0 && !isCitaPagada && ` (${selectedProducts.length})`}
                  </Button>

                  {/* Resumen de facturación */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h4 className="font-semibold mb-3">Resumen de Facturación</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Servicio:</span>
                        <span className="font-medium">
                          ${formatMoney(selectedAppointment.valor_total || 0)}
                        </span>
                      </div>
                      {selectedProducts.length > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Productos:</span>
                          <span className="font-medium">
                            ${formatMoney(calculateProductsTotal())}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>TOTAL:</span>
                        <span>${formatMoney(calculateAppointmentTotal())}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                    onClick={handleFacturarCita}
                    disabled={isCitaPagada || isFacturando}
                  >
                    {isFacturando ? (
                      <>
                        <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Facturando...
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4 mr-2" />
                        {isCitaPagada 
                          ? 'Cita ya facturada' 
                          : `Facturar ${selectedProducts.length > 0 ? 'Servicio + Productos' : 'Servicio'}`
                        }
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              // DETALLE DE FICHA
              selectedFicha && (
                <div className="space-y-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToList}
                    className="mb-2"
                  >
                    ← Volver al historial
                  </Button>

                  <div className="rounded-lg border border-gray-200 bg-white p-6">
                    {/* Encabezado */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-900">Ficha de Servicio</h3>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${getEstadoColor(selectedFicha.estado)}`}>
                            {selectedFicha.estado.toUpperCase()}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${getEstadoColor(selectedFicha.estado_pago)}`}>
                            PAGO: {selectedFicha.estado_pago.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">ID: {selectedFicha.id}</p>
                    </div>

                    {/* Información en dos columnas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Columna izquierda - Información del cliente */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Información del Cliente
                          </h4>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8">
                                <User className="h-4 w-4 text-gray-400" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-500">Nombre completo</p>
                                <p className="font-medium">{selectedFicha.nombre} {selectedFicha.apellido || ''}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="w-8">
                                <IdCard className="h-4 w-4 text-gray-400" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-500">Cédula</p>
                                <p className="font-medium">{selectedFicha.cedula}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="w-8">
                                <Phone className="h-4 w-4 text-gray-400" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-500">Teléfono</p>
                                <p className="font-medium">{selectedFicha.telefono}</p>
                              </div>
                            </div>

                            {selectedFicha.contenido?.created_by && (
                              <div className="flex items-center gap-3">
                                <div className="w-8">
                                  <Mail className="h-4 w-4 text-gray-400" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm text-gray-500">Creado por</p>
                                  <p className="font-medium">{selectedFicha.contenido.created_by}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Información del servicio */}
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Scissors className="h-5 w-5" />
                            Información del Servicio
                          </h4>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-sm text-gray-500">Servicio</p>
                                <p className="font-medium">{selectedFicha.servicio_nombre}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Profesional</p>
                                <p className="font-medium">{selectedFicha.profesional_nombre}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-sm text-gray-500">Sede</p>
                                <p className="font-medium">{selectedFicha.sede_nombre}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Tipo de ficha</p>
                                <p className="font-medium">{selectedFicha.tipo_ficha.replace('_', ' ')}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Precio</p>
                              <p className="font-bold text-lg">${selectedFicha.precio.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Columna derecha - Fechas y firma */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Fechas
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-gray-500">Fecha de creación de ficha</p>
                              <p className="font-medium">{formatFechaHora(selectedFicha.fecha_ficha)}</p>
                            </div>

                            {selectedFicha.fecha_reserva && (
                              <div>
                                <p className="text-sm text-gray-500">Fecha de reserva</p>
                                <p className="font-medium">{formatFechaCorta(selectedFicha.fecha_reserva)}</p>
                              </div>
                            )}

                            {selectedFicha.contenido.fecha_firma && (
                              <div>
                                <p className="text-sm text-gray-500">Fecha de firma</p>
                                <p className="font-medium">{formatFechaHora(selectedFicha.contenido.fecha_firma)}</p>
                              </div>
                            )}

                            {selectedFicha.contenido.created_at && (
                              <div>
                                <p className="text-sm text-gray-500">Fecha de creación</p>
                                <p className="font-medium">{formatFechaHora(selectedFicha.contenido.created_at)}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Firma */}
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-3">Firma Profesional</h4>
                          <div className={`rounded-lg p-4 ${selectedFicha.contenido.firma_profesional ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                            <div className="flex items-center gap-3">
                              <CheckCircle className={`h-5 w-5 ${selectedFicha.contenido.firma_profesional ? 'text-green-600' : 'text-yellow-600'}`} />
                              <div>
                                <p className={`font-medium ${selectedFicha.contenido.firma_profesional ? 'text-green-800' : 'text-yellow-800'}`}>
                                  {selectedFicha.contenido.firma_profesional ? 'FIRMADO' : 'NO FIRMADO'}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {selectedFicha.contenido.firma_profesional
                                    ? 'El profesional ha firmado esta ficha'
                                    : 'Esta ficha no ha sido firmada por el profesional'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Información adicional */}
                        {selectedFicha.contenido.origen && (
                          <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Información Adicional</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Origen:</span>
                                <span className="font-medium">{selectedFicha.contenido.origen}</span>
                              </div>
                              {selectedFicha.contenido.procesado_imagenes !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Procesado imágenes:</span>
                                  <span className={`font-medium ${selectedFicha.contenido.procesado_imagenes ? 'text-green-600' : 'text-yellow-600'}`}>
                                    {selectedFicha.contenido.procesado_imagenes ? 'Sí' : 'No'}
                                  </span>
                                </div>
                              )}
                              {selectedFicha.contenido.autorizacion_publicacion !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Autorización publicación:</span>
                                  <span className={`font-medium ${selectedFicha.contenido.autorizacion_publicacion ? 'text-green-600' : 'text-red-600'}`}>
                                    {selectedFicha.contenido.autorizacion_publicacion ? 'Autorizado' : 'No autorizado'}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-gray-600">ID Cita:</span>
                                <span className="font-medium truncate">{selectedFicha.contenido.cita_id}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Descripciones y observaciones */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="font-semibold text-gray-700 mb-4">Contenido de la Ficha</h4>

                      {selectedFicha.contenido.descripcion && (
                        <div className="mb-4">
                          <h5 className="text-gray-600 font-medium mb-2">Descripción</h5>
                          <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedFicha.contenido.descripcion}</p>
                        </div>
                      )}

                      {selectedFicha.contenido.observaciones && (
                        <div className="mb-4">
                          <h5 className="text-gray-600 font-medium mb-2">Observaciones</h5>
                          <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedFicha.contenido.observaciones}</p>
                        </div>
                      )}

                      {selectedFicha.contenido.descripcion_servicio && (
                        <div className="mb-4">
                          <h5 className="text-gray-600 font-medium mb-2">Descripción del Servicio</h5>
                          <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedFicha.contenido.descripcion_servicio}</p>
                        </div>
                      )}

                      {selectedFicha.contenido.comentario_interno && (
                        <div>
                          <h5 className="text-gray-600 font-medium mb-2">Comentario Interno</h5>
                          <p className="text-gray-700 italic bg-gray-50 p-4 rounded-lg">{selectedFicha.contenido.comentario_interno}</p>
                        </div>
                      )}
                    </div>

                    {/* Fotografías - Si están disponibles */}
                    {selectedFicha.contenido.fotos && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="font-semibold text-gray-700 mb-4">Fotografías</h4>

                        {/* Fotos Antes */}
                        {selectedFicha.contenido.fotos.antes && selectedFicha.contenido.fotos.antes.length > 0 && (
                          <div className="mb-6">
                            <h5 className="text-gray-600 font-medium mb-3">Fotos Antes</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {selectedFicha.contenido.fotos.antes.map((url, index) => (
                                <div key={`antes-${index}`} className="relative group">
                                  <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                                    <img
                                      src={url}
                                      alt={`Foto antes ${index + 1}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        target.style.display = 'none'
                                        target.parentElement!.innerHTML = `
                                      <div class="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                                        <Camera class="h-12 w-12 text-gray-400 mb-2" />
                                        <p class="text-gray-500 text-sm">Imagen no disponible</p>
                                        <a href="${url}" target="_blank" class="text-blue-500 hover:text-blue-700 text-xs mt-1">
                                          Ver enlace
                                        </a>
                                      </div>
                                    `
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Fotos Después */}
                        {selectedFicha.contenido.fotos.despues && selectedFicha.contenido.fotos.despues.length > 0 && (
                          <div>
                            <h5 className="text-gray-600 font-medium mb-3">Fotos Después</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {selectedFicha.contenido.fotos.despues.map((url, index) => (
                                <div key={`despues-${index}`} className="relative group">
                                  <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                                    <img
                                      src={url}
                                      alt={`Foto después ${index + 1}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        target.style.display = 'none'
                                        target.parentElement!.innerHTML = `
                                      <div class="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                                        <Camera class="h-12 w-12 text-gray-400 mb-2" />
                                        <p class="text-gray-500 text-sm">Imagen no disponible</p>
                                        <a href="${url}" target="_blank" class="text-blue-500 hover:text-blue-700 text-xs mt-1">
                                          Ver enlace
                                        </a>
                                      </div>
                                    `
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            )
          ) : (
            // PESTAÑA NUEVA FICHA
            <div className="text-center py-8">
              <div className="mb-4 rounded-full bg-gray-100 p-4 inline-block">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <Button
                variant="outline"
                onClick={() => setActiveTab('historial')}
              >
                Ver historial existente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}