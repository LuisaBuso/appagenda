"use client"

import { MapPin, Phone, Mail, Pencil } from 'lucide-react'
import type { Sede } from "../../../types/sede"

interface SedesListProps {
  sedes: Sede[]
  onEdit: (sede: Sede) => void
  onDelete: (sedeId: string) => void
}

export function SedesList({ sedes, onEdit }: SedesListProps) {
  // Función segura para obtener propiedades
  const getSafeValue = (obj: any, key: string, defaultValue: string = 'No disponible') => {
    return obj && obj[key] !== undefined && obj[key] !== null ? obj[key] : defaultValue;
  };

  // Filtrar y validar sedes
  const validSedes = sedes.filter(sede => sede && sede._id);

  if (validSedes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No hay sedes disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {validSedes.map((sede) => (
        <div
          key={sede._id}
          className="flex items-start justify-between rounded-lg border bg-white p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{getSafeValue(sede, 'nombre')}</h3>
                <div className="flex items-center text-gray-600 mb-1">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span className="text-sm">{getSafeValue(sede, 'direccion')}</span>
                </div>
                <div className="flex items-center text-gray-600 mb-1">
                  <Phone className="h-4 w-4 mr-2" />
                  <span className="text-sm">{getSafeValue(sede, 'telefono')}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  <span className="text-sm">{getSafeValue(sede, 'email')}</span>
                </div>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                sede.activa 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {sede.activa ? 'Activa' : 'Inactiva'}
              </span>
            </div>
          </div>
          <button
            onClick={() => onEdit(sede)}
            className="ml-4 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600"
            title="Editar sede"
          >
            <Pencil className="h-5 w-5" />
          </button>
        </div>
      ))}
    </div>
  )
}