import { ArrowLeft } from 'lucide-react'
import { Button } from "../../../components/ui/button"
import type { Cliente } from "../../../types/cliente"

interface ClientDetailProps {
  client: Cliente
  onBack: () => void
}

export function ClientDetail({ client, onBack }: ClientDetailProps) {
  // 🔥 FUNCIÓN PARA FORMATEAR FECHA
  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  // 🔥 FUNCIÓN PARA FORMATEAR MONEDA
  const formatMoneda = (precio: string) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(Number(precio))
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="border-b px-8 py-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4 -ml-2 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>

        <div className="flex items-start gap-6">
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[oklch(0.75_0.15_280)] 
            to-[oklch(0.55_0.25_280)] flex items-center justify-center text-white text-2xl font-bold">
            {client.nombre.charAt(0)}
          </div>

          <div>
            <h1 className="text-4xl font-bold mb-2">{client.nombre}</h1>
            <p className="text-lg text-gray-600">{client.email}</p>
            <p className="text-lg text-gray-600">{client.telefono}</p>
          </div>
        </div>
      </div>

      {/* INFORMACIÓN + FICHAS */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="space-y-8">
          {/* Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-lg border p-6">
              <p className="text-sm text-gray-600 mb-2">Días sin venir</p>
              <p className="text-4xl font-bold">{client.diasSinVenir}</p>
            </div>

            <div className="rounded-lg border p-6">
              <p className="text-sm text-gray-600 mb-2">Días sin comprar</p>
              <p className="text-4xl font-bold">{client.diasSinComprar}</p>
            </div>

            <div className="rounded-lg border p-6">
              <p className="text-sm text-gray-600 mb-2">LTV</p>
              <p className="text-4xl font-bold">€ {client.ltv}</p>
            </div>

            <div className="rounded-lg border p-6">
              <p className="text-sm text-gray-600 mb-2">Ticket</p>
              <p className="text-4xl font-bold">€ {client.ticketPromedio}</p>
            </div>
          </div>

          {/* 🔥 SECCIÓN DE FICHAS DEL CLIENTE - MEJORADA */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Historial de Servicios</h2>
              <div className="text-sm text-gray-500">
                {client.fichas ? `${client.fichas.length} servicio(s)` : 'Cargando...'}
              </div>
            </div>

            {client.fichas && client.fichas.length > 0 ? (
              <div className="space-y-6">
                {client.fichas.map((ficha) => (
                  <div key={ficha._id} className="rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    {/* Header de la ficha */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">
                              {ficha.servicio || ficha.servicio_nombre}
                            </h3>
                            <div className="flex gap-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                ficha.estado === 'Reservado' 
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                  : ficha.estado === 'Completado'
                                  ? 'bg-green-100 text-green-800 border border-green-200'
                                  : 'bg-gray-100 text-gray-800 border border-gray-200'
                              }`}>
                                {ficha.estado}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                ficha.estado_pago?.includes('Pagada') 
                                  ? 'bg-green-100 text-green-800 border border-green-200' 
                                  : 'bg-orange-100 text-orange-800 border border-orange-200'
                              }`}>
                                {ficha.estado_pago?.replace('Pagada (pago asociado', 'Pagada') || 'Pendiente'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Fecha:</span>
                              <span>{formatFecha(ficha.fecha_ficha)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Sede:</span>
                              <span>{ficha.sede || ficha.local}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Estilista:</span>
                              <span>{ficha.estilista}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Precio:</span>
                              <span className="font-bold text-green-600">{formatMoneda(ficha.precio)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contenido de la ficha */}
                    <div className="p-6 bg-white">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Columna izquierda - Información del servicio */}
                        <div className="space-y-6">
                          {/* Información de contacto */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3 text-lg border-b pb-2">
                              📋 Información del Servicio
                            </h4> 
                            <div className="space-y-3">
                              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Fecha de reserva:</span>
                                <span className="font-medium text-gray-900">{formatFecha(ficha.fecha_reserva)}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Sede del servicio:</span>
                                <span className="font-medium text-gray-900">{ficha.sede || ficha.local}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Estilista asignado:</span>
                                <span className="font-medium text-gray-900">{ficha.estilista}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Sede del estilista:</span>
                                <span className="font-medium text-gray-900">{ficha.sede_estilista}</span>
                              </div>
                            </div>
                          </div>

                          {/* Notas para el cliente */}
                          {ficha.notas_cliente && ficha.notas_cliente.trim() !== '' && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3 text-lg border-b pb-2">
                                💬 Notas para el Cliente
                              </h4>
                              <p className="text-sm text-gray-700 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                {ficha.notas_cliente}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Columna derecha - Información adicional */}
                        <div className="space-y-6">
                          {/* Comentario interno */}
                          {ficha.comentario_interno && ficha.comentario_interno.trim() !== '' && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3 text-lg border-b pb-2">
                                🏷️ Comentario Interno
                              </h4>
                              <p className="text-sm text-gray-700 bg-blue-50 p-4 rounded-lg border border-blue-200">
                                {ficha.comentario_interno}
                              </p>
                            </div>
                          )}

                          {/* Imágenes */}
                          {(ficha.antes_url || ficha.despues_url) && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3 text-lg border-b pb-2">
                                📸 Imágenes del Servicio
                              </h4>
                              <div className="flex gap-4">
                                {ficha.antes_url && (
                                  <div className="text-center">
                                    <a 
                                      href={ficha.antes_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex flex-col items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                    >
                                      <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center border-2 border-blue-300">
                                        <span className="text-2xl">📷</span>
                                      </div>
                                      <span className="text-sm">Antes</span>
                                    </a>
                                  </div>
                                )}
                                {ficha.despues_url && (
                                  <div className="text-center">
                                    <a 
                                      href={ficha.despues_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex flex-col items-center gap-2 text-green-600 hover:text-green-800 font-medium transition-colors"
                                    >
                                      <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center border-2 border-green-300">
                                        <span className="text-2xl">📷</span>
                                      </div>
                                      <span className="text-sm">Después</span>
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Respuestas del cuestionario */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3 text-lg border-b pb-2">
                              📝 Cuestionario del Cliente
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { key: 'respuesta_1', label: 'Pregunta 1' },
                                { key: 'respuesta_2', label: 'Pregunta 2' },
                                { key: 'respuesta_3', label: 'Pregunta 3' },
                                { key: 'respuesta_4', label: 'Pregunta 4' },
                                { key: 'respuesta_5', label: 'Pregunta 5' },
                                { key: 'respuesta_6', label: 'Pregunta 6' },
                                { key: 'respuesta_7', label: 'Pregunta 7' },
                                { key: 'respuesta_8', label: 'Pregunta 8' },
                                { key: 'respuesta_9', label: 'Pregunta 9' },
                                { key: 'respuesta_10', label: 'Pregunta 10' },
                              ].map(({ key, label }) => (
                                ficha[key as keyof typeof ficha] && ficha[key as keyof typeof ficha] !== '' && (
                                  <div key={key} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="text-xs text-gray-600 font-medium mb-1 truncate">{label}</div>
                                    <div className="text-sm font-semibold text-green-700 flex items-center gap-1">
                                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                      {ficha[key as keyof typeof ficha] as string}
                                    </div>
                                  </div>
                                )
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-500 mb-2">No hay servicios registrados</h3>
                <p className="text-gray-400">Este cliente no tiene fichas de servicio en el sistema.</p>
              </div>
            )}
          </div>

            {/* Historial de cabello */}
            <div>
              <h2 className="text-2xl font-bold mb-4">💇 Historial de Cabello</h2>
              <div className="space-y-4 rounded-xl border border-gray-200 p-6 bg-white">
                {client.historialCabello.length > 0 ? (
                  client.historialCabello.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                      <span className="text-gray-600 font-medium">{item.tipo}</span>
                      <span className="font-medium text-gray-900 bg-gray-50 px-3 py-1 rounded-full text-sm">
                        {item.fecha}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-2">💇</div>
                    <p className="text-gray-500">No hay historial de cabello registrado</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Historial de citas */}
          <div>
            <h2 className="text-2xl font-bold mb-4">📅 Historial de Citas</h2>
            {client.historialCitas.length > 0 ? (
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Fecha</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Servicio</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Estilista</th>
                      </tr>
                    </thead>
                    <tbody>
                      {client.historialCitas.map((cita, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{cita.fecha}</td>
                          <td className="px-6 py-4 text-gray-700">{cita.servicio}</td>
                          <td className="px-6 py-4 text-gray-700">{cita.estilista}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center bg-white">
                <div className="text-gray-400 text-6xl mb-4">📅</div>
                <h3 className="text-xl font-semibold text-gray-500 mb-2">No hay citas registradas</h3>
                <p className="text-gray-400">No se encontró historial de citas para este cliente.</p>
              </div>
            )}
          </div>

          {/* Historial de productos */}
          <div>
            <h2 className="text-2xl font-bold mb-4">🛍️ Historial de Productos</h2>
            {client.historialProductos.length > 0 ? (
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Producto</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {client.historialProductos.map((producto, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{producto.producto}</td>
                          <td className="px-6 py-4 text-gray-700">{producto.fecha}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center bg-white">
                <div className="text-gray-400 text-6xl mb-4">🛍️</div>
                <h3 className="text-xl font-semibold text-gray-500 mb-2">No hay productos registrados</h3>
                <p className="text-gray-400">No se encontró historial de productos para este cliente.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
}