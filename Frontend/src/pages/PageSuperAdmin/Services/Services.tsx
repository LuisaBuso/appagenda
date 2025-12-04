"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "../../../components/Layout/Sidebar";
import { ServicesList } from "./services-list";
import { ServiceFormModal } from "./service-form-modal";
import { ServiceFilters } from "./service-filters";
import { Button } from "../../../components/ui/button";
import { Plus, Loader } from "lucide-react";
import type { Service } from "../../../types/service";
import { serviciosService } from "./serviciosService";
import { useAuth } from "../../../components/Auth/AuthContext";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    categoria: "all",
    activo: "all",
  });

  const { user, isLoading: authLoading } = useAuth();

  // Cargar servicios desde la API
  const loadServices = async () => {
    if (!user?.access_token) {
      setError('No hay token de autenticación disponible');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const servicesData = await serviciosService.getServicios(user.access_token);
      console.log('📥 Servicios recibidos del backend:', servicesData);
      setServices(servicesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los servicios');
      console.error('Error loading services:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadServices();
    }
  }, [user, authLoading]);

  const handleAddService = () => {
    setSelectedService(null);
    setIsModalOpen(true);
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const handleSaveService = async (service: Service) => {
    if (!user?.access_token) {
      setError('No hay token de autenticación disponible');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      if (selectedService) {
        // Actualizar servicio existente - SIN descripcion
        await serviciosService.updateServicio(
          user.access_token,
          selectedService.id,
          {
            nombre: service.nombre,
            duracion_minutos: service.duracion,
            precio: service.precio,
            categoria: service.categoria,
            comision_estilista: service.comision_porcentaje,
            activo: service.activo,
            requiere_producto: service.requiere_producto || false
          }
        );
      } else {
        // Crear nuevo servicio - SIN descripcion
        await serviciosService.createServicio(user.access_token, {
          nombre: service.nombre,
          duracion_minutos: service.duracion,
          precio: service.precio,
          categoria: service.categoria,
          comision_estilista: service.comision_porcentaje,
          activo: service.activo,
          requiere_producto: service.requiere_producto || false
        });
      }

      // Recargar la lista
      await loadServices();
      setIsModalOpen(false);
      setSelectedService(null);

    } catch (err) {
      console.error('Error al guardar servicio:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar el servicio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!user?.access_token) {
      setError('No hay token de autenticación disponible');
      return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar este servicio?')) {
      return;
    }

    try {
      await serviciosService.deleteServicio(user.access_token, id);
      await loadServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el servicio');
      console.error('Error deleting service:', err);
    }
  };

  const filteredServices = services.filter((service) => {
    const matchSearch =
      service.nombre.toLowerCase().includes(filters.search.toLowerCase()) ||
      (service.descripcion && service.descripcion.toLowerCase().includes(filters.search.toLowerCase()));

    const matchCategoria =
      filters.categoria === "all" || service.categoria === filters.categoria;

    const matchActivo =
      filters.activo === "all" ||
      (filters.activo === "active" ? service.activo : !service.activo);

    return matchSearch && matchCategoria && matchActivo;
  });

  // Mostrar loading mientras se verifica la autenticación
  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3">
          <Loader className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">
            {authLoading ? "Verificando autenticación..." : "Cargando servicios..."}
          </span>
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">No autenticado</div>
          <div className="text-gray-600">Por favor inicia sesión para acceder a esta página</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Servicios</h1>
              <p className="mt-1 text-sm text-gray-600">
                Gestiona todos los servicios de tu salón
              </p>
            </div>

            <Button
              onClick={handleAddService}
              className="bg-[oklch(0.55_0.25_280)] hover:bg-[oklch(0.50_0.25_280)]"
            >
              <Plus className="mr-2 h-4 w-4" /> Añadir servicio
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4">
              <div className="flex items-center">
                <div className="text-sm text-red-700">
                  {error}
                  <button 
                    onClick={loadServices}
                    className="ml-2 font-medium text-red-800 hover:text-red-900 underline"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <ServiceFilters
            filters={filters}
            onFiltersChange={setFilters}
          />

          {/* Services Grid */}
          <ServicesList
            services={filteredServices}
            onEdit={handleEditService}
            onDelete={handleDeleteService}
          />
        </div>
      </main>

      {/* Modal */}
      <ServiceFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveService}
        service={selectedService}
        isSaving={isSaving}
      />
    </div>
  );
}