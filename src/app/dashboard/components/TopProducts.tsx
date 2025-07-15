'use client'

import React from 'react'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card'
import { formatCurrency } from '@/utils/formatCurrency'

interface TopProduct {
  product_id: string
  name: string
  total_revenue: number
  times_sold?: number
  total_quantity?: number
}

interface TopProductsProps {
  products: TopProduct[]
}

const TopProducts: React.FC<TopProductsProps> = ({ products }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Productos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.product_id} className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{product.name}</p>
                <p className="text-sm text-gray-500">
                  {product.times_sold} vendidos
                  {product.total_quantity && ` • ${product.total_quantity} unidades`}
                </p>
              </div>
              <p className="font-semibold text-gray-900">
                {formatCurrency(product.total_revenue)}
              </p>
            </div>
          ))}
          {products.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p>No hay productos con ventas</p>
              <p className="text-sm mt-1">Crea facturas con productos para ver estadísticas</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default React.memo(TopProducts)