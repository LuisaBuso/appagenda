// src/components/fichas/FichaValoracionPruebaColor.tsx
"use client";

import { useState } from "react";
import { Cita } from '../../../../types/fichas';
import { Camera } from "lucide-react";
import { API_BASE_URL } from '../../../../types/config';

interface FichaValoracionPruebaColorProps {
  cita: Cita;
  onSubmit: (data: any) => void;
}

export function FichaValoracionPruebaColor({ cita, onSubmit }: FichaValoracionPruebaColorProps) {
  const [formData, setFormData] = useState({
    acuerdos: "",
    recomendaciones: "",
    servicio_valorado: cita.servicio.nombre,
    foto_estado_actual: "",
    foto_expectativa: ""
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const fichaCompleta = {
      tipo_ficha: "VALORACION_PRUEBA_COLOR",
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
      respuestas: [],
      descripcion_servicio: `Valoración y prueba de color: ${formData.servicio_valorado}`,
      fotos_antes: formData.foto_estado_actual,
      fotos_despues: formData.foto_expectativa,
      autorizacion_publicacion: false,
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
        alert('Ficha de Valoración y Prueba de Color guardada exitosamente');
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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-6">Ficha - Recomendaciones de la Valoración y Prueba de Color</h2>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Información de la cita</h3>
        <p><strong>Cliente:</strong> {cita.cliente.nombre} {cita.cliente.apellido}</p>
        <p><strong>Servicio:</strong> {cita.servicio.nombre}</p>
        <p><strong>Fecha:</strong> {cita.fecha} {cita.hora_inicio}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="mb-3 font-semibold">Estado actual</h3>
          <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:bg-gray-100">
            <div className="text-center">
              <Camera className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-600">Estado actual del cabello</p>
            </div>
          </div>
        </div>
        <div>
          <h3 className="mb-3 font-semibold">Expectativa acordada</h3>
          <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:bg-gray-100">
            <div className="text-center">
              <Camera className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-600">Foto de referencia/expectativa</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Servicio valorado en:</label>
        <input 
          type="text"
          className="w-full p-3 border rounded-lg"
          value={formData.servicio_valorado}
          onChange={(e) => handleInputChange('servicio_valorado', e.target.value)}
          placeholder="Describe el servicio que se valoró..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Acuerdos con el cliente</label>
        <textarea 
          className="w-full p-3 border rounded-lg h-24"
          value={formData.acuerdos}
          onChange={(e) => handleInputChange('acuerdos', e.target.value)}
          placeholder="Describe los acuerdos alcanzados con el cliente respecto al color..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Recomendaciones de la valoración y prueba</label>
        <textarea 
          className="w-full p-3 border rounded-lg h-32"
          value={formData.recomendaciones}
          onChange={(e) => handleInputChange('recomendaciones', e.target.value)}
          placeholder="Detalla las recomendaciones específicas basadas en la valoración y prueba de color..."
          required
        />
      </div>

      <button 
        type="submit"
        disabled={loading}
        className={`w-full py-3 rounded-lg font-semibold transition-colors ${
          loading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-[oklch(0.55_0.25_280)] text-white hover:bg-[oklch(0.50_0.25_280)]'
        }`}
      >
        {loading ? 'Guardando...' : 'Guardar Valoración de Color'}
      </button>
    </form>
  );
}