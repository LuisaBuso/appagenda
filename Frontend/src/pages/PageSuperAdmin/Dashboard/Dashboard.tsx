import { Sidebar } from "../../../components/Layout/Sidebar"; 
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { SalesChart } from "./sales-chart";
import { SalesDonutChart } from "./sales-donut-chart";
import { AgendaList } from "./agenda-list";
import { ClientIndicators } from "./client-indicators";
import { Button } from "../../../components/ui/button";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {

  const navigate = useNavigate();

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

          {/* Right Settings Panel */}
          <div className="w-72 border-l bg-white p-6">
            <h2 className="mb-6 text-xl font-bold">Configuración</h2>

            <div className="space-y-2">
              {/* ---- BOTÓN SEDES ---- */}
              <button
                onClick={() => navigate("/superadmin/sedes")}
                className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-gray-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded bg-purple-100 text-purple-600">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <span className="font-medium">Sedes</span>
              </button>

              {/* ---- BOTÓN ESTILISTAS ---- */}
              <button
                onClick={() => navigate("/superadmin/stylists")}
                className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-gray-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded bg-purple-100 text-purple-600">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <span className="font-medium">Estilistas</span>
              </button>

              <button className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-gray-50">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-purple-100 text-purple-600">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <span className="font-medium">Comisiones</span>
              </button>
            </div>

            <Button className="mt-6 w-full bg-purple-600 hover:bg-purple-700">
              Guardar
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
