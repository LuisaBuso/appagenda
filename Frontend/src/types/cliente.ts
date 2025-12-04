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
  historialCitas: Array<{
    fecha: string;
    servicio: string;
    estilista: string;
  }>;
  historialCabello: Array<{
    tipo: string;
    fecha: string;
  }>;
  historialProductos: Array<{
    producto: string;
    fecha: string;
  }>;
  // 🔥 NUEVO: Fichas del cliente con nombres en lugar de IDs
  fichas?: Array<{
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
    
    // 🔥 CAMPOS NUEVOS DEL ENDPOINT - NOMBRES EN LUGAR DE IDs
    servicio: string;           // Nombre del servicio
    sede: string;              // Nombre de la sede
    estilista: string;         // Nombre del estilista
    sede_estilista: string;    // Sede del estilista
  }>;
}