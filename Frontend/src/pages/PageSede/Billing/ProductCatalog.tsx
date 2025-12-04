// components/products/ProductCatalog.tsx
"use client"

import { useState, useEffect } from "react"
import { Search, Plus, ShoppingCart } from "lucide-react"
import { Button } from "../../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { Input } from "../../../components/ui/input"
import { Badge } from "../../../components/ui/badge"

interface Producto {
  id: string
  nombre: string
  categoria: string
  descripcion: string
  imagen: string
  activo: boolean
  tipo_codigo: string
  descuento: number
  stock: string | number
  precio: number
  tipo_precio: string
}

interface ProductCatalogProps {
  onAddToCart?: (product: Producto) => void
  cartItems?: Producto[]
  readOnly?: boolean
}

export function ProductCatalog({ onAddToCart, cartItems = [], readOnly = false }: ProductCatalogProps) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token') // Ajusta cómo obtienes el token
      const response = await fetch('https://api.rizosfelices.co/api/productos/disponibles', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'accept': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Error al obtener productos')
      }
      
      const data = await response.json()
      setProductos(data)
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar productos
  const filteredProducts = productos.filter(product => {
    const matchesSearch = product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || product.categoria === selectedCategory
    return matchesSearch && matchesCategory && product.activo
  })

  // Obtener categorías únicas
  const categories = Array.from(new Set(productos.map(p => p.categoria))).filter(Boolean)

  // Contar productos en carrito por ID
  const getProductQuantity = (productId: string) => {
    return cartItems.filter(item => item.id === productId).length
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Catálogo de Productos
          </CardTitle>
          {!readOnly && cartItems.length > 0 && (
            <Badge variant="secondary" className="px-3 py-1">
              {cartItems.length} items en carrito
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Buscador y Filtros */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Buscar productos por nombre o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filtros de categoría */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                Todas
              </Button>
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Lista de Productos */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? "No se encontraron productos" : "No hay productos disponibles"}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map(product => {
              const quantityInCart = getProductQuantity(product.id)
              
              return (
                <div
                  key={product.id}
                  className={`border rounded-lg p-4 space-y-3 ${
                    quantityInCart > 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  {/* Imagen del producto */}
                  <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                    {product.imagen ? (
                      <img
                        src={product.imagen}
                        alt={product.nombre}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="text-gray-400 text-center p-4">
                        <ShoppingCart className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Sin imagen</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Información del producto */}
                  <div>
                    <h4 className="font-semibold text-sm truncate">{product.nombre}</h4>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">
                        {product.categoria}
                      </Badge>
                      <span className="font-bold">${product.precio.toFixed(2)}</span>
                    </div>
                    
                    {product.descripcion && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                        {product.descripcion}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-500">
                        Stock: {product.stock}
                      </span>
                      
                      {quantityInCart > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {quantityInCart} en carrito
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Botón para agregar */}
                  {!readOnly && (
                    <Button
                      variant={quantityInCart > 0 ? "default" : "outline"}
                      size="sm"
                      className="w-full"
                      onClick={() => onAddToCart?.(product)}
                      disabled={product.stock === 0 || product.stock === "0"}
                    >
                      {quantityInCart > 0 ? (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar otro
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar al carrito
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}