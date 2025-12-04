// src/components/AttentionProtocol.tsx
"use client";

import { useState, useEffect } from "react"
import { ChevronRight, Calendar, FileText, Package, Save, CheckCircle } from "lucide-react"
import { Button } from "../../../components/ui/button"
import { FichaDiagnosticoRizotipo } from './fichas/FichaDiagnosticoRizotipo'
import { FichaColor } from './fichas/FichaColor'
import { FichaAsesoriaCorte } from './fichas/FichaAsesoriaCorte'
import { FichaCuidadoPostColor } from './fichas/FichaCuidadoPostColor'
import { FichaValoracionPruebaColor } from './fichas/FichaValoracionPruebaColor'

interface AttentionProtocolProps {
  citaSeleccionada?: any;
  onFechaSeleccionada?: (fecha: string) => void;
  onFinalizarServicio?: (citaId: string) => void;
}

type TipoFicha =
  | "DIAGNOSTICO_RIZOTIPO"
  | "COLOR"
  | "ASESORIA_CORTE"
  | "CUIDADO_POST_COLOR"
  | "VALORACION_PRUEBA_COLOR";

type VistaPrincipal = "fichas" | "productos" | "calendario";

// Interfaz para datos de fichas guardadas
interface FichaGuardada {
  tipo: TipoFicha;
  datos: any;
  fechaGuardado: string;
  citaId: string; 
}

