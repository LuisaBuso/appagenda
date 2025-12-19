"use client"

import { useState } from "react"
import { Search, Plus, User } from 'lucide-react'
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

  const filteredClientes = clientes.filter(cliente =>
    cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefono.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <h1 className="text-lg font-medium text-gray-900">Clientes</h1>
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
        {filteredClientes.length === 0 ? (
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
          <div className="rounded-lg border border-gray-100 bg-white">
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
                {filteredClientes.map((cliente) => (
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
        )}
      </div>
    </div>
  )
}