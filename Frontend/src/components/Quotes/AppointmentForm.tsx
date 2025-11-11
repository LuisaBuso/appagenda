import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';
import { crearCita } from '../Quotes/citasApi';
import { useAuth } from '../../components/Auth/AuthContext';
import { getEstilistas, Estilista } from '../../components/Professionales/estilistasApi';
import { getServiciosEstilista, Servicio } from '../../components/Quotes/serviciosApi';

// Interfaces unificadas
interface Service {
    id: string;
    name: string;
    duration: number;
    price: number;
}

interface AppointmentSchedulerProps {
  onClose: () => void;
  sedeId: string;
  estilistaId?: string;
  fechaSeleccionada?: string;
  horaSeleccionada?: string;
}

const AppointmentScheduler: React.FC<AppointmentSchedulerProps> = ({ onClose, sedeId, estilistaId }) => {
    const { user } = useAuth();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState('10:00');
    const [showTimeSelector, setShowTimeSelector] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clientSearch, setClientSearch] = useState('');
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedStylist, setSelectedStylist] = useState<Estilista | null>(null);
    const [notes, setNotes] = useState('');

    // Estados para datos dinámicos
    const [estilistas, setEstilistas] = useState<Estilista[]>([]);
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [loadingEstilistas, setLoadingEstilistas] = useState(false);
    const [loadingServicios, setLoadingServicios] = useState(false);

    // Cargar estilistas de la sede
    useEffect(() => {
        const cargarEstilistas = async () => {
            if (!user?.access_token) return;
            
            setLoadingEstilistas(true);
            try {
                const estilistasData = await getEstilistas(user.access_token, sedeId);
                setEstilistas(estilistasData);
                
                // Si hay un estilista pre-seleccionado, seleccionarlo
                if (estilistaId) {
                    const estilistaPreseleccionado = estilistasData.find(e => e._id === estilistaId);
                    if (estilistaPreseleccionado) {
                        setSelectedStylist(estilistaPreseleccionado);
                    }
                }
            } catch (error) {
                console.error("Error al cargar estilistas:", error);
                setError("Error al cargar los estilistas");
            } finally {
                setLoadingEstilistas(false);
            }
        };

        cargarEstilistas();
    }, [sedeId, estilistaId, user?.access_token]);

    // Cargar servicios cuando se selecciona un estilista
    useEffect(() => {
        const cargarServiciosEstilista = async () => {
            if (!selectedStylist || !user?.access_token) {
                setServicios([]);
                return;
            }

            setLoadingServicios(true);
            try {
                const serviciosData = await getServiciosEstilista(selectedStylist._id, user.access_token);
                setServicios(serviciosData);
                setSelectedService(null); // Resetear servicio seleccionado
            } catch (error) {
                console.error("Error al cargar servicios:", error);
                setError("Error al cargar los servicios del estilista");
                // En caso de error, usar servicios vacíos
                setServicios([]);
            } finally {
                setLoadingServicios(false);
            }
        };

        cargarServiciosEstilista();
    }, [selectedStylist, user?.access_token]);

    // Función para convertir Servicio API a Service del componente
    const convertirServicio = (servicio: Servicio): Service => ({
        id: servicio._id,
        name: servicio.nombre,
        duration: servicio.duracion,
        price: servicio.precio
    });

    // Datos de ejemplo como fallback
    const serviciosEjemplo: Service[] = [
        { id: 'servicio_1', name: 'Corte Básico', duration: 30, price: 25 },
        { id: 'servicio_2', name: 'Servicio de Color', duration: 120, price: 85 },
        { id: 'servicio_3', name: 'Reflejos', duration: 90, price: 120 },
        { id: 'servicio_4', name: 'Peinado', duration: 45, price: 35 },
    ];

    // Servicios a mostrar (convertir dinámicos o usar ejemplo)
    const serviciosAMostrar = servicios.length > 0 
        ? servicios.map(convertirServicio) 
        : serviciosEjemplo;

    const getWeekDays = (date: Date) => {
        const week = [];
        const current = new Date(date);
        const day = current.getDay();
        const diff = current.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(current.setDate(diff));

        for (let i = 0; i < 7; i++) {
            const weekDate = new Date(monday);
            weekDate.setDate(monday.getDate() + i);
            week.push(weekDate);
        }
        return week;
    };

    const formatDateHeader = (date: Date) => {
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return {
            day: days[date.getDay()],
            date: date.getDate(),
            month: months[date.getMonth()]
        };
    };

    const generateTimeSlots = (): { time: string; available: boolean }[] => {
        const slots: { time: string; available: boolean }[] = [];
        for (let hour = 5; hour <= 19; hour++) {
            for (let min = 0; min < 60; min += 30) {
                if (hour === 19 && min > 30) break;
                slots.push({
                    time: `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`,
                    available: true
                });
            }
        }
        return slots;
    };

    const generateCalendarTimeSlots = (): { time: string; available: boolean }[] => {
        const slots: { time: string; available: boolean }[] = [];
        for (let hour = 5; hour <= 19; hour += 2) {
            slots.push({
                time: `${hour.toString().padStart(2, '0')}:00`,
                available: true
            });
        }
        if (19 % 2 !== 0) {
            slots.push({ time: '19:00', available: true });
        }
        return slots;
    };

    const handlePreviousWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const calculateEndTime = (startTime: string, duration: number): string => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + duration;
        const endHours = Math.floor(totalMinutes / 60);
        const endMinutes = totalMinutes % 60;
        return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    };

    const handleScheduleAppointment = async () => {
        if (!selectedService || !selectedStylist || !selectedDate) {
            setError('Por favor completa todos los campos requeridos');
            return;
        }

        if (!user?.access_token) {
            setError('No hay sesión activa');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const endTime = calculateEndTime(selectedTime, selectedService.duration);

            const fechaCita = new Date(selectedDate!);
            const [hours, minutes] = selectedTime.split(':').map(Number);
            fechaCita.setHours(hours, minutes, 0, 0);

            const citaData = {
                sede_id: sedeId,
                cliente_id: 'nuevo_cliente',
                estilista_id: selectedStylist._id,
                servicio_id: selectedService.id,
                fecha: fechaCita.toISOString(),
                hora_inicio: selectedTime + ':00',
                hora_fin: endTime + ':00',
                estado: 'pendiente'
            };

            console.log("Enviando datos al backend:", citaData);

            const resultado = await crearCita(citaData, user.access_token);

            console.log("Cita creada exitosamente:", resultado);

            setClientSearch('');
            setSelectedService(null);
            setSelectedStylist(null);
            setNotes('');
            onClose();

        } catch (error: any) {
            console.error("Error al crear cita:", error);
            setError(error.message || "Error al crear la cita");
        } finally {
            setLoading(false);
        }
    };

    const weekDays = getWeekDays(currentDate);
    const calendarTimeSlots = generateCalendarTimeSlots();
    const allTimeSlots = generateTimeSlots();

    return (
        <div className="w-full max-w-6xl mx-auto bg-white rounded-lg shadow-sm">
            <div className="flex flex-col lg:flex-row">
                {/* Panel lateral - Formulario de reserva */}
                <div className="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 p-6">
                    <h2 className="text-xl font-semibold mb-6">Nueva Reserva</h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Buscar cliente..."
                                    value={clientSearch}
                                    onChange={(e) => setClientSearch(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Estilista *</label>
                            <select
                                value={selectedStylist?._id || ''}
                                onChange={(e) => {
                                    const estilista = estilistas.find(s => s._id === e.target.value) || null;
                                    setSelectedStylist(estilista);
                                }}
                                disabled={loadingEstilistas}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white disabled:bg-gray-100"
                            >
                                <option value="">Seleccionar estilista...</option>
                                {loadingEstilistas ? (
                                    <option value="">Cargando estilistas...</option>
                                ) : (
                                    estilistas.map(stylist => (
                                        <option key={stylist._id} value={stylist._id}>
                                            {stylist.nombre}
                                        </option>
                                    ))
                                )}
                            </select>
                            {estilistas.length === 0 && !loadingEstilistas && (
                                <div className="mt-1 text-xs text-gray-500">
                                    No hay estilistas disponibles en esta sede
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Servicio *</label>
                            <select
                                value={selectedService?.id || ''}
                                onChange={(e) => setSelectedService(serviciosAMostrar.find(s => s.id === e.target.value) || null)}
                                disabled={!selectedStylist || loadingServicios}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white disabled:bg-gray-100"
                            >
                                <option value="">
                                    {!selectedStylist 
                                        ? 'Selecciona un estilista primero' 
                                        : loadingServicios 
                                        ? 'Cargando servicios...' 
                                        : 'Seleccionar servicio...'
                                    }
                                </option>
                                {serviciosAMostrar.map(service => (
                                    <option key={service.id} value={service.id}>
                                        {service.name}
                                    </option>
                                ))}
                            </select>
                            {selectedService && (
                                <div className="mt-1 text-xs text-gray-500">
                                    Duración: {selectedService.duration}min | ${selectedService.price}
                                </div>
                            )}
                            {selectedStylist && serviciosAMostrar.length === 0 && !loadingServicios && (
                                <div className="mt-1 text-xs text-gray-500">
                                    No hay servicios disponibles para este estilista
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Cuándo *</label>
                            <div className="relative">
                                <button
                                    onClick={() => setShowTimeSelector(!showTimeSelector)}
                                    className="w-full flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 hover:border-blue-500 transition-colors"
                                >
                                    <span className="text-sm flex-1 text-left">
                                        {selectedDate ?
                                            `${formatDateHeader(selectedDate).day}, ${formatDateHeader(selectedDate).date} ${formatDateHeader(selectedDate).month}`
                                            : 'Seleccionar fecha'}
                                    </span>
                                    <span className="text-sm font-medium text-blue-600">{selectedTime}</span>
                                </button>

                                {showTimeSelector && (
                                    <div className="absolute z-30 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {allTimeSlots.map((slot, idx) => (
                                            <button
                                                key={`${slot.time}-${idx}`}
                                                onClick={() => {
                                                    setSelectedTime(slot.time);
                                                    setShowTimeSelector(false);
                                                }}
                                                className={`w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors ${selectedTime === slot.time ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    {slot.time}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleScheduleAppointment}
                            disabled={!selectedService || !selectedStylist || !selectedDate || loading}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Creando...
                                </>
                            ) : (
                                'Agendar Cita'
                            )}
                        </button>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Agregar notas especiales..."
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                                rows={2}
                            />
                        </div>
                    </div>
                </div>

                {/* Calendario semanal */}
                <div className="flex-1 flex flex-col min-h-80">
                    <div className="bg-white border-b border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button onClick={handlePreviousWeek} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <h2 className="text-lg font-semibold">
                                    {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                                </h2>
                                <button onClick={handleNextWeek} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <div className="min-w-max">
                            <div className="flex bg-white border-b border-gray-200 sticky top-0 z-10">
                                <div className="w-16 flex-shrink-0"></div>
                                {weekDays.map((day, idx) => {
                                    const { day: dayName, date, month } = formatDateHeader(day);
                                    const isToday = day.toDateString() === new Date().toDateString();
                                    return (
                                        <div
                                            key={idx}
                                            className="flex-1 min-w-[100px] p-2 text-center border-l border-gray-200 cursor-pointer hover:bg-gray-50"
                                            onClick={() => setSelectedDate(day)}
                                        >
                                            <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-600'}`}>
                                                {dayName}
                                            </div>
                                            <div className={`text-xs ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                                                {month} {date}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="relative">
                                {calendarTimeSlots.map((slot, slotIdx) => (
                                    <div key={`${slot.time}-${slotIdx}`} className="flex border-b border-gray-100">
                                        <div className="w-16 flex-shrink-0 text-xs text-gray-500 p-1 text-right pr-2">
                                            {slot.time}
                                        </div>
                                        {weekDays.map((day, dayIdx) => (
                                            <div
                                                key={`${slot.time}-${dayIdx}`}
                                                onClick={() => {
                                                    setSelectedDate(day);
                                                    setSelectedTime(slot.time);
                                                }}
                                                className="flex-1 min-w-[100px] h-12 border-l border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors relative"
                                            >
                                                {/* Espacio para citas existentes */}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showTimeSelector && (
                <div className="fixed inset-0 z-20" onClick={() => setShowTimeSelector(false)} />
            )}
        </div>
    );
};

export default AppointmentScheduler;