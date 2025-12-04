import { API_BASE_URL } from "../../../types/config";
import { Cliente } from "../../../types/cliente";

export interface CreateClienteData {
  nombre: string;
  correo?: string;
  telefono?: string;
  notas?: string;
  sede_id?: string;
}

export interface UpdateClienteData {
  nombre?: string;
  correo?: string;
  telefono?: string;
  notas?: string;
  sede_id?: string;
}

export interface ClienteResponse {
  _id: string;
  cliente_id: string;
  nombre: string;
  correo?: string;
  telefono?: string;
  sede_id: string;
  fecha_creacion: string;
  creado_por: string;
  notas_historial?: Array<{
    contenido: string;
    fecha: string;
    autor: string;
  }>;
  dias_sin_visitar?: number;
  total_gastado?: number;
  ticket_promedio?: number;
}

// 🔥 INTERFAZ ACTUALIZADA PARA LAS FICHAS DEL CLIENTE
export interface FichaCliente {
  _id: string;
  cliente_id: string;
  sede_id: string;
  cliente_id_antiguo?: string;
  servicio_id: string;
  servicio_nombre: string;
  profesional_id: string;
  fecha_ficha: string;
  fecha_reserva: string;
  email: string;
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string;
  antes_url?: string;
  despues_url?: string;
  precio: string;
  estado: string;
  estado_pago: string;
  local: string;
  notas_cliente: string;
  comentario_interno: string;
  respuesta_1: string;
  respuesta_2: string;
  respuesta_3: string;
  respuesta_4: string;
  respuesta_5: string;
  respuesta_6: string;
  respuesta_7: string;
  respuesta_8: string;
  respuesta_9: string;
  respuesta_10: string;
  source_file?: string;
  migrated_at?: string;
  procesado_imagenes?: boolean;
  imagenes_actualizadas_at?: string;
  
  // 🔥 NUEVOS CAMPOS CON NOMBRES
  servicio: string;           // Nombre del servicio (no ID)
  sede: string;              // Nombre de la sede (no ID)
  estilista: string;         // Nombre del estilista (no ID)
  sede_estilista: string;    // Sede del estilista
}

// Helper functions fuera del objeto para evitar problemas con 'this'
const calcularDiasSinVisitar = (fechaCreacion: string): number => {
  const fechaUltimaVisita = new Date(fechaCreacion);
  const hoy = new Date();
  const diferenciaMs = hoy.getTime() - fechaUltimaVisita.getTime();
  return Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
};

const obtenerRizotipoAleatorio = (): string => {
  const rizotipos = ['1A', '1B', '1C', '2A', '2B', '2C', '3A', '3B', '3C', '4A', '4B', '4C'];
  return rizotipos[Math.floor(Math.random() * rizotipos.length)];
};

const transformarHistorialCabello = (historialCitas: any[]): any[] => {
  return historialCitas.map(cita => ({
    tipo: cita.servicio,
    fecha: cita.fecha
  }));
};

