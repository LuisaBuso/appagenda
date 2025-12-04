// src/components/StylistStats.tsx
"use client";

interface StylistStatsProps {
  citasHoy: number;
  serviciosCompletadosHoy: number;
  totalVentasHoy: number;
}

export function StylistStats({}: StylistStatsProps) {
  // Datos simulados (manteniendo tu estructura original)
  const ventas = [
    { nombre: "Producto A", total: 0 },
    { nombre: "Producto B", total: 0 },
  ]

  const comisiones = [
    { nombre: "Servicio", total: 0 },
    { nombre: "Productos", total: 0 },
  ]

  const totalVentas = ventas.reduce((acc, v) => acc + v.total, 0)
  const totalComisiones = comisiones.reduce((acc, v) => acc + v.total, 0)

  return (
    <div className="space-y-6">
      {/* VENTAS - Manteniendo tu diseño original */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Mis ventas</h3>

        <div className="mb-3 space-y-2">
          {ventas.map((v, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-600">{v.nombre}</span>
              <span className="font-medium">${v.total.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="border-t pt-3">
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>${totalVentas.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* COMISIONES - Manteniendo tu diseño original */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Mis comisiones</h3>

        <div className="mb-3 space-y-2">
          {comisiones.map((c, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-600">{c.nombre}</span>
              <span className="font-medium">${c.total.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="border-t pt-3">
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>${totalComisiones.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* LINKS / BOTONES - Manteniendo tu diseño original */}
      <div className="space-y-3">
        <button className="block text-left text-[oklch(0.55_0.25_280)] hover:underline font-medium">
          Promocionar mi agenda
        </button>
        <button className="block text-left text-[oklch(0.55_0.25_280)] hover:underline font-medium">
          Vender productos
        </button>
      </div>
    </div>
  )
}