"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "../../../components/Layout/Sidebar"
import { EstilistasList } from "./estilistas-list"
import { EstilistaDetail } from "./estilista-detail"
import { EstilistaFormModal } from "./estilista-form-modal"
import { Plus, Loader } from 'lucide-react'
import type { Estilista, CreateEstilistaData } from "../../../types/estilista"
import { estilistaService } from "./estilistaService"
import { useAuth } from "../../../components/Auth/AuthContext"

export default function EstilistasPage() {
  const [estilistas, setEstilistas] = useState<Estilista[]>([])
  const [selectedEstilista, setSelectedEstilista] = useState<Estilista | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEstilista, setEditingEstilista] = useState<Estilista | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, isLoading: authLoading } = useAuth()

  // Cargar estilistas desde la API
  const loadEstilistas = async () => {
    if (!user?.access_token) {
      setError('No hay token de autenticación disponible')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const estilistasData = await estilistaService.getEstilistas(user.access_token)
      console.log('📥 Estilistas recibidos del backend:', estilistasData)
      setEstilistas(estilistasData)

      // Seleccionar el primer estilista por defecto si hay datos
      if (estilistasData.length > 0 && !selectedEstilista) {
        setSelectedEstilista(estilistasData[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los estilistas')
      console.error('Error loading estilistas:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      loadEstilistas()
    }
  }, [user, authLoading])

  const handleAddEstilista = () => {
    setEditingEstilista(null)
    setIsModalOpen(true)
  }

  const handleEditEstilista = (estilista: Estilista) => {
    setEditingEstilista(estilista)
    setIsModalOpen(true)
  }

  const handleSaveEstilista = async (estilistaData: Partial<Estilista> & { password?: string }) => {
    if (!user?.access_token) {
      setError('No hay token de autenticación disponible')
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      console.log('🔍 === DATOS RECIBIDOS EN handleSaveEstilista ===');
      console.log('📥 estilistaData:', estilistaData);

      // Asegurar que especialidades siempre sea un array
      const especialidades = estilistaData.especialidades || [];

      if (editingEstilista) {
        console.log('🔄 Actualizando estilista existente:', editingEstilista.profesional_id);
        await estilistaService.updateEstilista(
          user.access_token,
          editingEstilista.profesional_id,
          {
            nombre: estilistaData.nombre,
            email: estilistaData.email,
            sede_id: estilistaData.sede_id,
            especialidades: especialidades,
            comision: estilistaData.comision || null,
            activo: estilistaData.activo
          }
        )

        await loadEstilistas()
      } else {
        // Crear nuevo estilista
        const createData: CreateEstilistaData = {
          nombre: estilistaData.nombre || "",
          email: estilistaData.email || "",
          sede_id: estilistaData.sede_id || "",
          especialidades: especialidades,
          comision: estilistaData.comision || null,
          password: estilistaData.password || "Unicornio123"
        }

        console.log('🔍 === DATOS PARA CREAR ESTILISTA ===');
        console.log('📤 createData:', createData);

        if (!createData.sede_id) {
          throw new Error('Debe seleccionar una sede para crear el estilista')
        }

        // Crear el estilista
        await estilistaService.createEstilista(user.access_token, createData)
        console.log('✅ Estilista creado exitosamente');
        
        // Recargar la lista completa para obtener todos los datos actualizados
        await loadEstilistas()
      }

      setIsModalOpen(false)
      setEditingEstilista(null)

    } catch (err) {
      console.error('❌ Error detallado al guardar estilista:', err)
      setError(err instanceof Error ? err.message : 'Error al guardar el estilista')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteEstilista = async (estilista: Estilista) => {
    if (!user?.access_token) {
      setError('No hay token de autenticación disponible')
      return
    }

    try {
      await estilistaService.deleteEstilista(user.access_token, estilista.profesional_id)

      // Recargar la lista
      await loadEstilistas()

      // Si el estilista eliminado era el seleccionado, limpiar la selección
      if (selectedEstilista?.profesional_id === estilista.profesional_id) {
        setSelectedEstilista(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el estilista')
      console.error('Error deleting estilista:', err)
    }
  }

  // Mostrar loading mientras se verifica la autenticación
  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3">
          <Loader className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">
            {authLoading ? "Verificando autenticación..." : "Cargando estilistas..."}
          </span>
        </div>
      </div>
    )
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
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex flex-1 overflow-hidden">
        {/* Lista lateral de estilistas */}
        <div className="w-80 border-r bg-white overflow-y-auto">
          <div className="p-4">
            <button
              onClick={handleAddEstilista}
              className="w-full flex items-center justify-center gap-2 bg-[oklch(0.65_0.25_280)] text-white rounded-lg px-4 py-3 font-medium hover:bg-[oklch(0.60_0.25_280)] transition-colors"
            >
              <Plus className="h-5 w-5" />
              Añadir estilista
            </button>
          </div>

            {error && (
            <div className="p-4 text-red-600 text-sm">
              Error: {error}
              <button
              onClick={loadEstilistas}
              className="ml-2 text-blue-600 hover:underline"
              >
              Reintentar
              </button>
            </div>
            )}
            <EstilistasList
            estilistas={estilistas}
            selectedEstilista={selectedEstilista}
            onSelectEstilista={setSelectedEstilista}
            onEdit={handleEditEstilista}
            onDelete={handleDeleteEstilista}
            />
        </div>

        {/* Detalle del estilista seleccionado */}
        <div className="flex-1 overflow-y-auto">
          {selectedEstilista ? (
            <EstilistaDetail
              estilista={selectedEstilista}
              onEdit={handleEditEstilista}
              onDelete={handleDeleteEstilista}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              {estilistas.length === 0 ? 'No hay estilistas disponibles' : 'Selecciona un estilista para ver los detalles'}
            </div>
          )}
        </div>
      </div>

      <EstilistaFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEstilista}
        estilista={editingEstilista}
        isSaving={isSaving}
      />
    </div>
  )
}