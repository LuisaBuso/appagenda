"use client";

import { useState } from "react";
import { Sidebar } from "../../../components/Layout/Sidebar";
import { ComisionesFilters } from "./comisiones-filters";
import { ComisionesResumen } from "./comisiones-resumen";
import { ComisionesDetalle } from "./comisiones-detalle";
import { Button } from "../../../components/ui/button";

type Tab = "resumen" | "detalle";

export default function ComisionesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("resumen");

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[oklch(0.65_0.25_280)]">
                <div className="h-6 w-6 rounded-full bg-white" />
              </div>
              <h1 className="text-2xl font-bold">Beaux</h1>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="border-gray-300">
                Exportar PDF/CSV
              </Button>
              <Button variant="outline" className="border-gray-300">
                Guardar borrador
              </Button>
              <Button className="bg-[oklch(0.65_0.25_280)] hover:bg-[oklch(0.60_0.25_280)]">
                Aprobar liquidación
              </Button>
            </div>
          </div>

          {/* Title */}
          <h2 className="mb-6 text-3xl font-bold">Liquidación de comisiones</h2>

          {/* Filters */}
          <ComisionesFilters />

          {/* Tabs */}
          <div className="mb-6 flex gap-8 border-b">
            <button
              onClick={() => setActiveTab("resumen")}
              className={`pb-3 text-base font-medium transition-colors ${
                activeTab === "resumen"
                  ? "border-b-2 border-[oklch(0.65_0.25_280)] text-[oklch(0.65_0.25_280)]"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Resumen
            </button>

            <button
              onClick={() => setActiveTab("detalle")}
              className={`pb-3 text-base font-medium transition-colors ${
                activeTab === "detalle"
                  ? "border-b-2 border-[oklch(0.65_0.25_280)] text-[oklch(0.65_0.25_280)]"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Detalle
            </button>
          </div>

          {/* Content */}
          {activeTab === "resumen" ? <ComisionesResumen /> : <ComisionesDetalle />}
        </div>
      </div>
    </div>
  );
}
