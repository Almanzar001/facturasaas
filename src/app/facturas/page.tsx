'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { InvoiceService, Invoice } from '@/services/invoices'
import { ClientService, Client } from '@/services/clients'
import { PaymentService, Payment } from '@/services/payments'
import { useInvoicesPagination } from '@/hooks/useInvoicesPagination'
import Button from '@/components/Button'
import Table from '@/components/Table'
import Modal from '@/components/Modal'
import SearchInput from '@/components/SearchInput'
import Card from '@/components/Card'
import StatusBadge from '@/components/StatusBadge'
import InvoiceForm from './InvoiceForm'
import { formatCurrency } from '@/utils/formatCurrency'
import { generateInvoicePDFAsync } from '@/components/LazyPDF'
import { SettingsService } from '@/services/settings'

function InvoicesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)
  const [preselectedClient, setPreselectedClient] = useState<string | null>(null)

  useEffect(() => {
    loadInvoices()
    
    // Check if there's a client parameter
    const clientId = searchParams.get('client')
    if (clientId) {
      setPreselectedClient(clientId)
      setShowModal(true)
    }
  }, [])

  useEffect(() => {
    filterInvoices()
  }, [searchQuery, statusFilter, invoices])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const data = await InvoiceService.getAll(true)
      setInvoices(data)
      setFilteredInvoices(data)
    } catch (error) {
      console.error('Error loading invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterInvoices = () => {
    let filtered = invoices

    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter)
    }

    if (searchQuery) {
      filtered = filtered.filter(invoice => 
        invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        false
      )
    }

    setFilteredInvoices(filtered)
  }

  const handleCreateInvoice = () => {
    setEditingInvoice(null)
    setShowModal(true)
  }

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setShowModal(true)
  }

  const handleUpdateStatus = async (invoice: Invoice, newStatus: Invoice['status']) => {
    // No permitir marcar como pagada si hay saldo pendiente
    if (newStatus === 'paid' && invoice.balance_due && invoice.balance_due > 0) {
      alert(`No se puede marcar como pagada. Saldo pendiente: ${formatCurrency(invoice.balance_due)}`)
      return
    }
    
    try {
      await InvoiceService.updateStatus(invoice.id, newStatus)
      await loadInvoices()
    } catch (error) {
      console.error('Error updating invoice status:', error)
      alert('Error al actualizar el estado de la factura')
    }
  }

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (window.confirm(`¿Está seguro de eliminar la factura ${invoice.invoice_number}?`)) {
      try {
        await InvoiceService.delete(invoice.id)
        await loadInvoices()
      } catch (error) {
        console.error('Error deleting invoice:', error)
        alert('Error al eliminar la factura')
      }
    }
  }

  const handleSaveInvoice = async () => {
    setShowModal(false)
    setPreselectedClient(null)
    await loadInvoices()
  }

  const handleDownloadPDF = async (invoice: Invoice) => {
    if (!invoice.client || !invoice.items || invoice.items.length === 0) {
      alert('No se puede generar el PDF: faltan datos de la factura')
      return
    }

    try {
      setPdfLoading(invoice.id)
      
      // Load payments and settings for this invoice
      const [payments, settings] = await Promise.all([
        PaymentService.getByInvoice(invoice.id),
        SettingsService.getSettings()
      ])
      
      const company = {
        name: settings?.company_name || 'Mi Empresa',
        rnc: settings?.company_rnc,
        address: settings?.company_address,
        phone: settings?.company_phone,
        email: settings?.company_email,
        logo: settings?.company_logo,
        tax_rate: settings?.tax_rate || 18
      }

      const invoiceData: InvoicePDFData = {
        invoice,
        client: invoice.client,
        items: invoice.items,
        payments,
        company
      }

      const pdfBytes = await generateInvoicePDFAsync(invoiceData)
      const filename = `Factura_${invoice.invoice_number}.pdf`
      
      // Dynamic download
      const { downloadPDF } = await import('@/pdf/generateInvoicePDF')
      downloadPDF(pdfBytes, filename)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error al generar el PDF')
    } finally {
      setPdfLoading(null)
    }
  }

  const getStatusOptions = (currentStatus: Invoice['status'], invoice: Invoice) => {
    const options = []
    
    if (currentStatus === 'draft') {
      options.push({ value: 'sent', label: 'Marcar como Enviada' })
    }
    if (currentStatus === 'sent') {
      // Only allow marking as paid if there's no pending balance
      const balanceDue = invoice.balance_due ?? invoice.total - (invoice.total_paid ?? 0)
      if (balanceDue <= 0) {
        options.push({ value: 'paid', label: 'Marcar como Pagada' })
      }
      options.push({ value: 'overdue', label: 'Marcar como Vencida' })
    }
    if (currentStatus === 'overdue') {
      // Only allow marking as paid if there's no pending balance
      const balanceDue = invoice.balance_due ?? invoice.total - (invoice.total_paid ?? 0)
      if (balanceDue <= 0) {
        options.push({ value: 'paid', label: 'Marcar como Pagada' })
      }
    }
    
    return options
  }

  const columns = [
    {
      key: 'invoice_number',
      title: 'Número',
      render: (value: string) => (
        <div className="font-medium text-gray-900">{value}</div>
      )
    },
    {
      key: 'client',
      title: 'Cliente',
      render: (value: Client) => (
        <div>
          <div className="font-medium text-gray-900">{value?.name}</div>
          <div className="text-sm text-gray-500">{value?.email}</div>
        </div>
      )
    },
    {
      key: 'date',
      title: 'Fecha',
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      key: 'due_date',
      title: 'Vencimiento',
      render: (value: string) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'total',
      title: 'Total',
      render: (value: number) => formatCurrency(value),
      align: 'right' as const
    },
    {
      key: 'status',
      title: 'Estado',
      render: (value: string) => (
        <StatusBadge status={value} variant="invoice" />
      )
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
            variant="outline"
            onClick={() => handleEditInvoice(row)}
          >
            Editar
          </Button>
          
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDownloadPDF(row)}
            loading={pdfLoading === row.id}
            disabled={!row.client || !row.items || row.items.length === 0}
          >
            PDF
          </Button>
          
          {getStatusOptions(row.status, row).length > 0 && (
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleUpdateStatus(row, e.target.value as Invoice['status'])
                  e.target.value = '' // Reset select
                }
              }}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="">Estado</option>
              {getStatusOptions(row.status, row).map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteInvoice(row)}
          >
            Eliminar
          </Button>
        </div>
      )
    }
  ]

  const statusOptions = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'draft', label: 'Borradores' },
    { value: 'sent', label: 'Enviadas' },
    { value: 'paid', label: 'Pagadas' },
    { value: 'overdue', label: 'Vencidas' }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Facturas</h1>
        <Button onClick={handleCreateInvoice}>
          Nueva Factura
        </Button>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Buscar facturas..."
                className="max-w-sm"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-500">
              {filteredInvoices.length} factura{filteredInvoices.length !== 1 ? 's' : ''}
            </div>
          </div>

          <Table
            data={filteredInvoices}
            columns={columns}
            loading={loading}
            emptyMessage="No hay facturas registradas"
          />
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setPreselectedClient(null)
        }}
        title={editingInvoice ? 'Editar Factura' : 'Nueva Factura'}
        maxWidth="2xl"
      >
        <InvoiceForm
          invoice={editingInvoice}
          preselectedClientId={preselectedClient}
          onSave={handleSaveInvoice}
          onCancel={() => {
            setShowModal(false)
            setPreselectedClient(null)
          }}
        />
      </Modal>
    </div>
  )
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="p-6">Cargando...</div>}>
      <InvoicesPageContent />
    </Suspense>
  )
}