// src/hooks/useFichasCliente.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../../../types/config';

interface FichaCliente {
  id: string;
  cliente_id: string;
  nombre: string;
  apellido: string | null;
  telefono: string;
  cedula: string;
  servicio_id: string;
  profesional_id: string;
  sede_id: string;
  fecha_ficha: string;
  fecha_reserva: string;
  tipo_ficha: string;
  precio: number;
  estado: string;
  estado_pago: string;
  contenido: any;
  servicio_nombre: string;
  profesional_nombre: string;
  sede_nombre: string;
}

interface UseFichasClienteProps {
  cliente_id?: string;
}

export function useFichasCliente({ cliente_id }: UseFichasClienteProps) {
  const [fichas, setFichas] = useState<FichaCliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFichas = useCallback(async () => {
    if (!cliente_id) {
      setFichas([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
      
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(
        `${API_BASE_URL}scheduling/quotes/fichas?cliente_id=${cliente_id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.fichas)) {
        setFichas(data.fichas);
      } else {
        setFichas([]);
      }
    } catch (err) {
      console.error('Error al cargar fichas del cliente:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setFichas([]);
    } finally {
      setLoading(false);
    }
  }, [cliente_id]);

  useEffect(() => {
    if (cliente_id) {
      fetchFichas();
    }
  }, [cliente_id, fetchFichas]);

  return {
    fichas,
    loading,
    error,
    refetch: fetchFichas
  };
}