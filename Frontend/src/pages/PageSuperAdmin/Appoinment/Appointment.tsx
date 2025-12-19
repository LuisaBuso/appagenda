import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Calendar, Plus, User, Clock, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Sidebar } from '../../../components/Layout/Sidebar';
import Bloqueos from "../../../components/Quotes/Bloqueos";
import AppointmentScheduler from "../../../components/Quotes/AppointmentForm";
import Modal from "../../../components/ui/modal";
import { getCitas } from '../../../components/Quotes/citasApi';
import { getSedes, type Sede } from '../../../components/Branch/sedesApi';
import { getEstilistas, type Estilista } from '../../../components/Professionales/estilistasApi';
import AppointmentDetailsModal from './AppointmentDetailsModal';
import { useAuth } from '../../../components/Auth/AuthContext';
import { getBloqueosMultiplesProfesionales, type Bloqueo } from '../../../components/Quotes/bloqueosApi';

interface Appointment {
  id: string;
  title: string;
  profesional: string;
  start: string;
  end: string;
  color: string;
  tipo: string;
  duracion: number;
  precio: number;
  cliente_nombre: string;
  servicio_nombre: string;
  estilista_nombre: string;
  estado: string;
  profesional_id?: string;
  rawData?: any;
}

interface EstilistaCompleto extends Estilista {
  servicios_no_presta: string[];
  especialidades: boolean;
  unique_key: string;
}

interface BloqueoCalendario extends Bloqueo {
  _id: string;
}

const HOURS = Array.from({ length: 29 }, (_, i) => {
  const hour = Math.floor(i / 2) + 5;
  return `${hour.toString().padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`;
});

const COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-indigo-500', 'bg-teal-500', 'bg-pink-500', 'bg-cyan-500'];
const CELL_HEIGHT = 48;
const CELL_WIDTH = 128;
const HEADER_HEIGHT = 48;

