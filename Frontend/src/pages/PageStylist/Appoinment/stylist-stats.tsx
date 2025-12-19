// src/components/StylistStats.tsx - VERSIÓN CORREGIDA
"use client";

interface StylistStatsProps {
  citasHoy: number;
  serviciosCompletadosHoy: number;
  totalVentasHoy: number;
  bloqueosHoy?: number; // ← Hacerlo opcional con "?"
}

export function StylistStats({ totalVentasHoy }: StylistStatsProps) {
  // Datos de ejemplo para productos
  const ventasProductos = [
    { nombre: "Producto A", total: 0 },
    { nombre: "Producto B", total: 0 },
  ];

  const totalVentasProductos = ventasProductos.reduce((acc, v) => acc + v.total, 0);
  const comisionServicio = totalVentasHoy * 0.3; // 30% comisión por servicio
  const comisionProductos = totalVentasProductos * 0.2; // 20% comisión por productos
  const totalComisiones = comisionServicio + comisionProductos;

  // Función para formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* COMISIONES */}
      <div className="rounded-lg border border-gray-300 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Mis comisiones</h3>

        <div className="mb-3 space-y-4">
          {/* Comisión por productos */}
          <div className="pb-3">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                <span className="text-sm text-gray-800">Productos</span>
              </div>
              <span className="font-medium text-gray-900">{formatCurrency(comisionProductos)}</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
            </div>
          </div>
        </div>

        {/* Total comisiones */}
        <div className="border-t border-gray-400 pt-3 mt-3">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-bold text-gray-900">Total comisiones</span>
              <div className="text-xs text-gray-700 mt-1">
                Hoy • Generado automáticamente
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-gray-900">
                {formatCurrency(totalComisiones)}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Disponible para pago
              </div>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-4 pt-4 border-t border-gray-300">
          <div className="text-xs text-gray-700 space-y-2">
            <div className="flex justify-between">
            </div>
            <div className="flex justify-between">
              <span>Ventas productos:</span>
              <span className="font-medium">{formatCurrency(totalVentasProductos)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}