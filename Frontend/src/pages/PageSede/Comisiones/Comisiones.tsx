// app/comisiones/page.tsx
"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "../../../components/Layout/Sidebar";
import { ComisionesFilters } from "./comisiones-filters";
import { ComisionesResumen } from "./comisiones-resumen";
import { ComisionesPendientes } from "./comisiones-pendientes";
import { Button } from "../../../components/ui/button";

type Tab = "resumen" | "pendientes";

export default function ComisionesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("pendientes");
  const [currentFilters, setCurrentFilters] = useState({});

  // Usar useCallback para evitar re-renders innecesarios
  const handleFiltersChange = useCallback((filters: any) => {
    console.log("🔧 Filters changed:", filters);
    setCurrentFilters(filters);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gray-100 p-2">
                <svg className="h-6 w-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Comisiones</h1>
                <p className="text-sm text-gray-600">Gestión de liquidaciones de comisiones</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                className="bg-black text-white hover:bg-gray-800"
                onClick={() => {
                  // Cambiar a pestaña de resumen si no está ya
                  if (activeTab !== "resumen") {
                    setActiveTab("resumen");
                  }
                }}
              >
                Nueva Liquidación
              </Button>
            </div>
          </div>

          {/* Title */}
          <h2 className="mb-6 text-2xl font-bold text-gray-900">Liquidación de comisiones</h2>

          {/* Filters - Solo mostrar en la pestaña de resumen */}
          {activeTab === "resumen" && (
            <ComisionesFilters onFiltersChange={handleFiltersChange} />
          )}

          {/* Tabs */}
          <div className="mb-6 flex gap-8 border-b border-gray-300">
            <button
              onClick={() => setActiveTab("pendientes")}
              className={`pb-3 text-base font-medium transition-colors ${
                activeTab === "pendientes"
                  ? "border-b-2 border-black text-black"
                  : "text-gray-600 hover:text-black"
              }`}
            >
              Resumen Pendientes
            </button>
            
            <button
              onClick={() => setActiveTab("resumen")}
              className={`pb-3 text-base font-medium transition-colors ${
                activeTab === "resumen"
                  ? "border-b-2 border-black text-black"
                  : "text-gray-600 hover:text-black"
              }`}
            >
              Liquidar Estilista
            </button>
          </div>

          {/* Content */}
          {activeTab === "resumen" ? (
            <ComisionesResumen filters={currentFilters} />
          ) : (
            <ComisionesPendientes />
          )}
        </div>
      </div>
    </div>
  );
}