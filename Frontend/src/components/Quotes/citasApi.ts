  // services/citasApi.ts
  import { API_BASE_URL } from "../../types/config";

  export async function getCitas(params?: { sede_id?: string; estilista_id?: string }, token?: string) {
    const query = new URLSearchParams();
    
    if (params?.sede_id) query.append('sede_id', params.sede_id);
    if (params?.estilista_id) query.append('estilista_id', params.estilista_id);
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/scheduling/quotes/citas?${query.toString()}`, {
      headers,
      credentials: "include",
    });
    
    if (!res.ok) throw new Error("Error al cargar citas");
    return res.json();
  }

  export async function crearCita(data: any, token: string) {
    const res = await fetch(`${API_BASE_URL}/scheduling/quotes/citas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      credentials: "include",
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || "Error al crear cita");
    }
    
    return res.json();
  }

  export async function editarCita(citaId: string, data: any, token: string) {
    const res = await fetch(`${API_BASE_URL}/scheduling/quotes/citas/${citaId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      credentials: "include",
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || "Error al editar cita");
    }
    
    return res.json();
  }

  export async function cancelarCita(citaId: string, token: string) {
    const res = await fetch(`${API_BASE_URL}/scheduling/quotes/citas/${citaId}/cancelar`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || "Error al cancelar cita");
    }
    
    return res.json();
  }

  export async function cambiarEstadoCita(citaId: string, nuevoEstado: string, token: string) {
    const res = await fetch(`${API_BASE_URL}/scheduling/quotes/citas/${citaId}/estado`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nuevo_estado: nuevoEstado }),
      credentials: "include",
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || "Error al cambiar estado de cita");
    }
    
    return res.json();
  }