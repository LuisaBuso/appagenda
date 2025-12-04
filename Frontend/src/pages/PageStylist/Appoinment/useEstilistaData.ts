// src/hooks/useEstilistaData.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Cita } from '../../../types/fichas';
import { API_BASE_URL } from '../../../types/config';

export function useEstilistaData() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCitas = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
      
      if (!token) {
        throw new Error('No hay token de autenticación. Por favor, inicia sesión nuevamente.');
      }

      console.log('Fetching citas from:', `${API_BASE_URL}scheduling/quotes/citas/estilista`);

      const response = await fetch(`${API_BASE_URL}scheduling/quotes/citas/estilista`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      // IMPORTANTE: La API devuelve un array directamente, no un objeto con "success" y "citas"
      if (Array.isArray(data)) {
        // Mapear los datos al formato esperado
        const citasFormateadas = data.map((cita: any) => ({
          cita_id: cita.cita_id || cita._id || cita.id,
          cliente: {
            cliente_id: cita.cliente?.cliente_id || cita.cliente_id,
            nombre: cita.cliente?.nombre || 'Cliente',
            apellido: cita.cliente?.apellido || '',
            telefono: cita.cliente?.telefono || '',
            email: cita.cliente?.email || '',
          },
          servicio: {
            servicio_id: cita.servicio?.servicio_id || cita.servicio_id,
            nombre: cita.servicio?.nombre || 'Servicio',
            precio: cita.servicio?.precio || 0,
            duracion: cita.servicio?.duracion || 60, // valor por defecto
          },
          sede: {
            sede_id: cita.sede?.sede_id || cita.sede_id,
            nombre: cita.sede?.nombre || 'Sede',
          },
          estilista_id: cita.estilista_id || cita.profesional_id,
          fecha: cita.fecha,
          hora_inicio: cita.hora_inicio,
          hora_fin: cita.hora_fin,
          estado: cita.estado || 'Pendiente',
          comentario: cita.comentario || '',
          // Campos adicionales para compatibilidad
          servicio_id: cita.servicio?.servicio_id || cita.servicio_id,
          cliente_id: cita.cliente?.cliente_id || cita.cliente_id,
          total: cita.servicio?.precio || 0,
        }));
        setCitas(citasFormateadas);
        setError(null);
      } else {
        console.warn('La API no devolvió un array, devolvió:', data);
        // Intentar manejar diferentes estructuras de respuesta
        if (data.data && Array.isArray(data.data)) {
          const citasFormateadas = data.data.map((cita: any) => ({
            cita_id: cita.cita_id || cita._id || cita.id,
            cliente: {
              cliente_id: cita.cliente?.cliente_id || cita.cliente_id,
              nombre: cita.cliente?.nombre || 'Cliente',
              apellido: cita.cliente?.apellido || '',
              telefono: cita.cliente?.telefono || '',
              email: cita.cliente?.email || '',
            },
            servicio: {
              servicio_id: cita.servicio?.servicio_id || cita.servicio_id,
              nombre: cita.servicio?.nombre || 'Servicio',
              precio: cita.servicio?.precio || 0,
              duracion: cita.servicio?.duracion || 60,
            },
            sede: {
              sede_id: cita.sede?.sede_id || cita.sede_id,
              nombre: cita.sede?.nombre || 'Sede',
            },
            estilista_id: cita.estilista_id || cita.profesional_id,
            fecha: cita.fecha,
            hora_inicio: cita.hora_inicio,
            hora_fin: cita.hora_fin,
            estado: cita.estado || 'Pendiente',
            comentario: cita.comentario || '',
            servicio_id: cita.servicio?.servicio_id || cita.servicio_id,
            cliente_id: cita.cliente?.cliente_id || cita.cliente_id,
            total: cita.servicio?.precio || 0,
          }));
          setCitas(citasFormateadas);
          setError(null);
        } else {
          throw new Error('Formato de respuesta inválido');
        }
      }
    } catch (err) {
      console.error('Error al cargar citas:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar citas');
      setCitas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCitas();
  }, [fetchCitas]);

  // Función para depurar - obtener el token actual
  const getCurrentToken = useCallback(() => {
    return localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  }, []);

  // Función para depurar - probar el endpoint directamente
  const testEndpoint = useCallback(async () => {
    try {
      const token = getCurrentToken();
      if (!token) {
        console.error('No hay token disponible');
        return;
      }

      console.log('Probando endpoint con token:', token.substring(0, 20) + '...');
      
      const response = await fetch(`${API_BASE_URL}scheduling/quotes/citas/estilista`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Test Response status:', response.status);
      const text = await response.text();
      console.log('Test Response text:', text);
      
      try {
        const json = JSON.parse(text);
        console.log('Test Response JSON:', json);
      } catch (e) {
        console.log('No se pudo parsear como JSON');
      }
      
      return { status: response.status, text };
    } catch (error) {
      console.error('Error en testEndpoint:', error);
    }
  }, [getCurrentToken]);

  // Función para actualizar el estado de una cita
  const updateCitaStatus = useCallback(async (cita_id: string, action: string) => {
    try {
      const token = getCurrentToken();
      
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      console.log(`Actualizando cita ${cita_id} con acción: ${action}`);

      const response = await fetch(`${API_BASE_URL}scheduling/quotes/${cita_id}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Update response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Update error response:', errorText);
        throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Update response data:', data);
      
      if (data.success) {
        // Actualizar la cita localmente
        setCitas(prevCitas => 
          prevCitas.map(cita => 
            cita.cita_id === cita_id 
              ? { 
                  ...cita, 
                  estado: action === 'confirmar' ? 'Confirmado' : 
                         action === 'cancelar' ? 'Cancelado' :
                         action === 'completar' ? 'Completado' :
                         action === 'no-asistio' ? 'No Asistió' : cita.estado 
                }
              : cita
          )
        );
        return { success: true, data };
      }
      
      throw new Error(data.message || 'Error al actualizar la cita');
    } catch (err) {
      console.error(`Error al ${action} la cita:`, err);
      throw err;
    }
  }, [getCurrentToken]);

  // Funciones específicas para cada acción
  const confirmarCita = useCallback((cita_id: string) => 
    updateCitaStatus(cita_id, 'confirmar'), [updateCitaStatus]);
  
  const cancelarCita = useCallback((cita_id: string) => 
    updateCitaStatus(cita_id, 'cancelar'), [updateCitaStatus]);
  
  const completarCita = useCallback((cita_id: string) => 
    updateCitaStatus(cita_id, 'completar'), [updateCitaStatus]);
  
  const marcarNoAsistio = useCallback((cita_id: string) => 
    updateCitaStatus(cita_id, 'no-asistio'), [updateCitaStatus]);

  // Estadísticas
  const citasHoy = citas.filter(cita => {
    if (!cita.fecha) return false;
    try {
      const fechaCita = new Date(cita.fecha);
      const hoy = new Date();
      return fechaCita.toDateString() === hoy.toDateString();
    } catch (e) {
      return false;
    }
  }).length;

  const serviciosCompletadosHoy = citas.filter(cita => {
    if (!cita.fecha) return false;
    try {
      const fechaCita = new Date(cita.fecha);
      const hoy = new Date();
      return fechaCita.toDateString() === hoy.toDateString() && 
             (cita.estado === 'Completado' || cita.estado === 'completado');
    } catch (e) {
      return false;
    }
  }).length;

  const totalVentasHoy = citas
    .filter(cita => {
      if (!cita.fecha) return false;
      try {
        const fechaCita = new Date(cita.fecha);
        const hoy = new Date();
        return fechaCita.toDateString() === hoy.toDateString() && 
               (cita.estado === 'Completado' || cita.estado === 'completado');
      } catch (e) {
        return false;
      }
    })
    .reduce((total, cita) => total + (cita.servicio?.precio || 0), 0);

  return {
    citas,
    citasHoy,
    serviciosCompletadosHoy,
    totalVentasHoy,
    loading,
    error,
    refetchCitas: fetchCitas,
    confirmarCita,
    cancelarCita,
    completarCita,
    marcarNoAsistio,
    // Funciones de depuración
    getCurrentToken,
    testEndpoint,
  };
}