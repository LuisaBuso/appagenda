// src/types/fichas.ts
export interface Cita {
  cita_id: string;
  cliente: {
    cliente_id: string;
    nombre: string;
    apellido: string;
    telefono: string;
    email: string;
  };
  servicio: {
    servicio_id: string;
    nombre: string;
    precio: number;
  };
  sede: {
    sede_id: string;
    nombre: string;
  };
  estilista_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  comentario?: string;
}

export interface FichaBase {
  tipo_ficha: string;
  cita_id: string;
  cliente_id: string;
  servicio_id: string;
  profesional_id: string;
  datos_especificos: Record<string, any>;
  fecha_ficha: string;
  autorizacion_publicacion?: boolean;
}

// Tipos específicos para cada ficha
export interface DiagnosticoRizotipoData {
  plasticidad: "ALTA" | "MEDIA" | "BAJA" | "MUY BAJA";
  permeabilidad: "ALTA" | "MEDIA" | "BAJA" | "OTRA";
  porosidad: "ALTA" | "BAJA";
  exterior_lipidico: "ALTA" | "MEDIA" | "BAJA";
  densidad: "EXTRA ALTA" | "ALTA" | "MEDIA" | "BAJA";
  oleosidad: "ALTA" | "MEDIA" | "BAJA";
  grosor: "GRUESO" | "MEDIO" | "DELGADO";
  textura: "Lanoso / Ulótrico" | "Ensotijado / Lisótrico" | "Laminado / Cinótrico" | "Procesado o dañado";
  recomendaciones_personalizadas: string;
  frecuencia_corte: string;
  tecnicas_estilizado: string;
  productos_sugeridos: string;
  observaciones_generales: string;
  autoriza_publicar: boolean;
}

export interface FichaColorData {
  respuestas: Array<{
    pregunta: string;
    respuesta: boolean;
    observaciones: string;
  }>;
  autoriza_publicar: boolean;
}

export interface AsesoriaCorteData {
  descripcion: string;
  observaciones: string;
  autoriza_publicar: boolean;
}

export interface CuidadoPostColorData {
  observaciones_personalizadas: string;
  tenga_en_cuenta: string;
  recomendaciones_seleccionadas: boolean[];
}

export interface ValoracionPruebaColorData {
  acuerdos: string;
  recomendaciones: string;
  servicio_valorado: string;
}