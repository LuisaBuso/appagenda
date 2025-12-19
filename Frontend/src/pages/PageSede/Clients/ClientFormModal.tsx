"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Textarea } from "../../../components/ui/textarea"

interface ClientFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (clientData: any) => Promise<void>
  isSaving: boolean
}

export function ClientFormModal({ isOpen, onClose, onSave, isSaving }: ClientFormModalProps) {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    nota: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(formData)
    setFormData({ nombre: "", email: "", telefono: "", nota: "" })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-medium text-gray-900">Nuevo Cliente</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-50 rounded"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <Label htmlFor="nombre" className="text-xs font-medium text-gray-700">
              Nombre *
            </Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
              className="h-8 text-sm border-gray-300"
              placeholder="Nombre completo"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-xs font-medium text-gray-700">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="h-8 text-sm border-gray-300"
              placeholder="ejemplo@email.com"
            />
          </div>

          <div>
            <Label htmlFor="telefono" className="text-xs font-medium text-gray-700">
              Teléfono
            </Label>
            <Input
              id="telefono"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              className="h-8 text-sm border-gray-300"
              placeholder="+52 123 456 7890"
            />
          </div>

          <div>
            <Label htmlFor="nota" className="text-xs font-medium text-gray-700">
              Notas
            </Label>
            <Textarea
              id="nota"
              value={formData.nota}
              onChange={(e) => setFormData({ ...formData, nota: e.target.value })}
              className="text-sm border-gray-300 min-h-[60px]"
              placeholder="Notas adicionales..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="text-xs bg-gray-900 hover:bg-gray-800 text-white"
              disabled={isSaving}
            >
              {isSaving ? "Guardando..." : "Crear Cliente"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}