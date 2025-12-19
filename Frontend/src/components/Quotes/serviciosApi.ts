import { API_BASE_URL } from "../../types/config";

export interface Servicio {
  _id: string;
  servicio_id?: string;
  nombre: string;
  descripcion?: string;
  duracion: number;
  precio: number;
  precio_local?: number;
  moneda_local?: string;
  estado: string;
  duracion_minutos: number;
  comision_estilista?: number | null;
  categoria?: string;
  requiere_producto?: boolean;
  activo?: boolean;
  creado_por?: string;
  created_at?: string;
  updated_at?: string;
  precios_completos?: {
    USD: number;
    COP?: number;
    MXN?: number;
  };
  sede_id?: string;
  codigo_referencia?: string;
}

// 🔥 INTERFAZ PARA DATOS DE SERVICIO DE LA API
interface ServicioAPI {
  _id: string;
  servicio_id?: string;
  nombre: string;
  duracion_minutos: number;
  precios: {
    USD: number;
    COP?: number;
    MXN?: number;
  };
  comision_estilista?: number;
  categoria?: string;
  requiere_producto?: boolean;
  activo?: boolean;
  sede_id?: string;
  creado_por?: string;
  created_at?: string;
  updated_at?: string;
}

// 🔥 INTERFAZ PARA SERVICIOS DE EJEMPLO
interface ServicioEjemplo {
  codigo: string;
  nombre: string;
  duracion: number;
  categoria: string;
  precio: number;
  requiere_producto: boolean;
}

// 🔥 LISTA COMPLETA DE TODOS LOS SERVICIOS DE GUAYAQUIL (22 servicios)
const TODOS_SERVICIOS_GUAYAQUIL: ServicioEjemplo[] = [
  { codigo: '1687644', nombre: 'PEINADOS O TRENZADOS', duracion: 40, categoria: 'Peinados', precio: 5, requiere_producto: false },
  { codigo: '1542486', nombre: 'SERVICIO EXPRESS', duracion: 90, categoria: 'Express', precio: 35, requiere_producto: false },
  { codigo: '1128696', nombre: 'Color', duracion: 120, categoria: 'Color', precio: 300, requiere_producto: false },
  { codigo: '736672', nombre: 'TRANSICION D MEDIA - EX ALTA', duracion: 180, categoria: 'Transición', precio: 60, requiere_producto: false },
  { codigo: '736667', nombre: 'TRANSICIÓN D EXB - MEDIA', duracion: 105, categoria: 'Transición', precio: 30, requiere_producto: false },
  { codigo: '736662', nombre: 'COMPLETO EX ALTA', duracion: 180, categoria: 'Completo', precio: 70, requiere_producto: false },
  { codigo: '736660', nombre: 'COMPLETO ALTA', duracion: 120, categoria: 'Completo', precio: 60, requiere_producto: false },
  { codigo: '736658', nombre: 'COMPLETO MEDIA', duracion: 90, categoria: 'Completo', precio: 50, requiere_producto: false },
  { codigo: '736656', nombre: 'COMPLETO BAJA', duracion: 75, categoria: 'Completo', precio: 40, requiere_producto: false },
  { codigo: '736651', nombre: 'COMPLETO EX BAJA', duracion: 60, categoria: 'Completo', precio: 30, requiere_producto: false },
  { codigo: '736648', nombre: 'OZONOTERAPIA', duracion: 60, categoria: 'Tratamientos', precio: 35, requiere_producto: true },
  { codigo: '736647', nombre: 'HIDRATACION D ALTA-E ALTA', duracion: 70, categoria: 'Tratamientos', precio: 35, requiere_producto: true },
  { codigo: '736646', nombre: 'HIDRATACION D BAJA-MEDIA', duracion: 60, categoria: 'Tratamientos', precio: 25, requiere_producto: true },
  { codigo: '736645', nombre: 'NUTRICION D ALTA-E TALTA', duracion: 70, categoria: 'Tratamientos', precio: 35, requiere_producto: true },
  { codigo: '736644', nombre: 'NUTRICION CAPILAR D BAJA-MEDIA', duracion: 60, categoria: 'Tratamientos', precio: 25, requiere_producto: true },
  { codigo: '736643', nombre: 'DEFINICION EA', duracion: 180, categoria: 'Definición', precio: 60, requiere_producto: true },
  { codigo: '736642', nombre: 'DEFINICION DA', duracion: 120, categoria: 'Definición', precio: 50, requiere_producto: true },
  { codigo: '736639', nombre: 'DEFINICION DM', duracion: 90, categoria: 'Definición', precio: 40, requiere_producto: true },
  { codigo: '736637', nombre: 'DEFINICION DB', duracion: 75, categoria: 'Definición', precio: 30, requiere_producto: true },
  { codigo: '736634', nombre: 'DEFINICION EB', duracion: 60, categoria: 'Definición', precio: 20, requiere_producto: true },
  { codigo: '736625', nombre: 'CORTE DE FORMA', duracion: 50, categoria: 'Corte', precio: 25, requiere_producto: true },
  { codigo: '736534', nombre: 'CORTE DE PUNTAS', duracion: 40, categoria: 'Corte', precio: 20, requiere_producto: true }
];

