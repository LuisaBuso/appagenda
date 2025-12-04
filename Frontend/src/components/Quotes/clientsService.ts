// services/clientsService.ts
import { API_BASE_URL } from "../../types/config";

export interface Cliente {
  _id?: string;
  cliente_id: string;
  nombre: string;
  correo?: string;
  telefono?: string;
  cedula?: string;
  ciudad?: string;
  fecha_de_nacimiento?: string;
  sede_id: string;
  notas?: string;
  fecha_creacion?: string;
  notas_historial?: NotaCliente[];
}

export interface NotaCliente {
  contenido: string;
  fecha?: string;
  autor?: string;
}

export interface CrearClienteRequest {
  nombre: string;
  correo?: string;
  telefono?: string;
  cedula?: string;
  ciudad?: string;
  fecha_de_nacimiento?: string;
  sede_id: string;
  notas?: string;
}

// 🔥 OBTENER CLIENTES POR SEDE
export async function getClientesPorSede(token: string, sedeId: string): Promise<Cliente[]> {
  try {
    console.log(`🔄 Obteniendo clientes para sede: ${sedeId}`);
    const res = await fetch(`${API_BASE_URL}clientes/filtrar/${sedeId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ Error ${res.status} al cargar clientes:`, errorText);
      throw new Error(`Error ${res.status} al cargar clientes de la sede`);
    }
    
    const data = await res.json();
    console.log(`✅ Clientes cargados: ${data.length} para sede ${sedeId}`);
    return data || [];
  } catch (error) {
    console.error('❌ Error cargando clientes por sede:', error);
    throw error;
  }
}

// 🔥 BUSCAR CLIENTES (con filtro opcional) - VERSIÓN CORREGIDA
export async function buscarClientes(token: string, filtro?: string, limite: number = 100): Promise<Cliente[]> {
  try {
    console.log(`🔍 Buscando clientes con filtro: "${filtro}"`);
    
    // Primero intentamos cargar todos los clientes de la sede y filtrar localmente
    // ya que el endpoint /clientes/ podría no estar funcionando
    const clientes = await getClientesPorSede(token, "sede_actual"); // Necesitamos saber la sede
    
    if (filtro && filtro.trim()) {
      const filtroLower = filtro.toLowerCase();
      const clientesFiltrados = clientes.filter(cliente => 
        cliente.nombre.toLowerCase().includes(filtroLower) ||
        (cliente.telefono && cliente.telefono.includes(filtro)) ||
        (cliente.correo && cliente.correo.toLowerCase().includes(filtroLower)) ||
        (cliente.cliente_id && cliente.cliente_id.includes(filtro))
      );
      
      console.log(`✅ ${clientesFiltrados.length} clientes encontrados con filtro "${filtro}"`);
      return clientesFiltrados.slice(0, limite);
    }
    
    return clientes.slice(0, limite);
  } catch (error) {
    console.error('❌ Error buscando clientes:', error);
    // Si falla, retornamos array vacío para no interrumpir el flujo
    return [];
  }
}

// 🔥 BUSCAR CLIENTES POR SEDE Y FILTRO - NUEVA FUNCIÓN MEJORADA
export async function buscarClientesPorSede(token: string, sedeId: string, filtro?: string): Promise<Cliente[]> {
  try {
    console.log(`🔍 Buscando clientes en sede ${sedeId} con filtro: "${filtro}"`);
    
    // Obtenemos todos los clientes de la sede
    const clientes = await getClientesPorSede(token, sedeId);
    
    // Filtramos localmente si hay un filtro
    if (filtro && filtro.trim()) {
      const filtroLower = filtro.toLowerCase();
      const clientesFiltrados = clientes.filter(cliente => 
        cliente.nombre.toLowerCase().includes(filtroLower) ||
        (cliente.telefono && cliente.telefono.includes(filtro)) ||
        (cliente.correo && cliente.correo.toLowerCase().includes(filtroLower)) ||
        (cliente.cliente_id && cliente.cliente_id.toLowerCase().includes(filtroLower))
      );
      
      console.log(`✅ ${clientesFiltrados.length} clientes encontrados en sede ${sedeId} con filtro "${filtro}"`);
      return clientesFiltrados;
    }
    
    console.log(`✅ ${clientes.length} clientes en sede ${sedeId}`);
    return clientes;
  } catch (error) {
    console.error('❌ Error buscando clientes por sede:', error);
    return [];
  }
}

// 🔥 CREAR NUEVO CLIENTE
export async function crearCliente(token: string, clienteData: CrearClienteRequest): Promise<{success: boolean; cliente: Cliente}> {
  try {
    console.log('🔄 Creando nuevo cliente:', clienteData);
    const res = await fetch(`${API_BASE_URL}clientes/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      body: JSON.stringify(clienteData),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: 'Error desconocido' }));
      throw new Error(errorData.detail || `Error ${res.status} al crear cliente`);
    }
    
    const data = await res.json();
    console.log('✅ Cliente creado exitosamente');
    return data;
  } catch (error) {
    console.error('❌ Error creando cliente:', error);
    throw error;
  }
}

// 🔥 OBTENER CLIENTE POR ID
export async function getClientePorId(token: string, clienteId: string): Promise<Cliente> {
  try {
    const res = await fetch(`${API_BASE_URL}clientes/${clienteId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });
    
    if (!res.ok) throw new Error("Error al cargar cliente");
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('❌ Error cargando cliente:', error);
    throw error;
  }
}

// 🔥 ACTUALIZAR CLIENTE
export async function actualizarCliente(token: string, clienteId: string, clienteData: Partial<CrearClienteRequest>): Promise<{success: boolean; msg: string}> {
  try {
    const res = await fetch(`${API_BASE_URL}clientes/${clienteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      body: JSON.stringify(clienteData),
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Error al actualizar cliente");
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('❌ Error actualizando cliente:', error);
    throw error;
  }
}

// 🔥 AGREGAR NOTA A CLIENTE
export async function agregarNotaCliente(token: string, clienteId: string, nota: string): Promise<{success: boolean; msg: string}> {
  try {
    const res = await fetch(`${API_BASE_URL}clientes/${clienteId}/notas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      body: JSON.stringify({ contenido: nota }),
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Error al agregar nota");
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('❌ Error agregando nota:', error);
    throw error;
  }
}

// 🔥 OBTENER HISTORIAL DE CLIENTE
export async function getHistorialCliente(token: string, clienteId: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}clientes/${clienteId}/historial`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });
    
    if (!res.ok) throw new Error("Error al cargar historial del cliente");
    const data = await res.json();
    return data || [];
  } catch (error) {
    console.error('❌ Error cargando historial:', error);
    throw error;
  }
}