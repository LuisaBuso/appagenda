// components/products/ProductCatalogModal.tsx
"use client"

import { useState, useEffect } from "react"
import { Search, X, Plus, Check, ShoppingCart, Filter } from "lucide-react"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Badge } from "../../../components/ui/badge"
import { ScrollArea } from "../../../components/ui/scroll-area"
import { API_BASE_URL } from "../../../types/config"

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

interface ProductCatalogModalProps {
  isOpen: boolean
  onClose: () => void
  onAddProducts: (products: Producto[]) => void
  selectedProducts?: Producto[]
}

export function ProductCatalogModal({ 
  isOpen, 
  onClose, 
  onAddProducts,
  selectedProducts = []
}: ProductCatalogModalProps) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [tempSelectedProducts, setTempSelectedProducts] = useState<Producto[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  useEffect(() => {
    if (isOpen) {
      fetchProducts()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && selectedProducts.length > 0) {
      setTempSelectedProducts(selectedProducts)
      
      const initialQuantities: Record<string, number> = {}
      selectedProducts.forEach(product => {
        if (product && product.id) {
          initialQuantities[product.id] = (initialQuantities[product.id] || 0) + 1
        }
      })
      setQuantities(initialQuantities)
    }
  }, [isOpen, selectedProducts])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
      
      if (!token) {
        console.error('No hay token de autenticación')
        setProductos([])
        return
      }

      const response = await fetch(`${API_BASE_URL}scheduling/quotes/products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Productos recibidos:', data) // Para debug
      
      // Validar y limpiar datos
      const productosValidos = (Array.isArray(data) ? data : []).filter(product => 
        product && 
        product.id && 
        product.nombre
      ).map(product => ({
        ...product,
        precio: typeof product.precio === 'number' ? product.precio : 0,
        stock: product.stock || "0",
        categoria: product.categoria || "Sin categoría",
        activo: product.activo !== false
      }))
      
      setProductos(productosValidos)
    } catch (error) {
      console.error("Error fetching products:", error)
      // Datos de ejemplo para desarrollo
      const mockData: Producto[] = [
        { 
          id: "P001", 
          nombre: "Shampoo 250 ML", 
          categoria: "SPECIAL", 
          descripcion: "", 
          imagen: "", 
          activo: true, 
          tipo_codigo: "", 
          descuento: 0, 
          stock: "500", 
          precio: 5.9, 
          tipo_precio: "sin_iva_internacional" 
        },
        { 
          id: "P002", 
          nombre: "Acondicionador 250 ML", 
          categoria: "SPECIAL", 
          descripcion: "", 
          imagen: "", 
          activo: true, 
          tipo_codigo: "", 
          descuento: 0, 
          stock: "500", 
          precio: 5.9, 
          tipo_precio: "sin_iva_internacional" 
        },
        { 
          id: "P003", 
          nombre: "Crema 3 en 1", 
          categoria: "SPECIAL", 
          descripcion: "", 
          imagen: "", 
          activo: true, 
          tipo_codigo: "", 
          descuento: 0, 
          stock: "500", 
          precio: 5.9, 
          tipo_precio: "sin_iva_internacional" 
        },
      ]
      setProductos(mockData)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar productos válidos
  const filteredProducts = productos.filter(product => {
    if (!product || !product.activo) return false
    
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      (product.nombre?.toLowerCase().includes(searchLower) || false) ||
      (product.categoria?.toLowerCase().includes(searchLower) || false) ||
      (product.descripcion?.toLowerCase().includes(searchLower) || false)
    
    const matchesCategory = !selectedCategory || product.categoria === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Obtener categorías únicas
  const categories = Array.from(new Set(
    productos
      .filter(product => product && product.categoria)
      .map(p => p.categoria)
  )).filter(Boolean)

  // Manejar selección de producto
  const handleProductSelect = (product: Producto) => {
    if (!product || !product.id) return
    
    setQuantities(prev => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + 1
    }))
    
    setTempSelectedProducts(prev => [...prev, product])
  }

  const handleRemoveProduct = (productId: string) => {
    setQuantities(prev => {
      const newQuantities = { ...prev }
      delete newQuantities[productId]
      return newQuantities
    })
    setTempSelectedProducts(prev => prev.filter(p => p && p.id !== productId))
  }

  const handleQuantityChange = (productId: string, delta: number) => {
    const currentQty = quantities[productId] || 0
    const newQty = Math.max(0, currentQty + delta)
    
    if (newQty === 0) {
      handleRemoveProduct(productId)
      return
    }

    setQuantities(prev => ({ ...prev, [productId]: newQty }))
    
    const product = productos.find(p => p && p.id === productId)
    if (product) {
      const currentCount = tempSelectedProducts.filter(p => p && p.id === productId).length
      const diff = newQty - currentCount
      
      if (diff > 0) {
        const toAdd = Array(diff).fill(product)
        setTempSelectedProducts(prev => [...prev, ...toAdd])
      } else if (diff < 0) {
        let count = Math.abs(diff)
        setTempSelectedProducts(prev => 
          prev.filter(p => {
            if (p && p.id === productId && count > 0) {
              count--
              return false
            }
            return true
          })
        )
      }
    }
  }

  const handleConfirm = () => {
    const productosValidos = tempSelectedProducts.filter(product => 
      product && product.id
    )
    onAddProducts(productosValidos)
    onClose()
  }

  // Calcular total
  const total = tempSelectedProducts.reduce((sum, product) => {
    if (!product || typeof product.precio !== 'number') return sum
    return sum + (product.precio || 0)
  }, 0)
  
  const totalQuantity = Object.values(quantities).reduce((sum, qty) => sum + qty, 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">Catálogo de Productos</h2>
            <p className="text-gray-500 text-sm mt-1">
              Selecciona los productos para agregar a la factura
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Contenido principal */}
        <div className="flex-1 flex overflow-hidden">
          {/* Panel izquierdo - Catálogo */}
          <div className="flex-1 p-6 border-r overflow-hidden flex flex-col">
            {/* Filtros y búsqueda */}
            <div className="space-y-4 mb-6">
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtrar:
                  </span>
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

            {/* Lista de productos */}
            <ScrollArea className="flex-1 pr-4">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  <p className="ml-3 text-gray-600">Cargando productos...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No se encontraron productos</p>
                  <p className="text-sm mt-2">
                    {searchTerm ? "Intenta con otros términos de búsqueda" : "No hay productos disponibles"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.map(product => {
                    if (!product) return null
                    
                    const qty = quantities[product.id] || 0
                    const isSelected = qty > 0
                    const precio = product.precio || 0
                    const stock = product.stock || "0"
                    const nombre = product.nombre || "Producto sin nombre"
                    const categoria = product.categoria || "Sin categoría"
                    
                    return (
                      <div
                        key={product.id}
                        className={`border rounded-lg p-4 space-y-3 ${
                          isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Imagen del producto */}
                        <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                          {product.imagen ? (
                            <img
                              src={product.imagen}
                              alt={nombre}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-gray-400 flex flex-col items-center">
                              <ShoppingCart className="h-8 w-8 mb-2" />
                              <span className="text-xs">Sin imagen</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Información del producto */}
                        <div>
                          <h4 className="font-semibold text-sm truncate">{nombre}</h4>
                          <div className="flex items-center justify-between mt-2">
                            <Badge variant="outline" className="text-xs">
                              {categoria}
                            </Badge>
                            <span className="font-bold">${precio.toFixed(2)}</span>
                          </div>
                          
                          {product.descripcion && (
                            <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                              {product.descripcion}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-gray-500">
                              Stock: {stock}
                            </span>
                            {isSelected && (
                              <Badge variant="secondary" className="text-xs">
                                {qty} seleccionado{qty > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Controles de cantidad */}
                        {isSelected ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleQuantityChange(product.id, -1)}
                              >
                                -
                              </Button>
                              <span className="font-medium min-w-[2rem] text-center">{qty}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleQuantityChange(product.id, 1)}
                                disabled={Number(stock) <= qty}
                              >
                                +
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleRemoveProduct(product.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleProductSelect(product)}
                            disabled={stock === 0 || stock === "0"}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Panel derecho - Resumen */}
          <div className="w-96 p-6 bg-gray-50 flex flex-col">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Productos Seleccionados
            </h3>
            
            <ScrollArea className="flex-1 mb-6">
              {totalQuantity === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No hay productos seleccionados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(quantities).map(([productId, qty]) => {
                    const product = productos.find(p => p && p.id === productId)
                    if (!product) return null
                    
                    const precio = product.precio || 0
                    const nombre = product.nombre || "Producto"
                    const categoria = product.categoria || "Sin categoría"
                    
                    return (
                      <div key={productId} className="bg-white rounded-lg p-4 border">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-sm truncate">{nombre}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">${precio.toFixed(2)} c/u</span>
                              <Badge variant="outline" className="text-xs">
                                {categoria}
                              </Badge>
                            </div>
                          </div>
                          <span className="text-lg font-bold">
                            ${(precio * qty).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Cantidad:</span>
                            <span className="font-medium">{qty}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleRemoveProduct(productId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
            
            {/* Resumen de totales */}
            <div className="border-t pt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total productos:</span>
                <span className="font-medium">{totalQuantity} items</span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="font-bold">Total:</span>
                <span className="font-bold">${total.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Botones de acción */}
            <div className="space-y-3 mt-6">
              <Button
                className="w-full"
                size="lg"
                onClick={handleConfirm}
                disabled={totalQuantity === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Agregar {totalQuantity} producto{totalQuantity !== 1 ? 's' : ''}
              </Button>
              
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                onClick={onClose}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}