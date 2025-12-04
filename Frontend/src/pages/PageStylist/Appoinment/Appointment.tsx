// src/components/EstilistaDashboard.tsx
"use client";

import { useState } from "react";
import { useEstilistaData } from './useEstilistaData';
import { AppointmentsList } from './appointments-list';
import { StylistStats } from './stylist-stats';
import { AttentionProtocol } from './attention-protocol';
import { Sidebar } from '../../../components/Layout/Sidebar';

export default function VistaEstilistaPage() {
  const { 
    citas, 
    loading, 
    error 
  } = useEstilistaData();

  const [citaSeleccionada, setCitaSeleccionada] = useState<any>(null);
  const [fechaFiltro, setFechaFiltro] = useState<string>("");

  // Función CORREGIDA para formatear fecha a YYYY-MM-DD sin problemas de zona horaria
  const formatearFecha = (fecha: string | Date) => {
    const date = new Date(fecha);
    // Usar UTC para evitar problemas de zona horaria
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filtrar citas por fecha seleccionada (CORREGIDO)
  const citasFiltradas = fechaFiltro 
    ? citas.filter(cita => {
        // Convertir la fecha de la cita a formato YYYY-MM-DD
        const fechaCita = new Date(cita.fecha);
        const fechaCitaFormateada = formatearFecha(fechaCita);
        
        // Formatear la fecha del filtro
        const fechaFiltroDate = new Date(fechaFiltro + 'T00:00:00'); // Agregar tiempo para evitar zona horaria
        const fechaFiltroFormateada = formatearFecha(fechaFiltroDate);
        
        console.log('🔍 Comparando fechas:', {
          fechaCitaOriginal: cita.fecha,
          fechaCitaFormateada,
          fechaFiltroOriginal: fechaFiltro,
          fechaFiltroFormateada,
          coincide: fechaCitaFormateada === fechaFiltroFormateada,
          cliente: cita.cliente.nombre
        });
        
        return fechaCitaFormateada === fechaFiltroFormateada;
      })
    : citas.filter(cita => {
        // Para mostrar citas de hoy por defecto
        const fechaCita = new Date(cita.fecha);
        const fechaCitaFormateada = formatearFecha(fechaCita);
        const hoy = new Date();
        const hoyFormateado = formatearFecha(hoy);
        return fechaCitaFormateada === hoyFormateado;
      });

  console.log('📊 Resultado del filtro:', {
    fechaFiltro,
    totalCitas: citas.length,
    citasFiltradas: citasFiltradas.length,
    citasFiltradasDetalle: citasFiltradas.map(c => ({
      cliente: c.cliente.nombre,
      fecha: c.fecha,
      fechaFormateada: formatearFecha(c.fecha),
      servicio: c.servicio.nombre
    }))
  });

  // Calcular estadísticas para las citas filtradas
  const citasFiltradasCount = citasFiltradas.length;
  const serviciosCompletadosFiltrados = citasFiltradas.filter(cita => 
    cita.estado === 'Completado'
  ).length;
  const totalVentasFiltradas = citasFiltradas
    .filter(cita => cita.estado === 'Completado')
    .reduce((total, cita) => total + (cita.servicio.precio || 0), 0);

  // Manejar selección de fecha desde el calendario
  const handleFechaSeleccionada = (fecha: string) => {
    console.log('📅 Fecha recibida en dashboard:', fecha);
    console.log('📝 Fecha formateada para filtro:', formatearFecha(fecha));
    setFechaFiltro(fecha);
    setCitaSeleccionada(null); // Limpiar cita seleccionada al cambiar fecha
  };

  // Limpiar filtro de fecha (volver a mostrar citas de hoy)
  const limpiarFiltro = () => {
    console.log('🔄 Limpiando filtro, mostrando citas de hoy');
    setFechaFiltro("");
    setCitaSeleccionada(null);
  };

  if (loading) return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[oklch(0.55_0.25_280)] mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando citas...</p>
        </div>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">❌ Error</div>
          <p className="text-gray-700">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[oklch(0.55_0.25_280)] text-white rounded hover:bg-[oklch(0.50_0.25_280)]"
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-4 gap-6">
          <div className="rounded-lg border bg-white p-6">
            <h3 className="text-lg font-semibold mb-2">
              {fechaFiltro 
                ? `Citas del ${new Date(fechaFiltro + 'T00:00:00').toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}` 
                : "Citas de hoy"
              }
            </h3>
            {fechaFiltro && (
              <button 
                onClick={limpiarFiltro}
                className="text-xs text-[oklch(0.55_0.25_280)] hover:underline mt-2"
              >
                ← Ver citas de hoy
              </button>
            )}
          </div>
          <div className="rounded-lg border bg-white p-6">
            <p className="mb-2 text-sm text-gray-600">Citas {fechaFiltro ? "del día" : "de hoy"}</p>
            <p className="text-4xl font-bold text-[oklch(0.55_0.25_280)]">{citasFiltradasCount}</p>
          </div>
          <div className="rounded-lg border bg-white p-6">
            <p className="mb-2 text-sm text-gray-600">Servicios completados</p>
            <p className="text-4xl font-bold text-green-600">{serviciosCompletadosFiltrados}</p>
          </div>
          <div className="rounded-lg border bg-white p-6">
            <p className="mb-2 text-sm text-gray-600">Ventas {fechaFiltro ? "del día" : "de hoy"}</p>
            <p className="text-4xl font-bold text-blue-600">${totalVentasFiltradas.toLocaleString()}</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Appointments */}
          <div className="col-span-3">
            <AppointmentsList 
              appointments={citasFiltradas} 
              onCitaSelect={setCitaSeleccionada}
              citaSeleccionada={citaSeleccionada}
              fechaFiltro={fechaFiltro}
            />
          </div>

          {/* Center Column - Attention Protocol */}
          <div className="col-span-6">
            <AttentionProtocol 
              citaSeleccionada={citaSeleccionada}
              onFechaSeleccionada={handleFechaSeleccionada}
            />
          </div>

          {/* Right Column - Sales & Commissions */}
          <div className="col-span-3">
            <StylistStats 
              citasHoy={citasFiltradasCount}
              serviciosCompletadosHoy={serviciosCompletadosFiltrados}
              totalVentasHoy={totalVentasFiltradas}
            />
          </div>
        </div>
      </div>
    </div>
  )
}