// 🔥 FUNCIÓN PRINCIPAL: Obtener servicios de la sede de Guayaquil
export async function getServicios(token: string): Promise<Servicio[]> {
  try {
    // 🔥 ID de la sede de Guayaquil
    const sedeId = "SD-28080";
    
    // 🔥 URL usando el endpoint específico
    const url = `${API_BASE_URL}scheduling/services/?sede_id=${sedeId}`;
    
    console.log('📍 Obteniendo servicios EXCLUSIVOS de Guayaquil desde:', url);
    
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });
    
    if (!res.ok) {
      console.error(`❌ Error HTTP ${res.status}:`, res.statusText);
      throw new Error(`Error ${res.status} al cargar servicios exclusivos de Guayaquil`);
    }
    
    const serviciosData: ServicioAPI[] = await res.json();
    console.log('📦 Servicios obtenidos de API:', serviciosData.length);
    
    let serviciosProcesados: Servicio[] = [];
    
    if (serviciosData.length === 0) {
      console.warn('⚠️ La API no devolvió servicios, usando lista completa de servicios');
      return crearServiciosExclusivosGuayaquil();
    }
    
    // 🔥 PROCESAR LOS SERVICIOS DE LA API
    serviciosProcesados = serviciosData.map((servicio: ServicioAPI) => {
      const monedaParaUsuario = 'USD';
      let precioFinal = 0;
      
      if (servicio.precios && servicio.precios.USD !== undefined) {
        precioFinal = servicio.precios.USD;
      }
      
      // 🔥 BUSCAR EL CÓDIGO EN NUESTRA LISTA COMPLETA
      const servicioCompleto = TODOS_SERVICIOS_GUAYAQUIL.find(s => 
        s.nombre.toLowerCase() === servicio.nombre.toLowerCase()
      );
      
      const codigoRef = servicioCompleto ? servicioCompleto.codigo : '';
      
      return {
        _id: servicio._id,
        servicio_id: servicio.servicio_id || servicio._id,
        codigo_referencia: codigoRef,
        nombre: servicio.nombre,
        descripcion: servicio.categoria || '',
        duracion: servicio.duracion_minutos || 30,
        duracion_minutos: servicio.duracion_minutos || 30,
        precio: precioFinal,
        precio_local: precioFinal,
        moneda_local: monedaParaUsuario,
        estado: servicio.activo ? 'activo' : 'inactivo',
        comision_estilista: servicio.comision_estilista || 0,
        categoria: servicio.categoria || 'General',
        requiere_producto: servicio.requiere_producto || false,
        activo: servicio.activo !== undefined ? servicio.activo : true,
        creado_por: servicio.creado_por,
        created_at: servicio.created_at,
        updated_at: servicio.updated_at,
        sede_id: servicio.sede_id || sedeId,
        precios_completos: servicio.precios || { USD: precioFinal }
      };
    });
    
    // 🔥 VERIFICAR SI FALTAN SERVICIOS
    const nombresApi = serviciosData.map(s => s.nombre.toLowerCase());
    const serviciosFaltantes = TODOS_SERVICIOS_GUAYAQUIL.filter(s => 
      !nombresApi.includes(s.nombre.toLowerCase())
    );
    
    if (serviciosFaltantes.length > 0) {
      console.warn(`⚠️ Faltan ${serviciosFaltantes.length} servicios en la API:`);
      serviciosFaltantes.forEach(s => {
        console.log(`   ❌ ${s.nombre} (${s.codigo})`);
      });
      
      // 🔥 AÑADIR LOS SERVICIOS FALTANTES
      const serviciosFaltantesProcesados = serviciosFaltantes.map(servicio => ({
        _id: `faltante-${servicio.codigo}`,
        servicio_id: `SV-${servicio.codigo}`,
        codigo_referencia: servicio.codigo,
        nombre: servicio.nombre,
        descripcion: `${servicio.categoria} - Servicio EXCLUSIVO Guayaquil`,
        duracion: servicio.duracion,
        duracion_minutos: servicio.duracion,
        precio: servicio.precio,
        precio_local: servicio.precio,
        moneda_local: 'USD',
        estado: 'activo',
        categoria: servicio.categoria,
        requiere_producto: servicio.requiere_producto,
        activo: true,
        comision_estilista: 0,
        creado_por: 'sistema-guayaquil-completo',
        sede_id: sedeId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        precios_completos: { 
          USD: servicio.precio,
          COP: servicio.precio * 4000,
          MXN: servicio.precio * 18
        }
      }));
      
      serviciosProcesados = [...serviciosProcesados, ...serviciosFaltantesProcesados];
    }
    
    console.log('🎯 Total servicios procesados para Guayaquil:', serviciosProcesados.length, '(22 esperados)');
    
    // 🔥 MOSTRAR TODOS LOS SERVICIOS
    console.log('📋 === SERVICIOS COMPLETOS GUAYAQUIL (22 servicios) ===');
    serviciosProcesados.forEach((servicio, index) => {
      const ref = servicio.codigo_referencia ? `[${servicio.codigo_referencia}]` : '[SIN CODIGO]';
      console.log(`${index + 1}. ${ref} ${servicio.nombre} - USD ${servicio.precio} - ${servicio.duracion}min - ${servicio.categoria}`);
    });
    console.log('=======================================================');
    
    return serviciosProcesados;
    
  } catch (error) {
    console.error('❌ Error en getServicios:', error);
    
    // 🔥 EN CASO DE ERROR, CREAR TODOS LOS SERVICIOS
    console.log('🚧 Creando TODOS los servicios EXCLUSIVOS de Guayaquil...');
    return crearServiciosExclusivosGuayaquil();
  }
}

