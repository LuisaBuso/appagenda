"use client"

import { useState } from "react"
import { Search, MoreVertical, Edit, Trash2, User } from 'lucide-react'
import type { Estilista } from "../../../types/estilista"

interface EstilistasListProps {
  estilistas: Estilista[]
  selectedEstilista: Estilista | null
  onSelectEstilista: (estilista: Estilista) => void
  onEdit?: (estilista: Estilista) => void
  onDelete?: (estilista: Estilista) => void
}

export function EstilistasList({ 
  estilistas, 
  selectedEstilista, 
  onSelectEstilista,
  onEdit,
  onDelete 
}: EstilistasListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterActive, setFilterActive] = useState<boolean | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  // 🔥 CORREGIDO: Verificar que estilistas sea un array
  const safeEstilistas = Array.isArray(estilistas) ? estilistas : []
  
  const filteredEstilistas = safeEstilistas.filter(estilista => {
    // 🔥 CORREGIDO: Verificar que estilista no sea null/undefined
    if (!estilista) return false
    
    const matchesSearch = estilista.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         estilista.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterActive === null || estilista.activo === filterActive
    
    return matchesSearch && matchesFilter
  })

  const toggleMenu = (id: string) => {
    setMenuOpenId(menuOpenId === id ? null : id)
  }

  const handleEdit = (estilista: Estilista, e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpenId(null)
    onEdit?.(estilista)
  }

  const handleDelete = (estilista: Estilista, e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpenId(null)
    if (confirm(`¿Estás seguro de que quieres eliminar a ${estilista.nombre}?`)) {
      onDelete?.(estilista)
    }
  }

  // 🔥 CORREGIDO: Función segura para obtener especialidades
  const getEspecialidades = (estilista: Estilista) => {
    return Array.isArray(estilista.especialidades) ? estilista.especialidades : []
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header con buscador y filtros */}
      <div className="p-4 border-b">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar estilistas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilterActive(null)}
            className={`flex-1 px-3 py-1.5 text-xs rounded border ${
              filterActive === null 
                ? 'bg-blue-100 border-blue-500 text-blue-700' 
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterActive(true)}
            className={`flex-1 px-3 py-1.5 text-xs rounded border ${
              filterActive === true 
                ? 'bg-green-100 border-green-500 text-green-700' 
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Activos
          </button>
          <button
            onClick={() => setFilterActive(false)}
            className={`flex-1 px-3 py-1.5 text-xs rounded border ${
              filterActive === false 
                ? 'bg-red-100 border-red-500 text-red-700' 
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Inactivos
          </button>
        </div>
      </div>

      {/* Lista de estilistas */}
      <div className="flex-1 overflow-y-auto">
        {filteredEstilistas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <User className="h-8 w-8 mb-2" />
            <p className="text-sm">No se encontraron estilistas</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredEstilistas.map((estilista) => {
              // 🔥 CORREGIDO: Verificar que estilista sea válido
              if (!estilista) return null
              
              const especialidades = getEspecialidades(estilista)
              const especialidadesCount = especialidades.length

              return (
                <div
                  key={estilista.profesional_id}
                  onClick={() => onSelectEstilista(estilista)}
                  className={`p-4 cursor-pointer transition-colors relative group ${
                    selectedEstilista?.profesional_id === estilista.profesional_id
                      ? 'bg-blue-50 border-r-2 border-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {estilista.nombre || 'Nombre no disponible'}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            estilista.activo
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {estilista.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-1 truncate">
                        {estilista.email || 'Email no disponible'}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {/* 🔥 CORREGIDO: Mostrar nombre de la sede en lugar del ID */}
                        <span>Sede: {(estilista as any).sede_nombre || 'Sede no asignada'}</span>
                        {estilista.comision && (
                          <span>• Comisión: {estilista.comision}%</span>
                        )}
                      </div>

                      {especialidadesCount > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">
                            Especialidades ({especialidadesCount}):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {especialidades.slice(0, 3).map((especialidad, index) => (
                              <span
                                key={index}
                                className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                              >
                                {especialidad}
                              </span>
                            ))}
                            {especialidadesCount > 3 && (
                              <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                +{especialidadesCount - 3} más
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Menú de acciones */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleMenu(estilista.profesional_id)
                        }}
                        className="p-1 rounded hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                      </button>

                      {menuOpenId === estilista.profesional_id && (
                        <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-32">
                          <button
                            onClick={(e) => handleEdit(estilista, e)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                          >
                            <Edit className="h-4 w-4" />
                            Editar
                          </button>
                          <button
                            onClick={(e) => handleDelete(estilista, e)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 first:rounded-t-lg last:rounded-b-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Contador */}
      <div className="p-3 border-t bg-gray-50">
        <p className="text-xs text-gray-600 text-center">
          {filteredEstilistas.length} de {safeEstilistas.length} estilistas
        </p>
      </div>
    </div>
  )
}