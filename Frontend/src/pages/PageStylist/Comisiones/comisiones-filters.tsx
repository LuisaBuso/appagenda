"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"

export function ComisionesFilters() {
  return (
    <div className="mb-6 flex gap-4">
      <div className="rounded-lg border border-gray-300 bg-white px-4 py-2.5">
        <span className="text-sm">1 – 31 de marzo, 2024</span>
      </div>
      
      <Select defaultValue="paulina">
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="paulina">Paulina</SelectItem>
          <SelectItem value="sofia">Sofia</SelectItem>
          <SelectItem value="celia">Celia</SelectItem>
          <SelectItem value="pedro">Pedro</SelectItem>
          <SelectItem value="marina">Marina</SelectItem>
        </SelectContent>
      </Select>

      <Select defaultValue="all">
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Sede" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las sedes</SelectItem>
          <SelectItem value="centro">Centro</SelectItem>
          <SelectItem value="toledo">Toledo</SelectItem>
          <SelectItem value="valladolid">Valladolid</SelectItem>
        </SelectContent>
      </Select>

      <Select defaultValue="all">
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="pending">Pendiente</SelectItem>
          <SelectItem value="approved">Aprobado</SelectItem>
          <SelectItem value="paid">Pagado</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
