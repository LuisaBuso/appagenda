import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"

export function ProductsForSale() {
  const products = [
    { id: "1", name: "Producto 1" },
    { id: "2", name: "Producto 2" },
    { id: "3", name: "Producto 3" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Productos para venta</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {products.map((product) => (
            <div key={product.id} className="flex flex-col items-center">
              <div className="aspect-square w-full rounded-lg bg-gray-100" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
