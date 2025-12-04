"use client"

import { useState } from "react"
import { Search, Plus } from 'lucide-react'
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select"
import type { Cliente } from "../../../types/cliente"
import type { Sede } from "../Sedes/sedeService"

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
  onSedeChange,
  selectedSede = "all",
  sedes = []
}: ClientsListProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredClientes = clientes.filter(cliente =>
    cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefono.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSedeChange = (sedeId: string) => {
    if (onSedeChange) {
      onSedeChange(sedeId)
    }
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">Error al cargar clientes</div>
          <p className="text-gray-600 mb-4">{error}</p>
          {onRetry && (
            <Button 
              onClick={onRetry}
              className="bg-[oklch(0.55_0.25_280)] hover:bg-[oklch(0.50_0.25_280)] text-white"
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
      <div className="border-b bg-white px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold">Clientes</h1>
          <Button
            onClick={onAddClient}
            className="bg-[oklch(0.55_0.25_280)] hover:bg-[oklch(0.50_0.25_280)] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Cliente
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, email o teléfono"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filtro por Sede - ESTILOS CORREGIDOS */}
          <div className="w-[200px]">
            <Select value={selectedSede} onValueChange={handleSedeChange}>
              <SelectTrigger className="w-full bg-white border border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-[oklch(0.55_0.25_280)] focus:border-[oklch(0.55_0.25_280)]">
                <SelectValue placeholder="Todas las sedes" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg">
                <SelectItem value="all" className="cursor-pointer hover:bg-gray-100 focus:bg-gray-100">
                  Todas las sedes
                </SelectItem>
                {sedes.map((sede) => (
                  <SelectItem 
                    key={sede.sede_id} 
                    value={sede.sede_id}
                    className="cursor-pointer hover:bg-gray-100 focus:bg-gray-100"
                  >
                    {sede.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button className="bg-[oklch(0.55_0.25_280)] hover:bg-[oklch(0.50_0.25_280)] text-white">
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {filteredClientes.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white">
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900">
                {clientes.length === 0 ? "No hay clientes registrados" : "No se encontraron clientes"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {clientes.length === 0 
                  ? "Comienza agregando tu primer cliente" 
                  : "Intenta ajustar los términos de búsqueda o el filtro de sede"
                }
              </p>
              {clientes.length === 0 && (
                <Button
                  onClick={onAddClient}
                  className="mt-4 bg-[oklch(0.55_0.25_280)] hover:bg-[oklch(0.50_0.25_280)] text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar primer cliente
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-6 py-4 text-left text-sm font-semibold">Nombre</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Teléfono</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Correo</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Días sin venir</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Sede</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.map((cliente) => (
                  <tr
                    key={cliente.id}
                    onClick={() => onSelectClient(cliente)}
                    className="cursor-pointer border-b transition-colors hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-lg">{cliente.nombre}</td>
                    <td className="px-6 py-4 text-lg">{cliente.telefono}</td>
                    <td className="px-6 py-4 text-lg">{cliente.email}</td>
                    <td className="px-6 py-4 text-lg">{cliente.diasSinVenir}</td>
                    <td className="px-6 py-4 text-lg">
                      {cliente.sede_id ? 
                        sedes.find(s => s.sede_id === cliente.sede_id)?.nombre || cliente.sede_id 
                        : 'Sin sede'}
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