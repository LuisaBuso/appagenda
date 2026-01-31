"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "../../../components/Layout/Sidebar"
import { ClientsList } from "./clients-list"
import { ClientDetail } from "./client-detail"
import { ClientFormModal } from "./ClientFormModal"
import type { Cliente } from "../../../types/cliente"
import { clientesService } from "./clientesService"
import { sedeService } from "../../PageSuperAdmin/Sedes/sedeService"
import { useAuth } from "../../../components/Auth/AuthContext"
import { Loader } from "lucide-react"


// Interface para la respuesta de la API
interface ApiResponse {
  clientes?: any[];
  data?: any[];
  [key: string]: any;
}

// Función para asegurar que un objeto cumpla con la interfaz Cliente
const asegurarClienteCompleto = (clienteData: any): Cliente => {
  return {
    id: clienteData.id || clienteData._id || clienteData.cliente_id || '',
    nombre: clienteData.nombre || '',
    email: clienteData.email || clienteData.correo || 'No disponible',
    telefono: clienteData.telefono || 'No disponible',
    cedula: clienteData.cedula || '',
    ciudad: clienteData.ciudad || '',
    sede_id: clienteData.sede_id || '',
    diasSinVenir: clienteData.diasSinVenir || clienteData.dias_sin_visitar || 0,
    diasSinComprar: clienteData.diasSinComprar || 0,
    ltv: clienteData.ltv || clienteData.total_gastado || 0,
    ticketPromedio: clienteData.ticketPromedio || clienteData.ticket_promedio || 0,
    rizotipo: clienteData.rizotipo || '',
    nota: clienteData.nota || clienteData.notas || '',
    historialCitas: clienteData.historialCitas || [],
    historialCabello: clienteData.historialCabello || [],
    historialProductos: clienteData.historialProductos || []
  }
}

