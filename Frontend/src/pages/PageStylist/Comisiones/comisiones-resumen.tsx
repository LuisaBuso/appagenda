export function ComisionesResumen() {
  const servicios = [
    {
      name: "Corte de cabello",
      price: "50",
      comisionEstilista: "50",
      comisionEstilistaPercent: "50",
      casaPercent: "50",
    },
    {
      name: "Corte de cabello",
      price: "60",
      comisionEstilista: "50",
      comisionEstilistaPercent: "50",
      casaPercent: "50",
    },
    {
      name: "Sorte gestodor",
      price: "45",
      comisionEstilista: "25,0",
      comisionEstilistaPercent: "85",
      casaPercent: "22,5",
    },
  ]

  const productos = [
    {
      name: "Shampoo",
      price: "20",
      comisionEstilista: "15",
      comisionEstilistaPercent: "85",
      casaPercent: "35",
    },
    {
      name: "Mascara titreo",
      price: "15",
      comisionEstilista: "3",
      comisionEstilistaPercent: "2,27",
      casaPercent: "3",
    },
    {
      name: "Hierno",
      price: "35",
      comisionEstilista: "3,7",
      comisionEstilistaPercent: "21,2",
      casaPercent: "21",
    },
  ]

  return (
    <div className="flex gap-8">
      {/* Main content */}
      <div className="flex-1">
        {/* Table Header */}
        <div className="mb-4 grid grid-cols-[2fr_1fr_1.5fr_1.5fr_1.5fr] gap-4 border-b pb-3 text-sm font-semibold">
          <div>Fecha</div>
          <div className="text-right">Precio</div>
          <div className="text-right">% comisistón estilista</div>
          <div className="text-right">Comusición estilista</div>
          <div className="text-right">% casa Comisiona</div>
        </div>

        {/* Servicios Section */}
        <div className="mb-6">
          <h3 className="mb-3 text-lg font-semibold">Servicios</h3>
          <div className="space-y-2">
            {servicios.map((servicio, index) => (
              <div
                key={index}
                className="grid grid-cols-[2fr_1fr_1.5fr_1.5fr_1.5fr] gap-4 py-3 text-sm"
              >
                <div>{servicio.name}</div>
                <div className="text-right">€ {servicio.price} €</div>
                <div className="text-right">{servicio.comisionEstilistaPercent} %</div>
                <div className="text-right">{servicio.comisionEstilista} %</div>
                <div className="text-right">{servicio.casaPercent} %</div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration note */}
        <p className="mb-6 text-sm text-gray-600">
          Los porcentajes se configuran en{" "}
          <a href="/configuracion" className="text-[oklch(0.65_0.25_280)] hover:underline">
            Configuración → Estilistas
          </a>{" "}
          y{" "}
          <a href="/configuracion" className="text-[oklch(0.65_0.25_280)] hover:underline">
            Configuración → Servicios & Productos
          </a>
          .
        </p>

        {/* Productos Section */}
        <div>
          <h3 className="mb-3 text-lg font-semibold">Productos</h3>
          <div className="space-y-2">
            {productos.map((producto, index) => (
              <div
                key={index}
                className="grid grid-cols-[2fr_1fr_1.5fr_1.5fr_1.5fr] gap-4 py-3 text-sm"
              >
                <div>{producto.name}</div>
                <div className="text-right">€ {producto.price} €</div>
                <div className="text-right">{producto.comisionEstilista} %</div>
                <div className="text-right">{producto.comisionEstilistaPercent} %</div>
                <div className="text-right">{producto.casaPercent} %</div>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-6 text-sm text-gray-600">
          Los porcentajes se configuran en
        </p>
      </div>

      {/* Sidebar with totals */}
      <div className="w-80 space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="text-sm font-medium text-gray-600">Totales</span>
            <span className="text-2xl font-bold">€ 77,50</span>
          </div>
          
          <div className="space-y-3 border-t pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Totales productos</span>
              <span className="font-medium">€ 9</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Descuentos nomina</span>
              <span className="font-medium">€ 20</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Anticipos/Bonos</span>
              <span className="font-medium">€ 0</span>
            </div>
          </div>

          <div className="mt-4 flex justify-between border-t pt-4 text-base font-semibold">
            <span>Total a pagar</span>
            <span>€ 66,50</span>
          </div>
        </div>
      </div>
    </div>
  )
}
