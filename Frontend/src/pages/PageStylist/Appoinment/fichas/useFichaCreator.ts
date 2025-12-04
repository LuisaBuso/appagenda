// src/hooks/useFichaCreator.ts
"use client";

import { useState } from 'react';
import { API_BASE_URL } from '../../../../types/config';

interface FichaBaseData {
  cliente_id: string;
  servicio_id: string;
  profesional_id: string;
  sede_id: string;
  tipo_ficha: 'COLOR' | 'CORTE' | 'TRATAMIENTO' | 'MASAJE' | 'OTRO';
  [key: string]: any;
}

interface UseFichaCreatorProps {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export function useFichaCreator({ onSuccess, onError }: UseFichaCreatorProps = {}) {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const createFicha = async (
    fichaData: FichaBaseData,
    fotosAntes: File[] = [],
    fotosDespues: File[] = []
  ) => {
    try {
      setLoading(true);
      setUploadProgress(0);

      const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
      
      if (!token) {
        throw new Error('No hay token de autenticación. Por favor, inicia sesión nuevamente.');
      }

      // 1. Crear FormData para enviar archivos
      const formData = new FormData();

      // 2. Agregar las fotos "antes"
      fotosAntes.forEach((file, ) => {
        formData.append(`fotos_antes`, file);
      });

      // 3. Agregar las fotos "después"
      fotosDespues.forEach((file, ) => {
        formData.append(`fotos_despues`, file);
      });

      // 4. Agregar los datos de la ficha como JSON stringify
      formData.append('data', JSON.stringify(fichaData));

      // 5. Enviar la petición
      const response = await fetch(`${API_BASE_URL}scheduling/quotes/create-ficha`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // NO incluir 'Content-Type': FormData lo establecerá automáticamente con boundary
        },
        body: formData,
      });

      // 6. Manejar progreso de subida
      // Nota: Para un manejo más preciso del progreso, necesitaríamos XMLHttpRequest
      if (response.body) {
        const reader = response.body.getReader();
        const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10);
        
        let receivedLength = 0;
        let chunks = [];
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          chunks.push(value);
          receivedLength += value.length;
          
          if (contentLength) {
            setUploadProgress(Math.round((receivedLength / contentLength) * 100));
          }
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        if (onSuccess) {
          onSuccess(data);
        }
        return data;
      } else {
        throw new Error(data.message || 'Error al crear la ficha');
      }

    } catch (error) {
      console.error('Error al crear ficha:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      if (onError) {
        onError(errorMessage);
      }
      
      throw error;
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return {
    createFicha,
    loading,
    uploadProgress,
  };
}