import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../../components/Auth/AuthContext';
import { getEstilistas, getEstilistaCompleto, Estilista } from '../../components/Professionales/estilistasApi';
import { getServicios, Servicio } from '../../components/Quotes/serviciosApi';
import { Cliente } from './clientsService';
import { ClientSearch } from '../../pages/PageSuperAdmin/Appoinment/Clients/ClientSearch';
import { useNavigate } from 'react-router-dom';

interface Service {
    id: string;
    profesional_id: string;
    name: string;
    duration: number;
    price: number;
}

interface EstilistaCompleto extends Estilista {
    servicios_no_presta: string[];
    especialidades: boolean;
}

interface AppointmentSchedulerProps {
    onClose: () => void;
    sedeId: string;
    estilistaId?: string;
    fecha: string;
    horaSeleccionada?: string;
    estilistas?: EstilistaCompleto[];
}

// 🔥 INTERFAZ PARA LOS DATOS DE LA CITA QUE SE PASARÁN AL PAGO
interface CitaParaPago {
    cliente: string;
    servicio: string;
    profesional: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    duracion: string;
    monto_total: number;
    cliente_id: string;
    profesional_id: string;
    servicio_id: string;
    sede_id: string;
    notas: string;
}

const AppointmentScheduler: React.FC<AppointmentSchedulerProps> = ({
    onClose,
    sedeId,
    estilistaId,
    fecha,
    horaSeleccionada,
    estilistas: estilistasFromProps
}) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(fecha ? new Date(fecha) : null);
    const [selectedTime, setSelectedTime] = useState(horaSeleccionada || '10:00');
    const [showTimeSelector, setShowTimeSelector] = useState(false);
    const [showMiniCalendar, setShowMiniCalendar] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedStylist, setSelectedStylist] = useState<EstilistaCompleto | null>(null);
    const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
    const [notes, setNotes] = useState('');

    const [estilistas, setEstilistas] = useState<EstilistaCompleto[]>([]);
    const [servicios, setServicios] = useState<Servicio[]>([]);

    const [loadingEstilistas, setLoadingEstilistas] = useState(false);
    const [loadingServicios, setLoadingServicios] = useState(false);

    // 🔥 FUNCIÓN PARA FORMATEAR FECHA BONITA
    const formatFechaBonita = useCallback((fecha: Date, hora: string) => {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        const dayName = days[fecha.getDay()];
        const day = fecha.getDate();
        const month = months[fecha.getMonth()];
        
        // Formatear hora (convertir 10:00 → 10:00 a.m.)
        const [hours, minutes] = hora.split(':').map(Number);
        const period = hours >= 12 ? 'p.m.' : 'a.m.';
        const formattedHours = hours % 12 || 12;
        const formattedTime = `${formattedHours}:${minutes.toString().padStart(2, '0')} ${period}`;

        return `${dayName}, ${day} de ${month}, ${formattedTime}`;
    }, []);

    // 🔥 FUNCIÓN PARA CALCULAR DURACIÓN EN TEXTO
    const calcularDuracionTexto = useCallback((duracionMinutos: number) => {
        const horas = Math.floor(duracionMinutos / 60);
        const minutos = duracionMinutos % 60;
        
        if (horas === 0) {
            return `${minutos} min`;
        } else if (minutos === 0) {
            return `${horas} h`;
        } else {
            return `${horas} h ${minutos} min`;
        }
    }, []);

    const eliminarDuplicados = useCallback((estilistasList: EstilistaCompleto[]) => {
        const estilistasUnicos = Array.from(
            new Map(
                estilistasList.map(e => [e.profesional_id || e._id, e])
            ).values()
        );
        return estilistasUnicos;
    }, []);

    // 🔥 CARGAR ESTILISTAS
    useEffect(() => {
        const cargarEstilistas = async () => {
            if (!user?.access_token) return;

            setLoadingEstilistas(true);
            try {
                let estilistasData: EstilistaCompleto[] = [];

                if (estilistasFromProps && estilistasFromProps.length > 0) {
                    estilistasData = eliminarDuplicados(estilistasFromProps);
                } else {
                    const estilistasApi = await getEstilistas(user.access_token, sedeId);

                    if (estilistasApi.length > 0) {
                        const estilistasConDetalles = await Promise.all(
                            estilistasApi.map(async (estilista) => {
                                try {
                                    const estilistaCompleto = await getEstilistaCompleto(user.access_token, estilista.profesional_id || estilista._id);
                                    return {
                                        ...estilista,
                                        servicios_no_presta: estilistaCompleto.servicios_no_presta || [],
                                        especialidades: estilistaCompleto.especialidades || false
                                    };
                                } catch (error) {
                                    console.error(`❌ Error cargando detalles de ${estilista.nombre}:`, error);
                                    return {
                                        ...estilista,
                                        servicios_no_presta: [],
                                        especialidades: false
                                    };
                                }
                            })
                        );

                        estilistasData = estilistasConDetalles;
                    } else {
                        estilistasData = [];
                    }

                    estilistasData = eliminarDuplicados(estilistasData);
                }

                setEstilistas(estilistasData);

                let estilistaSeleccionado: EstilistaCompleto | null = null;

                if (estilistaId && estilistasData.length > 0) {
                    estilistaSeleccionado = estilistasData.find(e =>
                        (e.profesional_id === estilistaId) || (e._id === estilistaId)
                    ) || null;
                }

                if (!estilistaSeleccionado && estilistasData.length > 0) {
                    estilistaSeleccionado = estilistasData[0];
                }

                setSelectedStylist(estilistaSeleccionado);

            } catch (error) {
                console.error('❌ Error cargando estilistas:', error);
                setError("Error al cargar los estilistas");
                setEstilistas([]);
            }
            finally {
                setLoadingEstilistas(false);
            }
        };

        cargarEstilistas();
    }, [sedeId, estilistaId, user?.access_token, estilistasFromProps, eliminarDuplicados]);

    // 🔥 CARGAR SERVICIOS
    useEffect(() => {
        const cargarServicios = async () => {
            if (!user?.access_token) {
                setServicios([]);
                return;
            }

            setLoadingServicios(true);
            try {
                const serviciosData = await getServicios(user.access_token);
                setServicios(serviciosData);
            } catch (error) {
                console.error('❌ Error cargando servicios:', error);
                setError("Error al cargar los servicios");
                setServicios([]);
            }
            finally {
                setLoadingServicios(false);
            }
        };

        cargarServicios();
    }, [user?.access_token]);

    // 🔥 INICIALIZAR FECHA Y HORA DESDE PROPS
    useEffect(() => {
        if (fecha) {
            setSelectedDate(new Date(fecha));
        }
        if (horaSeleccionada) {
            setSelectedTime(horaSeleccionada);
        }
    }, [fecha, horaSeleccionada]);

    // 🔥 MANEJADOR PARA CAMBIO DE ESTILISTA
    const handleStylistChange = useCallback((estilistaId: string) => {
        const estilista = estilistas.find(e =>
            (e.profesional_id === estilistaId) || (e._id === estilistaId)
        );

        if (estilista) {
            setSelectedStylist(estilista);
            setSelectedService(null);
        }
    }, [estilistas]);

    // 🔥 FUNCIÓN PARA FILTRAR SERVICIOS
    const filtrarServiciosPorEstilista = useCallback((serviciosList: Servicio[], estilista: EstilistaCompleto) => {
        if (!estilista || !serviciosList.length) {
            return [];
        }

        const serviciosDisponibles = serviciosList.filter(servicio => {
            const servicioId = servicio.servicio_id || servicio._id;
            const estaBloqueado = estilista.servicios_no_presta.includes(servicioId);
            return !estaBloqueado;
        });

        return serviciosDisponibles;
    }, []);

    // 🔥 SERVICIOS FILTRADOS
    const serviciosFiltrados = useMemo(() => {
        if (!selectedStylist || servicios.length === 0) {
            return [];
        }
        return filtrarServiciosPorEstilista(servicios, selectedStylist);
    }, [selectedStylist, servicios, filtrarServiciosPorEstilista]);

    // 🔥 SERVICIOS PARA MOSTRAR EN EL SELECT
    const serviciosAMostrar = useMemo(() =>
        serviciosFiltrados.map(s => ({
            id: s.servicio_id || s._id,
            profesional_id: s.servicio_id || s._id,
            name: s.nombre,
            duration: Number(s.duracion_minutos) || s.duracion || 30,
            price: s.precio ?? 0
        })),
        [serviciosFiltrados]
    );

    // 🔥 MANEJADORES PARA CLIENTE
    const handleClientSelect = useCallback((cliente: Cliente) => {
        setSelectedClient(cliente);
    }, []);

    const handleClientClear = useCallback(() => {
        setSelectedClient(null);
    }, []);

    // 🔥 GENERAR HORAS DISPONIBLES
    const generateTimeSlots = useCallback(() => {
        const slots = [];
        for (let hour = 5; hour <= 19; hour++) {
            for (let min = 0; min < 60; min += 30) {
                if (hour === 19 && min > 30) break;
                slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
            }
        }
        return slots;
    }, []);

    // 🔥 GENERAR DÍAS DEL CALENDARIO
    const generateCalendarDays = useCallback(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const firstDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        const days = [];

        for (let i = 0; i < firstDayOfWeek; i++) {
            const day = prevMonthLastDay - firstDayOfWeek + i + 1;
            const date = new Date(year, month - 1, day);
            days.push({
                date,
                isCurrentMonth: false,
                isToday: false,
                isSelected: selectedDate?.toDateString() === date.toDateString()
            });
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            days.push({
                date,
                isCurrentMonth: true,
                isToday: date.toDateString() === new Date().toDateString(),
                isSelected: selectedDate?.toDateString() === date.toDateString()
            });
        }

        const totalCells = 42;
        const remainingDays = totalCells - days.length;
        for (let day = 1; day <= remainingDays; day++) {
            const date = new Date(year, month + 1, day);
            days.push({
                date,
                isCurrentMonth: false,
                isToday: false,
                isSelected: false
            });
        }

        return days;
    }, [currentMonth, selectedDate]);

    // 🔥 FORMATEAR FECHA
    const formatDateHeader = useCallback((date: Date) => {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return {
            day: days[date.getDay()],
            date: date.getDate(),
            month: months[date.getMonth()],
            fullMonth: months[date.getMonth()],
            year: date.getFullYear()
        };
    }, []);

    // 🔥 NAVEGACIÓN DEL CALENDARIO
    const navigateMonth = useCallback((direction: 'prev' | 'next') => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(prev.getMonth() - 1);
            } else {
                newDate.setMonth(prev.getMonth() + 1);
            }
            return newDate;
        });
    }, []);

    // 🔥 CALCULAR HORA FINAL
    const calculateEndTime = useCallback((startTime: string, duration: number) => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + duration;
        const endHours = Math.floor(totalMinutes / 60);
        const endMinutes = totalMinutes % 60;
        return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    }, []);

    // 🔥 REDIRIGIR A PAGOS SIN GUARDAR CITA
    const handleIrAPagos = async () => {
        console.log('🎯 ========== REDIRIGIENDO A PAGOS ==========');

        // Validaciones
        if (!selectedClient) {
            setError('Por favor selecciona o crea un cliente');
            return;
        }

        if (!selectedService) {
            setError('Por favor selecciona un servicio');
            return;
        }

        if (!selectedStylist) {
            setError('Por favor selecciona un estilista');
            return;
        }

        if (!selectedStylist.profesional_id) {
            setError('El estilista seleccionado no tiene ID válido');
            return;
        }

        if (!selectedDate) {
            setError('Por favor selecciona una fecha');
            return;
        }

        console.log('✅ TODAS LAS VALIDACIONES PASARON');

        setLoading(true);
        setError(null);

        try {
            const endTime = calculateEndTime(selectedTime, selectedService.duration);

            // 🔥 PREPARAR DATOS PARA LA PÁGINA DE PAGOS (SIN CREAR CITA)
            const citaParaPago: CitaParaPago = {
                cliente: selectedClient.nombre,
                servicio: selectedService.name,
                profesional: selectedStylist.nombre,
                fecha: formatFechaBonita(selectedDate, selectedTime),
                hora_inicio: selectedTime,
                hora_fin: endTime,
                duracion: calcularDuracionTexto(selectedService.duration),
                monto_total: selectedService.price,
                cliente_id: selectedClient.cliente_id,
                profesional_id: selectedStylist.profesional_id,
                servicio_id: selectedService.profesional_id,
                sede_id: sedeId,
                notas: notes
            };

            console.log('💰 PREPARANDO DATOS PARA PAGOS:', citaParaPago);

            // 🔥 CERRAR EL MODAL PRIMERO
            onClose();

            // 🔥 ESPERAR UN MOMENTO Y LUEGO REDIRIGIR A PAGOS
            setTimeout(() => {
                // Navegar a la página de pagos con los datos de la cita
                navigate('/superadmin/paymethods', { 
                    state: { 
                        cita: citaParaPago,
                        fromScheduler: true 
                    } 
                });
            }, 300);

        } catch (error: any) {
            console.error('❌ ERROR PREPARANDO DATOS:', error);
            setError("Error al preparar los datos para el pago");
        }
        finally {
            setLoading(false);
        }
    };

    const calendarDays = useMemo(() => generateCalendarDays(), [generateCalendarDays]);
    const allTimeSlots = useMemo(() => generateTimeSlots(), [generateTimeSlots]);
    const dayHeaders = useMemo(() => ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'], []);

    const handleDateSelect = useCallback((date: Date) => {
        setSelectedDate(date);
        setShowMiniCalendar(false);
    }, []);

    const handleTimeSelect = useCallback((time: string) => {
        setSelectedTime(time);
        setShowTimeSelector(false);
    }, []);

    const handleCloseSelectors = useCallback(() => {
        setShowTimeSelector(false);
        setShowMiniCalendar(false);
    }, []);

    // 🔥 CALENDARIO
    const MiniCalendar = useCallback(() => {
        return (
            <div className="absolute z-30 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => navigateMonth('prev')}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="font-semibold text-gray-900">
                        {formatDateHeader(currentMonth).fullMonth} {currentMonth.getFullYear()}
                    </div>
                    <button
                        onClick={() => navigateMonth('next')}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayHeaders.map((day, i) => (
                        <div key={`day-header-${i}`} className="text-xs font-semibold text-gray-500 text-center py-2">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map(({ date, isCurrentMonth, isToday, isSelected }, i) => (
                        <button
                            key={`calendar-day-${date.toISOString()}-${i}`}
                            onClick={() => isCurrentMonth && handleDateSelect(date)}
                            disabled={!isCurrentMonth}
                            className={`h-10 w-10 text-sm flex items-center justify-center rounded-xl transition-all
                                ${!isCurrentMonth ? 'text-gray-300 cursor-default' : ''}
                                ${isSelected ? 'bg-blue-600 text-white shadow-lg scale-105' : ''}
                                ${isToday && !isSelected ? 'bg-blue-100 text-blue-600 border border-blue-300' : ''}
                                ${isCurrentMonth && !isSelected && !isToday ? 'hover:bg-gray-100 text-gray-700 hover:scale-105' : ''}`}
                        >
                            {date.getDate()}
                        </button>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                        onClick={() => {
                            const today = new Date();
                            setCurrentMonth(new Date());
                            handleDateSelect(today);
                        }}
                        className="w-full text-sm text-blue-600 hover:text-blue-700 font-semibold py-2 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        ⭐ Seleccionar hoy
                    </button>
                </div>
            </div>
        );
    }, [currentMonth, calendarDays, dayHeaders, formatDateHeader, navigateMonth, handleDateSelect]);

    return (
        <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100">
            <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Nueva Reserva</h2>
                <p className="text-gray-600 mb-6">Completa los datos para agendar la cita</p>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        <div className="font-semibold">Error</div>
                        {error}
                        <button
                            onClick={() => setError(null)}
                            className="float-right text-red-600 hover:text-red-800"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <div className="space-y-6">
                    {/* COMPONENTE DE BÚSQUEDA DE CLIENTE */}
                    <ClientSearch
                        sedeId={sedeId}
                        selectedClient={selectedClient}
                        onClientSelect={handleClientSelect}
                        onClientClear={handleClientClear}
                        required={true}
                    />

                    {/* ESTILISTA */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-3">
                            Estilista *
                        </label>
                        <select
                            value={selectedStylist?.profesional_id || selectedStylist?._id || ''}
                            disabled={loadingEstilistas || estilistas.length === 0}
                            onChange={(e) => handleStylistChange(e.target.value)}
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white disabled:bg-gray-100 transition-all"
                        >
                            <option value="">
                                {loadingEstilistas
                                    ? '🔄 Cargando estilistas...'
                                    : estilistas.length === 0
                                        ? '❌ No hay estilistas disponibles'
                                        : '👨‍💼 Seleccionar estilista...'
                                }
                            </option>
                            {estilistas.map(stylist => (
                                <option
                                    key={`stylist-${stylist.profesional_id || stylist._id}`}
                                    value={stylist.profesional_id || stylist._id}
                                >
                                    {stylist.nombre}
                                    {stylist.servicios_no_presta.length > 0 &&
                                        ` `
                                    }
                                </option>
                            ))}
                        </select>

                        <div className="mt-2 text-xs text-gray-600">
                            {loadingEstilistas ? (
                                '🔄 Cargando estilistas...'
                            ) : estilistas.length === 0 ? (
                                '❌ No hay estilistas disponibles en esta sede'
                            ) : selectedStylist ? (
                                `✅ ${selectedStylist.nombre} seleccionado - ${serviciosAMostrar.length} servicios disponibles`
                            ) : (
                                `📋 ${estilistas.length} estilistas únicos disponibles - Selecciona uno para ver servicios`
                            )}
                        </div>
                    </div>

                    {/* SERVICIO */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-3">
                            Servicio *
                        </label>

                        {!selectedStylist ? (
                            <div className="p-4 bg-gray-100 rounded-xl text-gray-600 text-center">
                                👆 Primero selecciona un estilista para ver los servicios disponibles
                            </div>
                        ) : (
                            <>
                                <select
                                    value={selectedService?.profesional_id || ''}
                                    disabled={loadingServicios || serviciosAMostrar.length === 0}
                                    onChange={(e) => setSelectedService(serviciosAMostrar.find(s => s.profesional_id === e.target.value) || null)}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white disabled:bg-gray-100 transition-all"
                                >
                                    <option value="">
                                        {loadingServicios
                                            ? '🔄 Cargando servicios...'
                                            : serviciosAMostrar.length === 0
                                                ? '❌ No hay servicios disponibles para este estilista'
                                                : '💇‍♀️ Seleccionar servicio...'
                                        }
                                    </option>
                                    {serviciosAMostrar.map(service => (
                                        <option key={`service-${service.profesional_id}`} value={service.profesional_id}>
                                            {service.name} - {service.duration}min - ${service.price}
                                        </option>
                                    ))}
                                </select>

                                <div className="mt-2 text-xs text-gray-600">
                                    {loadingServicios ? (
                                        '🔄 Cargando servicios...'
                                    ) : serviciosAMostrar.length === 0 ? (
                                        <span className="text-orange-600">
                                            ⚠️ Este estilista no presta ningún servicio disponible
                                        </span>
                                    ) : selectedService ? (
                                        `✅ ${selectedService.name} seleccionado`
                                    ) : (
                                        `📋 ${serviciosAMostrar.length} servicios disponibles`
                                    )}
                                </div>

                                {selectedService && (
                                    <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-semibold text-blue-900">{selectedService.name}</span>
                                            <div className="flex gap-4 text-blue-700">
                                                <span>⏱ {selectedService.duration}min</span>
                                                <span>💰 ${selectedService.price}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* FECHA Y HORA */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-3">
                            Fecha y Hora *
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <button
                                    onClick={() => setShowMiniCalendar(!showMiniCalendar)}
                                    className="w-full flex items-center justify-between border border-gray-300 rounded-xl px-4 py-3 hover:border-blue-500 transition-all bg-white"
                                >
                                    <span className="text-sm flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4" />
                                        {selectedDate
                                            ? `${formatDateHeader(selectedDate).date} ${formatDateHeader(selectedDate).month}`
                                            : '📅 Seleccionar fecha'
                                        }
                                    </span>
                                </button>
                                {showMiniCalendar && <MiniCalendar />}
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setShowTimeSelector(!showTimeSelector)}
                                    className="w-full flex items-center justify-between border border-gray-300 rounded-xl px-4 py-3 hover:border-blue-500 transition-all bg-white"
                                >
                                    <span className="text-sm flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        {selectedTime}
                                    </span>
                                </button>

                                {showTimeSelector && (
                                    <div className="absolute z-30 mt-2 w-full bg-white border border-gray-200 rounded-2xl shadow-2xl max-h-64 overflow-y-auto">
                                        {allTimeSlots.map((time, i) => (
                                            <button
                                                key={`time-slot-${time}-${i}`}
                                                onClick={() => handleTimeSelect(time)}
                                                className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-all border-b border-gray-100 last:border-b-0
                                                    ${selectedTime === time ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Clock className="w-4 h-4" />
                                                    {time}
                                                    {selectedTime === time && (
                                                        <span className="ml-auto text-blue-600">✓</span>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* NOTAS */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-3">
                            Notas <span className="text-gray-500 font-normal">(opcional)</span>
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Agregar notas especiales, preferencias del cliente, etc..."
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-all"
                            rows={3}
                        />
                    </div>

                    {/* 🔥 BOTÓN MODIFICADO: SOLO REDIRIGE A PAGOS */}
                    <button
                        onClick={handleIrAPagos}
                        disabled={!selectedClient || !selectedService || !selectedStylist || !selectedDate || loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg relative overflow-hidden"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                Redirigiendo a pagos...
                            </>
                        ) : (
                            <>
                                <span>💰 Realizar Pago - ${selectedService?.price || '0'}</span>
                                {!loading && (
                                    <div className="absolute inset-0 bg-green-500 opacity-0 hover:opacity-20 transition-opacity duration-300"></div>
                                )}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Overlay para cerrar selectores */}
            {(showTimeSelector || showMiniCalendar) && (
                <div
                    className="fixed inset-0 z-20"
                    onClick={handleCloseSelectors}
                />
            )}
        </div>
    );
};

export default React.memo(AppointmentScheduler);