'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Product } from '@/services/products'
import { useDebounce } from '@/hooks/useDebounce'
import Input from './Input'

interface ProductSearchProps {
  products: Product[]
  onSelect: (product: Product) => void
  placeholder?: string
}

const ProductSearch: React.FC<ProductSearchProps> = ({ 
  products, 
  onSelect, 
  placeholder = "Buscar producto por nombre o código..." 
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Memoizar los productos filtrados
  const filteredProducts = useMemo(() => {
    if (!debouncedSearchTerm) return []
    
    const term = debouncedSearchTerm.toLowerCase()
    return products
      .filter(product => 
        product.name.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term) ||
        product.description?.toLowerCase().includes(term)
      )
      .slice(0, 10) // Limitar a 10 resultados para mejor rendimiento
  }, [debouncedSearchTerm, products])

  const handleSelect = useCallback((product: Product) => {
    onSelect(product)
    setSearchTerm('')
    setIsOpen(false)
  }, [onSelect])

  useEffect(() => {
    setIsOpen(filteredProducts.length > 0)
  }, [filteredProducts])

  return (
    <div className="relative">
      <Input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setIsOpen(filteredProducts.length > 0)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
      />
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              type="button"
              className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              onMouseDown={() => handleSelect(product)}
            >
              <div className="font-medium">{product.name}</div>
              <div className="text-sm text-gray-600">
                {product.category && `${product.category} | `}
                Precio: RD$ {product.price.toFixed(2)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default React.memo(ProductSearch)