const CalendarScheduler: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSede, setSelectedSede] = useState<Sede | null>(null);
  const [selectedEstilista, setSelectedEstilista] = useState<EstilistaCompleto | null>(null);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [estilistas, setEstilistas] = useState<EstilistaCompleto[]>([]);
  const [citas, setCitas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [_, setShowOptions] = useState(false);
  const [showBloqueoModal, setShowBloqueoModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ estilista: EstilistaCompleto, hora: string } | null>(null);
  const [citaTooltip,] = useState({ visible: false, x: 0, y: 0, cita: null as Appointment | null });
  const [hoveredCell, setHoveredCell] = useState<{ estilista: EstilistaCompleto, hora: string } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [bloqueos, setBloqueos] = useState<BloqueoCalendario[]>([]);
  const [, setLoadingBloqueos] = useState(false);

  const optionsRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date(), []);
  const selectedDateString = useMemo(() => selectedDate.toISOString().split('T')[0], [selectedDate]);

  const sedeIdActual = useMemo(() => {
    return selectedSede?.sede_id || '';
  }, [selectedSede]);

  const handleCitaClick = useCallback((apt: Appointment) => {
    console.log('Cita clickeada:', apt);
    setSelectedAppointment(apt);
    setShowAppointmentDetails(true);
  }, []);

  const getCitaStyles = (estado: string, isSelected: boolean = false) => {
    const estadoLower = estado?.toLowerCase() || 'pendiente';

    let baseStyles;

    switch (estadoLower) {
      case 'confirmada':
      case 'confirmado':
        baseStyles = {
          bg: 'bg-green-500',
          hover: 'hover:bg-green-600',
          border: 'border-green-600',
          text: 'text-white',
          badge: 'bg-green-700',
          icon: '✓',
          shadow: 'shadow-md'
        };
        break;

      case 'reservada':
      case 'reservado':
      case 'pendiente':
        baseStyles = {
          bg: 'bg-blue-500',
          hover: 'hover:bg-blue-600',
          border: 'border-blue-600',
          text: 'text-white',
          badge: 'bg-blue-700',
          icon: '⏱️',
          shadow: 'shadow-md'
        };
        break;

      case 'en proceso':
      case 'en_proceso':
      case 'proceso':
        baseStyles = {
          bg: 'bg-purple-500',
          hover: 'hover:bg-purple-600',
          border: 'border-purple-600',
          text: 'text-white',
          badge: 'bg-purple-700',
          icon: '⚡',
          shadow: 'shadow-md'
        };
        break;

      case 'cancelada':
      case 'cancelado':
        baseStyles = {
          bg: 'bg-red-500',
          hover: 'hover:bg-red-600',
          border: 'border-red-600',
          text: 'text-white',
          badge: 'bg-red-700',
          icon: '✗',
          shadow: 'shadow-md'
        };
        break;

      case 'finalizada':
      case 'completada':
      case 'completado':
        baseStyles = {
          bg: 'bg-gray-500',
          hover: 'hover:bg-gray-600',
          border: 'border-gray-600',
          text: 'text-white',
          badge: 'bg-gray-700',
          icon: '✓',
          shadow: 'shadow-md'
        };
        break;

      default:
        baseStyles = {
          bg: 'bg-amber-500',
          hover: 'hover:bg-amber-600',
          border: 'border-amber-600',
          text: 'text-white',
          badge: 'bg-amber-700',
          icon: '?',
          shadow: 'shadow-md'
        };
    }

    // Si la cita está seleccionada (cuando se hace clic o se abre el modal)
    if (isSelected) {
      return {
        ...baseStyles,
        bg: baseStyles.bg.replace('500', '400'),
        border: 'border-2 border-white',
        shadow: 'shadow-xl ring-2 ring-white ring-opacity-50'
      };
    }

    return baseStyles;
  };

  const cargarBloqueos = useCallback(async () => {
    if (!user?.access_token || !selectedSede || estilistas.length === 0) {
      setBloqueos([]);
      return;
    }

    setLoadingBloqueos(true);
    try {
      const profesionalIds = estilistas.map(e => e.profesional_id);
      const todosBloqueos = await getBloqueosMultiplesProfesionales(profesionalIds, user.access_token);

      const bloqueosFiltrados = todosBloqueos.filter(bloqueo => {
        if (!bloqueo || !bloqueo.fecha) return false;

        try {
          let fechaBloqueo: string;

          if (bloqueo.fecha.includes('T')) {
            fechaBloqueo = bloqueo.fecha.split('T')[0];
          } else if (bloqueo.fecha.includes(' ')) {
            fechaBloqueo = bloqueo.fecha.split(' ')[0];
          } else {
            fechaBloqueo = bloqueo.fecha;
          }

          return fechaBloqueo === selectedDateString;
        } catch (error) {
          console.error('Error procesando fecha del bloqueo:', error);
          return false;
        }
      });

      console.log('✅ BLOQUEOS CARGADOS:', {
        total: todosBloqueos.length,
        filtrados: bloqueosFiltrados.length,
        fecha: selectedDateString
      });

      setBloqueos(bloqueosFiltrados);
    } catch (error) {
      console.error('Error cargando bloqueos:', error);
      setBloqueos([]);
    } finally {
      setLoadingBloqueos(false);
    }
  }, [estilistas, user, selectedDateString, selectedSede]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cargarDatos = useCallback(async () => {
    if (!user?.access_token) return;

    setLoading(true);
    try {
      const [sedesData, citasData] = await Promise.all([
        getSedes(user.access_token),
        getCitas({}, user.access_token)
      ]);

      setSedes(sedesData);
      setCitas(citasData.citas || citasData || []);

      if (sedesData.length > 0 && !selectedSede) {
        setSelectedSede(sedesData[0]);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedSede]);

  const cargarEstilistas = useCallback(async () => {
    if (!sedeIdActual || !user?.access_token) {
      setEstilistas([]);
      setSelectedEstilista(null);
      return;
    }

    setLoading(true);
    try {
      const estilistasData = await getEstilistas(user.access_token);

      if (!Array.isArray(estilistasData)) {
        setEstilistas([]);
        return;
      }

      const estilistasFiltrados = estilistasData
        .filter((est): est is Estilista => {
          return est?.sede_id === sedeIdActual;
        })
        .map(est => ({
          ...est,
          servicios_no_presta: est.servicios_no_presta || [],
          especialidades: est.especialidades || false,
          unique_key: `stylist-${est.profesional_id}`
        } as EstilistaCompleto));

      console.log('👨‍💼 ESTRUCTURA COMPLETA DE ESTILISTAS:', estilistasFiltrados.map(e => ({
        nombre: e.nombre,
        profesional_id: e.profesional_id,
        _id: e._id,
        sede_id: e.sede_id
      })));

      // 🔍 DEBUG PARA VERIFICAR CARGA
      console.log('🔍 DEBUG ESTILISTAS:', {
        sedeIdActual,
        estilistasDataLength: estilistasData.length,
        estilistasFiltradosLength: estilistasFiltrados.length,
        tieneSede: !!sedeIdActual,
        tieneToken: !!user?.access_token,
        filtro: `sede_id === ${sedeIdActual}`
      });

      setEstilistas(estilistasFiltrados);
    } catch (error) {
      console.error('Error cargando estilistas:', error);
      setEstilistas([]);
    } finally {
      setLoading(false);
    }
  }, [sedeIdActual, user]);

  const cargarCitas = useCallback(async () => {
    if (!user?.access_token) return;

    setLoading(true);
    try {
      const params: any = { fecha: selectedDateString };
      if (selectedSede) params.sede_id = sedeIdActual;
      if (selectedEstilista) params.profesional_id = selectedEstilista.profesional_id;

      const response = await getCitas(params, user.access_token);
      setCitas(response.citas || response || []);
    } catch (error) {
      console.error('Error al cargar citas:', error);
      setCitas([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDateString, selectedSede, selectedEstilista, user]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    cargarCitas();
    if (estilistas.length > 0 && selectedSede) {
      cargarBloqueos();
    }
  }, [cargarCitas, estilistas, selectedSede, refreshTrigger]);

  useEffect(() => {
    cargarEstilistas();
  }, [cargarEstilistas]);

  useEffect(() => {
    cargarCitas();
  }, [cargarCitas, refreshTrigger]);

  // 🔥 ORDEN CORREGIDO: profesionales PRIMERO
  const profesionales = useMemo(() => {
    const result = estilistas.map(est => ({
      name: est.nombre,
      initials: est.nombre.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
      estilista: est
    }));

    console.log('👥 PROFESIONALES CALCULADOS:', {
      count: result.length,
      nombres: result.map(p => p.name),
      ids: result.map(p => p.estilista.profesional_id)
    });

    return result;
  }, [estilistas]);

  // 🔥 LUEGO getAppointmentPosition (usa profesionales)
  const getAppointmentPosition = useCallback((apt: Appointment) => {
    console.log(`\n📐 CALCULANDO POSICIÓN PARA: ${apt.cliente_nombre} (${apt.profesional})`);

    const profIndex = profesionales.findIndex(p => {
      const citaProfesionalId = apt.profesional_id || apt.rawData?.profesional_id;
      const estilistaId = p.estilista.profesional_id;
      return citaProfesionalId === estilistaId;
    });

    if (profIndex !== -1) {
      console.log(`✅ ENCONTRADO: ${apt.profesional} en índice ${profIndex}`);
    } else {
      console.log(`❌ PROFESIONAL NO ENCONTRADO PARA: ${apt.cliente_nombre}`);
      console.log(`ID en cita: ${apt.profesional_id || apt.rawData?.profesional_id}`);
      console.log(`📋 ESTILISTAS DISPONIBLES:`, profesionales.map(p => ({
        id: p.estilista.profesional_id,
        nombre: p.name
      })));
      return null;
    }

    const [startHour, startMin] = apt.start.split(':').map(Number);
    const [endHour, endMin] = apt.end.split(':').map(Number);

    const startMinutesFrom5AM = (startHour - 5) * 60 + startMin;
    const endMinutesFrom5AM = (endHour - 5) * 60 + endMin;

    const startBlock = Math.floor(startMinutesFrom5AM / 30);
    const endBlock = Math.ceil(endMinutesFrom5AM / 30);
    const totalBlocks = endBlock - startBlock;

    const minHeight = Math.max(totalBlocks * CELL_HEIGHT - 2, 24);

    const position = {
      left: profIndex * CELL_WIDTH + 80,
      top: startBlock * CELL_HEIGHT + HEADER_HEIGHT,
      height: minHeight,
      width: CELL_WIDTH - 8,
    };

    console.log(`✅ POSICIÓN CALCULADA:`, {
      profesional: apt.profesional,
      index: profIndex,
      start: apt.start,
      end: apt.end,
      startBlock,
      endBlock,
      totalBlocks,
      position
    });

    return position;
  }, [profesionales]);

  // 🔥 FINALMENTE appointments (usa getAppointmentPosition)
  const appointments = useMemo(() => {
    console.log('🔍 PROCESANDO CITAS CON DATOS COMPLETOS DEL BACKEND');

    if (!citas.length) {
      console.log('❌ No hay citas para procesar');
      return [];
    }

    const citasFiltradas = citas.filter(cita => {
      return cita.fecha === selectedDateString;
    });

    console.log('📋 CITAS FILTRADAS PARA FECHA:', citasFiltradas.length);
    console.log('📊 DETALLE DE CITAS:', citasFiltradas.map(cita => ({
      id: cita._id,
      cliente: cita.cliente_nombre,
      servicio: cita.servicio_nombre,
      estilista: cita.profesional_nombre,
      estilista_id: cita.profesional_id,
      horario: `${cita.hora_inicio} - ${cita.hora_fin}`,
      rawData: cita
    })));

    const appointmentsResult = citasFiltradas.map((cita, index) => {
      console.log(`📝 CITA ${index + 1}:`, {
        cliente: cita.cliente_nombre || `Cliente ${cita.cliente_id}`,
        servicio: cita.servicio_nombre,
        estilista: cita.profesional_nombre,
        estilista_id: cita.profesional_id,
        horario: `${cita.hora_inicio} - ${cita.hora_fin}`,
        rawData: cita
      });

      const estilistaIndex = estilistas.findIndex(e =>
        e.profesional_id === cita.profesional_id
      );

      console.log(`🎯 BUSCANDO ESTILISTA ID: ${cita.profesional_id}`);
      console.log(`📊 ESTILISTAS DISPONIBLES:`, estilistas.map(e => ({
        id: e.profesional_id,
        nombre: e.nombre
      })));
      console.log(`✅ ÍNDICE ENCONTRADO: ${estilistaIndex}`);

      const colorIndex = estilistaIndex >= 0 ? estilistaIndex % COLORS.length : index % COLORS.length;
      const colorClass = COLORS[colorIndex];

      const parseTime = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        return (hours - 5) * 60 + minutes;
      };

      const startMinutes = parseTime(cita.hora_inicio);
      const endMinutes = parseTime(cita.hora_fin);
      const duracion = Math.max(0, endMinutes - startMinutes);

      const appointment = {
        id: cita._id,
        title: cita.cliente_nombre || `Cliente ${cita.cliente_id}`,
        profesional: cita.profesional_nombre,
        start: cita.hora_inicio,
        end: cita.hora_fin,
        color: colorClass,
        tipo: cita.servicio_nombre,
        duracion: duracion,
        precio: 0,
        cliente_nombre: cita.cliente_nombre || `Cliente ${cita.cliente_id}`,
        servicio_nombre: cita.servicio_nombre,
        estilista_nombre: cita.profesional_nombre,
        estado: cita.estado || 'pendiente',
        profesional_id: cita.profesional_id,
        rawData: cita
      };

      return appointment;
    });

    console.log('✅ APPOINTMENTS PROCESADOS:', appointmentsResult.length);

    // 🔥 CORREGIDO: Sin llamar a getAppointmentPosition aquí
    console.log('📋 DETALLE FINAL APPOINTMENTS:', appointmentsResult.map(apt => ({
      id: apt.id,
      cliente: apt.cliente_nombre,
      estilista: apt.estilista_nombre,
      estilista_id: apt.profesional_id || apt.rawData?.profesional_id,
      horario: `${apt.start} - ${apt.end}`
      // ❌ SIN position: getAppointmentPosition(apt) - esto causa el error
    })));

    return appointmentsResult;
  }, [citas, selectedDateString, estilistas]); // 🔥 QUITAR getAppointmentPosition de las dependencias

  const handleClose = useCallback(() => {
    setShowAppointmentModal(false);
    setShowBloqueoModal(false);
    setSelectedCell(null);
    setShowOptions(false);
  }, []);

  const handleCitaCreada = useCallback(() => {
    console.log('🔄 Recargando citas después de crear nueva cita...');
    cargarCitas();
    cargarEstilistas();
    setRefreshTrigger(prev => prev + 1);
    handleClose();
  }, [cargarCitas, cargarEstilistas, handleClose]);

  const handleBloqueoCreado = useCallback(() => {
    cargarCitas();
    cargarEstilistas();
    cargarBloqueos(); // Añadir esta línea
    setRefreshTrigger(prev => prev + 1);
    handleClose();
  }, [cargarCitas, cargarEstilistas, cargarBloqueos, handleClose]);

  // REEMPLAZA la función tieneCita por esta:
  const tieneCitaOBloqueo = useCallback((estilistaNombre: string, hora: string) => {
    const [blockHour, blockMin] = hora.split(':').map(Number);
    const blockMinutesFrom5AM = (blockHour - 5) * 60 + blockMin;

    // Verificar citas
    const tieneCitaActual = appointments.some(apt => {
      const estilista = profesionales.find(p => p.name === estilistaNombre);
      if (!estilista) return false;

      const aptProfesionalId = apt.profesional_id || apt.rawData?.profesional_id;
      const estilistaId = estilista.estilista.profesional_id;

      if (aptProfesionalId !== estilistaId) return false;

      const [startHour, startMin] = apt.start.split(':').map(Number);
      const startMinutesFrom5AM = (startHour - 5) * 60 + startMin;

      const [endHour, endMin] = apt.end.split(':').map(Number);
      const endMinutesFrom5AM = (endHour - 5) * 60 + endMin;

      return blockMinutesFrom5AM >= startMinutesFrom5AM && blockMinutesFrom5AM < endMinutesFrom5AM;
    });

    if (tieneCitaActual) return true;

    // Verificar bloqueos
    const tieneBloqueo = bloqueos.some(bloqueo => {
      const estilista = profesionales.find(p => p.name === estilistaNombre);
      if (!estilista) return false;

      if (bloqueo.profesional_id !== estilista.estilista.profesional_id) return false;

      const [startHour, startMin] = bloqueo.hora_inicio.split(':').map(Number);
      const startMinutesFrom5AM = (startHour - 5) * 60 + startMin;

      const [endHour, endMin] = bloqueo.hora_fin.split(':').map(Number);
      const endMinutesFrom5AM = (endHour - 5) * 60 + endMin;

      return blockMinutesFrom5AM >= startMinutesFrom5AM && blockMinutesFrom5AM < endMinutesFrom5AM;
    });

    return tieneBloqueo;
  }, [appointments, profesionales, bloqueos]);


  const handleCellHover = useCallback((estilista: EstilistaCompleto, hora: string) => {
    setHoveredCell({ estilista, hora });
  }, []);

  const handleCellHoverLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  const handleCellClick = useCallback((estilista: EstilistaCompleto, hora: string) => {
    if (!tieneCitaOBloqueo(estilista.nombre, hora)) {
      setSelectedCell({ estilista, hora });
      setShowOptions(true);
    }
  }, [tieneCitaOBloqueo]);

  const openAppointmentModal = useCallback((estilista: EstilistaCompleto, hora: string) => {
    setSelectedCell({ estilista, hora });
    setShowAppointmentModal(true);
    setShowOptions(false);
  }, []);

  const openBloqueoModal = useCallback((estilista: EstilistaCompleto, hora: string) => {
    setSelectedCell({ estilista, hora });
    setShowBloqueoModal(true);
    setShowOptions(false);
  }, []);

  // En el componente principal
  const formatearFecha = useCallback((fecha: string | Date) => {
    const date = new Date(fecha);
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const MiniCalendar = useCallback(() => {
    // Inicializar con el mes de la fecha seleccionada
    const [currentMonth, setCurrentMonth] = useState<Date>(() => {
      const date = new Date(selectedDate);
      return new Date(date.getFullYear(), date.getMonth(), 1);
    });

    const generateCalendarDays = useCallback(() => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const firstDayOfWeek = firstDay.getDay();
      const daysInMonth = lastDay.getDate();
      const prevMonthLastDay = new Date(year, month, 0).getDate();
      const days = [];

      // Días del mes anterior
      for (let i = 0; i < firstDayOfWeek; i++) {
        const day = prevMonthLastDay - firstDayOfWeek + i + 1;
        const date = new Date(year, month - 1, day);
        const dateFormatted = formatearFecha(date);
        const selectedDateFormatted = formatearFecha(selectedDate);
        const todayFormatted = formatearFecha(new Date());

        days.push({
          date,
          isCurrentMonth: false,
          isToday: dateFormatted === todayFormatted,
          isSelected: dateFormatted === selectedDateFormatted
        });
      }

      // Días del mes actual
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateFormatted = formatearFecha(date);
        const selectedDateFormatted = formatearFecha(selectedDate);
        const todayFormatted = formatearFecha(new Date());

        days.push({
          date,
          isCurrentMonth: true,
          isToday: dateFormatted === todayFormatted,
          isSelected: dateFormatted === selectedDateFormatted
        });
      }

      // Días del mes siguiente
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
    }, [currentMonth, selectedDate, formatearFecha]); // Añadir formatearFecha

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

    const handleDateSelect = useCallback((date: Date) => {
      console.log('📅 Fecha seleccionada:', date);
      console.log('📅 Fecha formateada:', formatearFecha(date));
      setSelectedDate(date);

      // Actualizar currentMonth para mostrar el mes de la fecha seleccionada
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));

      // Forzar recarga de citas
      setRefreshTrigger(prev => prev + 1);
    }, [formatearFecha]); // Añadir formatearFecha

    const calendarDays = useMemo(() => generateCalendarDays(), [generateCalendarDays]);
    const dayHeaders = useMemo(() => ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'], []);

    const formatMonthYear = useCallback((date: Date) => {
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }, []);

    // Sincronizar currentMonth cuando cambia selectedDate desde fuera
    useEffect(() => {
      const selectedYear = selectedDate.getFullYear();
      const selectedMonth = selectedDate.getMonth();
      const currentYear = currentMonth.getFullYear();
      const currentMonthIndex = currentMonth.getMonth();

      if (selectedYear !== currentYear || selectedMonth !== currentMonthIndex) {
        console.log('🔄 Sincronizando currentMonth');
        setCurrentMonth(new Date(selectedYear, selectedMonth, 1));
      }
    }, [selectedDate]);

    return (
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">Calendario</h3>

        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="font-semibold text-sm text-gray-900">
            {formatMonthYear(currentMonth)}
          </div>
          <button
            onClick={() => navigateMonth('next')}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayHeaders.map((day, i) => (
            <div key={`day-header-${i}`} className="text-xs font-semibold text-gray-500 text-center py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map(({ date, isCurrentMonth, isToday, isSelected }, i) => {
            // Para debugging
            if (isSelected) {
              console.log('✅ Día seleccionado encontrado:', {
                date: formatearFecha(date),
                selectedDate: formatearFecha(selectedDate),
                coincide: formatearFecha(date) === formatearFecha(selectedDate)
              });
            }

            return (
              <button
                key={`calendar-day-${date.toISOString()}-${i}`}
                onClick={() => isCurrentMonth && handleDateSelect(date)}
                disabled={!isCurrentMonth}
                className={`h-7 w-7 text-xs flex items-center justify-center rounded-lg transition-all relative
                ${!isCurrentMonth ? 'text-gray-300 cursor-default' : ''}
                ${isSelected ? 'bg-blue-600 text-white shadow-md scale-105' : ''}
                ${isToday && !isSelected ? 'bg-blue-100 text-blue-600 border border-blue-300' : ''}
                ${isCurrentMonth && !isSelected && !isToday ? 'hover:bg-gray-100 text-gray-700 hover:scale-105' : ''}`}
              >
                {date.getDate()}
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={() => {
              const today = new Date();
              console.log('⭐ Botón "Hoy" clickeado:', today);
              console.log('⭐ Fecha formateada:', formatearFecha(today));

              // Actualizar ambos estados
              setSelectedDate(today);
              setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));

              // Forzar recarga
              setRefreshTrigger(prev => prev + 1);
            }}
            className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium py-2 hover:bg-blue-50 rounded-lg transition-colors"
          >
            ⭐ Hoy
          </button>
        </div>
      </div>
    );
  }, [selectedDate, formatearFecha, refreshTrigger]); // Añadir todas las dependencias necesarias

  const CalendarCell = React.memo(({ prof, hour }: { prof: any; hour: string }) => {
    const tieneCitaOBloqueoEnEstaHora = tieneCitaOBloqueo(prof.name, hour);
    const isHovered = hoveredCell?.estilista.unique_key === prof.estilista.unique_key && hoveredCell?.hora === hour;

    // Determinar si es un bloqueo
    const esBloqueo = useMemo(() => {
      const [blockHour, blockMin] = hour.split(':').map(Number);
      const blockMinutesFrom5AM = (blockHour - 5) * 60 + blockMin;

      return bloqueos.some(bloqueo => {
        const profesionalId = prof.estilista.profesional_id;
        if (bloqueo.profesional_id !== profesionalId) return false;

        const [startHour, startMin] = bloqueo.hora_inicio.split(':').map(Number);
        const startMinutesFrom5AM = (startHour - 5) * 60 + startMin;

        const [endHour, endMin] = bloqueo.hora_fin.split(':').map(Number);
        const endMinutesFrom5AM = (endHour - 5) * 60 + endMin;

        return blockMinutesFrom5AM >= startMinutesFrom5AM && blockMinutesFrom5AM < endMinutesFrom5AM;
      });
    }, [bloqueos, hour, prof.estilista.profesional_id]);

    const handleReservarClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      openAppointmentModal(prof.estilista, hour);
    };

    const handleBloquearClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      openBloqueoModal(prof.estilista, hour);
    };

    return (
      <div
        onClick={() => handleCellClick(prof.estilista, hour)}
        onMouseEnter={() => handleCellHover(prof.estilista, hour)}
        onMouseLeave={handleCellHoverLeave}
        className={`w-32 h-12 border-l border-gray-100 cursor-pointer relative transition-all duration-200 group ${tieneCitaOBloqueoEnEstaHora
          ? esBloqueo
            ? 'bg-red-50/40 hover:bg-red-100/50 border-red-200'
            : 'bg-amber-50/30 hover:bg-amber-100/50 border-amber-200'
          : 'bg-white hover:bg-blue-50 hover:shadow-sm'
          }`}
      >
        {tieneCitaOBloqueoEnEstaHora && (
          <div className={`absolute inset-1 rounded-lg border flex items-center justify-center ${esBloqueo
            ? 'bg-gradient-to-r from-red-100/50 to-pink-100/40 border-red-200/60'
            : 'bg-gradient-to-r from-amber-100/40 to-orange-100/30 border-amber-200/60'
            }`}>
            <div className={`text-xs font-semibold ${esBloqueo ? 'text-red-700 opacity-70' : 'text-amber-700 opacity-70'
              }`}>
              {esBloqueo ? '🔒 Bloqueado' : '● Ocupado'}
            </div>
          </div>
        )}

        {!tieneCitaOBloqueoEnEstaHora && isHovered && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="flex gap-1 bg-white/95 backdrop-blur-sm rounded-lg p-1.5 shadow-xl border border-gray-200/80">
              <button
                onClick={handleReservarClick}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Reservar
              </button>
              <button
                onClick={handleBloquearClick}
                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Bloquear
              </button>
            </div>
          </div>
        )}

        {!tieneCitaOBloqueoEnEstaHora && isHovered && (
          <div className="absolute inset-0 bg-blue-100/20 border-2 border-blue-300/50 rounded-lg pointer-events-none transition-all duration-200" />
        )}
      </div>
    );
  });

  const CitaComponent = React.memo(({ apt }: { apt: Appointment }) => {
    const position = getAppointmentPosition(apt);
    const isSelected = selectedAppointment?.id === apt.id;
    const styles = getCitaStyles(apt.estado, isSelected);

    if (!position) {
      console.log(`❌ NO SE PUDO CALCULAR POSICIÓN PARA: ${apt.cliente_nombre}`);
      return null;
    }

    const renderCitaContent = () => {
      const alturaDisponible = position.height;

      // Pequeña (30 min)
      if (alturaDisponible <= 40) {
        return (
          <div className="p-1.5 h-full">
            <div className="flex items-center justify-between h-full">
              <div className="text-[9px] font-semibold text-white truncate pr-1">
                {apt.cliente_nombre.split(' ')[0]}
              </div>
              <div className="text-[8px] text-white/70 bg-black/30 px-1 py-0.5 rounded">
                {apt.start.split(':')[0]}:{apt.start.split(':')[1]}
              </div>
            </div>
          </div>
        );
      }

      // Mediana (60-90 min)
      if (alturaDisponible <= 80) {
        return (
          <div className="p-2 h-full flex flex-col">
            {/* Nombre */}
            <div className="text-xs font-bold text-white truncate mb-1">
              {apt.cliente_nombre}
            </div>

            {/* Información en 2 columnas */}
            <div className="grid grid-cols-2 gap-1 mt-auto">
              <div className="text-[9px] text-white/80 truncate">
                {apt.servicio_nombre.split(' ')[0]}
              </div>
              <div className="text-[9px] text-white font-medium text-right">
                {apt.duracion}min
              </div>
              <div className="text-[8px] text-white/70">
                {apt.estilista_nombre.split(' ')[0]}
              </div>
              <div className="text-[8px] text-white/90 text-right">
                {styles.icon}
              </div>
            </div>
          </div>
        );
      }

      // Grande (120+ min)
      return (
        <div className="p-3 h-full">
          {/* Header */}
          <div className="mb-3">
            <div className="text-sm font-bold text-white truncate">
              {apt.cliente_nombre}
            </div>
            <div className="text-xs text-white/80 mt-1">
              {apt.servicio_nombre}
            </div>
          </div>

          {/* Detalles */}
          <div className="space-y-2">
            {/* Estilista */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-xs">💇</span>
              </div>
              <div className="text-xs text-white/90">
                {apt.estilista_nombre}
              </div>
            </div>

            {/* Horario */}
            <div className="bg-white/10 rounded p-2">
              <div className="flex justify-between items-center">
                <div className="text-xs text-white">
                  {apt.start} - {apt.end}
                </div>
                <div className="text-xs font-bold text-white">
                  {apt.duracion} min
                </div>
              </div>
            </div>

            {/* Estado */}
            <div className="flex items-center justify-center">
              <div className={`px-2 py-1 rounded text-xs font-medium ${styles.badge} text-white`}>
                {styles.icon} {apt.estado}
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div
        className={`absolute rounded-lg shadow-md cursor-pointer overflow-hidden 
                 transition-all duration-200 z-30 ${styles.bg} ${styles.hover} ${styles.shadow}
                 hover:shadow-lg hover:scale-[1.02] hover:z-40 border-l-4 ${styles.border}
                 group pointer-events-auto active:scale-95 active:shadow-inner`}
        style={position}
        onClick={() => handleCitaClick(apt)}
      >
        {/* Degradado para mejor visibilidad */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/10 pointer-events-none"></div>

        {/* Puntito de estado en esquina superior derecha */}
        <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${styles.badge} 
                      border-2 border-white shadow-sm`}></div>

        {/* Contenido principal */}
        {renderCitaContent()}

        {/* Efecto hover sutil */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-200"></div>

        {/* Indicador de selección */}
        {isSelected && (
          <div className="absolute inset-0 border-2 border-white shadow-inner pointer-events-none"></div>
        )}
      </div>
    );
  });

  useEffect(() => {
    console.log('🎯 ESTADO ACTUAL DEL CALENDARIO:', {
      citasCount: citas.length,
      appointmentsCount: appointments.length,
      estilistasCount: estilistas.length,
      profesionalesCount: profesionales.length,
      refreshTrigger: refreshTrigger,
    });

    if (appointments.length > 0) {
      console.log('🔍 DETALLE DE APPOINTMENTS Y POSICIONES:');
      appointments.forEach(apt => {
        const position = getAppointmentPosition(apt);
        console.log(`📍 ${apt.cliente_nombre}:`, {
          estilista: apt.estilista_nombre,
          estilista_id: apt.profesional_id || apt.rawData?.profesional_id,
          position,
          encontrado: position !== null
        });
      });
    }
  }, [citas, appointments, estilistas, profesionales, refreshTrigger, getAppointmentPosition]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <Sidebar />

      <div className="flex-1 lg:ml-0 flex flex-col overflow-hidden">
        <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
                <p className="text-sm text-gray-600">
                  {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • {selectedSede?.nombre || 'Todas las sedes'}
                  {loading && <span className="ml-2 inline-flex items-center gap-1 text-blue-600"><Loader2 className="w-3 h-3 animate-spin" />Actualizando...</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedDate(today)} disabled={loading} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Calendar className="w-4 h-4" />Hoy
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-80 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 p-6 overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Filtros</h2>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Sede</label>
              <select className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" value={selectedSede?._id || ''} onChange={(e) => setSelectedSede(sedes.find(s => s._id === e.target.value) || null)}>
                <option value="">Todas las sedes</option>
                {sedes.map(sede => <option key={sede._id} value={sede._id}>{sede.nombre}</option>)}
              </select>
            </div>

            <div className="mb-6">
              <MiniCalendar />
            </div>

            <div className="mb-6">
              {estilistas.length === 0 && selectedSede && <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">No hay estilistas en esta sede</div>}
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Resumen del día</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-600">Citas programadas:</span><span className="font-semibold text-green-600">{appointments.length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Estilistas activos:</span><span className="font-semibold text-blue-600">{estilistas.length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Horas cubiertas:</span><span className="font-semibold text-purple-600">{Math.round(appointments.reduce((acc, apt) => acc + apt.duracion, 0) / 60)}h</span></div>
              </div>
            </div>
            {/* Leyenda de estados de citas */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm mt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Estados de citas</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-xs text-gray-700">Confirmada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-gray-700">Reservada/Pendiente</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-xs text-gray-700">En Proceso</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-xs text-gray-700">Cancelada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span className="text-xs text-gray-700">Finalizada</span>
                </div>
              </div>
            </div>
            {/* Sección de bloqueos */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Bloqueos del día</h3>
                <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                  {bloqueos.length} bloqueos
                </span>
              </div>
              {bloqueos.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">
                  No hay bloqueos para esta fecha
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {bloqueos.map((bloqueo) => {
                    const profesional = estilistas.find(e => e.profesional_id === bloqueo.profesional_id);
                    return (
                      <div key={bloqueo._id} className="p-2 bg-red-50 border border-red-100 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-red-700">
                            🔒 {bloqueo.motivo}
                          </span>
                        </div>
                        <div className="text-xs text-red-600 mt-1">
                          <div className="flex justify-between">
                            <span>{profesional?.nombre || bloqueo.profesional_id}</span>
                            <span>{bloqueo.hora_inicio} - {bloqueo.hora_fin}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {loading && <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600"><Loader2 className="w-4 h-4 animate-spin" />Cargando datos...</div>}
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto bg-white/60 backdrop-blur-sm">
              <div className="min-w-max">
                <div className="flex bg-white/95 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-20 shadow-sm">
                  <div className="w-20 flex-shrink-0" />
                  {profesionales.length > 0 ? (
                    <div className="flex">
                      {profesionales.map((prof) => (
                        <div key={prof.estilista.unique_key} className="w-32 flex-shrink-0 p-3 border-l border-gray-200/60 text-center bg-white/80">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mx-auto mb-2 flex items-center justify-center text-sm font-bold text-white shadow-md">{prof.initials}</div>
                          <div className="text-xs font-semibold text-gray-900 truncate">{prof.name}</div>
                          <div className="text-[10px] text-gray-500 mt-1">{appointments.filter(apt => apt.profesional_id === prof.estilista.profesional_id).length} citas</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full p-8 text-center">
                      <div className="text-gray-500 text-lg mb-2">{selectedSede ? 'No hay estilistas en esta sede' : 'Selecciona una sede'}</div>
                      <div className="text-sm text-gray-400">{selectedSede ? 'Agrega estilistas para comenzar a programar' : 'Para ver los estilistas disponibles'}</div>
                    </div>
                  )}
                </div>

                {profesionales.length > 0 && (
                  <div className="relative">
                    {HOURS.map((hour) => (
                      <div key={hour}
                        className={`flex border-b border-gray-100/80 group z-0 relative  ${HOURS.indexOf(hour) % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/30 transition-colors`}>
                        <div className="w-20 flex-shrink-0 text-xs text-gray-600 p-3 text-right border-r border-gray-200/60 bg-white/95 backdrop-blur-sm sticky left-0 z-10 font-medium">{hour}</div>
                        {profesionales.map((prof) => (
                          <CalendarCell key={`${hour}-${prof.estilista.unique_key}`} prof={prof} hour={hour} />
                        ))}
                      </div>
                    ))}

                    {(() => {
                      const now = new Date();
                      const currentHour = now.getHours();
                      const currentMinute = now.getMinutes();
                      if (currentHour >= 5 && currentHour <= 19 && selectedDate.toDateString() === today.toDateString()) {
                        const minutesFrom5AM = (currentHour - 5) * 60 + currentMinute;
                        const top = (minutesFrom5AM / 30) * CELL_HEIGHT + HEADER_HEIGHT;
                        return (
                          <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: `${top}px` }}>
                            <div className="flex">
                              <div className="w-20 flex-shrink-0 flex items-center justify-end pr-3"><div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" /></div>
                              <div className="flex-1 border-t-2 border-red-500 border-dashed" />
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="absolute top-0 left-0 right-0 bottom-0 z-0 pointer-events-none">
                      {appointments.map((apt) => (
                        <CitaComponent key={`${apt.id}-${apt.start}-${apt.profesional_id}`} apt={apt} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {citaTooltip.visible && citaTooltip.cita && (
        <div
          className="fixed z-50 bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-5 max-w-sm transform -translate-y-1/2 animate-in fade-in-0 zoom-in-95 duration-200"
          style={{
            left: `${Math.min(citaTooltip.x + 10, window.innerWidth - 380)}px`,
            top: `${citaTooltip.y}px`
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-lg truncate">
                {citaTooltip.cita.cliente_nombre}
              </h3>
              <p className="text-sm text-gray-600 truncate">
                {citaTooltip.cita.servicio_nombre}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-green-500" />
              <span className="font-medium text-gray-700">
                {citaTooltip.cita.start} - {citaTooltip.cita.end}
              </span>
              <span className="text-gray-500">({citaTooltip.cita.duracion}min)</span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-gray-700">
                <strong>Estilista:</strong> {citaTooltip.cita.estilista_nombre}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              {citaTooltip.cita.estado}
            </div>
          </div>
        </div>
      )}

      {showBloqueoModal && (
        <Modal open={showBloqueoModal} onClose={handleClose} title="Bloqueo de horario">
          <Bloqueos
            onClose={handleBloqueoCreado}
            estilistaId={selectedCell?.estilista.profesional_id}
            fecha={selectedDateString}
            horaInicio={selectedCell?.hora}
          />
        </Modal>
      )}

      {showAppointmentModal && (
        <Modal open={showAppointmentModal} onClose={handleClose} title="Nueva Reserva" className="w-full max-w-[70vw] max-h-[85vh]">
          <div className="h-[75vh] w-full p-5 overflow-auto bg-white rounded-2xl shadow-xl">
            <AppointmentScheduler
              sedeId={sedeIdActual}
              estilistaId={selectedCell?.estilista.profesional_id}
              fecha={selectedDateString}
              horaSeleccionada={selectedCell?.hora}
              estilistas={estilistas}
              onClose={handleCitaCreada}
            />
          </div>
        </Modal>
      )}
      {showAppointmentDetails && (
        <AppointmentDetailsModal
          open={showAppointmentDetails}
          onClose={() => {
            setShowAppointmentDetails(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          onRefresh={() => {
            cargarCitas();
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
};

export default React.memo(CalendarScheduler);