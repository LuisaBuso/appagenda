// components/Quotes/AppointmentDetailsModal.tsx
import React, { useState, useEffect } from 'react';
import { User, Clock, Scissors, MapPin, DollarSign, Calendar, Phone, Mail, Tag, AlertCircle, Edit, XCircle, UserX, Loader2 } from 'lucide-react';
import Modal from '../../../components/ui/modal';
import { useAuth } from '../../../components/Auth/AuthContext';
import { updateCita } from './citasApi'; // Asegúrate de tener esta función

interface AppointmentDetailsModalProps {
  open: boolean;
  onClose: () => void;
  appointment: any;
  onRefresh?: () => void;
}

const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({
  open,
  onClose,
  appointment,
  onRefresh
}) => {
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [appointmentDetails, setAppointmentDetails] = useState<any>(null);

  useEffect(() => {
    if (open && appointment) {
      setAppointmentDetails(appointment);
    }
  }, [open, appointment]);

  const handleUpdateStatus = async (nuevoEstado: string) => {
    if (!appointmentDetails?.id || !user?.access_token) {
      alert('No se puede actualizar: falta información de autenticación');
      return;
    }
    
    // Confirmación según el estado
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
      
      // Actualizar localmente
      setAppointmentDetails({
        ...appointmentDetails,
        estado: nuevoEstado
      });
      
      // Mostrar confirmación
      alert(`✅ Estado cambiado a: ${nuevoEstado}`);
      
      // Notificar al padre para refrescar
      if (onRefresh) {
        setTimeout(() => onRefresh(), 500);
      }
      
    } catch (error: any) {
      console.error('Error actualizando estado:', error);
      alert(`❌ Error: ${error.message || 'No se pudo actualizar el estado'}`);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmado':
      case 'confirmada':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'cancelado':
      case 'cancelada':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'completado':
      case 'completada':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'no asistio':
      case 'no asistió':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  };

  if (!appointmentDetails) return null;

  const duration = calculateDuration(appointmentDetails.start, appointmentDetails.end);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalles de la Cita"
      className="w-full max-w-3xl"
    >
      <div className="max-h-[85vh] overflow-y-auto">
        {updating ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600">Actualizando estado...</p>
          </div>
        ) : (
          <>
            {/* Header con estado y acciones */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {appointmentDetails.cliente_nombre || 'Cliente'}
                </h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${getStatusColor(appointmentDetails.estado)}`}>
                    {appointmentDetails.estado?.toUpperCase() || 'PENDIENTE'}
                  </span>
                  <span className="text-sm text-gray-600">
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar cita"
                  disabled={updating}
                >
                  <Edit className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* Información de la cita (igual que antes) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Información del Cliente */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Información del Cliente
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500">Nombre completo</label>
                    <p className="font-medium text-gray-900">{appointmentDetails.cliente_nombre || 'No especificado'}</p>
                  </div>
                  {appointmentDetails.rawData?.cliente_telefono && (
                    <div>
                      <label className="text-xs text-gray-500">Teléfono</label>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <p className="font-medium text-gray-900">{appointmentDetails.rawData.cliente_telefono}</p>
                      </div>
                    </div>
                  )}
                  {appointmentDetails.rawData?.cliente_email && (
                    <div>
                      <label className="text-xs text-gray-500">Email</label>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <p className="font-medium text-gray-900">{appointmentDetails.rawData.cliente_email}</p>
                      </div>
                    </div>
                  )}
                  {appointmentDetails.rawData?.cliente_notas && (
                    <div>
                      <label className="text-xs text-gray-500">Notas del cliente</label>
                      <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border mt-1">
                        {appointmentDetails.rawData.cliente_notas}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Información del Servicio */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-purple-600" />
                  Detalles del Servicio
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500">Servicio</label>
                    <p className="font-medium text-gray-900">{appointmentDetails.servicio_nombre || 'No especificado'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Estilista</label>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <p className="font-medium text-gray-900">{appointmentDetails.estilista_nombre || 'No asignado'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Duración</label>
                      <p className="font-medium text-gray-900">{duration} minutos</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Precio</label>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <p className="font-medium text-gray-900">
                          ${appointmentDetails.precio || appointmentDetails.rawData?.precio || '0'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {appointmentDetails.rawData?.servicio_notas && (
                    <div>
                      <label className="text-xs text-gray-500">Notas del servicio</label>
                      <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border mt-1">
                        {appointmentDetails.rawData.servicio_notas}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Horario */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  Horario
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500">Fecha</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="font-medium text-gray-900">
                        {new Date(appointmentDetails.rawData?.fecha || new Date()).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Hora inicio</label>
                      <p className="font-medium text-gray-900">{formatTime(appointmentDetails.start)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Hora fin</label>
                      <p className="font-medium text-gray-900">{formatTime(appointmentDetails.end)}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Duración total</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <p className="font-medium text-gray-900">{duration} minutos</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información Adicional */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-amber-600" />
                  Información Adicional
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500">Sede</label>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <p className="font-medium text-gray-900">
                        {appointmentDetails.rawData?.sede_nombre || 'No especificada'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Método de pago</label>
                    <p className="font-medium text-gray-900">
                      {appointmentDetails.rawData?.metodo_pago || 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Creado por</label>
                    <p className="font-medium text-gray-900">
                      {appointmentDetails.rawData?.creado_por || 'Sistema'}
                    </p>
                  </div>
                  {appointmentDetails.rawData?.fecha_creacion && (
                    <div>
                      <label className="text-xs text-gray-500">Fecha de creación</label>
                      <p className="font-medium text-gray-900">
                        {new Date(appointmentDetails.rawData.fecha_creacion).toLocaleString('es-ES')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notas importantes */}
            {(appointmentDetails.rawData?.notas_importantes || appointmentDetails.rawData?.alergias) && (
              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
                <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  Notas importantes
                </h3>
                <div className="space-y-2">
                  {appointmentDetails.rawData?.alergias && (
                    <div>
                      <label className="text-xs text-amber-700">Alergias</label>
                      <p className="text-sm text-amber-900">{appointmentDetails.rawData.alergias}</p>
                    </div>
                  )}
                  {appointmentDetails.rawData?.notas_importantes && (
                    <div>
                      <label className="text-xs text-amber-700">Notas adicionales</label>
                      <p className="text-sm text-amber-900">{appointmentDetails.rawData.notas_importantes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Acciones finales */}
            <div className="flex justify-between gap-3 mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                disabled={updating}
              >
                Cerrar
              </button>
              
              {/* Botones duplicados en la parte inferior también */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleUpdateStatus('cancelada')}
                  disabled={updating || appointmentDetails.estado === 'cancelada'}
                  className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4" />
                  Cancelar Cita
                </button>
                
                <button
                  onClick={() => handleUpdateStatus('no asistio')}
                  disabled={updating || appointmentDetails.estado === 'no asistio'}
                  className="px-5 py-2.5 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserX className="w-4 h-4" />
                  No Asistió
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default AppointmentDetailsModal;