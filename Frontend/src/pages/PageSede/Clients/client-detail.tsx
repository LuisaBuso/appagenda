import { useState } from 'react'
import { ArrowLeft, Image as ImageIcon, X, Calendar, MapPin, User, FileText, Tag, ShoppingBag, Scissors } from 'lucide-react'
import { Button } from "../../../components/ui/button"
import type { Cliente } from "../../../types/cliente"

interface ClientDetailProps {
  client: Cliente
  onBack: () => void
}

export function ClientDetail({ client, onBack }: ClientDetailProps) {
  const [showImagesModal, setShowImagesModal] = useState(false)
  const [selectedImages, setSelectedImages] = useState<{
    antes?: string,
    despues?: string,
    todas_antes?: string[],
    todas_despues?: string[]
  }>({})

  const openImagesModal = (ficha: any) => {
    let antesUrl = ficha.antes_url;
    let despuesUrl = ficha.despues_url;
    let todasAntes: string[] = [];
    let todasDespues: string[] = [];

    if (ficha.fotos) {
      if (ficha.fotos.antes && Array.isArray(ficha.fotos.antes) && ficha.fotos.antes.length > 0) {
        antesUrl = ficha.fotos.antes[0];
        todasAntes = ficha.fotos.antes;
      }
      if (ficha.fotos.despues && Array.isArray(ficha.fotos.despues) && ficha.fotos.despues.length > 0) {
        despuesUrl = ficha.fotos.despues[0];
        todasDespues = ficha.fotos.despues;
      }
    }

    setSelectedImages({
      antes: antesUrl,
      despues: despuesUrl,
      todas_antes: todasAntes,
      todas_despues: todasDespues
    });
    setShowImagesModal(true);
  }

  const closeImagesModal = () => {
    setShowImagesModal(false)
    setSelectedImages({})
  }

  const formatFecha = (fecha: string) => {
    if (!fecha) return ''
    try {
      if (fecha.includes('T')) {
        const [datePart] = fecha.split('T')
        const [year, month, day] = datePart.split('-')
        return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      } else if (fecha.includes('-')) {
        const [year, month, day] = fecha.split('-')
        return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      }
      return fecha
    } catch (error) {
      return fecha
    }
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* MODAL DE IMÁGENES - Ultra minimalista */}
      {showImagesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm p-2">
          <div className="relative w-full max-w-xl rounded-lg border border-gray-100 bg-white shadow-sm">
            {/* Header del modal */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-gray-600" />
                <h2 className="text-sm font-medium text-gray-900">Imágenes</h2>
              </div>
              <button
                onClick={closeImagesModal}
                className="p-1 hover:bg-gray-50 rounded"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Imagen ANTES */}
                <div>
                  <h3 className="text-xs font-medium text-gray-600 mb-2">Antes</h3>
                  {selectedImages.antes ? (
                    <div className="overflow-hidden rounded border border-gray-200">
                      <img
                        src={selectedImages.antes}
                        alt="Antes del servicio"
                        className="h-36 w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/400x300/f3f4f6/6b7280?text=Sin+imagen'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex h-36 items-center justify-center rounded border border-dashed border-gray-200 bg-gray-50">
                      <ImageIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Imagen DESPUÉS */}
                <div>
                  <h3 className="text-xs font-medium text-gray-600 mb-2">Después</h3>
                  {selectedImages.despues ? (
                    <div className="overflow-hidden rounded border border-gray-200">
                      <img
                        src={selectedImages.despues}
                        alt="Después del servicio"
                        className="h-36 w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/400x300/f3f4f6/6b7280?text=Sin+imagen'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex h-36 items-center justify-center rounded border border-dashed border-gray-200 bg-gray-50">
                      <ImageIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  onClick={closeImagesModal}
                  variant="outline"
                  size="sm"
                  className="text-xs border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cerrar
                </Button>
                {(selectedImages.antes || selectedImages.despues) && (
                  <Button
                    onClick={() => {
                      const imageToDownload = selectedImages.despues || selectedImages.antes
                      if (imageToDownload) {
                        window.open(imageToDownload, '_blank')
                      }
                    }}
                    className="bg-gray-900 hover:bg-gray-800 text-xs text-white"
                    size="sm"
                  >
                    Abrir imagen
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header ultra minimalista */}
      <div className="px-4 py-3 border-b border-gray-100">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-3 -ml-1 gap-1 p-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          size="sm"
        >
          <ArrowLeft className="h-3 w-3" />
          Volver
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 text-sm font-medium border border-gray-200">
            {client.nombre.charAt(0)}
          </div>

          <div>
            <h1 className="text-base font-medium text-gray-900">{client.nombre}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-gray-500">{client.email}</p>
              <span className="text-gray-300">•</span>
              <p className="text-xs text-gray-500">{client.telefono}</p>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL - Ultra minimalista */}
      <div className="flex-1 overflow-auto px-4 py-3">
        <div className="space-y-4">
          {/* SECCIÓN DE FICHAS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-900">Fichas</h2>
              <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                {client.fichas ? `${client.fichas.length} servicios` : '...'}
              </div>
            </div>

            {client.fichas && client.fichas.length > 0 ? (
              <div className="space-y-3">
                {client.fichas.map((ficha) => {
                  const servicioNombre = ficha.servicio_nombre || ficha.servicio || 'Servicio'
                  const estilistaNombre = ficha.profesional_nombre || ficha.estilista || 'Sin estilista'
                  const sedeNombre = ficha.sede_nombre || ficha.sede || ficha.local || 'Sin sede'

                  const tieneImagenes =
                    (ficha.antes_url && ficha.antes_url !== '') ||
                    (ficha.despues_url && ficha.despues_url !== '') ||
                    (ficha.fotos?.antes && Array.isArray(ficha.fotos.antes) && ficha.fotos.antes.length > 0) ||
                    (ficha.fotos?.despues && Array.isArray(ficha.fotos.despues) && ficha.fotos.despues.length > 0);

                  const primeraAntes = ficha.antes_url || ficha.fotos?.antes?.[0] || '';
                  const primeraDespues = ficha.despues_url || ficha.fotos?.despues?.[0] || '';

                  return (
                    <div key={ficha._id} className="rounded-lg border border-gray-100 bg-white p-3 hover:border-gray-200">
                      {/* Header de la ficha */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 mb-1">
                            {servicioNombre}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatFecha(ficha.fecha_ficha)}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate max-w-[100px]">{sedeNombre}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">

                          {tieneImagenes && (
                            <button
                              onClick={() => openImagesModal(ficha)}
                              className="p-1 hover:bg-gray-50 rounded"
                            >
                              <ImageIcon className="h-3.5 w-3.5 text-gray-500" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Detalles */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <User className="h-3 w-3" />
                            {estilistaNombre}
                          </div>
                          {ficha.notas_cliente && ficha.notas_cliente.trim() !== '' && (
                            <div className="flex items-start gap-2 text-xs">
                              <FileText className="h-3 w-3 text-gray-400 mt-0.5" />
                              <p className="text-gray-600">
                                {ficha.notas_cliente.length > 60 ? ficha.notas_cliente.substring(0, 60) + '...' : ficha.notas_cliente}
                              </p>
                            </div>
                          )}
                        </div>

                        {tieneImagenes && (
                          <div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="relative">
                                <div className="h-16 rounded border border-gray-200 overflow-hidden">
                                  {primeraAntes ? (
                                    <img
                                      src={primeraAntes}
                                      alt="Antes"
                                      className="h-full w-full object-cover text-transparent"
                                      onError={(e) => {
                                        e.currentTarget.src = 'https://via.placeholder.com/200x150/f3f4f6/9ca3af?text=Antes'
                                      }}
                                    />
                                  ) : (
                                    <div className="h-full w-full bg-gray-50 flex items-center justify-center">
                                      <span className="text-xs text-gray-400">Antes</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="relative">
                                <div className="h-16 rounded border border-gray-200 overflow-hidden">
                                  {primeraDespues ? (
                                    <img
                                      src={primeraDespues}
                                      alt="Después"
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.src = 'https://via.placeholder.com/200x150/f3f4f6/9ca3af?text=Después'
                                      }}
                                    />
                                  ) : (
                                    <div className="h-full w-full bg-gray-50 flex items-center justify-center">
                                      <span className="text-xs text-gray-400">Después</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {ficha.comentario_interno && ficha.comentario_interno.trim() !== '' && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="flex items-start gap-2 text-xs">
                            <Tag className="h-3 w-3 text-gray-400 mt-0.5" />
                            <p className="text-gray-600">
                              {ficha.comentario_interno.length > 80 ? ficha.comentario_interno.substring(0, 80) + '...' : ficha.comentario_interno}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
                <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No hay servicios registrados</p>
              </div>
            )}
          </div>

          {/* Historial de cabello */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                Historial de Cabello
              </h2>
            </div>
            <div className="rounded-lg border border-gray-100 p-3">
              {client.historialCabello.length > 0 ? (
                <div className="space-y-2">
                  {client.historialCabello.map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-b-0">
                      <span className="text-sm text-gray-700">{item.tipo}</span>
                      <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                        {item.fecha}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Scissors className="h-6 w-6 text-gray-300 mx-auto mb-1" />
                  <p className="text-sm text-gray-500">Sin historial</p>
                </div>
              )}
            </div>
          </div>

          {/* Historial de productos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Historial de Compras
              </h2>
            </div>
            {client.historialProductos.length > 0 ? (
              <div className="rounded-lg border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-medium text-gray-700 text-xs">Producto</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 text-xs">Fecha</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 text-xs">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {client.historialProductos.map((producto, index) => (
                        <tr key={index} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50">
                          <td className="px-3 py-2 text-gray-700 text-sm">{producto.producto}</td>
                          <td className="px-3 py-2 text-gray-500 text-sm">{producto.fecha}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${producto.estado_pago === 'pagado'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                              }`}>
                              {producto.estado_pago || 'pendiente'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
                <ShoppingBag className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No hay compras registradas</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}