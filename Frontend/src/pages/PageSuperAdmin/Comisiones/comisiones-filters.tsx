"use client"

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Calendar } from "lucide-react";
import { profesionalesService } from "./Api/profesionalesService";
import { Professional } from "../../../types/commissions";
import { sedeService } from "../Sedes/sedeService";
import type { Sede } from "../../../types/sede";

interface ComisionesFiltersProps {
  onFiltersChange?: (filters: {
    profesional_id?: string;
    sede_id?: string;
    estado?: string;
    tipo_comision?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
  }) => void;
}

export function ComisionesFilters({ onFiltersChange }: ComisionesFiltersProps) {
  const [selectedSede, setSelectedSede] = useState<string>("");
  const [estilistaSeleccionado, setEstilistaSeleccionado] = useState<string>("placeholder");
  const [tipoComisionSeleccionado, setTipoComisionSeleccionado] = useState<string>("placeholder");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [estilistas, setEstilistas] = useState<Professional[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [cargandoEstilistas, setCargandoEstilistas] = useState(false);
  const [cargandoSedes, setCargandoSedes] = useState(false);
  const [sedeIdMap, setSedeIdMap] = useState<Record<string, string>>({});

  const tiposComision = [
    { id: "placeholder", nombre: "Todos los tipos" },
    { id: "servicios", nombre: "Servicios" },
    { id: "productos", nombre: "Productos" },
    { id: "mixto", nombre: "Mixto" },
  ];

  // Cargar sedes disponibles
  useEffect(() => {
    const cargarSedes = async () => {
      setCargandoSedes(true);
      try {
        const token = sessionStorage.getItem("access_token");
        if (!token) {
          throw new Error("No hay token de autenticación");
        }
        
        const sedesData = await sedeService.getSedes(token);
        setSedes(sedesData);
        
        // Crear mapa de _id a sede_id (SD-XXXXX)
        const idMap: Record<string, string> = {};
        sedesData.forEach(sede => {
          if (sede._id && sede.sede_id) {
            idMap[sede._id] = sede.sede_id;
          }
        });
        setSedeIdMap(idMap);
        
        // Si solo hay una sede, seleccionarla automáticamente
        if (sedesData.length === 1) {
          setSelectedSede(sedesData[0]._id);
        }
      } catch (error) {
        console.error("Error cargando sedes:", error);
        setSedes([]);
      } finally {
        setCargandoSedes(false);
      }
    };

    cargarSedes();
  }, []);

  // Cargar estilistas cuando se selecciona una sede
  useEffect(() => {
    const cargarEstilistas = async () => {
      if (!selectedSede) {
        setEstilistas([]);
        setEstilistaSeleccionado("placeholder");
        return;
      }

      setCargandoEstilistas(true);
      try {
        const data = await profesionalesService.getProfessionals();
        
        // Filtrar estilistas por la sede seleccionada usando sede_id
        const sedeApiId = sedeIdMap[selectedSede];
        
        const filteredEstilistas = data.filter(estilista => {
          // Si el estilista tiene sede_id, filtrar por ella
          if (estilista.sede_id && sedeApiId) {
            return estilista.sede_id === sedeApiId;
          }
          return true;
        });
        
        setEstilistas(filteredEstilistas);
        
        if (filteredEstilistas.length === 1) {
          setEstilistaSeleccionado(filteredEstilistas[0].profesional_id);
        } else {
          setEstilistaSeleccionado("placeholder");
        }
      } catch (error) {
        console.error("Error cargando estilistas:", error);
        setEstilistas([]);
        setEstilistaSeleccionado("placeholder");
      } finally {
        setCargandoEstilistas(false);
      }
    };

    cargarEstilistas();
  }, [selectedSede, sedeIdMap]);

  useEffect(() => {
    if (onFiltersChange) {
      const timer = setTimeout(() => {
        const filters: any = {
          estado: "pendiente"
        };

        if (selectedSede && sedeIdMap[selectedSede]) {
          filters.sede_id = sedeIdMap[selectedSede];
        }

        if (estilistaSeleccionado && estilistaSeleccionado !== "placeholder") {
          filters.profesional_id = estilistaSeleccionado;
        }

        if (tipoComisionSeleccionado && tipoComisionSeleccionado !== "placeholder") {
          filters.tipo_comision = tipoComisionSeleccionado;
        }

        if (fechaInicio) {
          filters.fecha_inicio = fechaInicio;
        }

        if (fechaFin) {
          filters.fecha_fin = fechaFin;
        }

        onFiltersChange(filters);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [selectedSede, estilistaSeleccionado, tipoComisionSeleccionado, fechaInicio, fechaFin, sedeIdMap, onFiltersChange]);
  
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDefaultDates = () => {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    return {
      inicio: formatDate(primerDiaMes),
      fin: formatDate(ultimoDiaMes)
    };
  };

  useEffect(() => {
    const defaultDates = getDefaultDates();
    setFechaInicio(defaultDates.inicio);
    setFechaFin(defaultDates.fin);
  }, []);

  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:flex-wrap">
      {/* Selector de Sede */}
      <div className="min-w-[250px]">
        <Select
          value={selectedSede}
          onValueChange={setSelectedSede}
          disabled={cargandoSedes}
        >
          <SelectTrigger className="w-full bg-white border-gray-300 text-gray-900 hover:bg-gray-50">
            <SelectValue placeholder={cargandoSedes ? "Cargando sedes..." : "Selecciona una sede *"} />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-300 max-h-60">
            {/* NO usar SelectItem con value="" */}
            <SelectItem value="none" className="text-gray-500 italic bg-white hover:bg-gray-100">
              -- Selecciona una sede --
            </SelectItem>
            {cargandoSedes ? (
              <SelectItem value="loading" disabled className="text-gray-500">
                Cargando sedes...
              </SelectItem>
            ) : sedes.length > 0 ? (
              sedes.map((sede) => (
                <SelectItem 
                  key={sede._id} 
                  value={sede._id}
                  className="bg-white hover:bg-gray-100 text-gray-900"
                >
                  {sede.nombre} ({sede.sede_id})
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-data" disabled className="text-gray-500">
                No hay sedes disponibles
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Estado fijo - Pendiente */}
      <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-green-50 px-4 py-2.5 min-w-[150px]">
        <span className="text-sm font-medium text-gray-900">Estado:</span>
        <span className="text-sm font-semibold text-green-600">Pendiente</span>
      </div>

      {/* Selector de estilista */}
      <div className="min-w-[250px]">
        <Select
          value={estilistaSeleccionado}
          onValueChange={setEstilistaSeleccionado}
          disabled={!selectedSede || cargandoEstilistas}
        >
          <SelectTrigger className="w-full bg-white border-gray-300 text-gray-900 hover:bg-gray-50">
            <SelectValue 
              placeholder={
                !selectedSede 
                  ? "Selecciona una sede primero" 
                  : cargandoEstilistas 
                  ? "Cargando estilistas..." 
                  : "Selecciona un estilista"
              } 
            />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-300 max-h-60">
            <SelectItem value="placeholder" className="text-gray-500 italic bg-white hover:bg-gray-100">
              -- Selecciona un estilista --
            </SelectItem>
            {cargandoEstilistas ? (
              <SelectItem value="loading" disabled className="text-gray-500">
                Cargando estilistas...
              </SelectItem>
            ) : estilistas.length > 0 ? (
              estilistas.map((estilista) => (
                <SelectItem 
                  key={estilista.profesional_id} 
                  value={estilista.profesional_id}
                  className="bg-white hover:bg-gray-100 text-gray-900"
                >
                  {estilista.nombre} ({estilista.profesional_id})
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-data" disabled className="text-gray-500">
                {selectedSede ? "No hay estilistas en esta sede" : "Selecciona una sede primero"}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Selector de tipo de comisión */}
      <div className="min-w-[200px]">
        <Select
          value={tipoComisionSeleccionado}
          onValueChange={setTipoComisionSeleccionado}
          disabled={!selectedSede}
        >
          <SelectTrigger className="w-full bg-white border-gray-300 text-gray-900 hover:bg-gray-50">
            <SelectValue placeholder="Tipo de comisión" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-300">
            {tiposComision.map((tipo) => (
              <SelectItem 
                key={tipo.id} 
                value={tipo.id}
                className="bg-white hover:bg-gray-100 text-gray-900"
              >
                {tipo.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selector de fecha inicio */}
      <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 min-w-[200px]">
        <Calendar className="h-4 w-4 text-gray-400" />
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Desde</span>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="text-sm bg-white border-none outline-none w-full text-gray-900"
            disabled={!selectedSede}
          />
        </div>
      </div>

      {/* Selector de fecha fin */}
      <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 min-w-[200px]">
        <Calendar className="h-4 w-4 text-gray-400" />
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Hasta</span>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="text-sm bg-white border-none outline-none w-full text-gray-900"
            disabled={!selectedSede}
          />
        </div>
      </div>

      {/* Botón para limpiar filtros */}
      {(selectedSede || estilistaSeleccionado !== "placeholder" || tipoComisionSeleccionado !== "placeholder") && (
        <button
          onClick={() => {
            setSelectedSede("");
            setEstilistaSeleccionado("placeholder");
            setTipoComisionSeleccionado("placeholder");
            const defaultDates = getDefaultDates();
            setFechaInicio(defaultDates.inicio);
            setFechaFin(defaultDates.fin);
          }}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-400 transition-colors"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}