"use client"

import { MapPin, Phone, Mail, Pencil, Trash2 } from 'lucide-react'
import type { Sede } from "../../../types/sede"

interface SedesListProps {
  sedes: Sede[]
  onEdit: (sede: Sede) => void
  onDelete: (sedeId: string) => void
}

export function SedesList({ sedes, onEdit, onDelete }: SedesListProps) {
  const getSafeValue = (obj: any, key: string, defaultValue: string = '') => {
    return obj && obj[key] !== undefined && obj[key] !== null ? obj[key] : defaultValue;
  };

  const validSedes = sedes.filter(sede => sede && sede._id);

  if (validSedes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 text-sm">No hay sedes</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {validSedes.map((sede) => (
        <div
          key={sede._id}
          className="border p-4 hover:bg-gray-50 flex flex-col"
        >
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm truncate">{getSafeValue(sede, 'nombre')}</h3>
              <span className={`text-xs px-2 py-0.5 ml-2 flex-shrink-0 ${
                sede.activa 
                  ? 'bg-gray-100' 
                  : 'bg-gray-200'
              }`}>
                {sede.activa ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start text-sm text-gray-600">
                <MapPin className="h-3.5 w-3.5 mr-1.5 mt-0.5 flex-shrink-0" />
                <span className="text-xs line-clamp-2">{getSafeValue(sede, 'direccion')}</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                <span className="text-xs">{getSafeValue(sede, 'telefono')}</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                <span className="text-xs truncate">{getSafeValue(sede, 'email')}</span>
              </div>
            </div>
            
            {sede.zona_horaria && (
              <div className="text-xs text-gray-500 mt-3 pt-2 border-t">
                Zona horaria: {sede.zona_horaria}
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-1 mt-4 pt-3 border-t">
            <button
              onClick={() => onEdit(sede)}
              className="p-1 hover:bg-gray-100 text-gray-600"
              title="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                if (window.confirm('¿Eliminar sede?')) {
                  onDelete(sede._id);
                }
              }}
              className="p-1 hover:bg-gray-100 text-gray-600"
              title="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}