"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "../../../components/Layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import { Plus, Search } from "lucide-react";
import { API_BASE_URL } from "../../../types/config";
import { useAuth } from "../../../components/Auth/AuthContext";

export default function Products() {
  const { user } = useAuth(); // ← TOKEN
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const getStockVariant = (stock: number) => {
    if (stock === 0) return "bg-red-100 text-red-800";
    if (stock < 20) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        if (!user?.access_token) return;

        const res = await fetch(
          `${API_BASE_URL}inventary/product/productos/?moneda=COP`,
          {
            headers: {
              Authorization: `Bearer ${user.access_token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await res.json();

        // Si llega un error o un 401
        if (!Array.isArray(data)) {
          console.error("Respuesta invalida:", data);
          setProducts([]);
          return;
        }

        setProducts(data);
      } catch (error) {
        console.error("Error cargando productos", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [user]);

  const filteredProducts = products.filter((p) =>
    p.nombre?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8">Cargando productos...</div>;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="p-8">

          {/* HEADER */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
              <p className="text-gray-600 mt-2">
                Administra los productos y el inventario de tu negocio
              </p>
            </div>

            <Button className="bg-black hover:bg-gray-800 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo producto
            </Button>
          </div>

          {/* BUSCADOR */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar productos..."
                className="pl-10 bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* TABLA */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Productos
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">Nombre</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">Categoría</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">Precios</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">Stock actual</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProducts.map((product: any, index: number) => (
                      <tr key={index} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">

                        {/* NOMBRE */}
                        <td className="py-4 px-4">
                          <span className="text-sm font-medium text-gray-900">{product.nombre}</span>
                        </td>

                        {/* CATEGORÍA */}
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-700">{product.categoria}</span>
                        </td>

                        {/* PRECIOS: COP / MXN / USD */}
                        <td className="py-4 px-4">
                          <div className="text-sm font-medium text-gray-700 space-y-1">
                            <p>COP: ${product.precios?.COP?.toLocaleString() ?? "0"}</p>
                            <p>MXN: ${product.precios?.MXN?.toLocaleString() ?? "0"}</p>
                            <p>USD: ${product.precios?.USD?.toLocaleString() ?? "0"}</p>
                          </div>
                        </td>

                        {/* STOCK */}
                        <td className="py-4 px-4">
                          <Badge className={`${getStockVariant(product.stock_actual)} text-xs font-medium`}>
                            {product.stock_actual}
                          </Badge>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
