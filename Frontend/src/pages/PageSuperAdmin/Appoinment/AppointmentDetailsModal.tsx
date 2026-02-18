// components/Quotes/AppointmentDetailsModal.tsx
import React, { useState, useEffect } from 'react';
import {
  User, Clock, XCircle, UserX,
  Loader2, CheckCircle, Plus, Package,
  CreditCard,
  CreditCard as CardIcon, Wallet, CalendarDays,
  Tag, Users, X, Bug, Landmark,
  Phone, Mail, DollarSign, AlertCircle,
  ShoppingBag, Trash2
} from 'lucide-react';
import Modal from '../../../components/ui/modal';
import { useAuth } from '../../../components/Auth/AuthContext';
import { updateCita, registrarPagoCita } from './citasApi';
import { formatDateDMY } from '../../../lib/dateFormat';
import { getServicios, type Servicio as ServicioCatalogo } from '../../../components/Quotes/serviciosApi';

interface AppointmentDetailsModalProps {
  open: boolean;
  onClose: () => void;
  appointment: any;
  onRefresh?: () => void;
}

interface PagoModalData {
  show: boolean;
  tipo: 'pago' | 'abono';
  monto: number;
  metodoPago: 'efectivo' | 'transferencia' | 'tarjeta' | 'tarjeta_credito' | 'tarjeta_debito' | 'addi';
}

interface Producto {
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  moneda: string;
  comision_porcentaje: number;
  comision_valor: number;
  agregado_por_email: string;
  agregado_por_rol: string;
  fecha_agregado: string;
  profesional_id: string;
}

interface ServicioSeleccionado {
  servicio_id: string;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
  precio_personalizado: number | null;
  usa_precio_personalizado: boolean;
}

interface ServicioDisponible {
  servicio_id: string;
  nombre: string;
  precio: number;
}

const ESTADOS_NO_EDITABLES_SERVICIOS = new Set([
  'cancelada',
  'completada',
  'finalizada',
  'no asistio',
  'no_asistio'
]);

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value: number): number => {
  return Math.round(value * 100) / 100;
};

const extraerMensajeError = (error: any, fallback: string): string => {
  const rawMessage = error?.message ?? error;

  if (!rawMessage) return fallback;
  if (typeof rawMessage === 'string') return rawMessage;

  if (Array.isArray(rawMessage)) {
    const joined = rawMessage
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && typeof item.msg === 'string') return item.msg;
        return JSON.stringify(item);
      })
      .join(' | ');
    return joined || fallback;
  }

  if (typeof rawMessage === 'object') {
    if (typeof rawMessage.detail === 'string') return rawMessage.detail;
    const entries = Object.entries(rawMessage)
      .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
      .join(' | ');
    return entries || fallback;
  }

  return fallback;
};

const normalizarServiciosCita = (servicios: any[] | undefined): ServicioSeleccionado[] => {
  if (!Array.isArray(servicios)) return [];

  return servicios
    .filter((servicio) => servicio && servicio.servicio_id)
    .map((servicio) => {
      const precioUnitario = roundMoney(toNumber(servicio.precio));
      const cantidad = Math.max(1, Math.trunc(toNumber(servicio.cantidad) || 1));
      const usaPrecioPersonalizado = Boolean(servicio.precio_personalizado);
      const subtotalRaw = servicio.subtotal !== undefined
        ? toNumber(servicio.subtotal)
        : precioUnitario * cantidad;

      return {
        servicio_id: String(servicio.servicio_id),
        nombre: String(servicio.nombre || 'Servicio'),
        precio_unitario: precioUnitario,
        cantidad,
        subtotal: roundMoney(subtotalRaw),
        precio_personalizado: usaPrecioPersonalizado ? precioUnitario : null,
        usa_precio_personalizado: usaPrecioPersonalizado
      };
    });
};

const normalizarComparacionServicios = (servicios: ServicioSeleccionado[]) => {
  return [...servicios]
    .map((servicio) => ({
      servicio_id: servicio.servicio_id,
      cantidad: servicio.cantidad,
      precio_unitario: roundMoney(servicio.precio_unitario),
      usa_precio_personalizado: servicio.usa_precio_personalizado
    }))
    .sort((a, b) => a.servicio_id.localeCompare(b.servicio_id));
};

