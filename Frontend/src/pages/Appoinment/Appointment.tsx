import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, Calendar, Menu } from 'lucide-react';
import { Sidebar } from '../../components/Layout/Sidebar';
import Bloqueos from "../../components/Quotes/Bloqueos";
import AppointmentScheduler from "../../components/Quotes/AppointmentForm";
import Modal from "../../components/ui/modal";
import { Plus } from "lucide-react";
import { getCitas } from '../../components/Quotes/citasApi';

interface Appointment {
  id: string;
  title: string;
  profesional: string;
  start: string;
  end: string;
  color: string;
  tipo: string;
}

interface CitaFromAPI {
  _id: string;
  cliente_id: string;
  estilista_id: string;
  sede_id: string;
  servicio_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  notas?: string;
  cliente_nombre?: string;
  servicio_nombre?: string;
  estilista_nombre?: string;
}

const CalendarScheduler: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedLocation, setSelectedLocation] = useState('RF SURAMERICANA...');
  const [selectedProfessional, setSelectedProfessional] = useState('Todos');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [citas, setCitas] = useState<CitaFromAPI[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados para los modales
  const [showOptions, setShowOptions] = useState(false);
  const [showBloqueoModal, setShowBloqueoModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  const handleClose = () => {
    setShowAppointmentModal(false);
  };

  // Datos de profesionales (sin IDs quemados, solo nombres)
  const profesionales = [
    { name: 'DENAL GIRALDO', initials: 'DG' },
    { name: 'LAURA RIOS', initials: 'LR' },
    { name: 'Maicol enseñar puig...', initials: 'ME' },
    { name: 'SERGIO HEREDIA', initials: 'SH' },
    { name: 'LAURA GARZÓN', initials: 'LG' },
    { name: 'Maria José', initials: 'MJ' },
    { name: 'YALISCA', initials: 'Y' },
    { name: 'ANNY SANCHEZ W...', initials: 'AS' },
    { name: 'LINA GUTIÉRREZ', initials: 'LG' },
    { name: 'MARYORY GUTY', initials: 'MG' },
    { name: 'CATALINA VÁSQUEZ', initials: 'CV' },
    { name: 'CAMILA CORTES', initials: 'CC' },
    { name: 'DELCY GIRALDO', initials: 'DG' }
  ];

  // Función para cargar citas desde la API
  const cargarCitas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken'); // O tu método de autenticación
      
      // Parámetros para filtrar por sede y fecha si es necesario
      const params: any = {};
      if (selectedLocation !== 'Todos') {
        // Aquí deberías mapear el nombre de la sede a un ID real
        params.sede_id = obtenerSedeId(selectedLocation);
      }
      
      if (selectedProfessional !== 'Todos') {
        // Aquí deberías mapear el nombre del profesional a un ID real
        params.estilista_id = obtenerEstilistaId(selectedProfessional);
      }
      
      const response = await getCitas(params, token);
      setCitas(response.citas || []);
    } catch (error) {
      console.error('Error al cargar citas:', error);
      setCitas([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para convertir citas de la API al formato del calendario
  const convertirCitasParaCalendario = (citas: CitaFromAPI[]): Appointment[] => {
    return citas.map((cita, index) => {
      // Colores basados en el tipo de servicio o estado
      const colores = [
        'bg-pink-300', 'bg-cyan-300', 'bg-sky-400', 'bg-amber-400', 
        'bg-yellow-300', 'bg-green-300', 'bg-purple-300', 'bg-red-300'
      ];
      
      const color = colores[index % colores.length];
      
      return {
        id: cita._id,
        title: cita.cliente_nombre || `Cliente ${cita.cliente_id.substring(0, 8)}`,
        profesional: cita.estilista_nombre || `Estilista ${cita.estilista_id.substring(0, 8)}`,
        start: cita.hora_inicio,
        end: cita.hora_fin,
        color: color,
        tipo: cita.servicio_nombre || `Servicio ${cita.servicio_id.substring(0, 8)}`
      };
    });
  };

  // Función auxiliar para obtener ID de sede (implementar según tu lógica)
  const obtenerSedeId = (nombreSede: string): string => {
    const sedes: { [key: string]: string } = {
      'RF SURAMERICANA...': 'sede_suramericana',
      'RF CENTRO': 'sede_centro',
      'RF NORTE': 'sede_norte'
    };
    return sedes[nombreSede] || '';
  };

  // Función auxiliar para obtener ID de estilista (implementar según tu lógica)
  const obtenerEstilistaId = (_: string): string => {
    // Aquí deberías tener un mapeo de nombres a IDs
    // Por ahora retorna un string vacío para cargar todos
    return '';
  };

  // Cargar citas cuando cambien los filtros o la fecha
  useEffect(() => {
    cargarCitas();
  }, [selectedLocation, selectedProfessional, selectedDate]);

  const hours = Array.from({ length: 29 }, (_, i) => {
    const hour = Math.floor(i / 2) + 5;
    const minutes = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minutes}`;
  });

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDate = (date: Date) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = day === selectedDate.getDate() && 
                        currentMonth === selectedDate.getMonth() && 
                        currentYear === selectedDate.getFullYear();
      const isToday = day === new Date().getDate() && 
                     currentMonth === new Date().getMonth() && 
                     currentYear === new Date().getFullYear();
      
      days.push(
        <div
          key={day}
          className={`h-8 flex items-center justify-center text-sm cursor-pointer rounded-full ${
            isSelected ? 'bg-blue-600 text-white' : 
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

  // Función para manejar el clic en "Nueva reserva"
  const handleNuevaReserva = () => {
    setShowAppointmentModal(true);
    setShowOptions(false);
  };

  // Función para recargar citas después de crear una nueva
  const handleCitaCreada = () => {
    cargarCitas();
    handleClose();
  };

  // Convertir citas API a formato de calendario
  const appointments = convertirCitasParaCalendario(citas);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Nuestro Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 lg:ml-0 flex flex-col overflow-hidden">
        {/* Espacio para el header móvil */}
        <div className="lg:hidden h-16" />

        {/* Contenido del Calendario */}
        <div className="flex-1 flex">
          {/* Sidebar del Calendario (filtros y mini calendario) */}
          <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Selecciona la filial</h2>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                <option>RF SURAMERICANA...</option>
                <option>RF CENTRO</option>
                <option>RF NORTE</option>
              </select>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Ver agenda por:</span>
                <Menu className="w-4 h-4 text-gray-500" />
              </div>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                value={selectedProfessional}
                onChange={(e) => setSelectedProfessional(e.target.value)}
              >
                <option>Todos</option>
                <option>Profesional</option>
              </select>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Estado de la reserva</h3>
              <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                <option>Todas las reservas</option>
                <option>Pendientes</option>
                <option>Confirmadas</option>
                <option>Completadas</option>
                <option>Canceladas</option>
              </select>
            </div>

            <div className="mb-4">
              <button className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded px-3 py-2 text-sm hover:bg-gray-50">
                <Search className="w-4 h-4" />
                Búsqueda rápida de hora
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">
                  {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][currentMonth]} {currentYear}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      if (currentMonth === 0) {
                        setCurrentMonth(11);
                        setCurrentYear(currentYear - 1);
                      } else {
                        setCurrentMonth(currentMonth - 1);
                      }
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (currentMonth === 11) {
                        setCurrentMonth(0);
                        setCurrentYear(currentYear + 1);
                      } else {
                        setCurrentMonth(currentMonth + 1);
                      }
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-xs text-center mb-2">
                <div className="font-medium">Dom</div>
                <div className="font-medium">Lun</div>
                <div className="font-medium">Mar</div>
                <div className="font-medium">Mie</div>
                <div className="font-medium">Jue</div>
                <div className="font-medium">Vie</div>
                <div className="font-medium">Sab</div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-sm">
                {renderCalendar()}
              </div>
            </div>

            <div className="text-xs text-blue-600 cursor-pointer hover:underline">
              Ver todas las citas →
            </div>
          </div>

          {/* Grid del Calendario */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Calendar className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Menu className="w-5 h-5" />
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
                    <div className="text-gray-500 text-xs">@ {selectedLocation} SALON</div>
                  </div>
                </div>

                {/* Botón Nuevo */}
                <div className="relative">
                  <button
                    onClick={() => setShowOptions(!showOptions)}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo
                  </button>

                  {/* Menú desplegable */}
                  {showOptions && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg z-50">
                      <button
                        onClick={handleNuevaReserva}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-gray-700"
                      >
                        Nueva reserva
                      </button>
                      <button
                        onClick={() => {
                          setShowBloqueoModal(true);
                          setShowOptions(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-gray-700"
                      >
                        Nuevo bloqueo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Schedule Grid */}
            <div className="flex-1 overflow-auto relative">
              <div className="min-w-max h-full">
                {/* Professional Headers */}
                <div className="flex bg-white border-b border-gray-200 sticky top-0 z-20">
                  <div className="w-20 flex-shrink-0 bg-white"></div>
                  {profesionales.map((prof, idx) => (
                    <div
                      key={idx}
                      className="w-32 flex-shrink-0 p-2 border-l border-gray-200 text-center bg-white"
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-300 mx-auto mb-1 flex items-center justify-center text-sm font-semibold">
                        {prof.initials}
                      </div>
                      <div className="text-xs font-medium truncate">{prof.name}</div>
                    </div>
                  ))}
                </div>

                {/* Contenedor del grid con scroll */}
                <div className="relative overflow-auto h-[calc(100vh-200px)]">
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-gray-500">Cargando citas...</div>
                    </div>
                  ) : (
                    <div className="min-w-max">
                      {hours.map((hour, hourIndex) => (
                        <div key={hour} className="flex border-b border-gray-200">
                          {/* Columna de horas */}
                          <div className="w-20 flex-shrink-0 text-xs text-gray-500 p-2 text-right border-r border-gray-200 bg-white sticky left-0 z-10">
                            {hour}
                          </div>

                          {/* Celdas de los profesionales */}
                          {profesionales.map((_, profIdx) => (
                            <div
                              key={`${hour}-${profIdx}`}
                              className="w-32 flex-shrink-0 h-12 border-l border-gray-100 bg-white hover:bg-gray-50 cursor-pointer relative"
                            >
                              {/* Grid lines for 30-minute intervals */}
                              {hourIndex % 2 === 0 && (
                                <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200"></div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}

                      {/* Appointments from API */}
                      <div className="absolute top-0 left-20 right-0 bottom-0 pointer-events-none min-w-max">
                        {appointments.map((apt) => {
                          const profIndex = profesionales.findIndex(p => p.name === apt.profesional);
                          if (profIndex === -1) return null;

                          const [startHour, startMin] = apt.start.split(':').map(Number);
                          const [endHour, endMin] = apt.end.split(':').map(Number);

                          const startMinutesFrom5AM = (startHour - 5) * 60 + startMin;
                          const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
                          const top = (startMinutesFrom5AM / 30) * 24;
                          const height = (durationMinutes / 30) * 24;

                          return (
                            <div
                              key={apt.id}
                              className={`absolute ${apt.color} rounded p-2 text-xs pointer-events-auto cursor-pointer shadow-sm hover:shadow-md border border-gray-300 overflow-hidden`}
                              style={{
                                left: `${profIndex * 128}px`,
                                top: `${top}px`,
                                width: '124px',
                                height: `${height}px`,
                                minHeight: '24px'
                              }}
                            >
                              <div className="font-semibold truncate text-[10px] leading-tight">
                                {apt.title}
                              </div>
                              <div className="text-[9px] opacity-80 truncate mt-0.5">
                                {apt.tipo}
                              </div>
                              <div className="text-[9px] opacity-80 mt-0.5">
                                {apt.start} - {apt.end}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE BLOQUEO */}
      {showBloqueoModal && (
        <Modal
          open={showBloqueoModal}
          onClose={() => setShowBloqueoModal(false)}
          title="Bloqueo de horario"
        >
          <Bloqueos onClose={() => setShowBloqueoModal(false)} />
        </Modal>
      )}

      {/* MODAL DE NUEVA RESERVA */}
      {showAppointmentModal && (
        <Modal
          open={showAppointmentModal}
          onClose={handleClose}
          title="Nueva Reserva"
          className="w-full max-w-[1200px]"
        >
          <div className="h-[90vh] w-full p-2">
            <AppointmentScheduler
              sedeId={obtenerSedeId(selectedLocation)}
              onClose={handleCitaCreada}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CalendarScheduler;