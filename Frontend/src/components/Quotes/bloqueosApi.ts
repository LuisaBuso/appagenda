// src/pages/Quotes/bloqueosApi.ts
import { API_BASE_URL } from "../../types/config";

export interface Bloqueo {
  id?: string;
  motivo: string;
  profesional_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  repetir?: boolean;
}

export async function getBloqueos(token: string) {
  const res = await fetch(`${API_BASE_URL}/bloqueos`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Error al cargar bloqueos");
  return res.json();
}

export async function createBloqueo(data: Bloqueo, token: string) {
  const res = await fetch(`${API_BASE_URL}/bloqueos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al crear bloqueo");
  return res.json();
}

export async function deleteBloqueo(id: string, token: string) {
  const res = await fetch(`${API_BASE_URL}/bloqueos/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Error al eliminar bloqueo");
  return res.json();
}
