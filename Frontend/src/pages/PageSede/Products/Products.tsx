import { useEffect, useState } from 'react';
import { Sidebar } from '../../../components/Layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Plus, Search } from 'lucide-react';
import { API_BASE_URL } from '../../../types/config';

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const getStockVariant = (stock: number) => {
    if (stock === 0) return 'bg-red-100 text-red-800';
    if (stock < 20) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}scheduling/quotes/products`);
        const data = await res.json();

        setProducts(data.productos || []);
      } catch (error) {
        console.error("Error cargando productos", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = products.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8">Loading products...</div>;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          
          {/* HEADER */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Products</h1>
              <p className="text-gray-600 mt-2">Manage your salon products and inventory</p>
            </div>

            <Button className="bg-black hover:bg-gray-800 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New product
            </Button>
          </div>

          {/* SEARCH */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search products..."
                className="pl-10 bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* TABLE */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Products
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">Name</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">Category</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">Price</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">In Stock</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProducts.map((product: any, index: number) => (
                      <tr key={index} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                        
                        <td className="py-4 px-4">
                          <span className="text-sm font-medium text-gray-900">{product.nombre}</span>
                        </td>

                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-700">{product.categoria}</span>
                        </td>

                        <td className="py-4 px-4">
                          <span className="text-sm font-medium text-gray-700">
                            ${product.precio.toLocaleString()}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <Badge className={`${getStockVariant(product.stock)} text-xs font-medium`}>
                            {product.stock}
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
