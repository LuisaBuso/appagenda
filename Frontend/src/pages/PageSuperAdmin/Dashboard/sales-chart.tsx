"use client"

import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../../../components/ui/chart"

const salesData = [
  { month: "Jan", value: 0 },
  { month: "Feb", value: 0 },
  { month: "Mar", value: 0 },
  { month: "Apr", value: 0 },
  { month: "May", value: 0 },
]

export function SalesChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Ventas</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            value: {
              label: "Ventas",
              color: "oklch(0.65 0.25 280)",
            },
          }}
          className="h-[200px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.65 0.25 280)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.65 0.25 280)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6b7280", fontSize: 12 }}
                tickFormatter={(value) => `${value / 1000}k`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="oklch(0.65 0.25 280)"
                strokeWidth={2}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
