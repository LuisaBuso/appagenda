  // services/citasApi.ts
  import { API_BASE_URL } from "../../types/config";

  export async function getCitas(params?: { sede_id?: string; profesional_id?: string; fecha?: string }, token?: string) {
    const query = new URLSearchParams();

    if (params?.sede_id) query.append('sede_id', params.sede_id);
    if (params?.profesional_id) query.append('profesional_id', params.profesional_id);
    if (params?.fecha) query.append('fecha', params.fecha);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('🔍 Fetching citas con query:', query.toString());

    const res = await fetch(`${API_BASE_URL}scheduling/quotes/?${query.toString()}`, {
      headers,
      credentials: "include",
    });

    if (!res.ok) throw new Error("Error al cargar citas");
    return res.json();
  }

  export async function crearCita(data: any, token: string) {
    // 🔥 CORREGIDO: Ahora usamos profesional_id directamente
    const citaData = {
      sede_id: data.sede_id,
      profesional_id: data.profesional_id,
      servicio_id: data.servicio_id,
      cliente_id: data.cliente_id,
      fecha: data.fecha,
      hora_inicio: data.hora_inicio,
      hora_fin: data.hora_fin,
      estado: data.estado || "pendiente",
      notas: data.notas || "",
      cliente_nombre: data.cliente_nombre || "",
    };

    console.log("📤 Enviando datos de cita al backend:", citaData);

    try {
      const res = await fetch(`${API_BASE_URL}scheduling/quotes/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(citaData),
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Error response:', errorText);

        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText || "Error al crear cita" };
        }

        // 🔥 MEJOR MANEJO DE ERRORES DE VALIDACIÓN
        if (errorData.detail && Array.isArray(errorData.detail)) {
          // Es un error de validación de Pydantic
          const firstError = errorData.detail[0];
          const field = firstError.loc[firstError.loc.length - 1];
          const message = firstError.msg;
          
          if (field === 'fecha') {
            throw new Error(`Error en la fecha: ${message}. Fecha enviada: ${data.fecha}`);
          } else {
            throw new Error(`Error en ${field}: ${message}`);
          }
        } else {
          const errorDetail = errorData.detail || errorData.message || "Error al crear cita";

          // 🔥 MANEJO MEJORADO DE ERRORES
          if (errorDetail.includes("no tiene horario asignado")) {
            throw new Error("El estilista no tiene horario configurado para este día. Contacta al administrador.");
          } else if (errorDetail.includes("fuera del horario laboral")) {
            throw new Error("La cita está fuera del horario laboral del estilista.");
          } else if (errorDetail.includes("ya tiene una cita")) {
            throw new Error("El estilista ya tiene una cita programada en ese horario.");
          } else if (errorDetail.includes("bloqueado")) {
            throw new Error("El horario está bloqueado. Selecciona otro horario.");
          } else if (errorDetail.includes("profesional_id")) {
            throw new Error("Error con el ID del profesional. Verifica los datos del estilista.");
          } else if (errorDetail.includes("Cliente no encontrado")) {
            throw new Error("El cliente no existe en el sistema. Verifica los datos del cliente.");
          } else if (errorDetail.includes("Servicio no encontrado")) {
            throw new Error("El servicio no existe. Verifica los datos del servicio.");
          } else if (errorDetail.includes("Profesional no encontrado")) {
            throw new Error("El estilista no existe. Verifica los datos del estilista.");
          } else if (errorDetail.includes("Sede no encontrada")) {
            throw new Error("La sede no existe. Verifica los datos de la sede.");
          } else {
            throw new Error(errorDetail);
          }
        }
      }

      const result = await res.json();
      console.log('✅ Cita creada exitosamente:', result);
      return result;

    } catch (error) {
      console.error('❌ Error en crearCita:', error);
      throw error;
    }
  }

  export async function editarCita(citaId: string, data: any, token: string) {
    const res = await fetch(`${API_BASE_URL}scheduling/quotes/${citaId}`, {
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
    const res = await fetch(`${API_BASE_URL}scheduling/quotes/${citaId}/cancelar`, {
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
    const res = await fetch(`${API_BASE_URL}scheduling/quotes/${citaId}/estado`, {
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