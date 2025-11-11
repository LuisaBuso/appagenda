// services/serviciosApi.ts
import { API_BASE_URL } from "../../types/config";

export interface Servicio {
  _id: string;
  servicio_id?: string;
  nombre: string;
  descripcion?: string;
  duracion: number;
  precio: number;
  estado: string;
}

export async function getServicios(token: string): Promise<Servicio[]> {
  const res = await fetch(`${API_BASE_URL}/admin/servicios/`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });
  
  if (!res.ok) throw new Error("Error al cargar servicios");
  const data = await res.json();
  return data.servicios || data || [];
}

// Nueva función para obtener servicios por estilista
export async function getServiciosEstilista(estilistaId: string, token: string): Promise<Servicio[]> {
  const res = await fetch(`${API_BASE_URL}/admin/servicios/?estilista_id=${estilistaId}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });
  
  if (!res.ok) throw new Error("Error al cargar servicios del estilista");
  const data = await res.json();
  return data.servicios || data || [];
}