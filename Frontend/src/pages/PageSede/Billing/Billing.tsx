// app/(protected)/admin-sede/ventas/Billing.tsx
"use client"

import { useState } from "react"
import { Sidebar } from "../../../components/Layout/Sidebar"
import { SalesMetrics } from "./sales-metrics"
import { TodayAppointments } from "./today-appointments"
import { ServiceProtocol } from "./service-protocol"
// Asegúrate de que esta interfaz coincida con la de TodayAppointments
interface Appointment {
  _id: string
  cliente: string
  cliente_nombre?: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  servicio: string
  servicio_nombre?: string
  estilista?: string
  profesional_nombre?: string
  estado: string
  sede_id: string
  valor_total?: number
  estado_pago?: string
}

export default function Billing() {
  // Estado para la cita seleccionada
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  const handleSelectAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
  }

  const handleCloseProtocol = () => {
    setSelectedAppointment(null)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold">Ventas</h1>
            <div className="flex items-center gap-2">
            </div>
          </div>

          {/* Sales Metrics */}
          <SalesMetrics />

          {/* Main Content Grid */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-6">
              <TodayAppointments 
                onSelectAppointment={handleSelectAppointment}
                selectedAppointmentId={selectedAppointment?._id}
              />
            </div>

            {/* Right Column - Muestra el protocolo de la cita seleccionada */}
            <div>
              <ServiceProtocol 
                selectedAppointment={selectedAppointment}
                onClose={handleCloseProtocol}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}