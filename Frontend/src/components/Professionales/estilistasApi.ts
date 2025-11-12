// services/estilistasApi.ts
import { API_BASE_URL } from "../../types/config";

export interface Estilista {
  _id: string;
  unique_id?: string;
  nombre: string;
  email: string;
  especialidad?: string;
  estado: string;
  sede_id?: string;
}

export async function getEstilistas(token: string, sede_id?: string): Promise<Estilista[]> {
  const query = new URLSearchParams();
  if (sede_id) query.append('sede_id', sede_id);
  
  const res = await fetch(`${API_BASE_URL}/admin/profesionales/?${query.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });
  
  if (!res.ok) throw new Error("Error al cargar estilistas");
  const data = await res.json();
  return data.profesionales || data || [];
}