import React, { useState, useCallback, useMemo } from "react";
import { createBloqueo } from "./bloqueosApi";
import { useAuth } from "../../components/Auth/AuthContext";

interface BloqueosProps {
  onClose: () => void;
  estilistaId?: string;
  fecha?: string;
  horaInicio?: string;
}

// 🔥 VALORES POR DEFECTO OPTIMIZADOS
const DEFAULT_VALUES = {
  motivo: "",
  profesionalId: "",
  fechaInicio: "",
  horaInicio: "09:00",
  fechaFin: "",
  horaFin: "10:00",
  repetir: false,
  tipoRepeticion: "diariamente" as const,
  intervalo: 1,
  tipoFinalizacion: "repeticiones" as "repeticiones" | "fecha",
  repeticiones: 1,
  fechaFinal: "",
  incluyeOriginal: true,
};

const Bloqueos: React.FC<BloqueosProps> = ({ onClose, estilistaId, fecha, horaInicio }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    ...DEFAULT_VALUES,
    // 🔥 Pre-llenar datos si vienen de props
    profesionalId: estilistaId || "",
    fechaInicio: fecha || "",
    horaInicio: horaInicio || DEFAULT_VALUES.horaInicio,
  });
  
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // 🔥 HANDLERS OPTIMIZADOS CON useCallback
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.access_token) return;

    const inicio = `${formData.fechaInicio}T${formData.horaInicio}:00`;
    const fin = `${formData.fechaFin}T${formData.horaFin}:00`;

    const data = {
      motivo: formData.motivo,
      profesional_id: formData.profesionalId,
      fecha_inicio: inicio,
      fecha_fin: fin,
      repetir: formData.repetir,
      configuracion_repetir: formData.repetir ? {
        tipo: formData.tipoRepeticion,
        intervalo: formData.intervalo,
        finaliza: {
          tipo: formData.tipoFinalizacion,
          repeticiones: formData.tipoFinalizacion === "repeticiones" ? formData.repeticiones : undefined,
          fecha: formData.tipoFinalizacion === "fecha" ? formData.fechaFinal : undefined
        },
        incluye_original: formData.incluyeOriginal
      } : undefined
    };

    try {
      setLoading(true);
      setMensaje("");
      
      await createBloqueo(data, user.access_token);
      setMensaje("✅ Bloqueo guardado correctamente");

      // 🔥 Cerrar después de éxito
      setTimeout(onClose, 800);
    } catch (err) {
      console.error(err);
      setMensaje("❌ Error al guardar el bloqueo");
    } finally {
      setLoading(false);
    }
  }, [formData, user, onClose]);

  // 🔥 CALCULAR FECHA MÍNIMA PARA FECHA FIN
  const minFechaFin = useMemo(() => {
    return formData.fechaInicio || undefined;
  }, [formData.fechaInicio]);

  // 🔥 RENDERIZADO CONDICIONAL OPTIMIZADO
  const renderRepetirSection = useMemo(() => {
    if (!formData.repetir) return null;

    return (
      <div className="ml-7 space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Repetir</label>
          
          <div className="flex items-center space-x-3">
            <select
              value={formData.tipoRepeticion}
              onChange={(e) => handleInputChange('tipoRepeticion', e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
            >
              <option value="diariamente">Diariamente</option>
              <option value="semanalmente">Semanalmente</option>
              <option value="mensualmente">Mensualmente</option>
            </select>
            
            <span className="text-sm text-gray-600 whitespace-nowrap">Cada</span>
            
            <input
              type="number"
              min="1"
              value={formData.intervalo}
              onChange={(e) => handleInputChange('intervalo', parseInt(e.target.value) || 1)}
              className="w-16 p-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
            />
            
            <span className="text-sm text-gray-600 whitespace-nowrap">
              {formData.tipoRepeticion === "diariamente" ? "día(s)" : 
               formData.tipoRepeticion === "semanalmente" ? "semana(s)" : "mes(es)"}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Finaliza</label>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="finaliza-repeticiones"
                name="finaliza"
                value="repeticiones"
                checked={formData.tipoFinalizacion === "repeticiones"}
                onChange={(e) => handleInputChange('tipoFinalizacion', e.target.value)}
                className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <label htmlFor="finaliza-repeticiones" className="text-sm text-gray-700 whitespace-nowrap">
                Después de
              </label>
              <input
                type="number"
                min="1"
                value={formData.repeticiones}
                onChange={(e) => handleInputChange('repeticiones', parseInt(e.target.value) || 1)}
                className="w-20 p-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                placeholder="Ej. 5"
              />
              <span className="text-sm text-gray-600 whitespace-nowrap">repeticiones</span>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="finaliza-fecha"
                name="finaliza"
                value="fecha"
                checked={formData.tipoFinalizacion === "fecha"}
                onChange={(e) => handleInputChange('tipoFinalizacion', e.target.value)}
                className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <label htmlFor="finaliza-fecha" className="text-sm text-gray-700 whitespace-nowrap">
                El
              </label>
              <input
                type="date"
                value={formData.fechaFinal}
                onChange={(e) => handleInputChange('fechaFinal', e.target.value)}
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                min={formData.fechaInicio}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }, [formData.repetir, formData.tipoRepeticion, formData.intervalo, formData.tipoFinalizacion, formData.repeticiones, formData.fechaFinal, formData.fechaInicio, handleInputChange]);

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-semibold mb-4">Bloqueo de horario</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Motivo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motivo / Etiqueta
          </label>
          <input
            type="text"
            value={formData.motivo}
            onChange={(e) => handleInputChange('motivo', e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
            placeholder="Ej: Vacaciones, Capacitación, Mantenimiento"
          />
        </div>

        {/* Profesional */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Profesional
          </label>
          <input
            type="text"
            placeholder="Nombre del profesional"
            value={formData.profesionalId}
            onChange={(e) => handleInputChange('profesionalId', e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
          />
        </div>

        {/* Fecha de inicio */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
            <input
              type="date"
              value={formData.fechaInicio}
              onChange={(e) => handleInputChange('fechaInicio', e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio</label>
            <input
              type="time"
              value={formData.horaInicio}
              onChange={(e) => handleInputChange('horaInicio', e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
            />
          </div>
        </div>

        {/* Fecha de fin */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de fin</label>
            <input
              type="date"
              value={formData.fechaFin}
              onChange={(e) => handleInputChange('fechaFin', e.target.value)}
              required
              min={minFechaFin}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hora fin</label>
            <input
              type="time"
              value={formData.horaFin}
              onChange={(e) => handleInputChange('horaFin', e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
            />
          </div>
        </div>

        {/* Repetir bloqueo */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center space-x-3 mb-4">
            <input
              type="checkbox"
              id="repetir"
              checked={formData.repetir}
              onChange={(e) => handleInputChange('repetir', e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="repetir" className="text-sm font-medium text-gray-700">
              Repetir bloqueo
            </label>
          </div>

          {renderRepetirSection}
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className={`p-3 rounded-lg text-center text-sm font-medium ${
            mensaje.includes("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {mensaje}
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Guardando..." : "Guardar bloqueo"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default React.memo(Bloqueos);