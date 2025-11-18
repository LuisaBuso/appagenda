// services/sedesApi.ts
import { API_BASE_URL } from "../../types/config";

export interface Sede {
  _id: string;
  unique_id?: string;
  nombre: string;
  direccion: string;
  telefono: string;
  estado: string;
}

export async function getSedes(token: string): Promise<Sede[]> {
  const res = await fetch(`${API_BASE_URL}/admin/locales/`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });
  
  if (!res.ok) throw new Error("Error al cargar sedes");
  const data = await res.json();
  return data.locales || data || [];
}