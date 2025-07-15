'use client'

import React from 'react'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card'
import { formatCurrency } from '@/utils/formatCurrency'

interface TopClient {
  client_id: string
  name: string
  total_revenue: number
  invoice_count: number
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
            <div key={client.client_id} className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{client.name}</p>
                <p className="text-sm text-gray-500">{client.invoice_count} facturas</p>
              </div>
              <p className="font-semibold text-gray-900">
                {formatCurrency(client.total_revenue)}
              </p>
            </div>
          ))}
          {clients.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p>No hay clientes con facturas pagadas</p>
              <p className="text-sm mt-1">Crea y marca facturas como pagadas para ver estadísticas</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default React.memo(TopClients)
