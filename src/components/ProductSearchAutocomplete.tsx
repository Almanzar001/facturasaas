'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ProductService, Product } from '@/services/products'
import { useDebounce } from '@/hooks/useDebounce'
import { formatCurrency } from '@/utils/formatCurrency'

interface ProductSearchAutocompleteProps {
  onProductSelect: (product: Product) => void
  placeholder?: string
  className?: string
}

const ProductSearchAutocomplete: React.FC<ProductSearchAutocompleteProps> = ({
  onProductSelect,
  placeholder = "Buscar producto...",
  className = ""
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  useEffect(() => {
    if (debouncedSearchTerm.length >= 2) {
      searchProducts(debouncedSearchTerm)
    } else {
      setProducts([])
      setIsOpen(false)
    }
  }, [debouncedSearchTerm])

  const searchProducts = async (query: string) => {
    try {
      setLoading(true)
      const allProducts = await ProductService.getAll()
      const filtered = allProducts.filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.category?.toLowerCase().includes(query.toLowerCase()) ||
        product.description?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10)
      
      setProducts(filtered)
      setIsOpen(filtered.length > 0)
      setSelectedIndex(-1)
    } catch (error) {
      console.error('Error searching products:', error)
      setProducts([])
      setIsOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (product: Product) => {
    onProductSelect(product)
    setSearchTerm('')
    setIsOpen(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < products.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < products.length) {
          handleSelect(products[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text
    
    const regex = new RegExp(`(${query})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200">{part}</mark>
      ) : part
    )
  }

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (products.length > 0) {
            setIsOpen(true)
          }
        }}
        onBlur={() => {
          setTimeout(() => setIsOpen(false), 200)
        }}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      
      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {products.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              {searchTerm.length < 2 ? 'Escriba al menos 2 caracteres' : 'No se encontraron productos'}
            </div>
          ) : (
            products.map((product, index) => (
              <button
                key={product.id}
                type="button"
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${
                  index === selectedIndex ? 'bg-blue-50' : ''
                }`}
                onMouseDown={() => handleSelect(product)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="font-medium text-gray-900">
                  {highlightMatch(product.name, searchTerm)}
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-gray-600">
                    {product.category && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded mr-2">
                        {product.category}
                      </span>
                    )}
                    {product.description && (
                      <span className="text-gray-500">
                        {product.description.length > 50 
                          ? `${product.description.substring(0, 50)}...` 
                          : product.description
                        }
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-medium text-green-600">
                    {formatCurrency(product.price)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default ProductSearchAutocomplete