export default function ClientsPage() {
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [searchTerm, setSearchTerm] = useState("") // ✅ NUEVO
  const [metadata, setMetadata] = useState<{
    total: number;
    pagina: number;
    limite: number;
    total_paginas: number;
    tiene_siguiente: boolean;
    tiene_anterior: boolean;
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sedes, setSedes] = useState<any[]>([])
  const [itemsPorPagina, setItemsPorPagina] = useState(10)

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

  // Método para cargar TODOS los clientes
  const loadClientes = async (pagina: number = 1, filtro: string = "") => {
    if (!user?.access_token) {
      setError('No hay token de autenticación disponible')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      console.log('📋 Cargando TODOS los clientes...')
      
      // Usar el método obtenerClientes del servicio (que ahora solo recibe token)
      const todosClientes = await clientesService.obtenerClientes(user.access_token)
      
      console.log('📦 Respuesta de obtenerClientes:', todosClientes)

      // Transformar a array de Clientes completos
      let clientesArray: Cliente[] = []
      
      if (Array.isArray(todosClientes)) {
        clientesArray = todosClientes.map(asegurarClienteCompleto)
      } else if (todosClientes && typeof todosClientes === 'object') {
        // Cast a ApiResponse para que TypeScript reconozca las propiedades
        const response = todosClientes as ApiResponse
        
        // Manejar diferentes estructuras de respuesta
        if (response.clientes && Array.isArray(response.clientes)) {
          clientesArray = response.clientes.map(asegurarClienteCompleto)
        } else if (response.data && Array.isArray(response.data)) {
          clientesArray = response.data.map(asegurarClienteCompleto)
        } else {
          // Intentar extraer array de alguna propiedad
          const values = Object.values(response)
          for (const val of values) {
            if (Array.isArray(val)) {
              clientesArray = val.map(asegurarClienteCompleto)
              break
            }
          }
        }
      }

      console.log(`✅ Total de clientes procesados: ${clientesArray.length}`)

      // Aplicar filtro de búsqueda
      let clientesFiltrados = clientesArray
      if (filtro) {
        const filtroLower = filtro.toLowerCase()
        clientesFiltrados = clientesFiltrados.filter(cliente => 
          cliente.nombre?.toLowerCase().includes(filtroLower) ||
          cliente.email?.toLowerCase().includes(filtroLower) ||
          cliente.telefono?.includes(filtro) ||
          cliente.cedula?.includes(filtro) ||
          cliente.ciudad?.toLowerCase().includes(filtroLower)
        )
        console.log(`🔍 Clientes después de filtrar: ${clientesFiltrados.length}`)
      }
      
      // Ordenar por nombre
      clientesFiltrados.sort((a, b) => a.nombre.localeCompare(b.nombre))
      
      // Configurar paginación
      const limite = itemsPorPagina
      const inicio = (pagina - 1) * limite
      const clientesPaginados = clientesFiltrados.slice(inicio, inicio + limite)
      const totalPaginas = Math.ceil(clientesFiltrados.length / limite)
      
      console.log(`📊 Paginación: Mostrando ${clientesPaginados.length} de ${clientesFiltrados.length}`)
      
      setClientes(clientesPaginados)
      setMetadata({
        total: clientesFiltrados.length,
        pagina: pagina,
        limite: limite,
        total_paginas: totalPaginas,
        tiene_siguiente: inicio + limite < clientesFiltrados.length,
        tiene_anterior: pagina > 1
      })
      
    } catch (err) {
      console.error('❌ Error cargando clientes:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar los clientes')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
  if (!user?.access_token) return

  const timeout = setTimeout(() => {
    loadClientes(1, searchTerm)
  }, 600)

  return () => clearTimeout(timeout)
}, [searchTerm])

  useEffect(() => {
    if (!authLoading && user) {
      loadSedes()
      loadClientes()
    }
  }, [user, authLoading, itemsPorPagina])

  const handlePageChange = (pagina: number, filtro: string = "") => {
    loadClientes(pagina, filtro)
  }

  const handleSearch = (value: string) => {
  setSearchTerm(value)
}



  const handleSelectClient = async (client: Cliente) => {
    if (!user?.access_token) return
    try {
      const clienteCompleto = await clientesService.getClienteById(user.access_token, client.id)
      setSelectedClient(asegurarClienteCompleto(clienteCompleto))
    } catch (err) {
      console.error('Error cargando detalles:', err)
      setSelectedClient(client)
    }
  }

  const handleAddClient = () => setIsModalOpen(true)

  const handleSaveClient = async (clienteData: any) => {
    if (!user?.access_token) return
    try {
      setIsSaving(true)
      setError(null)

      let sedeIdToUse = clienteData.sede_id
      if (!sedeIdToUse && sedes.length > 0) {
        sedeIdToUse = sedes[0].id || sedes[0]._id
      }

      if (!sedeIdToUse) {
        throw new Error('No hay sedes disponibles')
      }

      const createData = {
        nombre: clienteData.nombre,
        correo: clienteData.email || '',
        telefono: clienteData.telefono || '',
        notas: clienteData.nota || '',
        sede_id: sedeIdToUse,
        cedula: clienteData.cedula || '',
        ciudad: clienteData.ciudad || '',
        fecha_de_nacimiento: clienteData.fecha_de_nacimiento || ''
      }

      // Usar type assertion ya que createCliente espera CreateClienteData
      await (clientesService.createCliente as any)(user.access_token, createData)
      await loadClientes(metadata?.pagina || 1)
      setIsModalOpen(false)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el cliente')
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => setSelectedClient(null)

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex items-center gap-3">
          <Loader className="h-5 w-5 animate-spin text-gray-600" />
          <span className="text-sm text-gray-600">Cargando clientes...</span>
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
          <ClientDetail client={selectedClient} onBack={handleBack} />
        ) : (
          <>
            {/* Controles de cantidad por página */}
            <div className="border-b border-gray-100 p-4 bg-white">
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-medium text-gray-900">Clientes</h1>
                  <p className="text-xs text-gray-500 mt-1">
                    {metadata ? `Mostrando ${clientes.length} de ${metadata.total} clientes` : 'Cargando...'}
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-700">Mostrar:</span>
                    <select
                      value={itemsPorPagina}
                      onChange={(e) => setItemsPorPagina(Number(e.target.value))}
                      className="h-8 text-sm border border-gray-300 rounded px-2 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                      <option value="200">200</option>
                      <option value="500">500</option>
                    </select>
                    <span className="text-xs text-gray-500">por página</span>
                  </div>
                </div>
              </div>
              {error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                  Error: {error}
                </div>
              )}
            </div>
            
            <ClientsList
              onSelectClient={handleSelectClient}
              onAddClient={handleAddClient}
              clientes={clientes}
              metadata={metadata || undefined}
              error={error}
              isLoading={isLoading}
              onPageChange={handlePageChange}
              onSearch={handleSearch}
              searchValue={searchTerm}   // 👈 ESTO
            
            />
          </>
        )}
      </div>

      <ClientFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSaveClient}
        isSaving={isSaving}
        sedeId={sedes.length > 0 ? (sedes[0].id || sedes[0]._id || "") : ""}
      />
    </div>
  )
}