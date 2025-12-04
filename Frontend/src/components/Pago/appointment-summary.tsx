import { Card } from "../../components/ui/card"
import { User, DollarSign, Calendar } from "lucide-react"

interface AppointmentSummaryProps {
  appointment: {
    client: string
    service: string
    professional: string
    date: string
    duration: string
  }
}

export function AppointmentSummary({ appointment }: AppointmentSummaryProps) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Resumen de la cita</h2>
      </div>

      <div className="space-y-4">
        {/* Client */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <User className="h-5 w-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{appointment.client}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Profesional</div>
            <div className="font-medium">{appointment.professional}</div>
          </div>
        </div>

        {/* Service */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <DollarSign className="h-5 w-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{appointment.service}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">{appointment.date}</div>
            <div className="text-sm text-gray-600">{appointment.duration}</div>
          </div>
        </div>

        {/* Date */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <Calendar className="h-5 w-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{appointment.date}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2 border-t pt-4">
      </div>
    </Card>
  )
}
