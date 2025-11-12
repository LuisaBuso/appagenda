// src/pages/Quotes/Bloqueos.tsx
import React, { useState } from "react";
import { createBloqueo } from "./bloqueosApi";
import { useAuth } from "../../components/Auth/AuthContext";

// ✅ Props para permitir cerrar el modal desde fuera
interface BloqueosProps {
  onClose: () => void;
  estilistaId?: string; // ← Agregar esta prop
  fecha?: string;
  horaInicio?: string;
}

const Bloqueos: React.FC<BloqueosProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [motivo, setMotivo] = useState("");
  const [profesionalId, setProfesionalId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [repetir, setRepetir] = useState(false);
  const [tipoRepeticion, setTipoRepeticion] = useState("diariamente");
  const [intervalo, setIntervalo] = useState(1);
  const [tipoFinalizacion, setTipoFinalizacion] = useState("repeticiones");
  const [repeticiones, setRepeticiones] = useState(1);
  const [fechaFinal, setFechaFinal] = useState("");
  const [incluyeOriginal, setIncluyeOriginal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.access_token) return;

    const inicio = `${fechaInicio}T${horaInicio}:00`;
    const fin = `${fechaFin}T${horaFin}:00`;

    const data = {
      motivo,
      profesional_id: profesionalId,
      fecha_inicio: inicio,
      fecha_fin: fin,
      repetir,
      configuracion_repetir: repetir ? {
        tipo: tipoRepeticion,
        intervalo,
        finaliza: {
          tipo: tipoFinalizacion,
          repeticiones: tipoFinalizacion === "repeticiones" ? repeticiones : undefined,
          fecha: tipoFinalizacion === "fecha" ? fechaFinal : undefined
        },
        incluye_original: incluyeOriginal
      } : undefined
    };

    try {
      setLoading(true);
      await createBloqueo(data, user.access_token);
      setMensaje("✅ Bloqueo guardado correctamente");

      // Limpiar formulario
      setMotivo("");
      setProfesionalId("");
      setFechaInicio("");
      setHoraInicio("");
      setFechaFin("");
      setHoraFin("");
      setRepetir(false);
      setTipoRepeticion("diariamente");
      setIntervalo(1);
      setTipoFinalizacion("repeticiones");
      setRepeticiones(1);
      setFechaFinal("");
      setIncluyeOriginal(true);

      // Cerrar modal después de guardar
      setTimeout(() => onClose(), 800);
    } catch (err) {
      console.error(err);
      setMensaje("❌ Error al guardar el bloqueo");
    } finally {
      setLoading(false);
    }
  };

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
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
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
            placeholder="ID del profesional"
            value={profesionalId}
            onChange={(e) => setProfesionalId(e.target.value)}
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
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio</label>
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
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
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hora fin</label>
            <input
              type="time"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
            />
          </div>
        </div>

        {/* Repetir bloqueo - Sección mejorada */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center space-x-3 mb-4">
            <input
              type="checkbox"
              id="repetir"
              checked={repetir}
              onChange={(e) => setRepetir(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="repetir" className="text-sm font-medium text-gray-700">
              Repetir bloqueo
            </label>
          </div>

          {repetir && (
            <div className="ml-7 space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Repetir</label>
                
                <div className="flex items-center space-x-3">
                  <select
                    value={tipoRepeticion}
                    onChange={(e) => setTipoRepeticion(e.target.value)}
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
                    value={intervalo}
                    onChange={(e) => setIntervalo(parseInt(e.target.value) || 1)}
                    className="w-16 p-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                  />
                  
                  <span className="text-sm text-gray-600 whitespace-nowrap">
                    {tipoRepeticion === "diariamente" ? "día(s)" : 
                     tipoRepeticion === "semanalmente" ? "semana(s)" : "mes(es)"}
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
                      checked={tipoFinalizacion === "repeticiones"}
                      onChange={(e) => setTipoFinalizacion(e.target.value)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="finaliza-repeticiones" className="text-sm text-gray-700 whitespace-nowrap">
                      Después de
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={repeticiones}
                      onChange={(e) => setRepeticiones(parseInt(e.target.value) || 1)}
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
                      checked={tipoFinalizacion === "fecha"}
                      onChange={(e) => setTipoFinalizacion(e.target.value)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="finaliza-fecha" className="text-sm text-gray-700 whitespace-nowrap">
                      El
                    </label>
                    <input
                      type="date"
                      value={fechaFinal}
                      onChange={(e) => setFechaFinal(e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
              </div>
            </div>
          )}
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

export default Bloqueos;