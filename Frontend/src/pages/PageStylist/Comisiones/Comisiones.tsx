"use client";

import { useState } from "react";
import { Sidebar } from "../../../components/Layout/Sidebar";
import { ComisionesFilters } from "./comisiones-filters";
import { ComisionesResumen } from "./comisiones-resumen";
import { ComisionesDetalle } from "./comisiones-detalle";

type Tab = "resumen" | "detalle";

export default function ComisionesPage() {
  const [activeTab, ] = useState<Tab>("resumen");

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-4 md:p-5 lg:p-6">
          {/* Header Compacto */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white">
                  <div className="h-4 w-4 rounded-full bg-gray-800" />
                </div>
              </div>
              
              <div className="flex gap-2">
                {/* Espacio para botones futuros */}
              </div>
            </div>

            {/* Título Principal */}
            <h2 className="text-xl font-bold text-gray-900">Liquidación de Comisiones</h2>
            <p className="text-sm text-gray-600 mt-1">Gestión y consulta de comisiones por ventas</p>
          </div>

          {/* Filtros */}
          <div className="mb-5">
            <ComisionesFilters />
          </div>

          {/* Tabs Minimalistas */}
          <div className="mb-5 border-b border-gray-200">
            <div className="flex gap-6">

            </div>
          </div>

          {/* Contenido */}
          <div className="bg-white rounded border border-gray-200">
            {activeTab === "resumen" ? <ComisionesResumen /> : <ComisionesDetalle />}
          </div>
        </div>
      </div>
    </div>
  );
}