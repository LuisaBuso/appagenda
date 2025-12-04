// src/components/AppointmentsList.tsx
"use client";

import { Check, Clock, PlayCircle } from "lucide-react";
import { Cita } from '../../../types/fichas';

interface AppointmentsListProps {
  appointments: Cita[];
  onCitaSelect: (cita: Cita) => void;
  citaSeleccionada: Cita | null;
  fechaFiltro?: string;
}

export function AppointmentsList({ appointments, onCitaSelect, citaSeleccionada, fechaFiltro }: AppointmentsListProps) {
  // Función para determinar el estado de la cita
  const getEstadoCita = (cita: Cita) => {
    const ahora = new Date();
    
    // Si la cita ya tiene un estado definido, usarlo
    if (cita.estado && cita.estado !== "pendiente") {
      switch (cita.estado.toLowerCase()) {
        case "en_curso":
        case "en curso":
          return { 
            estado: "En curso", 
            color: "text-green-600", 
            bgColor: "bg-green-50",
            icon: PlayCircle
          };
        case "completada":
        case "completado":
          return { 
            estado: "Completada", 
            color: "text-gray-600", 
            bgColor: "bg-gray-50",
            icon: Check
          };
        case "no_asistio":
        case "no asistio":
          return { 
            estado: "No asistió", 
            color: "text-red-600", 
            bgColor: "bg-red-50",
            icon: Clock
          };
      }
    }
    
    // Calcular estado basado en horario si no tiene estado
    try {
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
          color: "text-yellow-600", 
          bgColor: "bg-yellow-50",
          icon: Clock
        };
      } else if (ahora >= inicioCita && ahora <= finCita) {
        return { 
          estado: "En curso", 
          color: "text-green-600", 
          bgColor: "bg-green-50",
          icon: PlayCircle
        };
      } else {
        return { 
          estado: "Completada", 
          color: "text-gray-600", 
          bgColor: "bg-gray-50",
          icon: Check
        };
      }
    } catch (error) {
      return { 
        estado: "Pendiente", 
        color: "text-yellow-600", 
        bgColor: "bg-yellow-50",
        icon: Clock
      };
    }
  };

  if (appointments.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">
            {fechaFiltro 
              ? `No hay citas para el ${new Date(fechaFiltro).toLocaleDateString('es-ES')}`
              : "No hay citas programadas para hoy"
            }
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {fechaFiltro && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800 font-medium">
            Mostrando citas del {new Date(fechaFiltro).toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      )}
      
      {appointments.map((appointment) => {
        const estadoInfo = getEstadoCita(appointment);
        const IconComponent = estadoInfo.icon;
        const nombreCliente = appointment.cliente?.nombre || "Cliente";
        const apellidoCliente = appointment.cliente?.apellido || "";
        const nombreServicio = appointment.servicio?.nombre || "Servicio";

        return (
          <div
            key={appointment.cita_id}
            className={`rounded-lg border p-4 cursor-pointer transition-all ${
              citaSeleccionada?.cita_id === appointment.cita_id
                ? "border-[oklch(0.55_0.25_280)] bg-[oklch(0.98_0.05_280)] ring-2 ring-[oklch(0.55_0.25_280)] ring-opacity-20"
                : `border-gray-200 ${estadoInfo.bgColor} hover:bg-gray-50`
            }`}
            onClick={() => onCitaSelect(appointment)}
          >
            <h3 className="mb-1 font-semibold">{nombreServicio}</h3>
            <p className="text-sm text-gray-600">
              {nombreCliente} {apellidoCliente}
            </p>
            <p className="text-sm text-gray-500">
              {appointment.hora_inicio} - {appointment.hora_fin}
            </p>
            
            <div className="mt-3 flex items-center gap-2 text-sm">
              <IconComponent className={`h-4 w-4 ${estadoInfo.color}`} />
              <span className={estadoInfo.color}>{estadoInfo.estado}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}