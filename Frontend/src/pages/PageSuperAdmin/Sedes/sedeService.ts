import { API_BASE_URL } from "../../../types/config"
import { Sede, SedeInput } from '../../../types/sede';

export type { Sede } from '../../../types/sede';

// Interface para la respuesta del backend
interface UpdateSedeResponse {
  msg: string;
  local: Sede;
}

interface CreateSedeResponse {
  msg: string;
  local: Sede;
}

export const sedeService = {
  async getSedes(token: string): Promise<Sede[]> {
    const response = await fetch(`${API_BASE_URL}admin/locales/`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error al obtener sedes: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Filtrar elementos undefined/null y validar estructura básica
    const validSedes = data.filter((sede: any) => 
      sede && 
      sede._id && 
      typeof sede.nombre === 'string'
    );
    
    console.log('✅ Sedes válidas después del filtro:', validSedes);
    
    return validSedes;
  },

  async createSede(token: string, sede: SedeInput): Promise<Sede> {
    // Enviar solo los campos que el backend espera para CREAR
    const requestData = {
      nombre: sede.nombre,
      direccion: sede.direccion,
      informacion_adicional: sede.informacion_adicional || "",
      zona_horaria: sede.zona_horaria,
      telefono: sede.telefono,
      email: sede.email
      // NO ENVIAR: sede_id, activa - el backend los genera automáticamente
    };

    console.log('📤 Enviando datos al backend para CREAR:', requestData);

    const response = await fetch(`${API_BASE_URL}admin/locales/`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ Error del backend:', errorData);
      throw new Error(errorData?.detail || `Error al crear sede: ${response.statusText}`);
    }

    const result: CreateSedeResponse = await response.json();
    console.log('✅ Respuesta del backend:', result);
    return result.local;
  },

  async updateSede(token: string, sedeId: string, sede: Partial<Sede>): Promise<Sede> {
    // Enviar solo los campos que el backend espera para ACTUALIZAR
    const requestData: any = {
      nombre: sede.nombre,
      direccion: sede.direccion,
      informacion_adicional: sede.informacion_adicional || "",
      zona_horaria: sede.zona_horaria,
      telefono: sede.telefono,
      email: sede.email,
      activa: sede.activa // Incluir activa para actualización
    };

    console.log('📤 Actualizando sede:', requestData);

    const response = await fetch(`${API_BASE_URL}admin/locales/${sedeId}`, {
      method: 'PUT',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ Error del backend:', errorData);
      throw new Error(errorData?.detail || `Error al actualizar sede: ${response.statusText}`);
    }

    const result: UpdateSedeResponse = await response.json();
    console.log('✅ Respuesta del backend:', result);
    return result.local;
  },

  async deleteSede(token: string, sedeId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}admin/locales/${sedeId}`, {
      method: 'DELETE',
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || `Error al eliminar sede: ${response.statusText}`);
    }
  }
};