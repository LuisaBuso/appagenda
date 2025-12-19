// src/pages/Dashboard/client-indicators.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { Users, RefreshCw, AlertCircle, DollarSign } from "lucide-react"
import { formatMoney, extractNumericValue } from "./formatMoney"

interface KPI {
  valor: number | string;
  crecimiento: string;
}

interface ClientIndicatorsProps {
  nuevosClientes: KPI;
  tasaRecurrencia: KPI;
  tasaChurn: KPI;
  ticketPromedio: KPI;
}

export function ClientIndicators({ 
  nuevosClientes, 
  tasaRecurrencia, 
  tasaChurn, 
  ticketPromedio 
}: ClientIndicatorsProps) {
  
  const formatTicketPromedio = (value: number | string) => {
    if (typeof value === 'string') {
      const numericValue = extractNumericValue(value);
      return formatMoney(numericValue, 'USD', 'es-CO');
    }
    return formatMoney(value, 'USD', 'es-CO');
  };

  const indicators = [
    { 
      label: "Nuevos clientes", 
      value: nuevosClientes.valor, 
      change: nuevosClientes.crecimiento, 
      positive: (nuevosClientes.crecimiento || "").startsWith('+'),
      icon: Users,
      isCurrency: false
    },
    { 
      label: "Recurrencia", 
      value: tasaRecurrencia.valor, 
      change: tasaRecurrencia.crecimiento, 
      positive: (tasaRecurrencia.crecimiento || "").startsWith('+'),
      icon: RefreshCw,
      isCurrency: false
    },
    { 
      label: "Churn", 
      value: tasaChurn.valor, 
      change: tasaChurn.crecimiento, 
      positive: !(tasaChurn.crecimiento || "").startsWith('+'),
      icon: AlertCircle,
      isCurrency: false
    },
    { 
      label: "Ticket promedio", 
      value: ticketPromedio.valor, 
      change: ticketPromedio.crecimiento, 
      positive: (ticketPromedio.crecimiento || "").startsWith('+'),
      icon: DollarSign,
      isCurrency: true
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Indicadores Clave</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {indicators.map((indicator, index) => (
            <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <indicator.icon className="w-4 h-4" />
                {indicator.label}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {indicator.isCurrency 
                    ? formatTicketPromedio(indicator.value)
                    : indicator.value}
                </span>
                <span className={`text-xs ${indicator.positive ? "text-green-600" : "text-red-600"}`}>
                  {indicator.change}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}