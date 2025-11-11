import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Menu } from 'lucide-react';
import { Sidebar } from '../../components/Layout/Sidebar';
import Bloqueos from "../../components/Quotes/Bloqueos";
import AppointmentScheduler from "../../components/Quotes/AppointmentForm";
import Modal from "../../components/ui/modal";
import { Plus } from "lucide-react";
import { getCitas } from '../../components/Quotes/citasApi';
import { getSedes, type Sede } from '../../components/Branch/sedesApi';
import { getEstilistas, type Estilista } from '../../components/Professionales/estilistasApi';
import { useAuth } from '../../components/Auth/AuthContext';

interface Appointment {
  id: string;
  title: string;
  profesional: string;
  start: string;
  end: string;
  color: string;
  tipo: string;
}

const CalendarScheduler: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSede, setSelectedSede] = useState<Sede | null>(null);
  const [selectedEstilista, setSelectedEstilista] = useState<Estilista | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const [sedes, setSedes] = useState<Sede[]>([]);
  const [estilistas, setEstilistas] = useState<Estilista[]>([]);
  const [citas, setCitas] = useState<any[]>([]);

  const [showOptions, setShowOptions] = useState(false);
  const [showBloqueoModal, setShowBloqueoModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ estilista: Estilista, hora: string } | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    if (user?.access_token) {
      cargarDatosIniciales();
    }
  }, [user]);

  // Cargar estilistas cuando cambie la sede
  useEffect(() => {
    if (selectedSede && user?.access_token) {
      cargarEstilistas(selectedSede._id);
    }
  }, [selectedSede, user]);

  // Cargar citas cuando cambien los filtros
  useEffect(() => {
    if (user?.access_token) {
      cargarCitas();
    }
  }, [selectedSede, selectedEstilista, user]);

  const cargarDatosIniciales = async () => {
    try {
      const [sedesData, citasData] = await Promise.all([
        getSedes(user!.access_token),
        getCitas({}, user!.access_token)
      ]);

      setSedes(sedesData);
      setCitas(citasData.citas || citasData || []);

      if (sedesData.length > 0) {
        setSelectedSede(sedesData[0]);
      }
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
    }
  };

  const cargarEstilistas = async (sedeId: string) => {
    try {
      const estilistasData = await getEstilistas(user!.access_token, sedeId);
      setEstilistas(estilistasData);
      setSelectedEstilista(null);
    } catch (error) {
      console.error('Error cargando estilistas:', error);
      setEstilistas([]);
    }
  };

  const cargarCitas = async () => {
    try {
      const params: any = {};
      if (selectedSede) params.sede_id = selectedSede._id;
      if (selectedEstilista) params.estilista_id = selectedEstilista.unique_id; // ← Usar unique_id aquí

      const response = await getCitas(params, user!.access_token);
      setCitas(response.citas || response || []);
    } catch (error) {
      console.error('Error al cargar citas:', error);
      setCitas([]);
    }
  };

  const handleClose = () => {
    setShowAppointmentModal(false);
    setShowBloqueoModal(false);
    setSelectedCell(null);
  };

  const handleCitaCreada = () => {
    cargarCitas();
    handleClose();
  };

  const handleBloqueoCreado = () => {
    cargarCitas();
    handleClose();
  };

  // Generar profesionales desde estilistas
  const profesionales = estilistas.map(estilista => ({
    name: estilista.nombre,
    initials: estilista.nombre.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
    estilista: estilista
  }));

  // Convertir citas API a formato de calendario
  const appointments: Appointment[] = citas.map((cita, index) => {
    const colores = ['bg-pink-300', 'bg-cyan-300', 'bg-sky-400', 'bg-amber-400', 'bg-yellow-300'];
    const color = colores[index % colores.length];

    return {
      id: cita._id || cita.id,
      title: cita.cliente_nombre || `Cliente ${cita.cliente_id?.substring(0, 8) || ''}`,
      profesional: cita.estilista_nombre || `Estilista ${cita.estilista_id?.substring(0, 8) || ''}`,
      start: cita.hora_inicio,
      end: cita.hora_fin,
      color: color,
      tipo: cita.servicio_nombre || `Servicio ${cita.servicio_id?.substring(0, 8) || ''}`
    };
  });

  // Verificar si una celda tiene cita
  const tieneCita = (estilistaNombre: string, hora: string) => {
    return appointments.some(apt =>
      apt.profesional === estilistaNombre &&
      apt.start === hora
    );
  };

  // Verificar si una celda está bloqueada
  const estaBloqueada = () => {
    return false;
  };

  // Manejar clic en celda
  const handleCellClick = (estilista: Estilista, hora: string) => {
    setSelectedCell({ estilista, hora });
    setShowOptions(true);
  };

  // Utilidades del calendario
  const hours = Array.from({ length: 29 }, (_, i) => {
    const hour = Math.floor(i / 2) + 5;
    const minutes = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minutes}`;
  });

  const formatDate = (date: Date) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  };

  const renderCalendarDays = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = day === selectedDate.getDate() && currentMonth === selectedDate.getMonth();
      const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth();

      days.push(
        <div
          key={day}
          className={`h-8 flex items-center justify-center text-sm cursor-pointer rounded-full ${isSelected ? 'bg-blue-600 text-white' :
              isToday ? 'bg-blue-100 text-blue-600' :
                'hover:bg-gray-200'
            }`}
          onClick={() => setSelectedDate(new Date(currentYear, currentMonth, day))}
        >
          {day}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 lg:ml-0 flex flex-col overflow-hidden">
        <div className="lg:hidden h-16" />

        <div className="flex-1 flex">
          {/* Sidebar de Filtros */}
          <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Selecciona la sede</h2>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                value={selectedSede?._id || ''}
                onChange={(e) => {
                  const sede = sedes.find(s => s._id === e.target.value);
                  setSelectedSede(sede || null);
                }}
              >
                <option value="">Todas las sedes</option>
                {sedes.map(sede => (
                  <option key={sede._id} value={sede._id}>
                    {sede.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Estilista</span>
                <Menu className="w-4 h-4 text-gray-500" />
              </div>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                value={selectedEstilista?.unique_id || ''}
                onChange={(e) => {
                  const estilista = estilistas.find(est => est.unique_id === e.target.value); {/* ← Y aquí */ }
                  setSelectedEstilista(estilista || null);
                }}
              >
                <option value="">Todos los estilistas</option>
                {estilistas.map(estilista => (
                  <option key={estilista.unique_id} value={estilista.unique_id}> {/* ← Y aquí */}
                    {estilista.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Mini Calendario */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">
                  {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][currentMonth]} {currentYear}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentMonth(prev => prev === 0 ? 11 : prev - 1)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(prev => prev === 11 ? 0 : prev + 1)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-xs text-center mb-2">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                  <div key={day} className="font-medium">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 text-sm">
                {renderCalendarDays()}
              </div>
            </div>
          </div>

          {/* Grid Principal */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Calendar className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const today = new Date();
                        setSelectedDate(today);
                        setCurrentMonth(today.getMonth());
                        setCurrentYear(today.getFullYear());
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-medium">Hoy</span>
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold">{formatDate(selectedDate)}</div>
                    <div className="text-gray-500 text-xs">
                      @ {selectedSede?.nombre || 'Todas las sedes'}
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowOptions(!showOptions)}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo
                  </button>

                  {showOptions && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg z-50">
                      <button
                        onClick={() => {
                          setShowAppointmentModal(true);
                          setShowOptions(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        Nueva reserva
                      </button>
                      <button
                        onClick={() => {
                          setShowBloqueoModal(true);
                          setShowOptions(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        Nuevo bloqueo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Grid de Horarios */}
            <div className="flex-1 overflow-auto">
              <div className="min-w-max">
                <div className="flex bg-white border-b border-gray-200 sticky top-0 z-20">
                  <div className="w-20 flex-shrink-0"></div>
                  {profesionales.map((prof, idx) => (
                    <div key={idx} className="w-32 flex-shrink-0 p-2 border-l border-gray-200 text-center">
                      <div className="w-10 h-10 rounded-full bg-gray-300 mx-auto mb-1 flex items-center justify-center text-sm font-semibold">
                        {prof.initials}
                      </div>
                      <div className="text-xs font-medium truncate">{prof.name}</div>
                    </div>
                  ))}
                </div>

                <div className="relative">
                  {hours.map((hour) => (
                    <div key={hour} className="flex border-b border-gray-200">
                      <div className="w-20 flex-shrink-0 text-xs text-gray-500 p-2 text-right border-r border-gray-200 bg-white sticky left-0 z-10">
                        {hour}
                      </div>
                      {profesionales.map((prof) => {
                        const tieneCitaEnEstaHora = tieneCita(prof.name, hour);
                        const estaBloqueadaEnEstaHora = estaBloqueada();

                        return (
                          <div
                            key={`${hour}-${prof.estilista.unique_id}`}
                            onClick={() => handleCellClick(prof.estilista, hour)}
                            className={`w-32 flex-shrink-0 h-12 border-l border-gray-100 cursor-pointer relative transition-colors ${tieneCitaEnEstaHora
                                ? 'bg-red-50 hover:bg-red-100'
                                : estaBloqueadaEnEstaHora
                                  ? 'bg-yellow-50 hover:bg-yellow-100'
                                  : 'bg-white hover:bg-blue-50'
                              }`}
                          >
                            {/* Indicador visual */}
                            {tieneCitaEnEstaHora && (
                              <div className="absolute inset-1 bg-red-200 rounded opacity-50"></div>
                            )}
                            {estaBloqueadaEnEstaHora && (
                              <div className="absolute inset-1 bg-yellow-200 rounded opacity-50"></div>
                            )}

                            {/* Botones de acción en celdas vacías */}
                            {!tieneCitaEnEstaHora && !estaBloqueadaEnEstaHora && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <div className="flex gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCell({ estilista: prof.estilista, hora: hour });
                                      setShowAppointmentModal(true);
                                    }}
                                    className="bg-green-500 text-white p-1 rounded text-xs hover:bg-green-600"
                                  >
                                    Reservar
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCell({ estilista: prof.estilista, hora: hour });
                                      setShowBloqueoModal(true);
                                    }}
                                    className="bg-orange-500 text-white p-1 rounded text-xs hover:bg-orange-600"
                                  >
                                    Bloquear
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* Citas existentes */}
                  <div className="absolute top-0 left-20 right-0 bottom-0 pointer-events-none">
                    {appointments.map((apt) => {
                      const profIndex = profesionales.findIndex(p => p.name === apt.profesional);
                      if (profIndex === -1) return null;

                      const [startHour, startMin] = apt.start.split(':').map(Number);
                      const [endHour, endMin] = apt.end.split(':').map(Number);

                      const startMinutesFrom5AM = (startHour - 5) * 60 + startMin;
                      const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
                      const top = (startMinutesFrom5AM / 30) * 24;
                      const height = Math.max((durationMinutes / 30) * 24, 24);

                      return (
                        <div
                          key={apt.id}
                          className={`absolute ${apt.color} rounded p-2 text-xs pointer-events-auto cursor-pointer shadow-sm border border-gray-300 overflow-hidden`}
                          style={{
                            left: `${profIndex * 128}px`,
                            top: `${top}px`,
                            width: '124px',
                            height: `${height}px`
                          }}
                        >
                          <div className="font-semibold truncate text-[10px]">{apt.title}</div>
                          <div className="text-[9px] opacity-80 truncate">{apt.tipo}</div>
                          <div className="text-[9px] opacity-80">{apt.start} - {apt.end}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Bloqueo */}
      {showBloqueoModal && (
        <Modal open={showBloqueoModal} onClose={handleClose} title="Bloqueo de horario">
          <Bloqueos
            onClose={handleBloqueoCreado}
            estilistaId={selectedCell?.estilista.unique_id}
            fecha={selectedDate.toISOString().split('T')[0]}
            horaInicio={selectedCell?.hora}
          />
        </Modal>
      )}

      {/* Modal de Nueva Reserva */}
      {showAppointmentModal && (
        <Modal
          open={showAppointmentModal}
          onClose={handleClose}
          title="Nueva Reserva"
          className="w-full max-w-[90vw] max-h-[95vh]" // más ancho y alto
        >
          <div className="h-[85vh] w-full p-6 overflow-auto bg-white rounded-xl shadow-md">
            <AppointmentScheduler
              sedeId={selectedSede?._id || ''}
              estilistaId={selectedCell?.estilista.unique_id}
              fechaSeleccionada={selectedDate.toISOString().split('T')[0]}
              horaSeleccionada={selectedCell?.hora}
              onClose={handleCitaCreada}
            />
          </div>
        </Modal>
      )}

    </div>
  );
};

export default CalendarScheduler;