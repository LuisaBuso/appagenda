"use client";

import { Clock, PlayCircle, Ban, Trash2, X, UserX, CheckCircle, Tag } from "lucide-react";
import { Cita } from '../../../types/fichas';
import { Bloqueo, deleteBloqueo } from '../../../components/Quotes/bloqueosApi';
import { useState } from "react";

interface AppointmentsListProps {
  appointments: Cita[];
  bloqueos: Bloqueo[];
  onCitaSelect: (cita: Cita) => void;
  citaSeleccionada: Cita | null;
  fechaFiltro?: string;
  onBloqueoEliminado?: () => void;
}

// 🔥 HELPER: Obtener nombres de servicios
const obtenerNombresServicios = (cita: any): string => {
  // Si tiene array de servicios (NUEVO FORMATO)
  if (cita.servicios && Array.isArray(cita.servicios) && cita.servicios.length > 0) {
    return cita.servicios.map((s: any) => s.nombre).join(', ');
  }
  
  // Si tiene servicio único (FORMATO ANTIGUO)
  if (cita.servicio?.nombre) {
    return cita.servicio.nombre;
  }
  
  return 'Sin servicio';
};

// 🔥 HELPER: Calcular precio total
const calcularPrecioTotal = (cita: any): number => {
  // Si tiene precio_total directo del backend
  if (cita.precio_total) {
    return cita.precio_total;
  }
  
  // Si tiene array de servicios
  if (cita.servicios && Array.isArray(cita.servicios) && cita.servicios.length > 0) {
    return cita.servicios.reduce((total: number, servicio: any) => {
      return total + (servicio.precio || 0);
    }, 0);
  }
  
  // Si tiene servicio único
  if (cita.servicio?.precio) {
    return cita.servicio.precio;
  }
  
  return 0;
};

