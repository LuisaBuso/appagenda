import { Sidebar } from '../../components/Layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Plus, Search, TrendingUp } from 'lucide-react';

export default function Products() {
  const products = [
    {
      name: "Smoothing Cream",
      price: "$18",
      inStock: "34",
      sales: "118",
      margin: "71% ↑"
    },
    {
      name: "Frizz Control Leave-In",
      price: "$24",
      inStock: "156",
      sales: "88",
      margin: "74% ↑"
    },
    {
      name: "Curly Hair Balance Shampoo",
      price: "$30",
      inStock: "93",
      sales: "72",
      margin: "58% ↑"
    },
    {
      name: "Colly Styling Custard",
      price: "$22",
      inStock: "0",
      sales: "62",
      margin: "68% ↑"
    },
    {
      name: "Shea Butter",
      price: "$16",
      inStock: "12",
      sales: "58",
      margin: "51% ↑"
    }
  ];

  const getStockVariant = (stock: string) => {
    const stockNumber = parseInt(stock);
    if (stockNumber === 0) return 'bg-red-100 text-red-800';
    if (stockNumber < 20) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getMarginVariant = (margin: string) => {
    return 'bg-green-100 text-green-800'; // Default styling for margin
  };


  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Header */}
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

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search products..."
                className="pl-10 bg-white"
              />
            </div>
          </div>

          {/* Products Table */}
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
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">Price</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">In stock</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">Sales</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, index) => (
                      <tr key={index} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <span className="text-sm font-medium text-gray-900">{product.name}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-700 font-medium">{product.price}</span>
                        </td>
                        <td className="py-4 px-4">
                          <Badge className={`${getStockVariant(product.inStock)} text-xs font-medium`}>
                            {product.inStock}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-700 font-medium">{product.sales}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-green-600" />
                            <Badge className={`${getMarginVariant(product.margin)} text-xs font-medium`}>
                              {product.margin}
                            </Badge>
                          </div>
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