"use client"

import { useState, useEffect } from "react"
import { Search, Plus, User, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import type { Cliente } from "../../../types/cliente"
import type { Sede } from "../../PageSuperAdmin/Sedes/sedeService"

interface ClientsListProps {
  onSelectClient: (client: Cliente) => void
  onAddClient: () => void
  clientes: Cliente[]
  error?: string | null
  onRetry?: () => void
  onSedeChange?: (sedeId: string) => void
  selectedSede?: string
  sedes?: Sede[]
}

export function ClientsList({ 
  onSelectClient, 
  onAddClient, 
  clientes, 
  error, 
  onRetry,
  sedes = []
}: ClientsListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Filtrar clientes por búsqueda
  const filteredClientes = clientes.filter(cliente =>
    cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefono.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calcular paginación
  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedClientes = filteredClientes.slice(startIndex, endIndex)

  // Resetear a página 1 cuando se busca
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // Navegación de páginas
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const goToPreviousPage = () => {
    goToPage(currentPage - 1)
  }

  const goToNextPage = () => {
    goToPage(currentPage + 1)
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-2">Error al cargar clientes</div>
          <p className="text-xs text-gray-500 mb-3">{error}</p>
          {onRetry && (
            <Button 
              onClick={onRetry}
              variant="outline"
              className="text-xs border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Reintentar
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Clientes</h1>
            {clientes.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Mostrando {Math.min(endIndex, filteredClientes.length)} de {filteredClientes.length} clientes
              </p>
            )}
          </div>
          <Button
            onClick={onAddClient}
            variant="outline"
            size="sm"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Plus className="h-3 w-3 mr-1" />
            <span className="text-xs">Nuevo</span>
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8 text-sm border-gray-300"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        {paginatedClientes.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white">
            <div className="text-center">
              <User className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">
                {clientes.length === 0 ? "No hay clientes" : "No se encontraron resultados"}
              </p>
              <p className="text-xs text-gray-500">
                {clientes.length === 0 ? "Agrega tu primer cliente" : "Ajusta tu búsqueda"}
              </p>
              {clientes.length === 0 && (
                <Button
                  onClick={onAddClient}
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar cliente
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-gray-100 bg-white mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-3 py-2 text-left font-medium text-gray-700 text-xs">Nombre</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700 text-xs">Teléfono</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700 text-xs">Email</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700 text-xs">Días</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700 text-xs">Sede</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedClientes.map((cliente) => (
                    <tr
                      key={cliente.id}
                      onClick={() => onSelectClient(cliente)}
                      className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-700">
                            {cliente.nombre.charAt(0)}
                          </div>
                          <span className="text-gray-900">{cliente.nombre}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{cliente.telefono}</td>
                      <td className="px-3 py-2 text-gray-600">{cliente.email}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${cliente.diasSinVenir > 30 
                          ? 'bg-gray-100 text-gray-600' 
                          : 'bg-gray-50 text-gray-500'
                        }`}>
                          {cliente.diasSinVenir}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {cliente.sede_id ? 
                          sedes.find(s => s.sede_id === cliente.sede_id)?.nombre || '—' 
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Controles de paginación */}
            {filteredClientes.length > itemsPerPage && (
              <div className="flex items-center justify-between px-1">
                <div className="text-xs text-gray-600">
                  Página {currentPage} de {totalPages}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="h-7 px-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <ChevronLeft className="h-3 w-3 mr-1" />
                    <span className="text-xs">Anterior</span>
                  </Button>
                  
                  <div className="flex gap-1">
                    {/* Mostrar números de página */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber
                      if (totalPages <= 5) {
                        pageNumber = i + 1
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i
                      } else {
                        pageNumber = currentPage - 2 + i
                      }
                      
                      return (
                        <Button
                          key={pageNumber}
                          variant={pageNumber === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(pageNumber)}
                          className={`h-7 w-7 text-xs ${pageNumber === currentPage ? "bg-gray-900 text-white hover:bg-gray-800" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                        >
                          {pageNumber}
                        </Button>
                      )
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="h-7 px-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <span className="text-xs">Siguiente</span>
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                
                <div className="text-xs text-gray-600">
                  {itemsPerPage} por página
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}