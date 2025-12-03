import { API_BASE_URL } from "../../types/config";

export interface Servicio {
  _id: string;
  servicio_id?: string;
  nombre: string;
  descripcion?: string;
  duracion: number;
  precio: number;
  estado: string;
  duracion_minutos: number;
}

export async function getServicios(token: string): Promise<Servicio[]> {  
  const res = await fetch(`${API_BASE_URL}admin/servicios/`, {
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

/* =============================================
    🔥 ARREGLADO: obtener servicios del estilista
   ============================================= */

export async function getServiciosEstilista(estilistaId: string, token: string): Promise<Servicio[]> {
  try {
    console.log('🔄 Iniciando getServiciosEstilista para:', estilistaId);

    // 1. Traer todos los servicios
    const todosLosServicios = await getServicios(token);
    console.log('📥 Todos los servicios disponibles:', todosLosServicios.length);

    // 2. Traer al estilista
    const res = await fetch(`${API_BASE_URL}admin/profesionales/${estilistaId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });

    if (!res.ok) {
      console.error('❌ Error cargando estilista:', res.status, res.statusText);
      return [];
    }

    const estilista = await res.json();
    console.log('👤 Estilista obtenido:', estilista);
    console.log('📋 TODOS los campos del estilista:', Object.keys(estilista));

    // 3. Buscar en TODOS los campos posibles donde puedan estar los servicios
    let serviciosIds: string[] = [];

    // Revisar todos los campos posibles
    const camposPosibles = [
      'especialidades', 'servicios', 'servicios_id', 'servicio_ids',
      'especialidades_ids', 'services', 'service_ids'
    ];

    for (const campo of camposPosibles) {
      if (estilista[campo] && Array.isArray(estilista[campo]) && estilista[campo].length > 0) {
        console.log(`✅ Encontrado campo "${campo}":`, estilista[campo]);
        serviciosIds = estilista[campo];
        break;
      }
    }

    // Si no encontramos servicios, mostrar advertencia
    if (serviciosIds.length === 0) {
      console.warn('⚠️ No se encontraron servicios para el estilista en ningún campo');
      console.log('🔍 Revisando campos del estilista:');
      Object.keys(estilista).forEach(key => {
        if (Array.isArray(estilista[key])) {
          console.log(`   - ${key}:`, estilista[key]);
        }
      });
      return [];
    }

    console.log('🎯 IDs de servicios del estilista:', serviciosIds);

    // 4. Filtrar servicios que coincidan
    const serviciosFiltrados = todosLosServicios.filter(servicio => {
      const servicioId = servicio.servicio_id || servicio._id;
      const coincide = serviciosIds.includes(servicioId);
      
      if (coincide) {
        console.log(`✅ Servicio coincidente: ${servicio.nombre} (ID: ${servicioId})`);
      }
      
      return coincide;
    });

    console.log('📦 Servicios filtrados encontrados:', serviciosFiltrados.length);
    console.log('📋 Lista de servicios:', serviciosFiltrados.map(s => s.nombre));

    return serviciosFiltrados;

  } catch (err) {
    console.error('❌ Error en getServiciosEstilista:', err);
    return [];
  }
}