"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Switch } from "../../../components/ui/switch";
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
    
    // Validaciones básicas
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl p-6 shadow-lg bg-white border">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-2xl font-semibold">
            {service ? "Editar servicio" : "Nuevo servicio"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Nombre */}
            <div className="sm:col-span-2">
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
                Nombre del servicio *
              </label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                placeholder="Ej: Corte de cabello"
                required
                className="mt-1"
                disabled={isSaving}
              />
            </div>

            {/* Descripción */}
            <div className="sm:col-span-2">
              <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">
                Descripción
              </label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
                placeholder="Describe el servicio..."
                rows={3}
                className="mt-1"
                disabled={isSaving}
              />
            </div>

            {/* Precio */}
            <div>
              <label htmlFor="precio" className="block text-sm font-medium text-gray-700">
                Precio ($) *
              </label>
              <Input
                id="precio"
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
                required
                className="mt-1"
                disabled={isSaving}
              />
            </div>

            {/* Duración */}
            <div>
              <label htmlFor="duracion" className="block text-sm font-medium text-gray-700">
                Duración (minutos) *
              </label>
              <Input
                id="duracion"
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
                required
                className="mt-1"
                disabled={isSaving}
              />
            </div>

            {/* Categoría */}
            <div>
              <label htmlFor="categoria" className="block text-sm font-medium text-gray-700">
                Categoría *
              </label>
              <Select
                value={formData.categoria}
                onValueChange={(value) =>
                  setFormData({ ...formData, categoria: value })
                }
                disabled={isSaving}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccione categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cortes">Cortes</SelectItem>
                  <SelectItem value="Coloración">Coloración</SelectItem>
                  <SelectItem value="Barba">Barba</SelectItem>
                  <SelectItem value="Tratamientos">Tratamientos</SelectItem>
                  <SelectItem value="Peinados">Peinados</SelectItem>
                  <SelectItem value="Manicura">Manicura</SelectItem>
                  <SelectItem value="Pedicura">Pedicura</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Comisión */}
            <div>
              <label htmlFor="comision" className="block text-sm font-medium text-gray-700">
                Comisión estilista (%) *
              </label>
              <Input
                id="comision"
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
                required
                className="mt-1"
                disabled={isSaving}
              />
            </div>

            {/* Estado */}
            <div className="sm:col-span-2 flex items-center justify-between rounded-lg border p-4 bg-white">
              <div>
                <label htmlFor="activo" className="block text-base font-medium text-gray-700">
                  Servicio activo
                </label>
                <p className="text-sm text-gray-500">
                  El servicio estará disponible para agendar
                </p>
              </div>

              <Switch
                id="activo"
                checked={formData.activo}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, activo: checked })
                }
                disabled={isSaving}
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-[oklch(0.55_0.25_280)] hover:bg-[oklch(0.50_0.25_280)]"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                service ? "Guardar cambios" : "Crear servicio"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}