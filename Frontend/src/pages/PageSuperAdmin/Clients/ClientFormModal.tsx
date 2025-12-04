
import { useState, useEffect } from "react"
import { X, Loader } from 'lucide-react'
import { Input } from "../../../components/ui/input"
// Import temporal - si no funciona, comentamos esto
// import { Label } from "../../../components/ui/label"
import { Textarea } from "../../../components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select"
import type { Sede } from "../Sedes/sedeService"

// Componente Label temporal para resolver el error
function TempLabel({ children, htmlFor, className }: { 
  children: React.ReactNode; 
  htmlFor?: string; 
  className?: string; 
}) {
  return (
    <label 
      htmlFor={htmlFor} 
      className={`block text-sm font-medium mb-2 ${className || ''}`}
    >
      {children}
    </label>
  )
}

interface ClientFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (cliente: any) => void
  isSaving?: boolean
  sedes?: Sede[]
  selectedSede?: string
}

export function ClientFormModal({ 
  isOpen, 
  onClose, 
  onSave, 
  isSaving = false,
  sedes = [],
  selectedSede = "all"
}: ClientFormModalProps) {
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    email: "",
    nota: "",
    sede_id: selectedSede !== "all" ? selectedSede : ""
  })

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        nombre: "",
        telefono: "",
        email: "",
        nota: "",
        sede_id: selectedSede !== "all" ? selectedSede : ""
      })
    }
  }, [isOpen, selectedSede])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validaciones básicas
    if (!formData.nombre.trim()) {
      alert('El nombre es requerido')
      return
    }

    if (!formData.telefono.trim() && !formData.email.trim()) {
      alert('Debe proporcionar al menos un teléfono o email')
      return
    }

    onSave(formData)
  }

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={stopPropagation}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Nuevo Cliente</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            disabled={isSaving}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <TempLabel htmlFor="nombre" className="block text-sm font-medium mb-2">
              Nombre completo *
            </TempLabel>
            <Input
              type="text"
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[oklch(0.65_0.25_280)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.65_0.25_280)]/20"
              required
              disabled={isSaving}
              placeholder="Ingresa el nombre completo"
            />
          </div>

          <div>
            <TempLabel htmlFor="telefono" className="block text-sm font-medium mb-2">
              Teléfono
            </TempLabel>
            <Input
              type="tel"
              id="telefono"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[oklch(0.65_0.25_280)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.65_0.25_280)]/20"
              disabled={isSaving}
              placeholder="Ej: 123 456 7890"
            />
          </div>

          <div>
            <TempLabel htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </TempLabel>
            <Input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[oklch(0.65_0.25_280)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.65_0.25_280)]/20"
              disabled={isSaving}
              placeholder="ejemplo@correo.com"
            />
          </div>

          {/* Selector de Sede */}
          {sedes.length > 0 && (
            <div>
              <TempLabel htmlFor="sede" className="block text-sm font-medium mb-2">
                Sede
              </TempLabel>
              <Select
                value={formData.sede_id}
                onValueChange={(value) => setFormData({ ...formData, sede_id: value })}
                disabled={isSaving}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar sede" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin sede específica</SelectItem>
                  {sedes.map((sede) => (
                    <SelectItem key={sede.sede_id} value={sede.sede_id}>
                      {sede.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <TempLabel htmlFor="nota" className="block text-sm font-medium mb-2">
              Nota
            </TempLabel>
            <Textarea
              id="nota"
              value={formData.nota}
              onChange={(e) => setFormData({ ...formData, nota: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[oklch(0.65_0.25_280)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.65_0.25_280)]/20"
              disabled={isSaving}
              placeholder="Información adicional del cliente..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[oklch(0.65_0.25_280)] text-white rounded-lg hover:bg-[oklch(0.60_0.25_280)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              disabled={isSaving || !formData.nombre.trim() || (!formData.telefono.trim() && !formData.email.trim())}
            >
              {isSaving ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Crear cliente"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}