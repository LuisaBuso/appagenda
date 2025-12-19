// app/(protected)/admin-sede/ventas/today-appointments.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import { useEffect, useState } from "react"
import { API_BASE_URL } from "../../../types/config"
import { Calendar } from "lucide-react" // Importar el icono de calendario

// Actualiza la interfaz para que coincida con los datos reales del API
interface Appointment {
  _id: string
  cliente: string
  cliente_nombre: string  // Agregar esto
  fecha: string
  hora_inicio: string
  hora_fin: string
  servicio: string
  servicio_nombre: string  // Agregar esto
  estilista?: string  // Mantener opcional por compatibilidad
  profesional_nombre: string  // Agregar esto - viene del API
  estado: string
  sede_id: string
  // Otros campos que podrías necesitar
  valor_total?: number
  estado_pago?: string
  abono?: number
  saldo_pendiente?: number
}

interface ApiResponse {
  total: number
  sede_id: string
  citas: Appointment[]
}

// Props simplificadas - solo para abrir protocolo
interface TodayAppointmentsProps {
  onSelectAppointment: (appointment: Appointment) => void
  selectedAppointmentId?: string
}

export function TodayAppointments({ onSelectAppointment, selectedAppointmentId }: TodayAppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fechaActual, setFechaActual] = useState<string>("")

  // Función para formatear la fecha en español
  const formatFecha = (fecha: Date) => {
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
    
    return fecha.toLocaleDateString('es-ES', opciones)
  }

  // Establecer la fecha actual al cargar el componente
  useEffect(() => {
    const hoy = new Date()
    setFechaActual(formatFecha(hoy))
  }, [])

  const fetchCitas = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')

      if (!token) {
        setError('No se encontró token de autenticación')
        return
      }

      // Obtener fecha actual en formato YYYY-MM-DD
      const today = new Date()
      const todayFormatted = today.toISOString().split('T')[0]
      const currentHour = today.getHours() // Hora actual para debug

      // DEBUG: Verificar fecha y hora actual
      console.log('=== FILTRANDO CITAS POR FECHA ===')
      console.log('Fecha actual:', todayFormatted)
      console.log('Hora actual:', currentHour)

      const url = `${API_BASE_URL}scheduling/quotes/citas-sede`
      console.log('URL del API:', url)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data: ApiResponse = await response.json()

      // DEBUG COMPLETO
      console.log('=== DEBUG DETALLADO ===')
      console.log('Total citas del API (todas):', data.citas.length)

      // Filtrar solo citas del día de hoy
      const citasHoy = data.citas.filter(cita => {
        const citaFecha = cita.fecha.split('T')[0]

        // Si la fecha no es hoy, descartar
        if (citaFecha !== todayFormatted) {
          return false
        }

        return true
      })

      console.log('Citas del día de hoy:', citasHoy.length)

      // Mostrar información de cada cita filtrada
      citasHoy.forEach((cita, index) => {
        const hora = parseInt(cita.hora_inicio.split(':')[0])
        console.log(`Cita de hoy ${index + 1}:`, {
          id: cita._id,
          hora: cita.hora_inicio,
          hora_numerica: hora,
          cliente: cita.cliente_nombre,
          servicio: cita.servicio_nombre,
          estado: cita.estado,
          fecha: cita.fecha
        })
      })

      // Contar citas por hora
      const citasPorHora = citasHoy.reduce((acc, cita) => {
        const hora = cita.hora_inicio.split(':')[0]
        acc[hora] = (acc[hora] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      console.log('Citas de hoy por hora:', citasPorHora)
      console.log('=== FIN DEBUG ===')

      // Ordenar citas por hora
      citasHoy.sort((a, b) => {
        const toMinutes = (time: string) => {
          const [hours, minutes] = time.split(':').map(Number)
          return hours * 60 + minutes
        }
        return toMinutes(a.hora_inicio) - toMinutes(b.hora_inicio)
      })

      setAppointments(citasHoy)

    } catch (err) {
      console.error('Error en fetchCitas:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar citas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCitas()
  }, [])

  const formatTimeRange = (horaInicio: string, horaFin: string) => {
    return `${horaInicio}–${horaFin}`
  }

  const handleSelectAppointment = (appointment: Appointment) => {
    // Solo llama a la función para abrir el protocolo
    onSelectAppointment(appointment)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              Citas (Hoy)
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>{fechaActual || "Cargando..."}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">Cargando citas...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              Citas (Hoy)
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>{fechaActual}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
            <Button
              onClick={fetchCitas}
              variant="outline"
              className="mt-4"
            >
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (appointments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              Citas (Hoy)
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>{fechaActual}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No hay citas programadas para hoy</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-1">
          <CardTitle className="text-xl flex items-center gap-2">
            Citas (Hoy)
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>{fechaActual}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {appointments.map((appointment) => {
          const isSelected = appointment._id === selectedAppointmentId
          // Usar profesional_nombre si está disponible, sino estilista
          const nombreProfesional = appointment.profesional_nombre || appointment.estilista || "Profesional no asignado"
          // Usar servicio_nombre si está disponible, sino servicio
          const nombreServicio = appointment.servicio_nombre || appointment.servicio
          // Usar cliente_nombre si está disponible, sino cliente
          const nombreCliente = appointment.cliente_nombre || appointment.cliente

          return (
            <div
              key={appointment._id}
              className={`flex items-center justify-between rounded-lg border p-4 ${isSelected ? 'border-[oklch(0.55_0.25_280)] bg-[oklch(0.55_0.25_280)/0.1]' :
                'border-gray-200'
                }`}
            >
              <div className="flex-1">
                <p className="font-semibold">{nombreProfesional}</p>
                <p className="text-sm text-gray-600">
                  {formatTimeRange(appointment.hora_inicio, appointment.hora_fin)}
                </p>
                <p className="text-sm text-gray-500">{nombreServicio}</p>
                {nombreCliente && (
                  <p className="text-xs text-gray-400">Cliente: {nombreCliente}</p>
                )}
                {/* Mostrar información adicional si está disponible */}
                {appointment.valor_total !== undefined && (
                  <p className="text-xs text-gray-400">Valor: ${appointment.valor_total?.toLocaleString() || '0'}</p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">{appointment.hora_inicio}</span>

                <Button
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSelectAppointment(appointment)}
                  disabled={appointment.estado === 'cancelada' || appointment.estado === 'completada'}
                >
                  {appointment.estado === 'cancelada' ? 'Cancelada' :
                    appointment.estado === 'completada' ? 'Completada' : 'Facturar'}
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}