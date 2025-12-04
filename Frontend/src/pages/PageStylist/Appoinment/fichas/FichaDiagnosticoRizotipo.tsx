// src/components/fichas/FichaDiagnosticoRizotipo.tsx
"use client";

import { useState } from "react";
import { Cita } from '../../../../types/fichas';
import { Camera } from "lucide-react";
import { API_BASE_URL } from '../../../../types/config';

interface FichaDiagnosticoRizotipoProps {
  cita: Cita;
  onSubmit: (data: any) => void;
}

export function FichaDiagnosticoRizotipo({ cita, onSubmit }: FichaDiagnosticoRizotipoProps) {
  const [formData, setFormData] = useState({
    plasticidad: "",
    permeabilidad: "",
    porosidad: "",
    exterior_lipidico: "",
    densidad: "",
    oleosidad: "",
    grosor: "",
    textura: "",
    recomendaciones_personalizadas: "",
    frecuencia_corte: "",
    tecnicas_estilizado: "",
    productos_sugeridos: "",
    observaciones_generales: "",
    autoriza_publicar: false,
    foto_antes: "",
    foto_despues: ""
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const fichaCompleta = {
      tipo_ficha: "DIAGNOSTICO_RIZOTIPO",
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
      descripcion_servicio: `Diagnóstico rizotipo para ${cita.servicio.nombre}`,
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
        alert('Ficha de Diagnóstico Rizotipo guardada exitosamente');
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
      <h2 className="text-2xl font-bold mb-6">Ficha - Diagnóstico Rizotipo</h2>

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

      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Parámetros Técnicos</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Plasticidad</label>
            <select 
              className="w-full p-2 border rounded-lg"
              value={formData.plasticidad}
              onChange={(e) => handleInputChange('plasticidad', e.target.value)}
              required
            >
              <option value="">Seleccionar</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Media</option>
              <option value="BAJA">Baja</option>
              <option value="MUY BAJA">Muy Baja</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Permeabilidad</label>
            <select 
              className="w-full p-2 border rounded-lg"
              value={formData.permeabilidad}
              onChange={(e) => handleInputChange('permeabilidad', e.target.value)}
              required
            >
              <option value="">Seleccionar</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Media</option>
              <option value="BAJA">Baja</option>
              <option value="OTRA">Otra</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Porosidad</label>
            <select 
              className="w-full p-2 border rounded-lg"
              value={formData.porosidad}
              onChange={(e) => handleInputChange('porosidad', e.target.value)}
              required
            >
              <option value="">Seleccionar</option>
              <option value="ALTA">Alta</option>
              <option value="BAJA">Baja</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Exterior Lipídico</label>
            <select 
              className="w-full p-2 border rounded-lg"
              value={formData.exterior_lipidico}
              onChange={(e) => handleInputChange('exterior_lipidico', e.target.value)}
              required
            >
              <option value="">Seleccionar</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Media</option>
              <option value="BAJA">Baja</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Densidad</label>
            <select 
              className="w-full p-2 border rounded-lg"
              value={formData.densidad}
              onChange={(e) => handleInputChange('densidad', e.target.value)}
              required
            >
              <option value="">Seleccionar</option>
              <option value="EXTRA ALTA">Extra Alta</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Media</option>
              <option value="BAJA">Baja</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Oleosidad</label>
            <select 
              className="w-full p-2 border rounded-lg"
              value={formData.oleosidad}
              onChange={(e) => handleInputChange('oleosidad', e.target.value)}
              required
            >
              <option value="">Seleccionar</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Media</option>
              <option value="BAJA">Baja</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Grosor</label>
            <select 
              className="w-full p-2 border rounded-lg"
              value={formData.grosor}
              onChange={(e) => handleInputChange('grosor', e.target.value)}
              required
            >
              <option value="">Seleccionar</option>
              <option value="GRUESO">Grueso</option>
              <option value="MEDIO">Medio</option>
              <option value="DELGADO">Delgado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Textura</label>
            <select 
              className="w-full p-2 border rounded-lg"
              value={formData.textura}
              onChange={(e) => handleInputChange('textura', e.target.value)}
              required
            >
              <option value="">Seleccionar</option>
              <option value="Lanoso / Ulótrico">Lanoso / Ulótrico</option>
              <option value="Ensotijado / Lisótrico">Ensotijado / Lisótrico</option>
              <option value="Laminado / Cinótrico">Laminado / Cinótrico</option>
              <option value="Procesado o dañado">Procesado o dañado</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recomendaciones</h3>
        
        <div>
          <label className="block text-sm font-medium mb-2">Recomendaciones Personalizadas</label>
          <textarea 
            className="w-full p-2 border rounded-lg h-20"
            value={formData.recomendaciones_personalizadas}
            onChange={(e) => handleInputChange('recomendaciones_personalizadas', e.target.value)}
            placeholder="Escribe recomendaciones específicas para el cliente..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Frecuencia de Corte</label>
          <select 
            className="w-full p-2 border rounded-lg"
            value={formData.frecuencia_corte}
            onChange={(e) => handleInputChange('frecuencia_corte', e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="1 vez al año">1 vez al año</option>
            <option value="Cada 4 meses">Cada 4 meses</option>
            <option value="Cada 3 meses">Cada 3 meses</option>
            <option value="Cada 2 meses">Cada 2 meses</option>
            <option value="Cada mes">Cada mes</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Técnicas de Estilizado Usadas Hoy</label>
          <input 
            type="text"
            className="w-full p-2 border rounded-lg"
            value={formData.tecnicas_estilizado}
            onChange={(e) => handleInputChange('tecnicas_estilizado', e.target.value)}
            placeholder="Ej: Plancha, secado, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Productos Sugeridos y Usados Hoy</label>
          <textarea 
            className="w-full p-2 border rounded-lg h-20"
            value={formData.productos_sugeridos}
            onChange={(e) => handleInputChange('productos_sugeridos', e.target.value)}
            placeholder="Lista de productos recomendados y utilizados..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Observaciones Generales</label>
          <textarea 
            className="w-full p-2 border rounded-lg h-20"
            value={formData.observaciones_generales}
            onChange={(e) => handleInputChange('observaciones_generales', e.target.value)}
            placeholder="Observaciones adicionales..."
          />
        </div>
      </div>

      <div className="flex items-center space-x-2 p-4 border rounded-lg">
        <input
          type="checkbox"
          id="autoriza"
          checked={formData.autoriza_publicar}
          onChange={(e) => handleInputChange('autoriza_publicar', e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="autoriza" className="text-sm font-medium">
          ¿Autoriza publicar fotos en redes sociales?
        </label>
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
        {loading ? 'Guardando...' : 'Guardar Ficha de Diagnóstico'}
      </button>
    </form>
  );
}