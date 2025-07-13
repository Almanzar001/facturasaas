'use client'

import React from 'react'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card'
import { formatCurrency } from '@/utils/formatCurrency'

interface TopProduct {
  id: string
  name: string
  totalRevenue: number
  timesSold: number
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
            <div key={product.id} className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{product.name}</p>
                <p className="text-sm text-gray-500">{product.timesSold} vendidos</p>
              </div>
              <p className="font-semibold text-gray-900">
                {formatCurrency(product.totalRevenue)}
              </p>
            </div>
          ))}
          {products.length === 0 && (
            <p className="text-center text-gray-500 py-4">No hay datos disponibles</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default React.memo(TopProducts)