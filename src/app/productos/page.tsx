'use client'

import React, { useState, useEffect } from 'react'
import { ProductService, Product } from '@/services/products'
import Button from '@/components/Button'
import Table from '@/components/Table'
import Modal from '@/components/Modal'
import SearchInput from '@/components/SearchInput'
import Card from '@/components/Card'
import StatusBadge from '@/components/StatusBadge'
import ProductForm from './ProductForm'
import { formatCurrency } from '@/utils/formatCurrency'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [showInactive])

  useEffect(() => {
    if (searchQuery) {
      searchProducts(searchQuery)
    } else {
      setFilteredProducts(products)
    }
  }, [searchQuery, products])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const data = await ProductService.getAll(showInactive)
      setProducts(data)
      setFilteredProducts(data)
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const searchProducts = async (query: string) => {
    try {
      const data = await ProductService.search(query)
      setFilteredProducts(data)
    } catch (error) {
    }
  }

  const handleCreateProduct = () => {
    setEditingProduct(null)
    setShowModal(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setShowModal(true)
  }

  const handleToggleActive = async (product: Product) => {
    try {
      await ProductService.toggleActive(product.id)
      await loadProducts()
    } catch (error) {
      alert('Error al cambiar el estado del producto')
    }
  }

  const handleDeleteProduct = async (product: Product) => {
    if (window.confirm(`¿Está seguro de eliminar el producto "${product.name}"?`)) {
      try {
        await ProductService.delete(product.id)
        await loadProducts()
      } catch (error) {
        alert('Error al eliminar el producto')
      }
    }
  }

  const handleSaveProduct = async () => {
    setShowModal(false)
    await loadProducts()
  }

  const columns = [
    {
      key: 'name',
      title: 'Producto',
      render: (value: string, row: Product) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          {row.description && (
            <div className="text-sm text-gray-500">{row.description}</div>
          )}
        </div>
      )
    },
    {
      key: 'price',
      title: 'Precio',
      render: (value: number) => formatCurrency(value),
      align: 'right' as const
    },
    {
      key: 'category',
      title: 'Categoría',
      render: (value: string) => value || '-'
    },
    {
      key: 'unit',
      title: 'Unidad',
      render: (value: string) => value || 'unidad'
    },
    {
      key: 'is_active',
      title: 'Estado',
      render: (value: boolean) => (
        <StatusBadge
          status={value ? 'active' : 'inactive'}
          variant="general"
        />
      )
    },
    {
      key: 'actions',
      title: 'Acciones',
      render: (value: any, row: Product) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEditProduct(row)}
          >
            Editar
          </Button>
          <Button
            size="sm"
            variant={row.is_active ? 'outline' : 'success'}
            onClick={() => handleToggleActive(row)}
          >
            {row.is_active ? 'Desactivar' : 'Activar'}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteProduct(row)}
          >
            Eliminar
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
        <Button onClick={handleCreateProduct}>
          Nuevo Producto
        </Button>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Buscar productos..."
                className="max-w-sm"
              />
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">
                  Mostrar inactivos
                </span>
              </label>
            </div>
            <div className="text-sm text-gray-500">
              {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''}
            </div>
          </div>

          <Table
            data={filteredProducts}
            columns={columns}
            loading={loading}
            emptyMessage="No hay productos registrados"
          />
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
        maxWidth="lg"
      >
        <ProductForm
          product={editingProduct}
          onSave={handleSaveProduct}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  )
}