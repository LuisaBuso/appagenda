export type SystemUserRole = "superadmin" | "admin" | "admin_sede" | "call_center";

export interface HorarioDisponibilidad {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

export interface HorarioConfig {
  sede_id: string;
  disponibilidad: HorarioDisponibilidad[];
}

export interface SystemUser {
  _id: string;
  nombre: string;
  email: string;
  role: SystemUserRole;
  sede_id?: string | null;
  comision?: number | null;
  especialidades?: string[];
  activo: boolean;
  user_type: "system" | "staff" | string;
  fecha_creacion?: string;
  creado_por?: string;
}

export interface CreateSystemUserPayload {
  nombre: string;
  email: string;
  role: SystemUserRole;
  sede_id?: string | null;
  comision?: number | null;
  especialidades?: string[];
  password?: string;
  horario?: HorarioConfig;
  activo?: boolean;
}
