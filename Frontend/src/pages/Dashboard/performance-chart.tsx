import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../components/ui/chart';

const chartData = [
  { day: "Mon", value: 5 },
  { day: "Tue", value: 7 },
  { day: "Wed", value: 6 },
  { day: "Thu", value: 15 },
  { day: "Fri", value: 10 },
  { day: "Sat", value: 18 },
  { day: "Sun", value: 17 },
];

const chartConfig = {
  value: {
    label: "Performance",
    color: "oklch(0.55 0.25 280)",
  },
};

export function PerformanceChart() {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-semibold">Performance</CardTitle>
        <p className="text-sm text-gray-500">Last 7 days</p>
      </CardHeader>

      {/* ✅ El ChartContainer es obligatorio para que funcione useChart() */}
      <CardContent className="flex-1 w-full h-[280px]">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <div className="w-full h-full">
            <ResponsiveContainer width="99%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.55 0.25 280)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.55 0.25 280)" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  domain={[0, 20]}
                  ticks={[0, 5, 10, 15, 20]}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="oklch(0.55 0.25 280)"
                  strokeWidth={2}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>
      </CardContent>
      </Card>
  );
}
