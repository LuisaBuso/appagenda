import { Card, CardContent } from "../../../components/ui/card"

export function SalesMetrics() {
  const metrics = [
    {
      title: "Ventas",
      value: "0 $",
      showChange: true,
    },
    {
      title: "Servicios",
      value: "0 $",
    },
    {
      title: "Productos",
      value: "0 $",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {metrics.map((metric) => (
        <Card key={metric.title} className="border-gray-200">
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-gray-600">{metric.title}</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-bold">{metric.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
