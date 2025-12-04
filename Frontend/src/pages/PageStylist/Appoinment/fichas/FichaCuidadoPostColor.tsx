// src/components/fichas/FichaCuidadoPostColor.tsx
"use client";

import { useState } from "react";
import { Cita } from '../../../../types/fichas';
import { Camera, Check } from "lucide-react";
import { API_BASE_URL } from '../../../../types/config';

interface FichaCuidadoPostColorProps {
  cita: Cita;
  onSubmit: (data: any) => void;
}

const recomendacionesPredeterminadas = [
  "No lavar con agua caliente",
  "No usar shampoos fuertes",
  "Evitar piscina por 1 mes sin cuidados",
  "Usar gorro y acondicionador antes de piscina",
  "Usar productos profesionales recomendados",
  "Evitar exposición prolongada al sol",
  "Usar protector térmico al planchar o secar",
  "Seguir rutina de cuidado específica"
];

export function FichaCuidadoPostColor({ cita, onSubmit }: FichaCuidadoPostColorProps) {
  const [formData, setFormData] = useState({
    observaciones_personalizadas: "",
    tenga_en_cuenta: "",
    recomendaciones_seleccionadas: recomendacionesPredeterminadas.map(() => false),
    foto_actual: ""
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const recomendacionesAplicadas = recomendacionesPredeterminadas.filter(
      (_, index) => formData.recomendaciones_seleccionadas[index]
    );

    const fichaCompleta = {
      tipo_ficha: "CUIDADO_POST_COLOR",
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
      datos_especificos: {
        ...formData,
        recomendaciones_aplicadas: recomendacionesAplicadas
      },
      respuestas: [],
      descripcion_servicio: `Recomendaciones post color para ${cita.servicio.nombre}`,
      fotos_antes: formData.foto_actual,
      fotos_despues: "",
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
        alert('Ficha de Cuidado Post Color guardada exitosamente');
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

  const toggleRecomendacion = (index: number) => {
    setFormData(prev => {
      const nuevasSelecciones = [...prev.recomendaciones_seleccionadas];
      nuevasSelecciones[index] = !nuevasSelecciones[index];
      return { ...prev, recomendaciones_seleccionadas: nuevasSelecciones };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-6">Ficha - Recomendaciones para el Cuidado Post Color</h2>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Información de la cita</h3>
        <p><strong>Cliente:</strong> {cita.cliente.nombre} {cita.cliente.apellido}</p>
        <p><strong>Servicio:</strong> {cita.servicio.nombre}</p>
        <p><strong>Fecha:</strong> {cita.fecha} {cita.hora_inicio}</p>
      </div>

      <div>
        <h3 className="mb-3 font-semibold">Estado actual del color</h3>
        <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:bg-gray-100">
          <div className="text-center">
            <Camera className="mx-auto mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-600">Subir imagen del resultado actual</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Recomendaciones de Cuidado</h3>
        <p className="text-sm text-gray-600 mb-4">
          Selecciona las recomendaciones que aplican para este cliente:
        </p>

        {recomendacionesPredeterminadas.map((recomendacion, index) => (
          <div 
            key={index}
            className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
              formData.recomendaciones_seleccionadas[index] 
                ? 'bg-green-50 border-green-200' 
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => toggleRecomendacion(index)}
          >
            <div className={`flex items-center justify-center w-5 h-5 border rounded ${
              formData.recomendaciones_seleccionadas[index] 
                ? 'bg-green-500 border-green-500 text-white' 
                : 'border-gray-300'
            }`}>
              {formData.recomendaciones_seleccionadas[index] && <Check className="w-3 h-3" />}
            </div>
            <span className="text-sm flex-1">{recomendacion}</span>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Observaciones Personalizadas</label>
        <textarea 
          className="w-full p-3 border rounded-lg h-24"
          value={formData.observaciones_personalizadas}
          onChange={(e) => handleInputChange('observaciones_personalizadas', e.target.value)}
          placeholder="Agrega observaciones específicas para este cliente..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Tenga en cuenta</label>
        <textarea 
          className="w-full p-3 border rounded-lg h-20"
          value={formData.tenga_en_cuenta}
          onChange={(e) => handleInputChange('tenga_en_cuenta', e.target.value)}
          placeholder="Información adicional importante que el cliente debe considerar..."
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
        {loading ? 'Guardando...' : 'Guardar Recomendaciones de Cuidado'}
      </button>
    </form>
  );
}