export const clientesService = {
  async getClientes(token: string, sedeId?: string): Promise<Cliente[]> {
    let url = `${API_BASE_URL}clientes/`;
    
    // Si se especifica una sede, usar el endpoint de filtrado
    if (sedeId && sedeId !== 'all') {
      url = `${API_BASE_URL}clientes/filtrar/${sedeId}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error al obtener clientes: ${response.statusText}`);
    }

    const data: ClienteResponse[] = await response.json();
    
    // Transformar la respuesta del backend al formato del frontend
    return data.map(cliente => ({
      id: cliente.cliente_id,
      nombre: cliente.nombre,
      telefono: cliente.telefono || 'No disponible',
      email: cliente.correo || 'No disponible',
      diasSinVenir: cliente.dias_sin_visitar || calcularDiasSinVisitar(cliente.fecha_creacion),
      diasSinComprar: cliente.dias_sin_visitar || 0,
      ltv: cliente.total_gastado || 0,
      ticketPromedio: cliente.ticket_promedio || 0,
      rizotipo: obtenerRizotipoAleatorio(),
      nota: cliente.notas_historial?.[0]?.contenido || '',
      sede_id: cliente.sede_id,
      historialCitas: [],
      historialCabello: [],
      historialProductos: []
    }));
  },

  async getAllClientes(token: string): Promise<Cliente[]> {
    const response = await fetch(`${API_BASE_URL}clientes/todos`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error al obtener todos los clientes: ${response.statusText}`);
    }

    const data: ClienteResponse[] = await response.json();
    
    return data.map(cliente => ({
      id: cliente.cliente_id,
      nombre: cliente.nombre,
      telefono: cliente.telefono || 'No disponible',
      email: cliente.correo || 'No disponible',
      diasSinVenir: cliente.dias_sin_visitar || calcularDiasSinVisitar(cliente.fecha_creacion),
      diasSinComprar: cliente.dias_sin_visitar || 0,
      ltv: cliente.total_gastado || 0,
      ticketPromedio: cliente.ticket_promedio || 0,
      rizotipo: obtenerRizotipoAleatorio(),
      nota: cliente.notas_historial?.[0]?.contenido || '',
      sede_id: cliente.sede_id,
      historialCitas: [],
      historialCabello: [],
      historialProductos: []
    }));
  },

  async getClienteById(token: string, clienteId: string): Promise<Cliente> {
    const response = await fetch(`${API_BASE_URL}clientes/${clienteId}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error al obtener cliente: ${response.statusText}`);
    }

    const cliente: ClienteResponse = await response.json();
    
    // Obtener historial adicional
    const [historialCitas, historialProductos, fichas] = await Promise.all([
      this.getHistorialCitas(token, clienteId),
      this.getHistorialProductos(token, clienteId),
      this.getFichasCliente(token, clienteId) // 🔥 AGREGADO: Obtener fichas
    ]);

    return {
      id: cliente.cliente_id,
      nombre: cliente.nombre,
      telefono: cliente.telefono || 'No disponible',
      email: cliente.correo || 'No disponible',
      diasSinVenir: cliente.dias_sin_visitar || calcularDiasSinVisitar(cliente.fecha_creacion),
      diasSinComprar: cliente.dias_sin_visitar || 0,
      ltv: cliente.total_gastado || 0,
      ticketPromedio: cliente.ticket_promedio || 0,
      rizotipo: obtenerRizotipoAleatorio(),
      nota: cliente.notas_historial?.[0]?.contenido || '',
      sede_id: cliente.sede_id,
      historialCitas,
      historialCabello: transformarHistorialCabello(historialCitas),
      historialProductos,
      fichas // 🔥 AGREGADO: Incluir fichas en el cliente
    };
  },

  // 🔥 NUEVO MÉTODO: OBTENER FICHAS DEL CLIENTE
  async getFichasCliente(token: string, clienteId: string): Promise<FichaCliente[]> {
    try {
      const response = await fetch(`${API_BASE_URL}clientes/fichas/${clienteId}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        // Si no hay fichas, devolver array vacío en lugar de error
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Error al obtener fichas: ${response.statusText}`);
      }

      const fichas: FichaCliente[] = await response.json();
      return fichas;
    } catch (error) {
      console.error('❌ Error obteniendo fichas del cliente:', error);
      // En caso de error, devolver array vacío para no romper la UI
      return [];
    }
  },

  async createCliente(token: string, cliente: CreateClienteData): Promise<ClienteResponse> {
    const requestData = {
      nombre: cliente.nombre.trim(),
      correo: cliente.correo?.trim() || '',
      telefono: cliente.telefono?.trim() || '',
      notas: cliente.notas?.trim() || '',
      sede_id: cliente.sede_id || ''
    };

    console.log('📤 Creando cliente con datos:', requestData);

    const response = await fetch(`${API_BASE_URL}clientes/`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      let errorMessage = `Error ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        console.error('❌ Error del backend:', errorData);
        
        if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch (parseError) {
        console.error('Error parseando respuesta:', parseError);
      }
      
      throw new Error(errorMessage);
    }

    return await response.json();
  },

  async updateCliente(token: string, clienteId: string, cliente: UpdateClienteData): Promise<any> {
    const requestData: any = {
      nombre: cliente.nombre?.trim(),
      correo: cliente.correo?.trim(),
      telefono: cliente.telefono?.trim(),
      notas: cliente.notas?.trim(),
      sede_id: cliente.sede_id
    };

    // Eliminar campos vacíos
    Object.keys(requestData).forEach(key => {
      if (requestData[key] === undefined || requestData[key] === '') {
        delete requestData[key];
      }
    });

    console.log('📤 Actualizando cliente:', requestData);

    const response = await fetch(`${API_BASE_URL}clientes/${clienteId}`, {
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
      throw new Error(errorData?.detail || `Error al actualizar cliente: ${response.statusText}`);
    }

    return await response.json();
  },

  async agregarNota(token: string, clienteId: string, nota: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}clientes/${clienteId}/notas`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ contenido: nota })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || `Error al agregar nota: ${response.statusText}`);
    }
  },

  async getHistorialCitas(token: string, clienteId: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}clientes/${clienteId}/historial`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return [];
      }

      const citas = await response.json();
      return citas.map((cita: any) => ({
        fecha: new Date(cita.fecha).toLocaleDateString('es-ES'),
        servicio: cita.servicio_nombre || 'Servicio no especificado',
        estilista: cita.estilista_nombre || 'Estilista no especificado'
      }));
    } catch (error) {
      console.error('Error obteniendo historial de citas:', error);
      return [];
    }
  },

  async getHistorialProductos(_: string, clienteId: string): Promise<any[]> {
    try {
      console.log(`Obteniendo historial de productos para cliente ${clienteId}`);
      
      // Nota: Esta endpoint no está definido en las rutas que proporcionaste
      // Puedes implementarlo cuando tengas la ruta correspondiente
      // Por ahora devolvemos un array vacío
      return [];
      
      // Código comentado para cuando tengas la ruta:
      /*
      const response = await fetch(`${API_BASE_URL}clientes/${clienteId}/productos`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const productos = await response.json();
        return productos.map((producto: any) => ({
          producto: producto.nombre || 'Producto no especificado',
          fecha: new Date(producto.fecha_compra).toLocaleDateString('es-ES')
        }));
      }

      return [];
      */
    } catch (error) {
      console.error('Error obteniendo historial de productos:', error);
      return [];
    }
  }
};