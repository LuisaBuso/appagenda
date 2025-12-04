import { useState, useEffect } from "react";
import { Plus, Loader } from "lucide-react";
import { SedesList } from "./sedes-list";
import { SedeFormModal } from "./sede-form-modal";
import type { Sede } from "../../../types/sede";
import { sedeService } from "./sedeService";
import { useAuth } from "../../../components/Auth/AuthContext";
import { Sidebar } from "../../../components/Layout/Sidebar";

export default function SedesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSede, setSelectedSede] = useState<Sede | null>(null);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading: authLoading } = useAuth();

  // Cargar sedes desde la API
  const loadSedes = async () => {
    if (!user?.access_token) {
      setError('No hay token de autenticación disponible');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const sedesData = await sedeService.getSedes(user.access_token);
      console.log('📥 Datos recibidos del backend:', sedesData);
      setSedes(sedesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las sedes');
      console.error('Error loading sedes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadSedes();
    }
  }, [user, authLoading]);

  const handleAddSede = () => {
    setSelectedSede(null);
    setIsModalOpen(true);
  };

  const handleEditSede = (sede: Sede) => {
    setSelectedSede(sede);
    setIsModalOpen(true);
  };

  const handleSaveSede = async (sedeData: Sede) => {
    if (!user?.access_token) {
      setError('No hay token de autenticación disponible');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      if (selectedSede) {
        // Actualizar sede existente - enviar solo los campos permitidos
        const response = await sedeService.updateSede(
          user.access_token, 
          selectedSede.sede_id,
          {
            nombre: sedeData.nombre,
            direccion: sedeData.direccion,
            informacion_adicional: sedeData.informacion_adicional,
            zona_horaria: sedeData.zona_horaria,
            telefono: sedeData.telefono,
            email: sedeData.email,
            activa: sedeData.activa // Solo en actualización
          }
        );

        setSedes(sedes.map((s) => (s.sede_id === response.sede_id ? response : s)));
      } else {
        // Crear nueva sede - NO enviar sede_id ni activa
        const response = await sedeService.createSede(user.access_token, {
          nombre: sedeData.nombre,
          direccion: sedeData.direccion,
          informacion_adicional: sedeData.informacion_adicional,
          zona_horaria: sedeData.zona_horaria,
          telefono: sedeData.telefono,
          email: sedeData.email
          // NO incluir: sede_id, activa (el backend los genera)
        });

        setSedes([...sedes, response]);
      }

      setIsModalOpen(false);
      setSelectedSede(null);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la sede');
      console.error('Error saving sede:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSede = async (sedeId: string) => {
    if (!user?.access_token) {
      setError('No hay token de autenticación disponible');
      return;
    }

    try {
      // Encontrar la sede para obtener su sede_id
      const sedeToDelete = sedes.find(s => s._id === sedeId);
      if (!sedeToDelete) {
        throw new Error('Sede no encontrada');
      }

      // Usar sede_id en lugar del _id de MongoDB
      await sedeService.deleteSede(user.access_token, sedeToDelete.sede_id);
      setSedes(sedes.filter((s) => s._id !== sedeId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la sede');
      console.error('Error deleting sede:', err);
    }
  };

  const handleRetry = () => {
    loadSedes();
  };

  // Mostrar loading mientras se verifica la autenticación
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3">
          <Loader className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">Verificando autenticación...</span>
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

  // Renderizar la página completa con Sidebar
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Contenido principal */}
      <main className="flex-1 lg:ml-0 overflow-auto">
        {isLoading ? (
          <div className="flex min-h-screen items-center justify-center">
            <div className="flex items-center gap-3">
              <Loader className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-lg text-gray-600">Cargando sedes...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <div className="text-red-600 text-lg mb-4">Error al cargar las sedes</div>
              <div className="text-gray-600 mb-4">{error}</div>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full min-h-screen overflow-auto bg-gray-50 lg:mt-0 mt-16">
            <div className="mx-auto max-w-5xl px-6 py-10">
              <div className="w-full flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-semibold">Configuración de Sedes</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Gestión de locales/sedes del sistema
                  </p>
                </div>

                <button
                  onClick={handleAddSede}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Añadir sede
                </button>
              </div>

              <div className="mb-4 text-sm text-gray-600">
                Total de sedes: {sedes.length}
              </div>

              <SedesList 
                sedes={sedes} 
                onEdit={handleEditSede} 
                onDelete={handleDeleteSede} 
              />

              <SedeFormModal
                isOpen={isModalOpen}
                onClose={() => {
                  setIsModalOpen(false);
                  setSelectedSede(null);
                }}
                onSave={handleSaveSede}
                sede={selectedSede}
                isSaving={isSaving}
              />
            </div>
          </div>    
        )}
      </main>
    </div>
  );
}