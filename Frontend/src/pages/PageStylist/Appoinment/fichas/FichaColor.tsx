// src/components/fichas/FichaColor.tsx
"use client";

import { useState } from "react";
import { Cita } from '../../../../types/fichas';
import { Camera } from "lucide-react";
import { API_BASE_URL } from '../../../../types/config';

interface FichaColorProps {
  cita: Cita;
  onSubmit: (data: any) => void;
}

const preguntasColor = [
  "¿Estás de acuerdo en que evaluemos la salud antes del color?",
  "¿Comprendes que si no está en buen estado no realizamos color?",
  "¿Aceptas que los resultados dependen del estado inicial?",
  "¿Aceptas los riesgos del servicio?",
  "¿Confías en que usaremos productos de la mejor calidad?",
  "¿Seguirás las recomendaciones posteriores?",
  "¿Aceptas que podemos suspender si el cabello no responde bien?",
  "¿Autorizas fotos para registro y redes?",
  "¿Comprendes que el color puede cambiar si no sigues cuidados?",
  "¿Te sientes seguro(a) y autorizas iniciar el proceso?"
];

export function FichaColor({ cita, onSubmit }: FichaColorProps) {
  const [formData, setFormData] = useState({
    autoriza_publicar: false,
    foto_antes: "",
    foto_despues: "",
    respuestas: preguntasColor.map(pregunta => ({
      pregunta,
      respuesta: false,
      observaciones: ""
    }))
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const fichaCompleta = {
      tipo_ficha: "COLOR",
      cita_id: cita.cita_id,
      cliente_id: cita.cliente.cliente_id,
      servicio_id: cita.servicio.servicio_id,
      servicio_nombre: cita.servicio.nombre,
      profesional_id: cita.estilista_id,
      profesional_nombre: "Estilista",
      fecha_ficha: new Date().toISOString(),
      fecha_reserva: cita.fecha,
      email: cita.cliente.email,
      nombre: cita.cliente.nombre,
      apellido: cita.cliente.apellido,
      cedula: "",
      telefono: cita.cliente.telefono,
      precio: cita.servicio.precio.toString(),
      estado: "Completado",
      estado_pago: "Pagado",
      datos_especificos: formData,
      respuestas: formData.respuestas,
      descripcion_servicio: `Servicio de color: ${cita.servicio.nombre}`,
      fotos_antes: formData.foto_antes,
      fotos_despues: formData.foto_despues,
      autorizacion_publicacion: formData.autoriza_publicar,
      comentario_interno: ""
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}scheduling/quotes/citas/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(fichaCompleta)
      });

      if (response.ok) {
        const data = await response.json();
        onSubmit(data);
        alert('Ficha de Color guardada exitosamente');
      } else {
        throw new Error('Error al guardar la ficha');
      }
    } catch (error) {
      console.error('Error al guardar ficha:', error);
      alert('Error al guardar la ficha');
    } finally {
      setLoading(false);
    }
  };

  const updateRespuesta = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const nuevasRespuestas = [...prev.respuestas];
      nuevasRespuestas[index] = { ...nuevasRespuestas[index], [field]: value };
      return { ...prev, respuestas: nuevasRespuestas };
    });
  };

  const todasRespondidas = formData.respuestas.every(r => r.respuesta === true);

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-6">Ficha - Color</h2>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Información de la cita</h3>
        <p><strong>Cliente:</strong> {cita.cliente.nombre} {cita.cliente.apellido}</p>
        <p><strong>Servicio:</strong> {cita.servicio.nombre}</p>
        <p><strong>Fecha:</strong> {cita.fecha} {cita.hora_inicio}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="mb-3 font-semibold">Foto antes</h3>
          <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:bg-gray-100">
            <div className="text-center">
              <Camera className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-600">Subir imagen</p>
            </div>
          </div>
        </div>
        <div>
          <h3 className="mb-3 font-semibold">Foto después</h3>
          <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:bg-gray-100">
            <div className="text-center">
              <Camera className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-600">Subir imagen</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Consentimiento Informado para Color</h3>
        <p className="text-sm text-gray-600 mb-4">
          Por favor, responde todas las preguntas para proceder con el servicio de color.
        </p>

        {formData.respuestas.map((respuesta, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-medium text-sm flex-1">
                {index + 1}. {respuesta.pregunta}
              </label>
              <div className="flex items-center space-x-4 ml-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={`pregunta-${index}`}
                    checked={respuesta.respuesta === true}
                    onChange={() => updateRespuesta(index, 'respuesta', true)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Sí</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={`pregunta-${index}`}
                    checked={respuesta.respuesta === false}
                    onChange={() => updateRespuesta(index, 'respuesta', false)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">No</span>
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Observaciones:</label>
              <textarea
                className="w-full p-2 border rounded text-sm"
                value={respuesta.observaciones}
                onChange={(e) => updateRespuesta(index, 'observaciones', e.target.value)}
                placeholder="Observaciones adicionales..."
                rows={2}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center space-x-2 p-4 border rounded-lg">
        <input
          type="checkbox"
          id="autoriza"
          checked={formData.autoriza_publicar}
          onChange={(e) => setFormData(prev => ({ ...prev, autoriza_publicar: e.target.checked }))}
          className="w-4 h-4"
        />
        <label htmlFor="autoriza" className="text-sm font-medium">
          ¿Autoriza publicar fotos en redes sociales?
        </label>
      </div>

      <button 
        type="submit"
        disabled={!todasRespondidas || loading}
        className={`w-full py-3 rounded-lg font-semibold transition-colors ${
          !todasRespondidas || loading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : 'bg-[oklch(0.55_0.25_280)] text-white hover:bg-[oklch(0.50_0.25_280)]'
        }`}
      >
        {loading ? 'Guardando...' : 
         todasRespondidas ? 'Guardar Ficha de Color' : 'Responde todas las preguntas para continuar'}
      </button>
    </form>
  );
}