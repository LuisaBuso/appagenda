"use client"

import { Input } from "../../../components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Search } from 'lucide-react'

interface ServiceFiltersProps {
  filters: {
    search: string
    categoria: string
    activo: string
  }
  onFiltersChange: (filters: any) => void
}

export function ServiceFilters({ filters, onFiltersChange }: ServiceFiltersProps) {
  return (
    <div className="mb-6 flex flex-wrap gap-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[300px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Buscar servicios..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-10"
        />
      </div>

      {/* Category Filter */}
      <Select
        value={filters.categoria}
        onValueChange={(value) => onFiltersChange({ ...filters, categoria: value })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las categorías</SelectItem>
          <SelectItem value="Cortes">Cortes</SelectItem>
          <SelectItem value="Coloración">Coloración</SelectItem>
          <SelectItem value="Barba">Barba</SelectItem>
          <SelectItem value="Tratamientos">Tratamientos</SelectItem>
          <SelectItem value="Peinados">Peinados</SelectItem>
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select
        value={filters.activo}
        onValueChange={(value) => onFiltersChange({ ...filters, activo: value })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="active">Activos</SelectItem>
          <SelectItem value="inactive">Inactivos</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
