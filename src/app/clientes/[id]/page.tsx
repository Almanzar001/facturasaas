'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ClientService, Client } from '@/services/clients'
import { InvoiceService, Invoice } from '@/services/invoices'
import { PaymentService, Payment } from '@/services/payments'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Table from '@/components/Table'
import { formatCurrency } from '@/utils/formatCurrency'
import { generateInvoicePDF, downloadPDF, InvoicePDFData } from '@/pdf/generateInvoicePDF'

interface ClientStats {
  totalInvoices: number
  paidInvoices: number
  pendingInvoices: number
  totalRevenue: number
  totalPaid: number
  totalPending: number
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  
  const [client, setClient] = useState<Client | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ClientStats>({
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    totalRevenue: 0,
    totalPaid: 0,
    totalPending: 0
  })
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)

  useEffect(() => {
    loadClientData()
  }, [clientId])

  const loadClientData = async () => {
    try {
      setLoading(true)
      
      // Load client info
      const clientData = await ClientService.getById(clientId)
      if (!clientData) {
        router.push('/clientes')
        return
      }
      setClient(clientData)
      
      // Load client invoices
      const invoicesData = await InvoiceService.getByClient(clientId)
      setInvoices(invoicesData)
      
      // Calculate statistics
      calculateStats(invoicesData)
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (invoices: Invoice[]) => {
    const stats: ClientStats = {
      totalInvoices: invoices.length,
      paidInvoices: 0,
      pendingInvoices: 0,
      totalRevenue: 0,
      totalPaid: 0,
      totalPending: 0
    }

    invoices.forEach(invoice => {
      stats.totalRevenue += invoice.total
      
      if (invoice.status === 'paid') {
        stats.paidInvoices++
        stats.totalPaid += invoice.total
      } else {
        stats.pendingInvoices++
        const paid = invoice.total_paid || 0
        stats.totalPaid += paid
        stats.totalPending += (invoice.total - paid)
      }
    })

    setStats(stats)
  }

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      setPdfLoading(invoice.id)
      
      const [invoiceDetails, payments] = await Promise.all([
        InvoiceService.getById(invoice.id),
        PaymentService.getByInvoice(invoice.id)
      ])

      if (!invoiceDetails || !client) {
        alert('Error al cargar los datos de la factura')
        return
      }

      const company = {
        name: 'Su Empresa',
        address: 'Dirección de la empresa',
        phone: '+57 300 123 4567',
        email: 'contacto@suempresa.com',
        nit: '900.123.456-7'
      }

      const invoiceData: InvoicePDFData = {
        invoice: invoiceDetails,
        client: client,
        items: invoiceDetails.items || [],
        payments: payments,
        company
      }

      const pdfBytes = await generateInvoicePDF(invoiceData)
      const filename = `Factura_${invoice.invoice_number}.pdf`
      downloadPDF(pdfBytes, filename)
    } catch (error) {
      alert('Error al generar el PDF')
    } finally {
      setPdfLoading(null)
    }
  }

  const invoiceColumns = [
    {
      key: 'invoice_number',
      title: 'Número',
      render: (value: string) => (
        <span className="font-medium text-blue-600">{value}</span>
      )
    },
    {
      key: 'fiscal_number',
      title: 'NCF',
      render: (value: string) => value || '-'
    },
    {
      key: 'date',
      title: 'Fecha',
      render: (value: string) => new Date(value).toLocaleDateString('es-DO')
    },
    {
      key: 'due_date',
      title: 'Vencimiento',
      render: (value: string) => value ? new Date(value).toLocaleDateString('es-DO') : '-'
    },
    {
      key: 'total',
      title: 'Total',
      render: (value: number) => formatCurrency(value)
    },
    {
      key: 'balance_due',
      title: 'Saldo',
      render: (value: number, row: Invoice) => {
        const balance = row.total - (row.total_paid || 0)
        return (
          <span className={balance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
            {balance > 0 ? formatCurrency(balance) : 'Pagado'}
          </span>
        )
      }
    },
    {
      key: 'status',
      title: 'Estado',
      render: (value: string) => {
        const statusMap = {
          'draft': { label: 'Borrador', class: 'bg-gray-100 text-gray-800' },
          'sent': { label: 'Enviada', class: 'bg-blue-100 text-blue-800' },
          'paid': { label: 'Pagada', class: 'bg-green-100 text-green-800' },
          'overdue': { label: 'Vencida', class: 'bg-red-100 text-red-800' }
        }
        const status = statusMap[value as keyof typeof statusMap] || { label: value, class: 'bg-gray-100 text-gray-800' }
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.class}`}>
            {status.label}
          </span>
        )
      }
    },
    {
      key: 'actions',
      title: 'Acciones',
      render: (value: any, row: Invoice) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/facturas/${row.id}`)}
          >
            Ver
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDownloadInvoice(row)}
            loading={pdfLoading === row.id}
          >
            PDF
          </Button>
        </div>
      )
    }
  ]

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!client) {
    return null
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            {client.email && <div>Email: {client.email}</div>}
            {client.phone && <div>Teléfono: {client.phone}</div>}
            {client.identification && (
              <div>
                {client.identification_type}: {client.identification}
              </div>
            )}
            {client.address && <div>Dirección: {client.address}</div>}
            {client.city && <div>Ciudad: {client.city}</div>}
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push('/clientes')}
          >
            Volver
          </Button>
          <Button
            onClick={() => router.push('/facturas?client=' + clientId)}
          >
            Nueva Factura
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <div className="p-4">
            <h3 className="text-sm font-medium text-blue-600">Total Facturas</h3>
            <p className="text-2xl font-bold text-blue-900">{stats.totalInvoices}</p>
            <div className="mt-2 text-sm text-blue-700">
              {stats.paidInvoices} pagadas, {stats.pendingInvoices} pendientes
            </div>
          </div>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <div className="p-4">
            <h3 className="text-sm font-medium text-green-600">Total Facturado</h3>
            <p className="text-2xl font-bold text-green-900">{formatCurrency(stats.totalRevenue)}</p>
            <div className="mt-2 text-sm text-green-700">
              Pagado: {formatCurrency(stats.totalPaid)}
            </div>
          </div>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <div className="p-4">
            <h3 className="text-sm font-medium text-red-600">Saldo Pendiente</h3>
            <p className="text-2xl font-bold text-red-900">{formatCurrency(stats.totalPending)}</p>
            <div className="mt-2 text-sm text-red-700">
              {stats.pendingInvoices} {stats.pendingInvoices === 1 ? 'factura' : 'facturas'} por cobrar
            </div>
          </div>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <div className="p-4 border-b">
          <h2 className="text-lg font-medium text-gray-900">Historial de Facturas</h2>
        </div>
        <div className="p-4">
          <Table
            data={invoices}
            columns={invoiceColumns}
            emptyMessage="No hay facturas registradas para este cliente"
          />
        </div>
      </Card>

    </div>
  )
}