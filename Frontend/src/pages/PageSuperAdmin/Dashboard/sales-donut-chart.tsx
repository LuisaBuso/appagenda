"use client"

import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
import { ChartContainer } from "../../../components/ui/chart"

const data = [
  { name: "Servicios", value: 0, color: "oklch(0.7 0.25 280)" },
  { name: "Productos", value: 0, color: "oklch(0.8 0.15 280)" },
]

export function SalesDonutChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Ventas por tipo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          <ChartContainer
            config={{
              servicios: { label: "Servicios", color: "oklch(0.7 0.25 280)" },
              productos: { label: "Productos", color: "oklch(0.8 0.15 280)" },
            }}
            className="h-[160px] w-[160px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={0} dataKey="value">
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "oklch(0.7 0.25 280)" }} />
              <div>
                <div className="text-sm font-medium">Servicios</div>
                <div className="text-sm text-gray-600">0 $</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "oklch(0.8 0.15 280)" }} />
              <div>
                <div className="text-sm font-medium">Productos</div>
                <div className="text-sm text-gray-600">0 $</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
