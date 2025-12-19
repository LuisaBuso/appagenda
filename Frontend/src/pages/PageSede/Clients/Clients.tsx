"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "../../../components/Layout/Sidebar"
import { ClientsList } from "./clients-list"
import { ClientDetail } from "./client-detail"
import { ClientFormModal } from "./ClientFormModal"
import type { Cliente } from "../../../types/cliente"
import type { Sede } from "./../../PageSuperAdmin/Sedes/sedeService"
import { clientesService } from "./clientesService"
import { sedeService } from "../../PageSuperAdmin/Sedes/sedeService"
import { useAuth } from "../../../components/Auth/AuthContext"
import { Loader } from "lucide-react"

export default function ClientsPage() {
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [selectedSede, setSelectedSede] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const { user, isLoading: authLoading } = useAuth()

  const loadSedes = async () => {
    if (!user?.access_token) return

    try {
      const sedesData = await sedeService.getSedes(user.access_token)
      setSedes(sedesData)
    } catch (err) {
      console.error('Error cargando sedes:', err)
    }
  }

  const loadClientes = async (sedeId?: string) => {
    if (!user?.access_token) {
      setError('No hay token de autenticación disponible')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const clientesData = await clientesService.getClientes(user.access_token, sedeId)
      setClientes(clientesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los clientes')
      console.error('Error loading clients:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      loadSedes()
      loadClientes()
    }
  }, [user, authLoading])

  const handleSedeChange = (sedeId: string) => {
    setSelectedSede(sedeId)
    loadClientes(sedeId === "all" ? undefined : sedeId)
  }

  const handleSelectClient = async (client: Cliente) => {
    if (!user?.access_token) {
      setError('No hay token de autenticación disponible')
      return
    }

    try {
      const clienteCompleto = await clientesService.getClienteById(user.access_token, client.id)
      setSelectedClient(clienteCompleto)
    } catch (err) {
      console.error('Error cargando detalles del cliente:', err)
      setSelectedClient(client)
    }
  }

  const handleAddClient = () => {
    setIsModalOpen(true)
  }

  const handleSaveClient = async (clienteData: any) => {
    if (!user?.access_token) {
      setError('No hay token de autenticación disponible')
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      const sedeId = selectedSede !== "all" ? selectedSede : undefined

      await clientesService.createCliente(user.access_token, {
        nombre: clienteData.nombre,
        correo: clienteData.email || '',
        telefono: clienteData.telefono || '',
        notas: clienteData.nota || '',
        sede_id: sedeId
      })

      await loadClientes(selectedSede !== "all" ? selectedSede : undefined)
      setIsModalOpen(false)

    } catch (err) {
      console.error('Error al crear cliente:', err)
      setError(err instanceof Error ? err.message : 'Error al crear el cliente')
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    setSelectedClient(null)
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex items-center gap-3">
          <Loader className="h-5 w-5 animate-spin text-gray-600" />
          <span className="text-sm text-gray-600">
            {authLoading ? "Verificando autenticación..." : "Cargando..."}
          </span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-2">No autenticado</div>
          <div className="text-xs text-gray-500">Inicia sesión para acceder</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        {selectedClient ? (
          <ClientDetail 
            client={selectedClient} 
            onBack={handleBack} 
          />
        ) : (
          <ClientsList 
            onSelectClient={handleSelectClient}
            onAddClient={handleAddClient}
            clientes={clientes}
            error={error}
            onRetry={() => loadClientes(selectedSede !== "all" ? selectedSede : undefined)}
            onSedeChange={handleSedeChange}
            selectedSede={selectedSede}
            sedes={sedes}
          />
        )}
      </div>

      <ClientFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveClient}
        isSaving={isSaving}
      />
    </div>
  )
}