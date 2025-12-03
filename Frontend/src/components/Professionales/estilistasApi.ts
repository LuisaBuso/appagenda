// services/estilistasApi.ts
import { API_BASE_URL } from "../../types/config";

export interface Estilista {
  _id: string;
   profesional_id: string;
  nombre: string;
  email: string;
  especialidad?: string;
  estado: string;
  sede_id?: string;
  servicios_no_presta?: string[];
  especialidades?: boolean;
}

export async function getEstilistas(token: string, sede_id?: string): Promise<Estilista[]> {
  const query = new URLSearchParams();
  if (sede_id) query.append('sede_id', sede_id);
  
  console.log('🔍 Fetching estilistas con query:', query.toString());
  
  const res = await fetch(`${API_BASE_URL}admin/profesionales/?${query.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });
  
  if (!res.ok) throw new Error("Error al cargar estilistas");
  const data = await res.json();
  console.log('👥 Estilistas cargados:', data.profesionales || data);
  return data.profesionales || data || [];
}

export async function getEstilistaCompleto(token: string, estilistaId: string): Promise<Estilista> {
  const res = await fetch(`${API_BASE_URL}admin/profesionales/${estilistaId}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });
  
  if (!res.ok) throw new Error("Error al cargar detalles del estilista");
  const data = await res.json();
  return data;
} 