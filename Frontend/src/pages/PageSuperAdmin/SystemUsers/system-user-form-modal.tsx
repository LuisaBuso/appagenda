"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Clock, Loader, X } from "lucide-react";
import { useAuth } from "../../../components/Auth/AuthContext";
import { sedeService, type Sede } from "../Sedes/sedeService";
import { serviciosService } from "../Services/serviciosService";
import type {
  CreateSystemUserPayload,
  HorarioConfig,
  HorarioDisponibilidad,
  SystemUserRole,
} from "../../../types/system-user";
import { formatSedeNombre } from "../../../lib/sede";
import type { Service } from "../../../types/service";

interface SystemUserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateSystemUserPayload) => Promise<void>;
  isSaving?: boolean;
}

const ROLE_OPTIONS: Array<{ label: string; value: SystemUserRole }> = [
  { label: "superadmin", value: "superadmin" },
  { label: "admin", value: "admin" },
  { label: "adminsede", value: "admin_sede" },
  { label: "call center", value: "call_center" },
];

const DIAS_SEMANA = [
  { id: 1, nombre: "Lunes" },
  { id: 2, nombre: "Martes" },
  { id: 3, nombre: "Miercoles" },
  { id: 4, nombre: "Jueves" },
  { id: 5, nombre: "Viernes" },
  { id: 6, nombre: "Sabado" },
  { id: 7, nombre: "Domingo" },
];

const HORARIOS_PREDEFINIDOS = [
  { label: "Turno Manana (8:00 - 12:00)", inicio: "08:00", fin: "12:00" },
  { label: "Turno Tarde (13:00 - 17:00)", inicio: "13:00", fin: "17:00" },
  { label: "Turno Completo (8:00 - 17:00)", inicio: "08:00", fin: "17:00" },
  { label: "Medio Turno (8:00 - 14:00)", inicio: "08:00", fin: "14:00" },
  { label: "Horario Extendido (7:00 - 19:00)", inicio: "07:00", fin: "19:00" },
];

const buildDefaultDisponibilidad = (): HorarioDisponibilidad[] =>
  DIAS_SEMANA.map((dia) => ({
    dia_semana: dia.id,
    hora_inicio: "08:00",
    hora_fin: "17:00",
    activo: true,
  }));

const buildDefaultHorario = (): HorarioConfig => ({
  sede_id: "",
  disponibilidad: buildDefaultDisponibilidad(),
});

