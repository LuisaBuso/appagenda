// src/services/salesMetricsApi.ts
import { API_BASE_URL } from "../../../types/config";

export interface SalesMetricsData {
  ventas_totales: number;
  ventas_servicios: number;
  ventas_productos: number;
  cantidad_ventas?: number;
  ticket_promedio?: number;
  crecimiento_ventas?: string;
}

export interface SalesMetricsResponse {
  success: boolean;
  tipo_dashboard: string;
  descripcion: string;
  usuario: {
    username: string | null;
    rol: string;
    sede_asignada: string;
  };
  period: string;
  range: {
    start: string;
    end: string;
    dias: number;
  };
  sede_id: string;
  metricas_por_moneda: {
    USD: SalesMetricsData;
  };
  debug_info: {
    ventas_registradas: number;
  };
  calidad_datos: string;
}

/**
 * Obtiene métricas de ventas simplificadas
 */
export async function getSalesMetrics(
  token: string,
  params: {
    period?: string;
    start_date?: string;
    end_date?: string;
    sede_id?: string;
  }
): Promise<any> {
  const queryParams = new URLSearchParams();
  
  // Parámetros requeridos
  if (params.period) queryParams.append('period', params.period);
  if (params.sede_id) queryParams.append('sede_id', params.sede_id);
  
  // Parámetros para período custom
  if (params.start_date) queryParams.append('start_date', params.start_date);
  if (params.end_date) queryParams.append('end_date', params.end_date);

  const url = `${API_BASE_URL}api/sales-dashboard/ventas/dashboard?${queryParams.toString()}`;
  console.log('Fetching sales metrics from:', url);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error en respuesta de la API:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      // Devolver estructura vacía
      return {
        success: false,
        metricas_por_moneda: {
          USD: {
            ventas_totales: 0,
            ventas_servicios: 0,
            ventas_productos: 0
          }
        }
      };
    }

    const data = await response.json();
    console.log('Respuesta parseada de la API:', data);
    return data;
  } catch (error) {
    console.error('Error en fetch:', error);
    // Devolver estructura vacía en caso de error de red
    return {
      success: false,
      metricas_por_moneda: {
        USD: {
          ventas_totales: 0,
          ventas_servicios: 0,
          ventas_productos: 0
        }
      }
    };
  }
}

/**
 * Extrae solo las 3 métricas principales para el componente SalesMetrics
 */
export function extractMainMetrics(data: SalesMetricsResponse): {
  ventas: number;
  servicios: number;
  productos: number;
} {
  const metricas = data.metricas_por_moneda.USD;
  
  return {
    ventas: metricas.ventas_totales,
    servicios: metricas.ventas_servicios,
    productos: metricas.ventas_productos
  };
}

/**
 * Helper para formatear moneda
 * Formatea un número como moneda USD con formato es-CO
 */
export function formatCurrencyMetric(value: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch (error) {
    console.error('Error formateando moneda:', error);
    // Formato de respaldo
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
}

/**
 * Formato de moneda corto para valores grandes
 * Ej: 1,500,000 → $1.5M
 */
export function formatCurrencyShort(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return formatCurrencyMetric(value);
}