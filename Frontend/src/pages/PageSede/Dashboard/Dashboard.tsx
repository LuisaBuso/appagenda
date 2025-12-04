import { Sidebar } from "../../../components/Layout/Sidebar"; 
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { SalesChart } from "./sales-chart";
import { SalesDonutChart } from "./sales-donut-chart";
import { AgendaList } from "./agenda-list";
import { ClientIndicators } from "./client-indicators";

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <div className="border-b bg-white px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Dashboard</h1>

            <div className="flex gap-3">
              {/* Filtro: Semana/Mes/Año */}
              {/* <Select defaultValue="week">
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Semana</SelectItem>
                  <SelectItem value="month">Mes</SelectItem>
                  <SelectItem value="year">Año</SelectItem>
                </SelectContent>
              </Select> */}

              {/* Fecha */}
              {/* <Select defaultValue="march">
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Fecha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="march">1 - 7 de mar, 2024</SelectItem>
                  <SelectItem value="april">1 - 7 de abr, 2024</SelectItem>
                </SelectContent>
              </Select> */}

              {/* Filtro general */}
              {/* <Select defaultValue="all">
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filtro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="confirmed">Confirmadas</SelectItem>
                </SelectContent>
              </Select> */}
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex">
          <div className="flex-1 p-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Left Column */}
              <div className="flex flex-col gap-6">
                {/* Sales Total Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-normal text-gray-600">
                      Ventas totales
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">0 $</div>
                  </CardContent>
                </Card>

                <SalesDonutChart />
                <AgendaList />
              </div>

              {/* Right Column */}
              <div className="flex flex-col gap-6">
                <SalesChart />

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-normal text-gray-600">
                      Capacidad de ocupación
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">0%</div>
                  </CardContent>
                </Card>

                <ClientIndicators />
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