export function SystemUserFormModal({
  isOpen,
  onClose,
  onSave,
  isSaving = false,
}: SystemUserFormModalProps) {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    role: "admin" as SystemUserRole,
    sede_id: "",
    comision: "",
    especialidades: [] as string[],
    password: "",
    activo: true,
  });

  const [horario, setHorario] = useState<HorarioConfig>(buildDefaultHorario());
  const [showHorarioConfig, setShowHorarioConfig] = useState(true);
  const [horarioPredefinido, setHorarioPredefinido] = useState("");

  const [sedes, setSedes] = useState<Sede[]>([]);
  const [servicios, setServicios] = useState<Service[]>([]);
  const [isLoadingSedes, setIsLoadingSedes] = useState(false);
  const [isLoadingServicios, setIsLoadingServicios] = useState(false);

  const [isSedeDropdownOpen, setIsSedeDropdownOpen] = useState(false);
  const [isServiciosDropdownOpen, setIsServiciosDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      Boolean(
        formData.nombre.trim() &&
          formData.email.trim() &&
          formData.role &&
          formData.sede_id.trim() &&
          formData.password.trim()
      ),
    [formData]
  );

  useEffect(() => {
    if (!isOpen) return;

    setFormData({
      nombre: "",
      email: "",
      role: "admin",
      sede_id: "",
      comision: "",
      especialidades: [],
      password: "",
      activo: true,
    });
    setHorario(buildDefaultHorario());
    setShowHorarioConfig(true);
    setHorarioPredefinido("");
    setError(null);
  }, [isOpen]);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.access_token || !isOpen) return;
      try {
        setIsLoadingSedes(true);
        setIsLoadingServicios(true);

        const [sedesData, serviciosData] = await Promise.all([
          sedeService.getSedes(user.access_token),
          serviciosService.getServicios(user.access_token),
        ]);

        setSedes(sedesData);
        setServicios(serviciosData);
      } catch (err) {
        console.error("Error cargando datos para crear usuario del sistema:", err);
      } finally {
        setIsLoadingSedes(false);
        setIsLoadingServicios(false);
      }
    };

    loadData();
  }, [isOpen, user?.access_token]);

  useEffect(() => {
    if (formData.sede_id) {
      setHorario((prev) => ({
        ...prev,
        sede_id: formData.sede_id,
      }));
    }
  }, [formData.sede_id]);

  useEffect(() => {
    const handleClickOutside = () => {
      setIsSedeDropdownOpen(false);
      setIsServiciosDropdownOpen(false);
    };

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleSelectSede = (sede: Sede) => {
    setFormData((prev) => ({ ...prev, sede_id: sede.sede_id }));
    setIsSedeDropdownOpen(false);
  };

  const getSedeNombre = () => {
    const sedeSeleccionada = sedes.find((s) => s.sede_id === formData.sede_id);
    return sedeSeleccionada ? formatSedeNombre(sedeSeleccionada.nombre, "Seleccionar sede") : "Seleccionar sede";
  };

  const handleToggleServicio = (servicioId: string) => {
    if (!servicioId) return;

    setFormData((prev) => ({
      ...prev,
      especialidades: prev.especialidades.includes(servicioId)
        ? prev.especialidades.filter((id) => id !== servicioId)
        : [...prev.especialidades, servicioId],
    }));
  };

  const handleComisionChange = (value: string) => {
    const cleanedValue = value.replace(/[^\d.]/g, "");
    const parts = cleanedValue.split(".");

    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;

    setFormData((prev) => ({ ...prev, comision: cleanedValue }));
  };

  const aplicarHorarioPredefinido = (horarioSeleccionado: string) => {
    if (!horarioSeleccionado) return;

    const preset = HORARIOS_PREDEFINIDOS.find((h) => h.label === horarioSeleccionado);
    if (!preset) return;

    setHorario((prev) => ({
      ...prev,
      disponibilidad: prev.disponibilidad.map((dia) => ({
        ...dia,
        hora_inicio: preset.inicio,
        hora_fin: preset.fin,
      })),
    }));
  };

  const actualizarHorarioDia = (
    diaSemana: number,
    campo: "hora_inicio" | "hora_fin" | "activo",
    valor: string | boolean
  ) => {
    setHorario((prev) => ({
      ...prev,
      disponibilidad: prev.disponibilidad.map((dia) =>
        dia.dia_semana === diaSemana ? { ...dia, [campo]: valor } : dia
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    const nombre = formData.nombre.trim();
    const email = formData.email.trim();
    const password = formData.password.trim();
    const sedeId = formData.sede_id.trim();

    if (!nombre) {
      setError("Por favor ingresa un nombre.");
      return;
    }

    if (!email) {
      setError("Por favor ingresa un email.");
      return;
    }

    if (!sedeId) {
      setError("Por favor selecciona una sede.");
      return;
    }

    if (!password) {
      setError("Por favor ingresa una contraseña.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    let comision: number | null = null;
    if (formData.comision.trim() !== "") {
      const comisionNum = Number(formData.comision);
      if (Number.isNaN(comisionNum) || comisionNum < 0 || comisionNum > 100) {
        setError("La comisión debe estar entre 0 y 100.");
        return;
      }
      comision = Number(comisionNum.toFixed(2));
    }

    const especialidadesValidas = (formData.especialidades || [])
      .map((esp) => esp.trim())
      .filter((esp) => Boolean(esp));

    if (showHorarioConfig) {
      const horariosInvalidos = horario.disponibilidad.filter(
        (dia) => dia.activo && dia.hora_inicio >= dia.hora_fin
      );
      if (horariosInvalidos.length > 0) {
        const dias = horariosInvalidos
          .map((dia) => DIAS_SEMANA.find((d) => d.id === dia.dia_semana)?.nombre || `Día ${dia.dia_semana}`)
          .join(", ");
        setError(`Hay horarios inválidos (inicio >= fin) en: ${dias}.`);
        return;
      }
    }

    const payload: CreateSystemUserPayload = {
      nombre,
      email,
      role: formData.role,
      sede_id: sedeId,
      comision,
      especialidades: especialidadesValidas,
      password,
      activo: formData.activo,
    };

    if (showHorarioConfig) {
      payload.horario = {
        sede_id: sedeId,
        disponibilidad: horario.disponibilidad,
      };
    }

    try {
      await onSave(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el usuario del sistema.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
      <div className="flex min-h-full items-start justify-center">
        <div
          className="bg-white rounded-lg w-full max-w-md p-6 max-h-[calc(100vh-2rem)] overflow-y-auto"
          onClick={stopPropagation}
        >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Añadir usuario del sistema</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            disabled={isSaving}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[oklch(0.65_0.25_280)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.65_0.25_280)]/20"
              required
              disabled={isSaving}
              placeholder="Ingresa el nombre completo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[oklch(0.65_0.25_280)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.65_0.25_280)]/20"
              required
              disabled={isSaving}
              placeholder="ejemplo@correo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Rol *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value as SystemUserRole }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[oklch(0.65_0.25_280)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.65_0.25_280)]/20"
              required
              disabled={isSaving}
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium mb-2">Sede *</label>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsSedeDropdownOpen(!isSedeDropdownOpen);
                setIsServiciosDropdownOpen(false);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[oklch(0.65_0.25_280)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.65_0.25_280)]/20 text-left flex justify-between items-center"
              disabled={isSaving || isLoadingSedes}
            >
              <span className={formData.sede_id ? "text-gray-900" : "text-gray-500"}>
                {isLoadingSedes ? "Cargando sedes..." : getSedeNombre()}
              </span>
              {isLoadingSedes ? (
                <Loader className="h-4 w-4 animate-spin text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {isSedeDropdownOpen && !isLoadingSedes && (
              <div
                className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                onClick={stopPropagation}
              >
                {sedes.map((sede) => (
                  <button
                    key={sede.sede_id}
                    type="button"
                    onClick={() => handleSelectSede(sede)}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                      formData.sede_id === sede.sede_id ? "bg-blue-50 text-blue-600" : ""
                    }`}
                  >
                    <div className="font-medium">{formatSedeNombre(sede.nombre)}</div>
                    <div className="text-sm text-gray-500 truncate">{sede.direccion}</div>
                  </button>
                ))}
                {sedes.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500 text-center">No hay sedes disponibles</div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Comisión (%)</label>
            <input
              type="text"
              value={formData.comision}
              onChange={(e) => handleComisionChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[oklch(0.65_0.25_280)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.65_0.25_280)]/20"
              placeholder="Ej: 15.5 (opcional)"
              disabled={isSaving}
            />
            <p className="text-xs text-gray-500 mt-1">Dejar vacío si no aplica comisión. Máximo 2 decimales.</p>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium mb-2">Especialidades (Servicios)</label>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsServiciosDropdownOpen(!isServiciosDropdownOpen);
                setIsSedeDropdownOpen(false);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[oklch(0.65_0.25_280)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.65_0.25_280)]/20 text-left flex justify-between items-center"
              disabled={isSaving || isLoadingServicios}
            >
              <span className={formData.especialidades.length > 0 ? "text-gray-900" : "text-gray-500"}>
                {isLoadingServicios
                  ? "Cargando servicios..."
                  : formData.especialidades.length === 0
                  ? "Seleccionar servicios"
                  : `${formData.especialidades.length} servicio(s) seleccionado(s)`}
              </span>
              {isLoadingServicios ? (
                <Loader className="h-4 w-4 animate-spin text-gray-400" />
              ) : isServiciosDropdownOpen ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {isServiciosDropdownOpen && !isLoadingServicios && (
              <div
                className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                onClick={stopPropagation}
              >
                {servicios.map((servicio) => {
                  const servicioId = servicio.servicio_id || servicio.id;
                  if (!servicioId) return null;

                  return (
                    <label
                      key={servicioId}
                      className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={formData.especialidades.includes(servicioId)}
                        onChange={() => handleToggleServicio(servicioId)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-[oklch(0.65_0.25_280)] focus:ring-[oklch(0.65_0.25_280)]"
                        disabled={isSaving}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{servicio.nombre}</p>
                        <p className="text-xs text-gray-500">
                          ID: {servicioId} • {servicio.duracion || 0} min • $
                        </p>
                      </div>
                    </label>
                  );
                })}
                {servicios.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500 text-center">No hay servicios disponibles</div>
                )}
              </div>
            )}
          </div>

          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900">Configuración de Horario (Nuevo)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHorarioConfig(!showHorarioConfig)}
                className="text-sm text-[oklch(0.65_0.25_280)] hover:text-[oklch(0.60_0.25_280)]"
                disabled={isSaving}
              >
                {showHorarioConfig ? "Ocultar" : "Mostrar"}
              </button>
            </div>

            {showHorarioConfig && (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-2">Horario Predefinido</label>
                  <select
                    value={horarioPredefinido}
                    onChange={(e) => {
                      const horarioSeleccionado = e.target.value;
                      setHorarioPredefinido(horarioSeleccionado);
                      aplicarHorarioPredefinido(horarioSeleccionado);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[oklch(0.65_0.25_280)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.65_0.25_280)]/20"
                    disabled={isSaving}
                  >
                    <option value="">Seleccionar horario predefinido</option>
                    {HORARIOS_PREDEFINIDOS.map((preset) => (
                      <option key={preset.label} value={preset.label}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Selecciona un horario predefinido o configura manualmente abajo
                  </p>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                  {horario.disponibilidad.map((dia) => {
                    const diaInfo = DIAS_SEMANA.find((d) => d.id === dia.dia_semana);
                    return (
                      <div key={dia.dia_semana} className="border border-gray-100 rounded p-2 bg-gray-50/50">
                        <div className="flex items-center justify-between mb-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={dia.activo}
                              onChange={(e) =>
                                actualizarHorarioDia(dia.dia_semana, "activo", e.target.checked)
                              }
                              className="h-4 w-4 rounded border-gray-300 text-[oklch(0.65_0.25_280)] focus:ring-[oklch(0.65_0.25_280)]"
                              disabled={isSaving}
                            />
                            <span className="text-sm font-medium">{diaInfo?.nombre}</span>
                          </label>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              dia.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {dia.activo ? "Activo" : "Inactivo"}
                          </span>
                        </div>

                        {dia.activo && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Hora Inicio</label>
                              <input
                                type="time"
                                value={dia.hora_inicio}
                                onChange={(e) =>
                                  actualizarHorarioDia(dia.dia_semana, "hora_inicio", e.target.value)
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-[oklch(0.65_0.25_280)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.65_0.25_280)]/20"
                                disabled={isSaving}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Hora Fin</label>
                              <input
                                type="time"
                                value={dia.hora_fin}
                                onChange={(e) =>
                                  actualizarHorarioDia(dia.dia_semana, "hora_fin", e.target.value)
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-[oklch(0.65_0.25_280)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.65_0.25_280)]/20"
                                disabled={isSaving}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded mt-2">
                  <p>Los cambios de horario quedan guardados en la configuración del usuario.</p>
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Contraseña *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[oklch(0.65_0.25_280)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.65_0.25_280)]/20"
              required
              placeholder="Ingresa una contraseña segura"
              disabled={isSaving}
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activo-system-user"
              checked={formData.activo}
              onChange={(e) => setFormData((prev) => ({ ...prev, activo: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-[oklch(0.65_0.25_280)] focus:ring-[oklch(0.65_0.25_280)]"
              disabled={isSaving}
            />
            <label htmlFor="activo-system-user" className="text-sm font-medium text-gray-700">
              Usuario activo
            </label>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[oklch(0.65_0.25_280)] text-white rounded-lg hover:bg-[oklch(0.60_0.25_280)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              disabled={!canSubmit || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Crear usuario del sistema"
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