export function AppointmentsList({ 
  appointments, 
  bloqueos, 
  onCitaSelect, 
  citaSeleccionada, 
  fechaFiltro,
  onBloqueoEliminado 
}: AppointmentsListProps) {
  const [bloqueoAEliminar, setBloqueoAEliminar] = useState<Bloqueo | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const getAuthToken = () => {
    return localStorage.getItem('access_token') || 
           sessionStorage.getItem('access_token') || 
           '';
  };

  const handleEliminarBloqueo = async (bloqueo: Bloqueo) => {
    if (!bloqueo._id) {
      console.error("No se puede eliminar: bloqueo sin ID");
      return;
    }

    const confirmar = window.confirm(
      `¿Eliminar bloqueo de ${bloqueo.hora_inicio} a ${bloqueo.hora_fin}?\nMotivo: ${bloqueo.motivo}`
    );

    if (!confirmar) return;

    try {
      setEliminando(true);
      const token = getAuthToken();
      
      if (!token) {
        alert("No hay token de autenticación");
        return;
      }

      await deleteBloqueo(bloqueo._id, token);
      
      if (onBloqueoEliminado) {
        onBloqueoEliminado();
      }

      alert("Bloqueo eliminado");
      
    } catch (error) {
      console.error("Error eliminando bloqueo:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Error desconocido"}`);
    } finally {
      setEliminando(false);
      setBloqueoAEliminar(null);
    }
  };

  const getEstadoCita = (cita: Cita) => {
    if (cita.estado) {
      const estadoNormalizado = cita.estado.toLowerCase().trim();
      
      switch (estadoNormalizado) {
        case "pendiente":
        case "reservada":
        case "reservada/pendiente":
        case "confirmada":
          return { 
            estado: cita.estado,
            color: "text-gray-700", 
            icon: Clock,
            borderColor: "border-gray-300"
          };
        
        case "en proceso":
        case "en_proceso":
        case "en curso":
          return { 
            estado: "En Proceso", 
            color: "text-gray-800", 
            icon: PlayCircle,
            borderColor: "border-gray-400"
          };
        
        case "cancelada":
        case "cancelado":
          return { 
            estado: "Cancelada", 
            color: "text-gray-500", 
            icon: X,
            borderColor: "border-gray-300"
          };
        
        case "no asistio":
        case "no_asistio":
        case "no asistió":
          return { 
            estado: "No Asistió", 
            color: "text-gray-500", 
            icon: UserX,
            borderColor: "border-gray-300"
          };
        
        case "finalizada":
        case "finalizado":
        case "completada":
        case "completado":
          return { 
            estado: "Finalizada", 
            color: "text-gray-700", 
            icon: CheckCircle,
            borderColor: "border-gray-400"
          };
      }
    }
    
    try {
      const ahora = new Date();
      const fechaCita = new Date(cita.fecha);
      
      const [horaInicio, minutoInicio] = cita.hora_inicio.split(':').map(Number);
      const [horaFin, minutoFin] = cita.hora_fin.split(':').map(Number);
      
      const inicioCita = new Date(fechaCita);
      inicioCita.setHours(horaInicio, minutoInicio, 0, 0);
      
      const finCita = new Date(fechaCita);
      finCita.setHours(horaFin, minutoFin, 0, 0);
      
      if (ahora < inicioCita) {
        return { 
          estado: "Pendiente", 
          color: "text-gray-700", 
          icon: Clock,
          borderColor: "border-gray-300"
        };
      } else if (ahora >= inicioCita && ahora <= finCita) {
        return { 
          estado: "En Proceso", 
          color: "text-gray-800", 
          icon: PlayCircle,
          borderColor: "border-gray-400"
        };
      } else {
        return { 
          estado: "Finalizada", 
          color: "text-gray-700", 
          icon: CheckCircle,
          borderColor: "border-gray-400"
        };
      }
    } catch (error) {
      return { 
        estado: "Pendiente", 
        color: "text-gray-700", 
        icon: Clock,
        borderColor: "border-gray-300"
      };
    }
  };

  const elementosCombinados = [
    ...appointments.map(cita => ({ 
      type: 'cita', 
      data: cita,
      horaInicio: cita.hora_inicio || "00:00",
      id: cita.cita_id 
    })),
    ...bloqueos.map(bloqueo => ({ 
      type: 'bloqueo', 
      data: bloqueo,
      horaInicio: bloqueo.hora_inicio || "00:00",
      id: bloqueo._id || `bloqueo-${bloqueo.hora_inicio}`
    }))
  ].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  if (elementosCombinados.length === 0) {
    return (
      <div className="space-y-2">
        <div className="rounded border border-gray-200 bg-white p-4 text-center">
          <div className="text-gray-300 mb-2">
            <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-medium text-gray-700 mb-1 text-sm">
            {fechaFiltro 
              ? `No hay citas ni bloqueos para esta fecha`
              : "No hay citas ni bloqueos programados"
            }
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {bloqueos.length > 0 && (
        <div className="text-xs text-gray-500 mb-2 px-1 flex items-center gap-1">
          <Ban className="h-3 w-3" />
          <span>{bloqueos.length} bloqueo(s)</span>
          <span className="text-gray-400 ml-auto text-[10px]">
            Click para eliminar
          </span>
        </div>
      )}

      {elementosCombinados.map((elemento) => {
        if (elemento.type === 'cita') {
          const appointment = elemento.data as Cita;
          const estadoInfo = getEstadoCita(appointment);
          const IconComponent = estadoInfo.icon;
          const nombreCliente = appointment.cliente?.nombre || "Cliente";
          const apellidoCliente = appointment.cliente?.apellido || "";
          
          // 🔥 CAMBIO CRÍTICO: Usar helper para obtener TODOS los servicios
          const nombresServicios = obtenerNombresServicios(appointment);
          const precioTotal = calcularPrecioTotal(appointment);
          
          // 🔥 Contar cantidad de servicios
          const cantidadServicios = appointment.servicios?.length || 1;

          return (
            <div
              key={appointment.cita_id}
              className={`rounded border p-3 cursor-pointer transition-all ${
                citaSeleccionada?.cita_id === appointment.cita_id
                  ? "border-gray-800 bg-gray-50"
                  : `border-gray-200 hover:border-gray-300 hover:bg-gray-50`
              }`}
              onClick={() => onCitaSelect(appointment)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    {/* 🔥 MOSTRAR SERVICIOS CON BADGE SI HAY MÚLTIPLES */}
                    <div className="flex items-center gap-1 flex-1">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                        {nombresServicios}
                      </h3>
                      {cantidadServicios > 1 && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-semibold shrink-0">
                          {cantidadServicios}
                        </span>
                      )}
                    </div>
                    
                    {precioTotal > 0 && (
                      <div className="text-xs text-gray-600 font-medium flex items-center gap-1 shrink-0 ml-2">
                        <Tag className="h-3 w-3" />
                        <span>${precioTotal.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-700 font-medium mb-1 truncate">
                    {nombreCliente} {apellidoCliente}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{appointment.hora_inicio} - {appointment.hora_fin}</span>
                    </div>
                    
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${estadoInfo.borderColor} ${estadoInfo.color}`}>
                      <IconComponent className="h-3 w-3" />
                      <span className="truncate max-w-[60px]">{estadoInfo.estado}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        } else {
          // BLOQUEO
          const bloqueo = elemento.data as Bloqueo;
          
          return (
            <div
              key={bloqueo._id}
              className="rounded border border-gray-300 bg-white p-3 hover:border-gray-400 transition-colors cursor-pointer group"
              onClick={() => handleEliminarBloqueo(bloqueo)}
              title="Click para eliminar este bloqueo"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ban className="h-3.5 w-3.5 text-gray-500 group-hover:text-gray-700" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-800">
                        {bloqueo.hora_inicio} - {bloqueo.hora_fin}
                      </span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-600 truncate max-w-[120px]">
                        {bloqueo.motivo}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                  <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                </div>
              </div>
              
              {eliminando && bloqueoAEliminar?._id === bloqueo._id && (
                <div className="mt-1 text-xs text-gray-600 flex items-center gap-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                  Eliminando...
                </div>
              )}
            </div>
          );
        }
      })}
    </div>
  );
}