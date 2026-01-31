"use client";

import { useState, useEffect } from "react";
import { Loader } from "lucide-react";
import type { Service } from "../../../types/service";

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (service: Service) => void;
  service: Service | null;
  isSaving?: boolean;
}

export function ServiceFormModal({
  isOpen,
  onClose,
  onSave,
  service,
  isSaving = false,
}: ServiceFormModalProps) {
  const [formData, setFormData] = useState<Partial<Service>>({
    nombre: "",
    descripcion: "",
    precio: 0,
    duracion: 30,
    categoria: "Cortes",
    activo: true,
    comision_porcentaje: 50,
  });

  useEffect(() => {
    if (service) {
      setFormData(service);
    } else {
      setFormData({
        nombre: "",
        descripcion: "",
        precio: 0,
        duracion: 30,
        categoria: "Cortes",
        activo: true,
        comision_porcentaje: 50,
      });
    }
  }, [service, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre?.trim()) {
      alert('El nombre del servicio es requerido');
      return;
    }

    if (!formData.precio || formData.precio <= 0) {
      alert('El precio debe ser mayor a 0');
      return;
    }

    if (!formData.duracion || formData.duracion <= 0) {
      alert('La duración debe ser mayor a 0');
      return;
    }

    onSave(formData as Service);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md mx-4 border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-medium">
            {service ? "Editar servicio" : "Nuevo servicio"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm mb-1">Nombre *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              className="w-full px-3 py-1.5 text-sm border focus:outline-none focus:border-gray-400"
              disabled={isSaving}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
              className="w-full px-3 py-1.5 text-sm border focus:outline-none focus:border-gray-400"
              disabled={isSaving}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Precio *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.precio}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    precio: parseFloat(e.target.value || "0"),
                  })
                }
                className="w-full px-3 py-1.5 text-sm border focus:outline-none focus:border-gray-400"
                disabled={isSaving}
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Duración (min) *</label>
              <input
                type="number"
                min="5"
                step="5"
                value={formData.duracion}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duracion: parseInt(e.target.value || "0"),
                  })
                }
                className="w-full px-3 py-1.5 text-sm border focus:outline-none focus:border-gray-400"
                disabled={isSaving}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Categoría *</label>
            <select
              value={formData.categoria}
              onChange={(e) =>
                setFormData({ ...formData, categoria: e.target.value })
              }
              className="w-full px-3 py-1.5 text-sm border focus:outline-none focus:border-gray-400"
              disabled={isSaving}
            >
              <option value="Cortes">Cortes</option>
              <option value="Coloración">Coloración</option>
              <option value="Barba">Barba</option>
              <option value="Tratamientos">Tratamientos</option>
              <option value="Peinados">Peinados</option>
              <option value="Manicura">Manicura</option>
              <option value="Pedicura">Pedicura</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Comisión (%) *</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.comision_porcentaje}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  comision_porcentaje: parseFloat(e.target.value || "0"),
                })
              }
              className="w-full px-3 py-1.5 text-sm border focus:outline-none focus:border-gray-400"
              disabled={isSaving}
              required
            />
          </div>

          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <label className="block text-sm">Activo</label>
              <p className="text-xs text-gray-500">Disponible para agendar</p>
            </div>
            <input
              type="checkbox"
              checked={formData.activo}
              onChange={(e) =>
                setFormData({ ...formData, activo: e.target.checked })
              }
              className="h-4 w-4"
              disabled={isSaving}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm border hover:bg-gray-50"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-sm bg-black text-white hover:bg-gray-800"
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="flex items-center gap-1">
                  <Loader className="h-3 w-3 animate-spin" />
                  Guardando...
                </span>
              ) : (
                service ? "Guardar" : "Crear"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}