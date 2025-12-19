// src/services/analyticsApi.ts
import { API_BASE_URL } from "../../../types/config";

export interface ChurnCliente {
  cliente_id: string;
  nombre: string;
  correo: string;
  telefono: string;
  sede_id: string;
  ultima_visita: string;
  dias_inactivo: number;
}

export interface ChurnResponse {
  total_churn: number;
  parametros: {
    sede_id: string;
    rango_fechas: string;
    dias_churn: number;
  };
  clientes: ChurnCliente[];
}

export interface KPI {
  valor: number | string;
  crecimiento: string;
}

export interface DashboardResponse {
  success: boolean;
  usuario: {
    username: string | null;
    rol: string;
    sede_asignada: string | null;
  };
  period: string;
  range: {
    start: string;
    end: string;
    dias: number;
  };
  sede_id: string;
  kpis: {
    nuevos_clientes: KPI;
    tasa_recurrencia: KPI;
    tasa_churn: KPI;
    ticket_promedio: KPI;
    debug_info?: {
      total_clientes: number;
      clientes_nuevos: number;
      clientes_recurrentes: number;
      total_citas: number;
    };
  };
  churn_actual: number;
  calidad_datos: string;
  advertencias: Array<{
    tipo: string;
    severidad: string;
    mensaje: string;
    recomendacion: string;
  }>;
}

export interface PeriodOption {
  id: string;
  name: string;
  description: string;
  recommended: boolean;
  min_days: number;
}

export interface PeriodsResponse {
  periods: PeriodOption[];
  default: string;
  recommendations: {
    minimum: string;
    optimal: string;
    avoid: string[];
  };
}

// API functions
export async function getDashboard(
  token: string,
  params: {
    period?: string;
    sede_id?: string;
  }
): Promise<DashboardResponse> {
  const queryParams = new URLSearchParams();
  
  if (params.period) queryParams.append('period', params.period);
  if (params.sede_id) queryParams.append('sede_id', params.sede_id);

  const response = await fetch(`${API_BASE_URL}analytics/dashboard?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Error al obtener dashboard: ${response.statusText}`);
  }

  return response.json();
}

export async function getAvailablePeriods(): Promise<PeriodsResponse> {
  const response = await fetch(`${API_BASE_URL}analytics/dashboard/periods`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Error al obtener períodos: ${response.statusText}`);
  }

  return response.json();
}

export async function getChurnClientes(
  token: string,
  params?: {
    sede_id?: string;
    start_date?: string;
    end_date?: string;
  }
): Promise<ChurnResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.sede_id) queryParams.append('sede_id', params.sede_id);
  if (params?.start_date) queryParams.append('start_date', params.start_date);
  if (params?.end_date) queryParams.append('end_date', params.end_date);
  queryParams.append('export', 'false');

  const response = await fetch(`${API_BASE_URL}analytics/churn-clientes?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Error al obtener churn: ${response.statusText}`);
  }

  return response.json();
}

// src/services/analyticsApi.ts (agregar esto al archivo existente)

export interface Sede {
  _id: string;
  nombre: string;
  direccion: string;
  informacion_adicional: string;
  zona_horaria: string;
  telefono: string;
  email: string;
  sede_id: string; // ← ESTE ES EL ID QUE NECESITAS
  fecha_creacion: string;
  creado_por: string;
  activa: boolean;
}

// Agregar esta función al archivo existente
export async function getSedes(
  token: string,
  activa: boolean = true
): Promise<Sede[]> {
  const response = await fetch(`${API_BASE_URL}admin/locales/?activa=${activa}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Error al obtener sedes: ${response.statusText}`);
  }

  return response.json();
}