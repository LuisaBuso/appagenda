// services/clientsService.ts
import { API_BASE_URL } from "../../types/config";
import { clientesService } from "../../pages/PageSede/Clients/clientesService"; // 🔥 RUTA CORRECTA

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

// 🔥 OBTENER CLIENTES POR SEDE (Ahora usa el endpoint unificado)
export async function getClientesPorSede(token: string, sedeId: string): Promise<Cliente[]> {
  try {
    console.log(`🔄 Obteniendo clientes para reservas (sede: ${sedeId})...`);
    
    // Usar el servicio unificado que maneja automáticamente sedes globales y locales
    const clientesData = await clientesService.obtenerClientes(token);
    
    // Transformar al formato de este archivo (si es necesario)
    const clientes: Cliente[] = clientesData.map((c: any) => ({
      _id: c._id,
      cliente_id: c.id || c.cliente_id,
      nombre: c.nombre,
      correo: c.email || c.correo,
      telefono: c.telefono,
      cedula: c.cedula,
      ciudad: c.ciudad,
      fecha_de_nacimiento: c.fecha_de_nacimiento,
      sede_id: c.sede_id,
      notas: c.nota || c.notas,
      fecha_creacion: c.fecha_creacion,
      notas_historial: c.notas_historial
    }));
    
    console.log(`✅ Clientes cargados para reservas: ${clientes.length}`);
    return clientes;
  } catch (error) {
    console.error('❌ Error cargando clientes para reservas:', error);
    throw error;
  }
}

// 🔥 BUSCAR CLIENTES (con filtro opcional)
export async function buscarClientes(token: string, filtro?: string, limite: number = 100): Promise<Cliente[]> {
  try {
    console.log(`🔍 Buscando clientes con filtro: "${filtro}"`);
    
    // Obtener todos los clientes disponibles (el backend ya filtró por sede)
    const clientes = await getClientesPorSede(token, "");
    
    // Filtrar localmente si hay un término de búsqueda
    if (filtro && filtro.trim()) {
      const filtroLower = filtro.toLowerCase();
      const clientesFiltrados = clientes.filter((cliente: Cliente) => 
        cliente.nombre.toLowerCase().includes(filtroLower) ||
        (cliente.telefono && cliente.telefono.includes(filtro)) ||
        (cliente.correo && cliente.correo.toLowerCase().includes(filtroLower)) ||
        (cliente.cliente_id && cliente.cliente_id.toLowerCase().includes(filtroLower))
      );
      
      console.log(`✅ ${clientesFiltrados.length} clientes encontrados con filtro "${filtro}"`);
      return clientesFiltrados.slice(0, limite);
    }
    
    console.log(`✅ Retornando ${Math.min(clientes.length, limite)} clientes (sin filtro)`);
    return clientes.slice(0, limite);
  } catch (error) {
    console.error('❌ Error buscando clientes:', error);
    return [];
  }
}

// 🔥 BUSCAR CLIENTES POR SEDE Y FILTRO
export async function buscarClientesPorSede(token: string, sedeId: string, filtro?: string): Promise<Cliente[]> {
  try {
    console.log(`🔍 Buscando clientes con filtro: "${filtro}"`);
    
    // Obtener clientes (el backend ya maneja la lógica de sede global vs local)
    const clientes = await getClientesPorSede(token, sedeId);
    
    // Filtrar localmente si hay un filtro
    if (filtro && filtro.trim()) {
      const filtroLower = filtro.toLowerCase();
      const clientesFiltrados = clientes.filter((cliente: Cliente) => 
        cliente.nombre.toLowerCase().includes(filtroLower) ||
        (cliente.telefono && cliente.telefono.includes(filtro)) ||
        (cliente.correo && cliente.correo.toLowerCase().includes(filtroLower)) ||
        (cliente.cliente_id && cliente.cliente_id.toLowerCase().includes(filtroLower))
      );
      
      console.log(`✅ ${clientesFiltrados.length} clientes encontrados con filtro "${filtro}"`);
      return clientesFiltrados;
    }
    
    console.log(`✅ ${clientes.length} clientes disponibles`);
    return clientes;
  } catch (error) {
    console.error('❌ Error buscando clientes por sede:', error);
    return [];
  }
}

// 🔥 NUEVA FUNCIÓN: Buscar con debounce para el input del modal
let searchTimeout: NodeJS.Timeout | null = null;

export async function buscarClientesConDebounce(
  token: string,
  filtro: string,
  callback: (clientes: Cliente[]) => void,
  delay: number = 300
): Promise<void> {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  searchTimeout = setTimeout(async () => {
    try {
      const resultados = await buscarClientes(token, filtro, 50);
      callback(resultados);
    } catch (error) {
      console.error('❌ Error en búsqueda con debounce:', error);
      callback([]);
    }
  }, delay);
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