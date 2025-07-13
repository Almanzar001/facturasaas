'use client'

import React from 'react'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card'
import { formatCurrency } from '@/utils/formatCurrency'

interface TopClient {
  id: string
  name: string
  totalRevenue: number
  invoiceCount: number
}

interface TopClientsProps {
  clients: TopClient[]
}

const TopClients: React.FC<TopClientsProps> = ({ clients }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Clientes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {clients.map((client) => (
            <div key={client.id} className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{client.name}</p>
                <p className="text-sm text-gray-500">{client.invoiceCount} facturas</p>
              </div>
              <p className="font-semibold text-gray-900">
                {formatCurrency(client.totalRevenue)}
              </p>
            </div>
          ))}
          {clients.length === 0 && (
            <p className="text-center text-gray-500 py-4">No hay datos disponibles</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default React.memo(TopClients)