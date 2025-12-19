// En cliente.ts, actualiza la interfaz:
export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  diasSinVenir: number;
  diasSinComprar: number;
  ltv: number;
  ticketPromedio: number;
  rizotipo: string;
  nota: string;
  sede_id: string;
  
  // Historiales
  historialCitas: Array<{
    fecha: string;
    servicio: string;
    estilista: string;
    notas?: string;
    metodo_pago?: string;
    estado_pago?: string;
    valor_total?: string | number;
    moneda?: string;
    hora_inicio?: string;
    hora_fin?: string;
    estado?: string;
    datos_completos?: any;
  }>;
  
  historialCabello: Array<{
    tipo: string;
    fecha: string;
  }>;
  
  historialProductos: Array<{
    producto: string;
    fecha: string;
    precio?: string | number;
    estilista?: string;
    estado_pago?: string;
    metodo_pago?: string;
  }>;
  
  fichas?: Array<{
    _id: string;
    cliente_id: string;
    sede_id: string;
    cliente_id_antiguo?: string;
    servicio_id: string;
    servicio_nombre: string;
    profesional_nombre?: string;
    profesional_id: string;
    fecha_ficha: string;
    fecha_reserva: string;
    email: string | null;
    nombre: string;
    apellido: string | null;
    cedula: string;
    telefono: string;
    
    // 🔥 Estructura de fotos
    fotos?: {
      antes?: string[];
      despues?: string[];
      antes_urls?: string[];
      despues_urls?: string[];
    };
    
    antes_url?: string;
    despues_url?: string;
    precio: string | number;
    estado: string;
    estado_pago: string;
    local: string;
    sede_nombre?: string;
    notas_cliente?: string; // 🔥 Cambiado a opcional
    comentario_interno: string;
    
    // 🔥 Respuestas del cuestionario
    respuestas?: Array<{
      pregunta: string;
      respuesta: boolean;
      observaciones: string;
    }>;
    
    respuesta_1?: string;
    respuesta_2?: string;
    respuesta_3?: string;
    respuesta_4?: string;
    respuesta_5?: string;
    respuesta_6?: string;
    respuesta_7?: string;
    respuesta_8?: string;
    respuesta_9?: string;
    respuesta_10?: string;
    
    source_file?: string;
    migrated_at?: string;
    procesado_imagenes?: boolean;
    imagenes_actualizadas_at?: string;
    servicio: string;
    sede: string;
    estilista: string;
    sede_estilista: string;
  }>;
}