export function AttentionProtocol({ citaSeleccionada, onFechaSeleccionada, onFinalizarServicio }: AttentionProtocolProps) {
  const [tipoFichaSeleccionada, setTipoFichaSeleccionada] = useState<TipoFicha | null>(null)
  const [vistaActual, setVistaActual] = useState<VistaPrincipal>("calendario")
  const [mesActual, setMesActual] = useState<Date>(new Date())
  const [fichasGuardadas, setFichasGuardadas] = useState<FichaGuardada[]>([])
  const [mostrarConfirmacionFinalizar, setMostrarConfirmacionFinalizar] = useState(false)

  // Cargar fichas guardadas del localStorage al inicializar
  useEffect(() => {
    const fichasGuardadasStorage = localStorage.getItem('fichasPendientes')
    if (fichasGuardadasStorage) {
      setFichasGuardadas(JSON.parse(fichasGuardadasStorage))
    }
  }, [])

  // Guardar fichas en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('fichasPendientes', JSON.stringify(fichasGuardadas))
  }, [fichasGuardadas])

  // Función para determinar el estado de la cita basado en la hora
  const getEstadoCita = (cita: any) => {
    const ahora = new Date();
    const fechaCita = new Date(cita.fecha);
    const [horaInicio, minutoInicio] = cita.hora_inicio.split(':').map(Number);
    const [horaFin, minutoFin] = cita.hora_fin.split(':').map(Number);

    const inicioCita = new Date(fechaCita);
    inicioCita.setHours(horaInicio, minutoInicio, 0, 0);

    const finCita = new Date(fechaCita);
    finCita.setHours(horaFin, minutoFin, 0, 0);

    if (ahora < inicioCita) {
      return { estado: "Pendiente", color: "bg-yellow-100 text-yellow-800" };
    } else if (ahora >= inicioCita && ahora <= finCita) {
      return { estado: "En curso", color: "bg-green-100 text-green-800" };
    } else {
      return { estado: "Completada", color: "bg-gray-100 text-gray-800" };
    }
  };

  // Función para obtener información de cualquier mes
  const getMonthInfo = (fecha: Date) => {
    const year = fecha.getFullYear();
    const month = fecha.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const now = new Date();
    const today = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return {
      year,
      monthName: monthNames[month],
      monthNumber: month,
      today,
      currentMonth,
      currentYear,
      totalDays: lastDay.getDate(),
      firstDayOffset: adjustedFirstDay
    };
  };

  // Navegar al mes anterior
  const mesAnterior = () => {
    setMesActual(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  // Navegar al mes siguiente
  const mesSiguiente = () => {
    setMesActual(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  // Manejar clic en un día del calendario
  const handleDiaClick = (dia: number) => {
    const { year, monthNumber } = getMonthInfo(mesActual);
    const mesFormateado = (monthNumber + 1).toString().padStart(2, '0');
    const diaFormateado = dia.toString().padStart(2, '0');
    const fechaFormateada = `${year}-${mesFormateado}-${diaFormateado}`;

    console.log('🟢 Fecha seleccionada:', fechaFormateada);

    if (onFechaSeleccionada) {
      onFechaSeleccionada(fechaFormateada);
    }
  };

  // Guardar ficha automáticamente
  const guardarFicha = (tipo: TipoFicha, datos: any) => {
    if (!citaSeleccionada) return;

    const nuevaFicha: FichaGuardada = {
      tipo,
      datos,
      fechaGuardado: new Date().toISOString(),
      citaId: citaSeleccionada.cita_id
    };

    // Verificar si ya existe una ficha de este tipo para esta cita
    const fichasActualizadas = fichasGuardadas.filter(
      ficha => !(ficha.citaId === citaSeleccionada.cita_id && ficha.tipo === tipo)
    );

    fichasActualizadas.push(nuevaFicha);
    setFichasGuardadas(fichasActualizadas);

    console.log('💾 Ficha guardada automáticamente:', { tipo, citaId: citaSeleccionada.cita_id });
  };

  // Cargar ficha guardada
  const cargarFichaGuardada = (tipo: TipoFicha) => {
    const fichaGuardada = fichasGuardadas.find(
      ficha => ficha.citaId === citaSeleccionada.cita_id && ficha.tipo === tipo
    );
    return fichaGuardada?.datos || null;
  };

  // Finalizar servicio
  const handleFinalizarServicio = () => {
    if (onFinalizarServicio && citaSeleccionada) {
      onFinalizarServicio(citaSeleccionada.cita_id);
      
      // Limpiar fichas guardadas de esta cita
      const fichasActualizadas = fichasGuardadas.filter(
        ficha => ficha.citaId !== citaSeleccionada.cita_id
      );
      setFichasGuardadas(fichasActualizadas);
      
      setMostrarConfirmacionFinalizar(false);
      setVistaActual("calendario");
    }
  };

  // Obtener fichas guardadas para la cita actual
  const getFichasGuardadasCitaActual = () => {
    if (!citaSeleccionada) return [];
    return fichasGuardadas.filter(ficha => ficha.citaId === citaSeleccionada.cita_id);
  };

  // Vista de selección de fichas
  const renderVistaFichas = () => {
    const estadoInfo = getEstadoCita(citaSeleccionada);
    const fichasCitaActual = getFichasGuardadasCitaActual();

    return (
      <div className="rounded-lg border bg-white p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold">Protocolo de atención</h2>
            <p className="text-gray-600 mt-1">
              {citaSeleccionada.cliente.nombre} - {citaSeleccionada.servicio.nombre}
            </p>
            <p className="text-sm text-gray-500">
              {citaSeleccionada.fecha} • {citaSeleccionada.hora_inicio} - {citaSeleccionada.hora_fin}
            </p>
          </div>
          <span className={`${estadoInfo.color} text-xs px-2 py-1 rounded-full`}>
            {estadoInfo.estado}
          </span>
        </div>

        {/* Mostrar fichas guardadas */}
        {fichasCitaActual.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
              <Save className="w-4 h-4 mr-2" />
              Fichas guardadas pendientes
            </h4>
            <div className="space-y-2">
              {fichasCitaActual.map((ficha, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="text-sm font-medium">
                    {ficha.tipo.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-gray-500">
                    Guardado: {new Date(ficha.fechaGuardado).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <h3 className="mb-4 font-semibold">Selecciona el tipo de ficha</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { value: "DIAGNOSTICO_RIZOTIPO", label: "Diagnóstico Rizotipo", color: "bg-purple-100 text-purple-800" },
              { value: "COLOR", label: "Ficha Color", color: "bg-pink-100 text-pink-800" },
              { value: "ASESORIA_CORTE", label: "Asesoría de Corte", color: "bg-blue-100 text-blue-800" },
              { value: "CUIDADO_POST_COLOR", label: "Cuidado Post Color", color: "bg-orange-100 text-orange-800" },
              { value: "VALORACION_PRUEBA_COLOR", label: "Valoración Color", color: "bg-green-100 text-green-800" },
            ].map((tipo) => {
              const tieneDatosGuardados = fichasCitaActual.some(f => f.tipo === tipo.value);
              
              return (
                <button
                  key={tipo.value}
                  className={`p-4 rounded-lg border text-left transition-all hover:shadow-md ${tipo.color} border-transparent relative`}
                  onClick={() => setTipoFichaSeleccionada(tipo.value as TipoFicha)}
                >
                  {tieneDatosGuardados && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                  <h4 className="font-semibold mb-1">{tipo.label}</h4>
                  <p className="text-sm opacity-80">
                    {tieneDatosGuardados ? 'Continuar ficha' : 'Crear ficha técnica'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setVistaActual("calendario")}
          >
            ← Volver
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => setMostrarConfirmacionFinalizar(true)}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Finalizar Servicio
          </Button>
        </div>
      </div>
    );
  };

  // Vista de productos (placeholder - puedes implementar la lógica de productos aquí)
  const renderVistaProductos = () => {
    const estadoInfo = getEstadoCita(citaSeleccionada);

    return (
      <div className="rounded-lg border bg-white p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold">Gestión de Productos</h2>
            <p className="text-gray-600 mt-1">
              {citaSeleccionada.cliente.nombre} - {citaSeleccionada.servicio.nombre}
            </p>
            <p className="text-sm text-gray-500">
              {citaSeleccionada.fecha} • {citaSeleccionada.hora_inicio} - {citaSeleccionada.hora_fin}
            </p>
          </div>
          <span className={`${estadoInfo.color} text-xs px-2 py-1 rounded-full`}>
            {estadoInfo.estado}
          </span>
        </div>

        <div className="mb-6">
          <h3 className="mb-4 font-semibold">Selecciona una opción</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-700 mb-2">Agregar Productos</h4>
              <p className="text-sm text-gray-500 mb-4">
                Seleccionar productos utilizados en el servicio
              </p>
              <Button className="w-full">
                Gestionar Productos
              </Button>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-700 mb-2">Inventario</h4>
              <p className="text-sm text-gray-500 mb-4">
                Consultar stock y disponibilidad
              </p>
              <Button variant="outline" className="w-full">
                Ver Inventario
              </Button>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setVistaActual("calendario")}
          >
            ← Volver
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => setMostrarConfirmacionFinalizar(true)}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Completar Servicio
          </Button>
        </div>
      </div>
    );
  };

  // Vista de calendario (cuando no hay cita seleccionada) - SIN "Protocolo de atención"
  const renderVistaCalendario = () => {
    const { year, monthName, monthNumber, today, currentMonth, currentYear, totalDays, firstDayOffset } = getMonthInfo(mesActual);
    
    const prevMonthDays = [];
    if (firstDayOffset > 0) {
      const prevMonthLastDay = new Date(year, monthNumber, 0).getDate();
      for (let i = firstDayOffset - 1; i >= 0; i--) {
        prevMonthDays.push(prevMonthLastDay - i);
      }
    }

    const nextMonthDays = Array.from({ length: (42 - firstDayOffset - totalDays) }, (_, i) => i + 1);
    const esMesActual = monthNumber === currentMonth && year === currentYear;

    return (
      <div className="rounded-lg border bg-white p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-[oklch(0.55_0.25_280)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Selecciona una fecha</h4>
          <p className="text-gray-600 mb-6">
            Elige un día para ver las citas de esa fecha
          </p>
          
          <div className="max-w-md mx-auto bg-gray-50 rounded-lg p-4 border">
            <div className="flex justify-between items-center mb-4">
              <button 
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                onClick={mesAnterior}
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <span className="font-semibold">{monthName} {year}</span>
              <button 
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                onClick={mesSiguiente}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 text-xs mb-2">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(dia => (
                <div key={dia} className="text-center text-gray-500 font-medium py-2">
                  {dia}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {prevMonthDays.map((dia, index) => (
                <div key={`prev-${index}`} className="text-center py-2 text-gray-300">
                  {dia}
                </div>
              ))}
              
              {Array.from({ length: totalDays }, (_, i) => i + 1).map(dia => {
                const esHoy = esMesActual && dia === today;
                
                return (
                  <div
                    key={dia}
                    className={`text-center py-2 rounded cursor-pointer transition-colors ${
                      esHoy
                        ? 'bg-[oklch(0.55_0.25_280)] text-white font-semibold shadow-md hover:bg-[oklch(0.50_0.25_280)]'
                        : 'bg-white text-gray-700 hover:bg-gray-200 border border-transparent hover:border-gray-300'
                    }`}
                    onClick={() => handleDiaClick(dia)}
                  >
                    {dia}
                  </div>
                );
              })}
              
              {nextMonthDays.map(dia => (
                <div key={`next-${dia}`} className="text-center py-2 text-gray-300">
                  {dia}
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-white rounded border text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Hoy es:</span>
                <span className="font-semibold">
                  {new Date().toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Haz clic en cualquier día para ver las citas
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Si hay cita seleccionada pero no se ha elegido una vista específica
  if (citaSeleccionada && vistaActual === "calendario") {
    const estadoInfo = getEstadoCita(citaSeleccionada);
    const fichasCitaActual = getFichasGuardadasCitaActual();

    return (
      <div className="rounded-lg border bg-white p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold">Protocolo de atención</h2>
            <p className="text-gray-600 mt-1">
              {citaSeleccionada.cliente.nombre} - {citaSeleccionada.servicio.nombre}
            </p>
            <p className="text-sm text-gray-500">
              {citaSeleccionada.fecha} • {citaSeleccionada.hora_inicio} - {citaSeleccionada.hora_fin}
            </p>
          </div>
          <span className={`${estadoInfo.color} text-xs px-2 py-1 rounded-full`}>
            {estadoInfo.estado}
          </span>
        </div>

        {/* Mostrar fichas guardadas */}
        {fichasCitaActual.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Save className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-800">
                  Tienes {fichasCitaActual.length} ficha(s) pendiente(s)
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setVistaActual("fichas")}
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h3 className="mb-4 font-semibold">¿Qué deseas hacer?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              className="p-6 rounded-lg border-2 border-blue-200 bg-blue-50 text-left transition-all hover:shadow-md hover:border-blue-300"
              onClick={() => setVistaActual("fichas")}
            >
              <div className="flex items-center mb-3">
                <FileText className="w-8 h-8 text-blue-600 mr-3" />
                <h4 className="font-semibold text-blue-800 text-lg">Gestionar Fichas</h4>
              </div>
              <p className="text-sm text-blue-600">
                Crear y gestionar fichas técnicas de diagnóstico y tratamiento
              </p>
            </button>

            <button
              className="p-6 rounded-lg border-2 border-green-200 bg-green-50 text-left transition-all hover:shadow-md hover:border-green-300"
              onClick={() => setVistaActual("productos")}
            >
              <div className="flex items-center mb-3">
                <Package className="w-8 h-8 text-green-600 mr-3" />
                <h4 className="font-semibold text-green-800 text-lg">Gestionar Productos</h4>
              </div>
              <p className="text-sm text-green-600">
                Seleccionar productos y gestionar inventario del servicio
              </p>
            </button>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setVistaActual("calendario")}
          >
            ← Volver al calendario
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => setMostrarConfirmacionFinalizar(true)}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Completar Servicio
          </Button>
        </div>
      </div>
    );
  }

  // Lógica de renderizado principal
  if (!citaSeleccionada) {
    return renderVistaCalendario();
  }

  if (citaSeleccionada && tipoFichaSeleccionada) {
    const datosGuardados = cargarFichaGuardada(tipoFichaSeleccionada);

    const fichaProps = {
      cita: citaSeleccionada,
      datosIniciales: datosGuardados,
      onGuardar: (datos: any) => guardarFicha(tipoFichaSeleccionada, datos),
      onSubmit: (data: any) => {
        console.log('Ficha completada:', data);
        
        // Eliminar ficha guardada al completarla
        const fichasActualizadas = fichasGuardadas.filter(
          ficha => !(ficha.citaId === citaSeleccionada.cita_id && ficha.tipo === tipoFichaSeleccionada)
        );
        setFichasGuardadas(fichasActualizadas);
        
        setTipoFichaSeleccionada(null);
        setVistaActual("fichas");
      },
      onCancelar: () => {
        setTipoFichaSeleccionada(null);
        setVistaActual("fichas");
      }
    };

    const renderFicha = () => {
      switch (tipoFichaSeleccionada) {
        case "DIAGNOSTICO_RIZOTIPO":
          return <FichaDiagnosticoRizotipo {...fichaProps} />;
        case "COLOR":
          return <FichaColor {...fichaProps} />;
        case "ASESORIA_CORTE":
          return <FichaAsesoriaCorte {...fichaProps} />;
        case "CUIDADO_POST_COLOR":
          return <FichaCuidadoPostColor {...fichaProps} />;
        case "VALORACION_PRUEBA_COLOR":
          return <FichaValoracionPruebaColor {...fichaProps} />;
        default:
          return null;
      }
    };

    return (
      <div>
        <div className="mb-4 flex items-center space-x-2">
          <button
            onClick={() => {
              setTipoFichaSeleccionada(null);
              setVistaActual("fichas");
            }}
            className="text-[oklch(0.55_0.25_280)] hover:underline text-sm"
          >
            ← Volver al selector de fichas
          </button>
        </div>
        {renderFicha()}
      </div>
    );
  }

  // Modal de confirmación para finalizar servicio
  if (mostrarConfirmacionFinalizar) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">¿Finalizar servicio?</h4>
          <p className="text-gray-600 mb-6">
            ¿Estás seguro de que deseas finalizar el servicio para {citaSeleccionada?.cliente.nombre}?
            {getFichasGuardadasCitaActual().length > 0 && (
              <span className="block mt-2 text-yellow-600 text-sm">
                Tienes {getFichasGuardadasCitaActual().length} ficha(s) pendiente(s) que se perderán.
              </span>
            )}
          </p>

          <div className="flex space-x-3 justify-center">
            <Button
              variant="outline"
              onClick={() => setMostrarConfirmacionFinalizar(false)}
            >
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleFinalizarServicio}
            >
              Sí, Completar Servicio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Renderizar vistas según la selección
  switch (vistaActual) {
    case "fichas":
      return renderVistaFichas();
    case "productos":
      return renderVistaProductos();
    default:
      return renderVistaCalendario();
  }
}