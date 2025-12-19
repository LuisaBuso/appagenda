// src/pages/Dashboard/DashboardPage.tsx
"use client"

import { useState, useEffect } from "react";
import { Sidebar } from "../../../components/Layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { SalesChart } from "./sales-chart";
import { SalesDonutChart } from "./sales-donut-chart";
import { ClientIndicators } from "./client-indicators";
import { Button } from "../../../components/ui/button";
import { useAuth } from "../../../components/Auth/AuthContext";
import {
  getDashboard,
  getAvailablePeriods,
  getChurnClientes,
  getSedes,
  type DashboardResponse,
  type Sede
} from "./analyticsApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  BarChart3,
  Users,
  AlertCircle,
  Calendar,
  RefreshCw,
  ChevronDown,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Progress } from "../../../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Input } from "../../../components/ui/input";
import { formatMoney, extractNumericValue } from "./formatMoney";

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingSedes, setLoadingSedes] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [globalData, setGlobalData] = useState<DashboardResponse | null>(null);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("last_30_days");
  const [selectedSede, setSelectedSede] = useState<string>("global");
  const [showChurnList, setShowChurnList] = useState(false);
  const [churnData, setChurnData] = useState<any[]>([]);
  const [salesData, setSalesData] = useState([
    { month: "Ene", value: 0 },
    { month: "Feb", value: 0 },
    { month: "Mar", value: 0 },
    { month: "Abr", value: 0 },
    { month: "May", value: 0 },
  ]);
  const [donutData, setDonutData] = useState([
    { name: "Servicios", value: 0, color: "oklch(0.7 0.25 280)" },
    { name: "Productos", value: 0, color: "oklch(0.8 0.15 280)" },
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    if (isAuthenticated && user) {
      loadSedes();
      loadPeriods();
      loadGlobalData();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (selectedSede === "global") {
        loadGlobalData();
      } else {
        loadDashboardData();
      }
    }
  }, [selectedSede, selectedPeriod]);

  const loadSedes = async () => {
    try {
      setLoadingSedes(true);
      const sedesData = await getSedes(user!.access_token, true);
      setSedes(sedesData);
    } catch (error) {
      console.error("Error cargando sedes:", error);
    } finally {
      setLoadingSedes(false);
    }
  };

  const loadGlobalData = async () => {
    try {
      setLoading(true);
      const data = await getDashboard(user!.access_token, {
        period: selectedPeriod
      });
      setGlobalData(data);
      updateSalesData(data);
      updateDonutData(data);
    } catch (error) {
      console.error("Error cargando datos globales:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await getDashboard(user!.access_token, {
        period: selectedPeriod,
        sede_id: selectedSede
      });
      setDashboardData(data);

      loadChurnData();
      updateSalesData(data);
      updateDonutData(data);
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPeriods = async () => {
    try {
      const data = await getAvailablePeriods();
      setPeriods(data.periods);
    } catch (error) {
      console.error("Error cargando períodos:", error);
    }
  };

  const loadChurnData = async () => {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);

      const data = await getChurnClientes(user!.access_token, {
        sede_id: selectedSede,
        start_date: thirtyDaysAgo.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0]
      });
      setChurnData(data.clientes.slice(0, 5));
    } catch (error) {
      console.error("Error cargando churn:", error);
    }
  };

  const updateSalesData = (data: DashboardResponse) => {
    const ticketValue = parseFloat(String(data.kpis.ticket_promedio.valor).replace(/[^0-9.-]+/g, "")) || 0;
    const totalCitas = data.kpis.debug_info?.total_citas || 0;

    const newSalesData = [
      { month: "Ene", value: Math.round(totalCitas * ticketValue * 0.8) },
      { month: "Feb", value: Math.round(totalCitas * ticketValue * 0.9) },
      { month: "Mar", value: Math.round(totalCitas * ticketValue * 1.0) },
      { month: "Abr", value: Math.round(totalCitas * ticketValue * 1.1) },
      { month: "May", value: Math.round(totalCitas * ticketValue * 1.2) },
    ];
    setSalesData(newSalesData);
  };

  const updateDonutData = (data: DashboardResponse) => {
    const ticketValue = parseFloat(String(data.kpis.ticket_promedio.valor).replace(/[^0-9.-]+/g, "")) || 0;
    const totalCitas = data.kpis.debug_info?.total_citas || 0;
    const totalVentas = totalCitas * ticketValue;

    setDonutData([
      { name: "Servicios", value: Math.round(totalVentas * 0.8), color: "oklch(0.7 0.25 280)" },
      { name: "Productos", value: Math.round(totalVentas * 0.2), color: "oklch(0.8 0.15 280)" },
    ]);
  };

  const handleRefresh = () => {
    if (selectedSede === "global") {
      loadGlobalData();
    } else {
      loadDashboardData();
    }
  };

  const handleSedeChange = (sedeId: string) => {
    setSelectedSede(sedeId);
    setDashboardData(null);
    setChurnData([]);
    setSalesData([
      { month: "Ene", value: 0 },
      { month: "Feb", value: 0 },
      { month: "Mar", value: 0 },
      { month: "Abr", value: 0 },
      { month: "May", value: 0 },
    ]);
    setDonutData([
      { name: "Servicios", value: 0, color: "oklch(0.7 0.25 280)" },
      { name: "Productos", value: 0, color: "oklch(0.8 0.15 280)" },
    ]);
  };

  const formatCurrency = (value: number | string): string => {
    if (typeof value === 'string') {
      const numericValue = extractNumericValue(value);
      return formatMoney(numericValue, 'USD', 'es-CO');
    }
    return formatMoney(value, 'USD', 'es-CO');
  };

  const formatCurrencyShort = (value: number | string): string => {
    const numericValue = typeof value === 'string' ? extractNumericValue(value) : value;

    if (numericValue >= 1000000) {
      return `$${(numericValue / 1000000).toFixed(1)}M`;
    } else if (numericValue >= 1000) {
      return `$${(numericValue / 1000).toFixed(1)}K`;
    }
    return formatMoney(numericValue, 'USD', 'es-CO');
  };

  const getSedeInfo = (sedeId: string) => {
    return sedes.find(sede => sede.sede_id === sedeId);
  };

  const filteredSedes = sedes.filter(sede =>
    sede.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sede.direccion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCurrentData = () => {
    if (selectedSede === "global") {
      return globalData;
    }
    return dashboardData;
  };

  const currentData = getCurrentData();

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Acceso no autorizado</h2>
          <p className="mt-2 text-gray-600">Por favor inicia sesión para ver el dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <div className="border-b bg-white px-8 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Dashboard Analytics</h1>
                <p className="text-sm text-gray-600">
                  {selectedSede === "global"
                    ? 'Vista Global - Todas las sedes'
                    : `Sede: ${getSedeInfo(selectedSede)?.nombre || 'Seleccionada'}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[180px] bg-white border border-gray-300 hover:bg-gray-50">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {periods.map((period) => (
                    <SelectItem
                      key={period.id}
                      value={period.id}
                      className="hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        {period.recommended && (
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        )}
                        {period.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSede} onValueChange={handleSedeChange}>
                <SelectTrigger className="w-[220px] bg-white border border-gray-300 hover:bg-gray-50">
                  <Building2 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Seleccionar sede">
                    {selectedSede === "global"
                      ? "Vista Global"
                      : getSedeInfo(selectedSede)?.nombre || "Sede seleccionada"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="global" className="hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Vista Global</div>
                        <div className="text-xs text-gray-500">Todas las sedes</div>
                      </div>
                    </div>
                  </SelectItem>
                  {loadingSedes ? (
                    <SelectItem value="loading" disabled className="hover:bg-gray-50">
                      <div className="flex items-center justify-center py-2">
                        <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <span className="ml-2">Cargando sedes...</span>
                      </div>
                    </SelectItem>
                  ) : sedes.length === 0 ? (
                    <SelectItem value="empty" disabled className="hover:bg-gray-50">
                      <div className="text-center py-2 text-gray-500">
                        No hay sedes disponibles
                      </div>
                    </SelectItem>
                  ) : (
                    sedes.map((sede) => (
                      <SelectItem key={sede._id} value={sede.sede_id} className="hover:bg-gray-50">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${sede.activa ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          <div>
                            <div className="font-medium">{sede.nombre}</div>
                            <div className="text-xs text-gray-500">{sede.direccion.split(',')[0]}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Button
                variant="default"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b bg-white px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-gray-100 p-1 rounded-lg">
              <TabsTrigger
                value="dashboard"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 rounded-md px-4 py-2"
              >
                Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="sedes"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 rounded-md px-4 py-2"
              >
                Todas las Sedes
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="dashboard" className="m-0">
              {loading && !currentData ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando datos...</p>
                  </div>
                </div>
              ) : currentData ? (
                <div className="space-y-6">
                  {/* Vista Global o Sede Específica Header */}
                  {selectedSede === "global" ? (
                    <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-white">
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-purple-100 rounded-xl">
                              <Globe className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">
                                Vista Global
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                Resumen agregado de todas las sedes activas
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-purple-600 hover:bg-purple-700 text-white">
                            {sedes.length} Sedes Activas
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ) : getSedeInfo(selectedSede) ? (
                    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-white">
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-100 rounded-xl">
                              <Building2 className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">
                                {getSedeInfo(selectedSede)!.nombre}
                              </h3>
                              <div className="flex flex-wrap gap-4 mt-2">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <MapPin className="w-4 h-4" />
                                  {getSedeInfo(selectedSede)!.direccion}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Phone className="w-4 h-4" />
                                  {getSedeInfo(selectedSede)!.telefono}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Mail className="w-4 h-4" />
                                  {getSedeInfo(selectedSede)!.email}
                                </div>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSedeChange("global")}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300"
                          >
                            <Globe className="w-4 h-4 mr-2" />
                            Ver Vista Global
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}

                  {/* Data Quality & Warnings */}
                  {currentData.advertencias && currentData.advertencias.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-yellow-800 mb-2">Advertencias</h4>
                          <div className="space-y-1">
                            {currentData.advertencias.map((advertencia, index) => (
                              <div key={index} className="text-sm text-yellow-700">
                                {advertencia.mensaje}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Main Dashboard Grid */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Left Column */}
                    <div className="flex flex-col gap-6">
                      {/* Sales Total Card */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-normal text-gray-600 flex items-center justify-between">
                            <span>Ventas totales</span>
                            <Badge className={`
                              ${currentData.calidad_datos === 'BUENA' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                              ${currentData.calidad_datos === 'MEDIA' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : ''}
                              ${currentData.calidad_datos === 'BAJA' ? 'bg-orange-100 text-orange-800 border-orange-200' : ''}
                              border
                            `}>
                              {currentData.calidad_datos}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">
                            {formatCurrency(currentData.kpis.ticket_promedio.valor)}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Ticket promedio • {currentData.kpis.debug_info?.total_citas || 0} citas
                          </div>
                        </CardContent>
                      </Card>

                      {/* Updated SalesDonutChart */}
                      <SalesDonutChart
                        donutData={donutData}
                        formatCurrency={formatCurrency}
                      />

                      {/* Churn Card (solo para sede específica) */}
                      {selectedSede !== "global" && (
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base font-semibold">
                                Clientes en Riesgo (Churn)
                              </CardTitle>
                              <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border border-red-200">
                                {currentData.churn_actual || 0} clientes
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {churnData.length > 0 ? (
                                churnData.map((cliente, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 border border-red-200">
                                        <Users className="w-4 h-4 text-red-600" />
                                      </div>
                                      <div>
                                        <span className="font-medium">{cliente.nombre}</span>
                                        <div className="text-xs text-gray-500">{cliente.dias_inactivo} días inactivo</div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs font-medium text-red-600">Alto riesgo</div>
                                      <div className="text-xs text-gray-500">
                                        Última visita: {new Date(cliente.ultima_visita).toLocaleDateString()}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-4 text-gray-500">
                                  No hay clientes en riesgo de churn
                                </div>
                              )}
                              {churnData.length > 0 && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700"
                                  onClick={() => setShowChurnList(!showChurnList)}
                                >
                                  <ChevronDown className={`w-4 h-4 mr-2 transition-transform ${showChurnList ? 'rotate-180' : ''}`} />
                                  {showChurnList ? 'Ocultar detalles' : 'Ver todos'}
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Right Column */}
                    <div className="flex flex-col gap-6">
                      {/* Updated SalesChart */}
                      <SalesChart
                        salesData={salesData}
                        formatCurrency={formatCurrencyShort}
                      />

                      {/* Capacity Card */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-normal text-gray-600">
                            Capacidad de ocupación
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">
                            {currentData.kpis.debug_info?.total_citas
                              ? Math.round((currentData.kpis.debug_info.total_citas / 100) * 100)
                              : 0}%
                          </div>
                          <div className="mt-4">
                            <Progress
                              value={currentData.kpis.debug_info?.total_citas
                                ? Math.round((currentData.kpis.debug_info.total_citas / 100) * 100)
                                : 0}
                              className="h-2"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-2">
                              <span>Baja ocupación</span>
                              <span>Alta ocupación</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Updated ClientIndicators */}
                      <ClientIndicators
                        nuevosClientes={currentData.kpis.nuevos_clientes}
                        tasaRecurrencia={currentData.kpis.tasa_recurrencia}
                        tasaChurn={currentData.kpis.tasa_churn}
                        ticketPromedio={currentData.kpis.ticket_promedio}
                      />
                    </div>
                  </div>

                  {/* Detailed Churn List Modal (solo para sede específica) */}
                  {showChurnList && churnData.length > 0 && selectedSede !== "global" && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
                        <div className="p-6 border-b">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold">Clientes en Riesgo de Abandono - {getSedeInfo(selectedSede)?.nombre}</h3>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => setShowChurnList(false)}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300"
                            >
                              Cerrar
                            </Button>
                          </div>
                          <p className="text-gray-600 mt-2">
                            {currentData.churn_actual || 0} clientes inactivos por más de 60 días
                          </p>
                        </div>
                        <div className="overflow-y-auto max-h-[60vh]">
                          <Table>
                            <TableHeader className="bg-gray-50">
                              <TableRow>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Contacto</TableHead>
                                <TableHead>Última Visita</TableHead>
                                <TableHead>Días Inactivo</TableHead>
                                <TableHead>Riesgo</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {churnData.map((cliente) => (
                                <TableRow key={cliente.cliente_id} className="hover:bg-gray-50">
                                  <TableCell>
                                    <div className="font-medium">{cliente.nombre}</div>
                                    <div className="text-xs text-gray-500">Cliente</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">{cliente.correo}</div>
                                    <div className="text-xs text-gray-500">{cliente.telefono}</div>
                                  </TableCell>
                                  <TableCell>
                                    {new Date(cliente.ultima_visita).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    <div className={`font-semibold ${cliente.dias_inactivo > 90 ? 'text-red-600' :
                                        cliente.dias_inactivo > 60 ? 'text-orange-500' : 'text-yellow-500'
                                      }`}>
                                      {cliente.dias_inactivo} días
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={
                                      cliente.dias_inactivo > 90 ? 'bg-red-100 text-red-800 border-red-200' :
                                        cliente.dias_inactivo > 60 ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                          'bg-yellow-100 text-yellow-800 border-yellow-200'
                                    }>
                                      {cliente.dias_inactivo > 90 ? 'Alto' :
                                        cliente.dias_inactivo > 60 ? 'Medio' : 'Bajo'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay datos disponibles</h3>
                  <p className="text-gray-500 mb-4">Selecciona un período o verifica la conexión.</p>
                  <Button
                    onClick={handleRefresh}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Recargar datos
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Pestaña de Todas las Sedes */}
            <TabsContent value="sedes" className="m-0">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">Todas las Sedes</CardTitle>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="relative flex-1 max-w-md">
                        <Input
                          placeholder="Buscar sede por nombre o dirección..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                        <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 border border-blue-200 px-4 py-2">
                        {filteredSedes.length} sedes
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingSedes ? (
                      <div className="text-center py-12">
                        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Cargando sedes...</p>
                      </div>
                    ) : filteredSedes.length === 0 ? (
                      <div className="text-center py-12">
                        <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No se encontraron sedes</h3>
                        <p className="text-gray-500">Intenta con otros términos de búsqueda.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredSedes.map((sede) => (
                          <Card
                            key={sede._id}
                            className={`border hover:border-blue-300 transition-all cursor-pointer hover:shadow-lg ${selectedSede === sede.sede_id ? 'border-blue-500 bg-blue-50' : ''
                              }`}
                            onClick={() => {
                              handleSedeChange(sede.sede_id);
                              setActiveTab("dashboard");
                            }}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-100 rounded-lg border border-blue-200">
                                    <Building2 className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-gray-900">{sede.nombre}</h4>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {sede.direccion.split(',')[0]}
                                    </div>
                                  </div>
                                </div>
                                {sede.activa ? (
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border border-green-200">
                                    Activa
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-800 border border-gray-300">Inactiva</Badge>
                                )}
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-start gap-2 text-sm text-gray-600">
                                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-2">{sede.direccion}</span>
                                </div>

                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Phone className="w-4 h-4" />
                                  {sede.telefono}
                                </div>

                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Mail className="w-4 h-4" />
                                  <span className="truncate">{sede.email}</span>
                                </div>
                              </div>

                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="text-xs text-gray-500">
                                  Creada: {new Date(sede.fecha_creacion).toLocaleDateString()}
                                </div>
                              </div>

                              {selectedSede === sede.sede_id && (
                                <div className="mt-4 pt-4 border-t border-blue-200">
                                  <div className="text-center">
                                    <Badge className="bg-blue-600 hover:bg-blue-700 text-white">
                                      Sede seleccionada
                                    </Badge>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Haz clic en "Dashboard" para ver métricas
                                    </p>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                {/* Sede Stats Summary */}
                {sedes.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Resumen de Sedes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-blue-600">{sedes.length}</div>
                          <div className="text-sm text-gray-600">Total Sedes</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {sedes.filter(s => s.activa).length}
                          </div>
                          <div className="text-sm text-gray-600">Sedes Activas</div>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-yellow-600">
                            {sedes.filter(s => !s.activa).length}
                          </div>
                          <div className="text-sm text-gray-600">Sedes Inactivas</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {new Set(sedes.map(s => s.zona_horaria)).size}
                          </div>
                          <div className="text-sm text-gray-600">Zonas Horarias</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}