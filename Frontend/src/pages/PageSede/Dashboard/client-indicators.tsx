import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"

const indicators = [
  { label: "Nuevos clientes", value: "0", change: "+0%", positive: true },
  { label: "Recurrencia", value: "0%", change: "+0%", positive: true },
  { label: "Churn", value: "0%", change: "+0%", positive: true },
  { label: "Ticket promedio", value: "0 €", change: "+0%", positive: true },
]

export function ClientIndicators() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Indicadores de clientes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {indicators.map((indicator, index) => (
            <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
              <span className="text-sm text-gray-600">{indicator.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{indicator.value}</span>
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
