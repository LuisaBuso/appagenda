import { useEffect, useState } from 'react';
import { Sidebar } from '../../../components/Layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Search } from 'lucide-react';
import { API_BASE_URL } from '../../../types/config';

// Elimina el import de useAuth si no funciona
// import { useAuth } from '../../../contexts/AuthContext';

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Obtener información del usuario directamente del localStorage/sessionStorage
  const getUserInfoFromStorage = () => {
    const email = localStorage.getItem('beaux-email') || sessionStorage.getItem('beaux-email');
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    const pais = localStorage.getItem('beaux-pais') || sessionStorage.getItem('beaux-pais');
    
    return {
      email,
      token,
      pais: pais || undefined
    };
  };
  
  const userInfo = getUserInfoFromStorage();
  const token = userInfo.token;
  const pais = userInfo.pais;

  // Función para determinar la moneda basada en el país del usuario
  const getCurrencyForCountry = (pais?: string): string => {
    if (!pais) return 'USD'; // Por defecto USD
    
    const countryCurrencyMap: Record<string, string> = {
      'Colombia': 'COP',
      'México': 'MXN',
      'Mexico': 'MXN',
      'Ecuador': 'USD',
      'Perú': 'USD',
      'Chile': 'USD',
      'Argentina': 'USD',
      'Estados Unidos': 'USD',
      'United States': 'USD',
      'USA': 'USD',
    };
    
    return countryCurrencyMap[pais] || 'USD';
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Verificar si hay token
        if (!token) {
          console.error("No hay token de autenticación disponible");
          setLoading(false);
          return;
        }

        // Determinar la moneda basada en el país
        const moneda = getCurrencyForCountry(pais);
        
        // Construir la URL con el parámetro de moneda
        const url = `${API_BASE_URL}inventary/product/productos/?moneda=${moneda}`;
        
        const res = await fetch(url, {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        setProducts(data || []);
      } catch (error) {
        console.error("Error cargando productos", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [token, pais]);

  const filteredProducts = products.filter((p) =>
    p.nombre?.toLowerCase().includes(search.toLowerCase())
  );

  // Función para formatear el precio según la moneda
  const formatPrice = (product: any) => {
    if (!product) return '$0';
    
    // Usar precio_local si existe (viene del backend con conversión)
    const price = product.precio_local || product.precio || 0;
    const currency = product.moneda_local || getCurrencyForCountry(pais) || 'USD';
    
    // Formatear según la moneda
    switch (currency) {
      case 'COP':
        return `$${price.toLocaleString('es-CO')}`;
      case 'MXN':
        return `$${price.toLocaleString('es-MX')}`;
      case 'USD':
        return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      default:
        return `$${price.toLocaleString()}`;
    }
  };

  // Función para obtener el símbolo de moneda
  const getCurrencySymbol = (product: any) => {
    const currency = product.moneda_local || getCurrencyForCountry(pais) || 'USD';
    switch (currency) {
      case 'COP': return 'COP';
      case 'MXN': return 'MXN';
      case 'USD': return 'USD';
      default: return '';
    }
  };

  if (loading) return <div className="p-8">Loading products...</div>;

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
                Administre los productos y el inventario de su salón
                {pais && (
                  <span className="ml-2 text-sm text-gray-500">
                    (Prices in {getCurrencyForCountry(pais)} for {pais})
                  </span>
                )}
              </p>
            </div>

          </div>

          {/* SEARCH */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar "
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
                Productos
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">Nombre</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">Categoria</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">Precio</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProducts.map((product: any, index: number) => (
                      <tr key={index} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                        
                        <td className="py-4 px-4">
                          <span className="text-sm font-medium text-gray-900">{product.nombre}</span>

                        </td>

                        <td className="py-4 px-4">
                          <Badge variant="outline" className="text-xs">
                            {product.categoria}
                          </Badge>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">
                              {formatPrice(product)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {getCurrencySymbol(product)}
                            </span>
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