const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({
  open,
  onClose,
  appointment,
  onRefresh
}) => {
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [appointmentDetails, setAppointmentDetails] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [pagoModal, setPagoModal] = useState<PagoModalData>({
    show: false,
    tipo: 'pago',
    monto: 0,
    metodoPago: 'efectivo'
  });
  const [registrandoPago, setRegistrandoPago] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<ServicioDisponible[]>([]);
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<ServicioSeleccionado[]>([]);
  const [serviciosOriginales, setServiciosOriginales] = useState<ServicioSeleccionado[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [loadingServiciosDisponibles, setLoadingServiciosDisponibles] = useState(false);
  const [savingServicios, setSavingServicios] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);

  const sessionCurrency = typeof window !== 'undefined' ? sessionStorage.getItem("beaux-moneda") : null;
  const userCurrency = String(user?.moneda || sessionCurrency || appointmentDetails?.rawData?.moneda || "USD").toUpperCase();
  const isCopCurrency = userCurrency === "COP";

  const sanitizeMetodoPago = (metodo: PagoModalData['metodoPago']): PagoModalData['metodoPago'] => {
    if (!isCopCurrency && metodo === 'addi') {
      return 'efectivo';
    }
    return metodo;
  };

  useEffect(() => {
    if (open && appointment) {
      setAppointmentDetails(appointment);
      setServiceError(null);
      setSelectedServiceId('');
      // Extraer productos de la cita
      if (appointment.rawData?.productos) {
        setProductos(appointment.rawData.productos);
      } else if (appointment.productos) {
        setProductos(appointment.productos);
      } else {
        setProductos([]);
      }

      const serviciosIniciales = normalizarServiciosCita(
        appointment.rawData?.servicios || appointment.servicios || []
      );
      setServiciosSeleccionados(serviciosIniciales);
      setServiciosOriginales(serviciosIniciales);
    }
  }, [open, appointment]);

  useEffect(() => {
    if (!isCopCurrency && pagoModal.metodoPago === 'addi') {
      setPagoModal((prev) => ({ ...prev, metodoPago: 'efectivo' }));
    }
  }, [isCopCurrency, pagoModal.metodoPago]);

  useEffect(() => {
    if (!open || !user?.access_token) return;

    let isCancelled = false;
    const cargarServiciosDisponibles = async () => {
      setLoadingServiciosDisponibles(true);
      try {
        const catalogoServicios: ServicioCatalogo[] = await getServicios(user.access_token);

        if (isCancelled) return;

        const serviciosMapeados = catalogoServicios
          .filter((servicio) => servicio?.activo !== false)
          .map((servicio) => ({
            servicio_id: String(servicio.servicio_id || servicio._id),
            nombre: String(servicio.nombre || 'Servicio'),
            precio: roundMoney(
              servicio.precio_local !== undefined ? toNumber(servicio.precio_local) : toNumber(servicio.precio)
            )
          }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));

        setServiciosDisponibles(serviciosMapeados);
      } catch (error: any) {
        if (isCancelled) return;
        setServiciosDisponibles([]);
        setServiceError(extraerMensajeError(error, 'No se pudieron cargar los servicios disponibles.'));
      } finally {
        if (!isCancelled) {
          setLoadingServiciosDisponibles(false);
        }
      }
    };

    cargarServiciosDisponibles();
    return () => {
      isCancelled = true;
    };
  }, [open, user?.access_token]);

  const estadoCitaActual = String(appointmentDetails?.estado || '').toLowerCase().trim();
  const isEstadoNoEditableServicios = ESTADOS_NO_EDITABLES_SERVICIOS.has(estadoCitaActual);

  const totalServicios = roundMoney(
    serviciosSeleccionados.reduce((total, servicio) => total + roundMoney(servicio.subtotal), 0)
  );
  const totalProductos = roundMoney(
    productos.reduce((total, producto) => total + toNumber(producto.subtotal), 0)
  );
  const totalCitaCalculado = roundMoney(totalServicios + totalProductos);

  const hasUnsavedServiceChanges = JSON.stringify(normalizarComparacionServicios(serviciosSeleccionados))
    !== JSON.stringify(normalizarComparacionServicios(serviciosOriginales));

  const isServiceActionsDisabled = updating || savingServicios || isEstadoNoEditableServicios;

  const getPagosData = () => {
    if (!appointmentDetails?.rawData) {
      return {
        totalCita: 0,
        abonado: 0,
        saldoPendiente: 0,
        estadoPago: 'pendiente',
        tieneAbono: false,
        estaPagadoCompleto: false,
        pagos: []
      };
    }

    const rawData = appointmentDetails.rawData;
    const totalCita = parseFloat(rawData.valor_total) || 0;
    const abonado = parseFloat(rawData.abono) || 0;

    const saldoPendienteFromData = parseFloat(rawData.saldo_pendiente);
    let saldoPendiente = saldoPendienteFromData;

    if (isNaN(saldoPendiente) || saldoPendiente < 0) {
      saldoPendiente = Math.max(0, totalCita - abonado);
    }

    const estaPagadoCompleto = saldoPendiente <= 0;

    let estadoPago = rawData.estado_pago || 'pendiente';

    if (estaPagadoCompleto) {
      estadoPago = 'pagado';
    } else if (abonado > 0) {
      estadoPago = 'abonado';
    } else {
      estadoPago = 'pendiente';
    }

    const tieneAbono = abonado > 0;

    const pagos = [];

    if (abonado > 0) {
      pagos.push({
        fecha: formatDateDMY(rawData.fecha_creacion, formatDateDMY(new Date())),
        tipo: 'Abono',
        monto: abonado,
        metodo: rawData.metodo_pago || 'Efectivo',
        registradoPor: rawData.creada_por_rol === 'admin_sede' ? 'Administrador' : 'Sistema'
      });
    }

    return {
      totalCita,
      abonado,
      saldoPendiente,
      estadoPago,
      tieneAbono,
      estaPagadoCompleto,
      pagos
    };
  };

  const shouldDisableActions = () => {
    const pagosData = getPagosData();
    
    if (updating) return true;
    
    if (['cancelada', 'no asistio'].includes(appointmentDetails?.estado?.toLowerCase())) {
      return true;
    }

    if (pagosData?.estaPagadoCompleto) {
      return true;
    }

    if (appointmentDetails?.estado?.toLowerCase() === 'completada') {
      return true;
    }

    return false;
  };

  const handleUpdateStatus = async (nuevoEstado: string) => {
    if (!appointmentDetails?.id || !user?.access_token) {
      alert('No se puede actualizar: falta información de autenticación');
      return;
    }

    const mensajes = {
      'cancelada': '⚠️ ¿Cancelar esta cita?\n\nLa cita se marcará como cancelada.',
      'no asistio': '⚠️ ¿Marcar como "No Asistió"?\n\nEl cliente no se presentó a la cita.'
    };

    if (!confirm(mensajes[nuevoEstado as keyof typeof mensajes] || `¿Cambiar estado a "${nuevoEstado}"?`)) {
      return;
    }

    setUpdating(true);
    try {
      await updateCita(
        appointmentDetails.id,
        { estado: nuevoEstado },
        user.access_token
      );

      setAppointmentDetails({
        ...appointmentDetails,
        estado: nuevoEstado
      });

      alert(`✅ Estado cambiado a: ${nuevoEstado}`);

      if (onRefresh) {
        setTimeout(() => onRefresh(), 500);
      }

    } catch (error: any) {
      console.error('Error actualizando estado:', error);
      alert(`❌ Error: ${extraerMensajeError(error, 'No se pudo actualizar el estado')}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleRegistrarPago = async () => {
    if (!appointmentDetails?.id || !user?.access_token) {
      alert('No se puede registrar pago: falta información de autenticación');
      return;
    }

    if (pagoModal.monto <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    const pagosData = getPagosData();

    if (pagoModal.monto > pagosData.saldoPendiente) {
      alert(`El monto excede el saldo pendiente de $${pagosData.saldoPendiente}`);
      return;
    }

    const metodoPagoSeguro = sanitizeMetodoPago(pagoModal.metodoPago);
    const confirmacion = confirm(
      `¿Registrar ${pagoModal.tipo === 'pago' ? 'pago' : 'abono'} de $${pagoModal.monto} por ${metodoPagoSeguro}?`
    );

    if (!confirmacion) return;

    setRegistrandoPago(true);
    try {
      const response = await registrarPagoCita(
        appointmentDetails.id,
        {
          monto: pagoModal.monto,
          metodo_pago: metodoPagoSeguro
        },
        user.access_token
      );

      setAppointmentDetails((prev: any) => ({
        ...prev,
        rawData: {
          ...prev.rawData,
          abono: response.abono,
          saldo_pendiente: response.saldo_pendiente,
          estado_pago: response.estado_pago,
          metodo_pago: metodoPagoSeguro
        }
      }));

      alert(`✅ ${pagoModal.tipo === 'pago' ? 'Pago' : 'Abono'} registrado exitosamente`);

      setPagoModal({
        show: false,
        tipo: 'pago',
        monto: 0,
        metodoPago: 'efectivo'
      });

      if (onRefresh) {
        setTimeout(() => onRefresh(), 500);
      }

    } catch (error: any) {
      console.error('Error registrando pago:', error);
      alert(`❌ Error: ${extraerMensajeError(error, 'No se pudo registrar el pago')}`);
    } finally {
      setRegistrandoPago(false);
    }
  };

  const handleAgregarServicio = () => {
    if (!selectedServiceId) return;

    if (serviciosSeleccionados.some((servicio) => servicio.servicio_id === selectedServiceId)) {
      setServiceError('El servicio ya está agregado en la cita.');
      return;
    }

    const servicioCatalogo = serviciosDisponibles.find((servicio) => servicio.servicio_id === selectedServiceId);
    if (!servicioCatalogo) {
      setServiceError('No se encontró el servicio seleccionado.');
      return;
    }

    const nuevoServicio: ServicioSeleccionado = {
      servicio_id: servicioCatalogo.servicio_id,
      nombre: servicioCatalogo.nombre,
      precio_unitario: servicioCatalogo.precio,
      cantidad: 1,
      subtotal: roundMoney(servicioCatalogo.precio),
      precio_personalizado: null,
      usa_precio_personalizado: false
    };

    setServiciosSeleccionados((prev) => [...prev, nuevoServicio]);
    setSelectedServiceId('');
    setServiceError(null);
  };

  const handleEliminarServicio = (servicioId: string) => {
    setServiciosSeleccionados((prev) => prev.filter((servicio) => servicio.servicio_id !== servicioId));
    setServiceError(null);
  };

  const handleActualizarCantidad = (servicioId: string, cantidadInput: string) => {
    const cantidad = Math.max(1, Math.trunc(toNumber(cantidadInput) || 1));

    setServiciosSeleccionados((prev) =>
      prev.map((servicio) => {
        if (servicio.servicio_id !== servicioId) return servicio;
        const subtotal = roundMoney(servicio.precio_unitario * cantidad);
        return {
          ...servicio,
          cantidad,
          subtotal
        };
      })
    );
  };

  const handleGuardarServicios = async () => {
    if (!appointmentDetails?.id || !user?.access_token) {
      alert('No se puede guardar: falta información de autenticación.');
      return;
    }

    if (isEstadoNoEditableServicios) {
      alert('No se pueden editar servicios en el estado actual de la cita.');
      return;
    }

    if (serviciosSeleccionados.length === 0) {
      setServiceError('Debes mantener al menos un servicio en la cita.');
      return;
    }

    setSavingServicios(true);
    setServiceError(null);

    try {
      const serviciosPayload = serviciosSeleccionados.map((servicio) => ({
        servicio_id: servicio.servicio_id,
        precio_personalizado: servicio.usa_precio_personalizado ? servicio.precio_unitario : null,
        cantidad: servicio.cantidad
      }));

      const response = await updateCita(
        appointmentDetails.id,
        { servicios: serviciosPayload },
        user.access_token
      );

      const citaActualizada = response?.cita || {};
      const serviciosActualizados = normalizarServiciosCita(citaActualizada.servicios || []);

      setServiciosSeleccionados(serviciosActualizados);
      setServiciosOriginales(serviciosActualizados);

      setAppointmentDetails((prev: any) => ({
        ...prev,
        servicio_nombre: citaActualizada.servicio_nombre || prev?.servicio_nombre,
        rawData: {
          ...prev?.rawData,
          ...citaActualizada,
          servicios: citaActualizada.servicios || prev?.rawData?.servicios || [],
          valor_total: citaActualizada.valor_total ?? prev?.rawData?.valor_total,
          saldo_pendiente: citaActualizada.saldo_pendiente ?? prev?.rawData?.saldo_pendiente,
          estado_pago: citaActualizada.estado_pago ?? prev?.rawData?.estado_pago
        }
      }));

      alert('Servicios actualizados correctamente.');
      if (onRefresh) {
        setTimeout(() => onRefresh(), 400);
      }
    } catch (error: any) {
      const mensaje = extraerMensajeError(error, 'No se pudieron guardar los servicios.');
      setServiceError(mensaje);
      alert(`Error al guardar servicios: ${mensaje}`);
    } finally {
      setSavingServicios(false);
    }
  };

  const getStatusColor = (_: string) => {
    return 'bg-gray-100 text-gray-900 border border-gray-300';
  };

  const getEstadoPagoColor = (_: string) => {
    return 'bg-gray-100 text-gray-900 border border-gray-300';
  };

  const getEstadoPagoTexto = (estado: string, pagosData: any) => {
    if (!pagosData) return 'PENDIENTE';

    switch (estado?.toLowerCase()) {
      case 'pagado':
        return 'PAGADO';
      case 'abonado':
        return 'PAGO PARCIAL';
      case 'pendiente':
        return pagosData.tieneAbono ? 'PAGO PARCIAL' : 'SIN PAGO';
      default:
        return estado?.toUpperCase() || 'PENDIENTE';
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  const formatFechaSegura = (fechaString: string) => {
    return formatDateDMY(fechaString, 'Fecha no especificada');
  };

  const getPrecio = () => {
    if (!appointmentDetails) return '0';

    const precioGuardado =
      appointmentDetails.valor_total ||
      appointmentDetails.rawData?.valor_total ||
      appointmentDetails.precio ||
      '0';

    const precioNumericoGuardado = toNumber(precioGuardado);
    const usarTotalCalculado = serviciosSeleccionados.length > 0 || hasUnsavedServiceChanges;
    const total = usarTotalCalculado ? totalCitaCalculado : precioNumericoGuardado;

    return roundMoney(total).toString();
  };

  const getTotalProductos = () => {
    if (productos.length === 0) return 0;
    return productos.reduce((total, producto) => total + producto.subtotal, 0);
  };

  const getTotalComision = () => {
    if (productos.length === 0) return 0;
    return productos.reduce((total, producto) => total + producto.comision_valor, 0);
  };

  const formatFechaHora = (fechaString: string) => {
    if (!fechaString) return 'Fecha no disponible';
    const fecha = new Date(fechaString);
    if (Number.isNaN(fecha.getTime())) {
      return formatDateDMY(fechaString, fechaString);
    }
    const horas = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    return `${formatDateDMY(fecha)} ${horas}:${minutos}`;
  };

  const renderPagoModal = () => {
    if (!pagoModal.show) return null;

    const pagosData = getPagosData();
    const tipoTexto = pagoModal.tipo === 'pago' ? 'pago' : 'abono';
    const maxMonto = pagosData.saldoPendiente;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 p-1">
        <div className="bg-white rounded w-full max-w-xs shadow-lg border border-gray-200">
          <div className="p-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-semibold text-gray-900">
                Registrar {tipoTexto}
              </h3>
              <button
                onClick={() => setPagoModal(prev => ({ ...prev, show: false }))}
                className="text-gray-500 hover:text-gray-700 p-0.5"
                disabled={registrandoPago}
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="bg-gray-50 p-1.5 rounded text-[10px]">
                <div className="text-gray-600 mb-0.5">Cliente</div>
                <div className="font-medium text-gray-900">{appointmentDetails.cliente_nombre}</div>
                <div className="text-gray-600 mt-0.5">
                  Saldo: <span className="font-bold text-gray-900">${pagosData.saldoPendiente}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  Monto *
                </label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-[10px]">$</span>
                  <input
                    type="number"
                    min="0"
                    max={maxMonto}
                    step="0.01"
                    value={pagoModal.monto || ''}
                    onChange={(e) => setPagoModal(prev => ({
                      ...prev,
                      monto: parseFloat(e.target.value) || 0
                    }))}
                    className="w-full pl-5 pr-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-0 focus:border-black"
                    placeholder={`0.00 (máx: $${maxMonto})`}
                    disabled={registrandoPago}
                  />
                </div>
                <div className="text-[9px] text-gray-500 mt-0.5">
                  Saldo disponible: ${maxMonto}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  Método de pago *
                </label>
                <div className={`grid grid-cols-2 sm:grid-cols-3 ${isCopCurrency ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-1`}>
                  <button
                    type="button"
                    onClick={() => setPagoModal(prev => ({ ...prev, metodoPago: 'efectivo' }))}
                    className={`p-1 rounded border flex flex-col items-center justify-center gap-0.5 text-[10px] ${
                      pagoModal.metodoPago === 'efectivo' ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    disabled={registrandoPago}
                  >
                    <Wallet className="w-3 h-3 text-gray-700" />
                    <span className="font-medium">Efectivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPagoModal(prev => ({ ...prev, metodoPago: 'transferencia' }))}
                    className={`p-1 rounded border flex flex-col items-center justify-center gap-0.5 text-[10px] ${
                      pagoModal.metodoPago === 'transferencia' ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    disabled={registrandoPago}
                  >
                    <Landmark className="w-3 h-3 text-gray-700" />
                    <span className="font-medium">Transfer.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPagoModal(prev => ({ ...prev, metodoPago: 'tarjeta_credito' }))}
                    className={`p-1 rounded border flex flex-col items-center justify-center gap-0.5 text-[10px] ${
                      pagoModal.metodoPago === 'tarjeta_credito' ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    disabled={registrandoPago}
                  >
                    <CreditCard className="w-3 h-3 text-gray-700" />
                    <span className="font-medium">T. Crédito</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPagoModal(prev => ({ ...prev, metodoPago: 'tarjeta_debito' }))}
                    className={`p-1 rounded border flex flex-col items-center justify-center gap-0.5 text-[10px] ${
                      pagoModal.metodoPago === 'tarjeta_debito' ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    disabled={registrandoPago}
                  >
                    <CreditCard className="w-3 h-3 text-gray-700" />
                    <span className="font-medium">T. Débito</span>
                  </button>
                  {isCopCurrency && (
                    <button
                      type="button"
                      onClick={() => setPagoModal(prev => ({ ...prev, metodoPago: 'addi' }))}
                      className={`p-1 rounded border flex flex-col items-center justify-center gap-0.5 text-[10px] ${
                        pagoModal.metodoPago === 'addi' ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400'
                      }`}
                      disabled={registrandoPago}
                    >
                      <Wallet className="w-3 h-3 text-gray-700" />
                      <span className="font-medium">Addi</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => setPagoModal(prev => ({ ...prev, show: false }))}
                  className="flex-1 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium text-[10px]"
                  disabled={registrandoPago}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRegistrarPago}
                  disabled={registrandoPago || pagoModal.monto <= 0 || pagoModal.monto > maxMonto}
                  className="flex-1 py-1 bg-black text-white rounded hover:bg-gray-800 font-medium text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registrandoPago ? (
                    <>
                      <Loader2 className="w-2.5 h-2.5 animate-spin inline mr-0.5" />
                      Registrando...
                    </>
                  ) : (
                    `Registrar ${tipoTexto}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProductos = () => {
    if (productos.length === 0) {
      return (
        <div className="text-center py-2 text-gray-400 text-xs">
          <Package className="w-5 h-5 mx-auto mb-1 text-gray-300" />
          <p>No hay productos registrados</p>
        </div>
      );
    }

    return (
      <div className="space-y-1.5">
        {/* Resumen de productos */}
        <div className="bg-gray-50 p-1.5 rounded grid grid-cols-3 gap-1 text-xs">
          <div className="text-center">
            <div className="text-gray-600 font-medium">Total Productos</div>
            <div className="text-sm font-bold text-gray-900">${getTotalProductos()}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-600 font-medium">Comisión Total</div>
            <div className="text-sm font-bold text-gray-900">${getTotalComision()}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-600 font-medium">Cantidad</div>
            <div className="text-sm font-bold text-gray-900">{productos.length}</div>
          </div>
        </div>

        {/* Lista de productos */}
        <div className="space-y-1">
          {productos.map((producto, index) => (
            <div key={index} className="p-1.5 border border-gray-200 rounded hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ShoppingBag className="w-3 h-3 text-gray-700 flex-shrink-0" />
                    <h4 className="text-xs font-bold text-gray-900 truncate">
                      {producto.nombre}
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1 text-[10px] mb-1">
                    <div className="text-gray-600">
                      Cantidad: <span className="font-bold text-gray-900">{producto.cantidad}</span>
                    </div>
                    <div className="text-gray-600">
                      Precio: <span className="font-bold text-gray-900">${producto.precio_unitario}</span>
                    </div>
                    <div className="text-gray-600">
                      Subtotal: <span className="font-bold text-green-700">${producto.subtotal}</span>
                    </div>
                    <div className="text-gray-600">
                      Comisión: <span className="font-bold text-blue-700">${producto.comision_valor}</span>
                      <span className="text-gray-500 ml-0.5">({producto.comision_porcentaje}%)</span>
                    </div>
                  </div>
                  
                  <div className="text-[9px] text-gray-500 flex items-center gap-1">
                    <User className="w-2 h-2" />
                    <span className="truncate">
                      Agregado por: {producto.agregado_por_email} ({producto.agregado_por_rol})
                    </span>
                  </div>
                  <div className="text-[9px] text-gray-500 flex items-center gap-1 mt-0.5">
                    <CalendarDays className="w-2 h-2" />
                    <span className="truncate">
                      {formatFechaHora(producto.fecha_agregado)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderServiciosEditor = () => {
    const serviciosDisponiblesParaAgregar = serviciosDisponibles.filter(
      (servicio) => !serviciosSeleccionados.some((seleccionado) => seleccionado.servicio_id === servicio.servicio_id)
    );

    return (
      <div className="space-y-2">
        {serviceError && (
          <div className="p-2 border border-red-200 bg-red-50 rounded text-xs text-red-700">
            {serviceError}
          </div>
        )}

        {isEstadoNoEditableServicios && (
          <div className="p-2 border border-gray-300 bg-gray-50 rounded text-xs text-gray-700">
            Esta cita no permite edición de servicios por su estado actual.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-1.5">
          <select
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            disabled={isServiceActionsDisabled || loadingServiciosDisponibles}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-0 focus:border-black disabled:bg-gray-100"
          >
            <option value="">
              {loadingServiciosDisponibles ? 'Cargando servicios...' : 'Seleccionar servicio para agregar'}
            </option>
            {serviciosDisponiblesParaAgregar.map((servicio) => (
              <option key={servicio.servicio_id} value={servicio.servicio_id}>
                {servicio.nombre} - ${servicio.precio}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleAgregarServicio}
            disabled={
              isServiceActionsDisabled ||
              loadingServiciosDisponibles ||
              !selectedServiceId ||
              serviciosDisponiblesParaAgregar.length === 0
            }
            className="px-2 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 flex items-center justify-center gap-1 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-3 h-3" />
            Agregar servicio
          </button>
        </div>

        {serviciosSeleccionados.length === 0 ? (
          <div className="text-center py-3 text-gray-400 text-xs border border-dashed border-gray-300 rounded">
            No hay servicios seleccionados en esta cita.
          </div>
        ) : (
          <div className="space-y-1">
            {serviciosSeleccionados.map((servicio) => (
              <div key={servicio.servicio_id} className="p-2 border border-gray-200 rounded">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{servicio.nombre}</p>
                    <p className="text-[10px] text-gray-600">
                      Precio unitario: ${servicio.precio_unitario}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEliminarServicio(servicio.servicio_id)}
                    disabled={isServiceActionsDisabled}
                    className="p-1 text-gray-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Eliminar servicio"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Cantidad</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={servicio.cantidad}
                      onChange={(e) => handleActualizarCantidad(servicio.servicio_id, e.target.value)}
                      disabled={isServiceActionsDisabled}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-0 focus:border-black disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Subtotal</label>
                    <div className="border border-gray-200 rounded px-2 py-1 text-xs font-semibold text-gray-900 bg-gray-50">
                      ${servicio.subtotal}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-gray-50 p-2 rounded grid grid-cols-2 gap-1 text-xs">
          <div className="text-gray-700">
            Total servicios: <span className="font-bold text-gray-900">${totalServicios}</span>
          </div>
          <div className="text-gray-700 text-right">
            Total estimado cita: <span className="font-bold text-gray-900">${totalCitaCalculado}</span>
          </div>
        </div>

        <div className="flex justify-end items-center gap-2">
          {hasUnsavedServiceChanges && (
            <span className="text-[10px] text-gray-600">Hay cambios sin guardar</span>
          )}
          <button
            type="button"
            onClick={handleGuardarServicios}
            disabled={isServiceActionsDisabled || !hasUnsavedServiceChanges || serviciosSeleccionados.length === 0}
            className="px-2 py-1 bg-black text-white rounded hover:bg-gray-800 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {savingServicios ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar cambios'
            )}
          </button>
        </div>
      </div>
    );
  };

  if (!appointmentDetails) return null;

  const pagosData = getPagosData();

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title=""
        className="w-full max-w-[95vw] lg:max-w-[85vw] xl:max-w-[75vw]"
      >
        <div className="overflow-y-auto max-h-[90vh] md:max-h-[85vh]">
          {updating ? (
            <div className="flex flex-col items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-gray-900 animate-spin mb-1" />
              <p className="text-xs text-gray-600">Actualizando estado...</p>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {/* Panel de Debug */}
              {showDebug && (
                <div className="bg-black text-white p-1.5 rounded mb-1.5 max-h-60 overflow-y-auto text-[9px]">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-xs font-bold flex items-center gap-0.5">
                      <Bug className="w-2.5 h-2.5" />
                      Debug Data
                    </h3>
                    <button
                      onClick={() => setShowDebug(false)}
                      className="text-gray-300 hover:text-white p-0.5"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-300 mb-0.5">💰 Cálculos de Pagos:</h4>
                      <div className="space-y-0.5">
                        <div><span className="text-gray-400">Total Cita:</span> <span className="text-white">${pagosData.totalCita}</span></div>
                        <div><span className="text-gray-400">Abonado:</span> <span className="text-white">${pagosData.abonado}</span></div>
                        <div><span className="text-gray-400">Saldo Pendiente:</span> <span className="text-white">${pagosData.saldoPendiente}</span></div>
                        <div><span className="text-gray-400">Estado Pago:</span> <span className="text-white">{pagosData.estadoPago}</span></div>
                        <div><span className="text-gray-400">Total Productos:</span> <span className="text-white">${getTotalProductos()}</span></div>
                        <div><span className="text-gray-400">Comisión Total:</span> <span className="text-white">${getTotalComision()}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Header Superior */}
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-sm font-semibold text-gray-900">Detalles de cita</h2>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-0.5 rounded"
                >
                </button>
              </div>

              {/* Header Principal */}
              <div className="border-b border-gray-200 pb-2">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-gray-700" />
                      </div>
                      <div className="min-w-0">
                        <h1 className="text-base font-bold text-gray-900 truncate">
                          {appointmentDetails.cliente_nombre || 'Cliente'}
                        </h1>
                        <p className="text-xs text-gray-700 truncate">
                          {appointmentDetails.servicio_nombre || 'Servicio'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className={`px-1.5 py-0.5 rounded font-medium text-[10px] border border-gray-300 ${getStatusColor(appointmentDetails.estado)}`}>
                          {appointmentDetails.estado?.toUpperCase() || 'PENDIENTE'}
                        </span>

                        {pagosData.tieneAbono && !pagosData.estaPagadoCompleto && (
                          <div className="flex items-center gap-0.5 bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                            <Tag className="w-2.5 h-2.5 text-gray-800" />
                            <div className="font-bold text-gray-800">Abono parcial</div>
                          </div>
                        )}

                        <span className={`px-1.5 py-0.5 rounded font-medium text-[10px] border border-gray-300 ${getEstadoPagoColor(pagosData.estadoPago)}`}>
                          {getEstadoPagoTexto(pagosData.estadoPago, pagosData)}
                        </span>
                      </div>

                      <div className="text-sm font-bold text-gray-900 border-l border-gray-300 pl-1.5">
                        Total: <span className="text-black">${getPrecio()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contenido Principal */}
              <div className="space-y-2">
                {/* Información del Cliente */}
                <div className="bg-white border border-gray-200 rounded p-2">
                  <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-gray-200">
                    <User className="w-3 h-3 text-gray-700 flex-shrink-0" />
                    <h3 className="text-sm font-bold text-gray-900 truncate">Información del Cliente</h3>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Users className="w-3.5 h-3.5 text-gray-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {appointmentDetails.cliente_nombre}
                        </p>
                        {appointmentDetails.rawData?.cliente_telefono && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                            <Phone className="w-2.5 h-2.5" />
                            <span className="truncate">{appointmentDetails.rawData.cliente_telefono}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {appointmentDetails.rawData?.cliente_email && (
                      <div>
                        <div className="text-xs text-gray-500 font-medium mb-0.5">Email</div>
                        <div className="flex items-center gap-1">
                          <Mail className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" />
                          <p className="text-sm font-medium text-gray-900 truncate">{appointmentDetails.rawData.cliente_email}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Horario y Sede */}
                <div className="bg-white border border-gray-200 rounded p-2">
                  <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-gray-200">
                    <CalendarDays className="w-3 h-3 text-gray-700 flex-shrink-0" />
                    <h3 className="text-sm font-bold text-gray-900 truncate">Horario y Sede</h3>
                  </div>

                  <div className="space-y-1.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-3 h-3 text-gray-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-gray-500 font-medium">Fecha</div>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {formatFechaSegura(appointmentDetails.rawData?.fecha) || 'Fecha no especificada'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-gray-500 font-medium mb-0.5">Profesional</div>
                        <div className="flex items-center gap-1">
                          <User className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" />
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {appointmentDetails.estilista_nombre || 'Nombre del estilista'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 font-medium mb-0.5">Horario</div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" />
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {formatTime(appointmentDetails.start)} - {formatTime(appointmentDetails.end)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Servicios de la cita */}
                <div className="bg-white border border-gray-200 rounded p-2">
                  <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-gray-200">
                    <Tag className="w-3 h-3 text-gray-700 flex-shrink-0" />
                    <h3 className="text-sm font-bold text-gray-900 truncate">
                      Servicios de la cita {serviciosSeleccionados.length > 0 && `(${serviciosSeleccionados.length})`}
                    </h3>
                  </div>
                  {renderServiciosEditor()}
                </div>

                {/* Productos y Extras - MODIFICADO */}
                <div className="bg-white border border-gray-200 rounded p-2">
                  <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-gray-200">
                    <Package className="w-3 h-3 text-gray-700 flex-shrink-0" />
                    <h3 className="text-sm font-bold text-gray-900 truncate">
                      Productos y extras {productos.length > 0 && `(${productos.length})`}
                    </h3>
                  </div>

                  {renderProductos()}
                </div>

                {/* Pagos y Abonos */}
                <div className="bg-white border border-gray-200 rounded p-2">
                  <div className="flex items-center justify-between gap-1.5 mb-2 pb-1.5 border-b border-gray-200">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-gray-700 flex-shrink-0" />
                      <h3 className="text-sm font-bold text-gray-900 truncate">Pagos y Abonos</h3>
                    </div>
                    
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => setPagoModal({
                          show: true,
                          tipo: 'pago',
                          monto: pagosData.saldoPendiente,
                          metodoPago: 'efectivo'
                        })}
                        disabled={pagosData.estaPagadoCompleto || registrandoPago || hasUnsavedServiceChanges}
                        className="px-2 py-1 bg-black text-white rounded hover:bg-gray-800 flex items-center justify-center gap-1 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <DollarSign className="w-2.5 h-2.5" />  
                        <span>Registrar Pago</span>
                      </button>
                      <button
                        onClick={() => setPagoModal({
                          show: true,
                          tipo: 'abono',
                          monto: 0,
                          metodoPago: 'efectivo'
                        })}
                        disabled={pagosData.estaPagadoCompleto || registrandoPago || hasUnsavedServiceChanges}
                        className="px-2 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 flex items-center justify-center gap-1 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>Agregar Abono</span>
                      </button>
                    </div>
                  </div>

                  {hasUnsavedServiceChanges && (
                    <div className="mb-2 p-1.5 text-[10px] text-gray-700 bg-gray-50 border border-gray-200 rounded">
                      Guarda los cambios de servicios antes de registrar pagos o abonos.
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 mb-3">
                    <div className="bg-gray-50 p-1.5 rounded text-center">
                      <div className="text-xs text-gray-600 font-medium">Total</div>
                      <div className="text-sm font-bold text-gray-900">${pagosData.totalCita}</div>
                    </div>

                    <div className={`p-1.5 rounded text-center ${pagosData.tieneAbono ? 'bg-gray-100' : 'bg-gray-50'}`}>
                      <div className={`text-xs font-medium ${pagosData.tieneAbono ? 'text-gray-900' : 'text-gray-600'}`}>
                        {pagosData.tieneAbono ? 'Abonado' : 'Sin abono'}
                      </div>
                      <div className={`text-sm font-bold ${pagosData.tieneAbono ? 'text-black' : 'text-gray-700'}`}>
                        ${pagosData.abonado}
                      </div>
                    </div>

                    <div className={`p-1.5 rounded text-center ${pagosData.saldoPendiente > 0 ? 'bg-gray-100' : 'bg-gray-50'}`}>
                      <div className={`text-xs font-medium ${pagosData.saldoPendiente > 0 ? 'text-gray-900' : 'text-gray-600'}`}>
                        Saldo
                      </div>
                      <div className={`text-sm font-bold ${pagosData.saldoPendiente > 0 ? 'text-black' : 'text-gray-700'}`}>
                        ${pagosData.saldoPendiente}
                      </div>
                    </div>

                    <div className={`p-1.5 rounded text-center ${pagosData.estaPagadoCompleto ? 'bg-gray-100' : 'bg-gray-50'}`}>
                      <div className={`text-xs font-medium ${pagosData.estaPagadoCompleto ? 'text-gray-900' : 'text-gray-600'}`}>
                        {pagosData.estaPagadoCompleto ? 'Pagado' : 'Falta'}
                      </div>
                      <div className={`text-sm font-bold ${pagosData.estaPagadoCompleto ? 'text-black' : 'text-gray-700'}`}>
                        ${pagosData.estaPagadoCompleto ? 0 : pagosData.saldoPendiente}
                      </div>
                    </div>
                  </div>

                  {/* Historial de Pagos */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-xs font-bold text-gray-900">Historial de pagos</h4>
                    </div>

                    <div className="space-y-1">
                      {pagosData.pagos.length > 0 ? (
                        pagosData.pagos.map((pago, index) => (
                          <div key={index} className="p-1.5 border border-gray-200 rounded text-xs">
                            <div className="flex justify-between items-start">
                              <div className="flex items-start gap-2 min-w-0 flex-1">
                                <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${pago.metodo === 'Efectivo' ? 'bg-gray-100' : 'bg-gray-100'}`}>
                                  {pago.metodo === 'Efectivo' ?
                                    <Wallet className="w-3 h-3 text-gray-700" /> :
                                    <CardIcon className="w-3 h-3 text-gray-700" />
                                  }
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-gray-900 truncate">
                                    {pago.tipo} · ${pago.monto}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 truncate">
                                    <CalendarDays className="w-2.5 h-2.5 flex-shrink-0" />
                                    <span className="truncate">{pago.fecha} • {pago.metodo}</span>
                                  </div>
                                  <div className="text-xs text-gray-400 truncate">
                                    Registrado por: {pago.registradoPor}
                                  </div>
                                </div>
                              </div>
                              <CheckCircle className="w-3 h-3 text-gray-700 flex-shrink-0 mt-0.5" />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-2 text-gray-400 text-xs">
                          <Wallet className="w-4 h-4 mx-auto mb-1 text-gray-300" />
                          <p>No hay pagos registrados</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notas Adicionales */}
                <div className="bg-white border border-gray-200 rounded p-2">
                  <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-gray-200">
                    <AlertCircle className="w-3 h-3 text-gray-700 flex-shrink-0" />
                    <h3 className="text-sm font-bold text-gray-900 truncate">Notas adicionales</h3>
                  </div>

                  <div className="text-center py-2 text-gray-400 text-xs">
                    <AlertCircle className="w-4 h-4 mx-auto mb-1 text-gray-300" />
                    <p>No hay notas adicionales</p>
                  </div>
                </div>
              </div>

              {/* Acciones Finales */}
              <div className="flex flex-col sm:flex-row justify-between gap-1.5 pt-2 border-t border-gray-200">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleUpdateStatus('cancelada')}
                    disabled={shouldDisableActions()}
                    className="flex-1 sm:flex-none px-2 py-1 bg-black text-white rounded hover:bg-gray-800 font-medium flex items-center justify-center gap-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="w-2.5 h-2.5" />
                    Cancelar Cita
                  </button>

                  <button
                    onClick={() => handleUpdateStatus('no asistio')}
                    disabled={shouldDisableActions()}
                    className="flex-1 sm:flex-none px-2 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium flex items-center justify-center gap-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserX className="w-2.5 h-2.5" />
                    No Asistió
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="px-2 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium text-xs mt-1 sm:mt-0"
                  disabled={updating}
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal para registrar pago/abono */}
      {renderPagoModal()}
    </>
  );
};

export default AppointmentDetailsModal;