// 🔥 FUNCIÓN PARA CREAR TODOS LOS SERVICIOS
function crearServiciosExclusivosGuayaquil(): Servicio[] {
  return TODOS_SERVICIOS_GUAYAQUIL.map((servicio: ServicioEjemplo) => ({
    _id: `guayaquil-exclusivo-${servicio.codigo}`,
    servicio_id: `SV-${servicio.codigo}`,
    codigo_referencia: servicio.codigo,
    nombre: servicio.nombre,
    descripcion: `${servicio.categoria} - Servicio EXCLUSIVO Guayaquil`,
    duracion: servicio.duracion,
    duracion_minutos: servicio.duracion,
    precio: servicio.precio,
    precio_local: servicio.precio,
    moneda_local: 'USD',
    estado: 'activo',
    categoria: servicio.categoria,
    requiere_producto: servicio.requiere_producto,
    activo: true,
    comision_estilista: 0,
    creado_por: 'sistema-guayaquil-completo',
    sede_id: 'SD-28080',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    precios_completos: { 
      USD: servicio.precio,
      COP: servicio.precio * 4000,
      MXN: servicio.precio * 18
    }
  }));
}

// 🔥 OBTENER SERVICIOS DE UN ESTILISTA
export async function getServiciosEstilista(estilistaId: string, token: string): Promise<Servicio[]> {
  try {
    // 1. Obtener todos los servicios EXCLUSIVOS de Guayaquil
    const todosServicios = await getServicios(token);
    
    if (todosServicios.length === 0) {
      return [];
    }
    
    // 2. Obtener el estilista
    const res = await fetch(`${API_BASE_URL}admin/profesionales/${estilistaId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });
    
    if (!res.ok) {
      console.warn('⚠️ No se pudo obtener el estilista, mostrando todos los servicios EXCLUSIVOS');
      return todosServicios;
    }
    
    const estilista = await res.json();
    
    // 3. Si el estilista no tiene restricciones, devolver todos
    if (!estilista.servicios_no_presta || !Array.isArray(estilista.servicios_no_presta)) {
      return todosServicios;
    }
    
    // 4. Filtrar servicios que el estilista NO presta
    const serviciosFiltrados = todosServicios.filter((servicio: Servicio) => {
      const servicioId = servicio.servicio_id || servicio._id;
      const codigoRef = servicio.codigo_referencia || '';
      return !estilista.servicios_no_presta.includes(servicioId) && 
             !estilista.servicios_no_presta.includes(codigoRef);
    });
    
    console.log(`👨‍🎨 Estilista ${estilista.nombre}: ${serviciosFiltrados.length} servicios disponibles de ${todosServicios.length}`);
    
    return serviciosFiltrados;
    
  } catch (error) {
    console.error('❌ Error en getServiciosEstilista:', error);
    return [];
  }
}

// 🔥 OBTENER SERVICIO POR CÓDIGO DE REFERENCIA
export async function getServicioPorCodigo(token: string, codigoRef: string): Promise<Servicio | null> {
  try {
    const todosServicios = await getServicios(token);
    const servicio = todosServicios.find((s: Servicio) => 
      s.codigo_referencia === codigoRef || 
      s.servicio_id === codigoRef
    );
    
    return servicio || null;
  } catch (error) {
    console.error('❌ Error en getServicioPorCodigo:', error);
    return null;
  }
}

// 🔥 FORMATEAR PRECIO
export function formatPrice(price: number, currency: string): string {
  if (!price && price !== 0) return 'Precio no disponible';
  
  switch (currency) {
    case 'COP':
      return `$${price.toLocaleString('es-CO')} COP`;
    case 'MXN':
      return `$${price.toLocaleString('es-MX')} MXN`;
    case 'USD':
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    default:
      return `$${price.toLocaleString()} ${currency}`;
  }
}

// 🔥 OBTENER SÍMBOLO DE MONEDA
export function getCurrencySymbol(currency: string): string {
  switch (currency) {
    case 'COP': return 'COP';
    case 'MXN': return 'MXN';
    case 'USD': return 'USD';
    default: return currency;
  }
}

// 🔥 INTERFAZ PARA CREAR SERVICIO
export interface CreateServicioData {
  nombre: string;
  duracion_minutos: number;
  precios: {
    USD: number;
    COP?: number;
    MXN?: number;
  };
  comision_estilista?: number | null;
  categoria?: string;
  requiere_producto?: boolean;
  activo?: boolean;
  codigo_referencia?: string;
}

// 🔥 CREAR SERVICIO
export async function createServicio(token: string, servicio: CreateServicioData): Promise<any> {
  const response = await fetch(`${API_BASE_URL}admin/servicios/`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      nombre: servicio.nombre.trim(),
      duracion_minutos: servicio.duracion_minutos,
      precios: servicio.precios,
      comision_estilista: servicio.comision_estilista,
      categoria: servicio.categoria?.trim() || 'General',
      requiere_producto: servicio.requiere_producto || false,
      activo: servicio.activo !== undefined ? servicio.activo : true
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || `Error al crear servicio: ${response.statusText}`);
  }

  return await response.json();
}

// 🔥 ACTUALIZAR SERVICIO
export async function updateServicio(token: string, servicioId: string, servicio: Partial<CreateServicioData>): Promise<any> {
  const response = await fetch(`${API_BASE_URL}admin/servicios/${servicioId}`, {
    method: 'PUT',
    headers: {
      'accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      ...servicio,
      nombre: servicio.nombre?.trim(),
      categoria: servicio.categoria?.trim() || 'General'
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || `Error al actualizar servicio: ${response.statusText}`);
  }

  return await response.json();
}

// 🔥 ELIMINAR SERVICIO
export async function deleteServicio(token: string, servicioId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}admin/servicios/${servicioId}`, {
    method: 'DELETE',
    headers: {
      'accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || `Error al eliminar servicio: ${response.statusText}`);
  }

  return await response.json();
}

// 🔥 OBTENER SERVICIO POR ID
export async function getServicioById(token: string, servicioId: string): Promise<Servicio | null> {
  try {
    const response = await fetch(`${API_BASE_URL}admin/servicios/${servicioId}`, {
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.error(`❌ Error obteniendo servicio ${servicioId}:`, response.status);
      return null;
    }

    const servicioData = await response.json();
    
    // Procesar según la moneda solicitada
    const servicio = procesarServicioConMonedaIndividual(servicioData);
    return servicio;
    
  } catch (error) {
    console.error('❌ Error en getServicioById:', error);
    return null;
  }
}

// 🔥 FUNCIÓN AUXILIAR PARA PROCESAR SERVICIO CON MONEDA
function procesarServicioConMonedaIndividual(servicioData: any): Servicio {
  const monedaParaUsuario = 'USD';
  let precioFinal = 0;
  
  if (servicioData.precios && typeof servicioData.precios === 'object') {
    if (monedaParaUsuario && servicioData.precios[monedaParaUsuario] !== null && servicioData.precios[monedaParaUsuario] !== undefined) {
      precioFinal = servicioData.precios[monedaParaUsuario];
    } else if (servicioData.precios.USD !== null && servicioData.precios.USD !== undefined) {
      precioFinal = servicioData.precios.USD;
    }
  }
  
  return {
    _id: servicioData._id,
    servicio_id: servicioData.servicio_id || servicioData._id,
    nombre: servicioData.nombre,
    descripcion: servicioData.categoria || '',
    duracion: servicioData.duracion_minutos || 30,
    duracion_minutos: servicioData.duracion_minutos || 30,
    precio: precioFinal,
    precio_local: precioFinal,
    moneda_local: monedaParaUsuario,
    estado: servicioData.activo ? 'activo' : 'inactivo',
    comision_estilista: servicioData.comision_estilista || null,
    categoria: servicioData.categoria || 'General',
    requiere_producto: servicioData.requiere_producto || false,
    activo: servicioData.activo !== undefined ? servicioData.activo : true,
    creado_por: servicioData.creado_por,
    created_at: servicioData.created_at,
    updated_at: servicioData.updated_at,
    precios_completos: servicioData.precios
  };
}