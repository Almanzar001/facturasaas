'use client'

import React, { useState, useEffect } from 'react'
import { QuoteService, Quote } from '@/services/quotes'
import { ClientService, Client } from '@/services/clients'
import { InvoiceService } from '@/services/invoices'
import Button from '@/components/Button'
import Table from '@/components/Table'
import Modal from '@/components/Modal'
import SearchInput from '@/components/SearchInput'
import Card from '@/components/Card'
import StatusBadge from '@/components/StatusBadge'
import QuoteForm from './QuoteForm'
import { formatCurrency } from '@/utils/formatCurrency'
import { generateQuotePDF, downloadPDF, QuotePDFData } from '@/pdf/generateQuotePDF'

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)
  const [convertingToInvoice, setConvertingToInvoice] = useState<string | null>(null)

  useEffect(() => {
    loadQuotes()
  }, [])

  useEffect(() => {
    filterQuotes()
  }, [searchQuery, statusFilter, quotes])

  const loadQuotes = async () => {
    try {
      setLoading(true)
      const data = await QuoteService.getAll(true)
      setQuotes(data)
      setFilteredQuotes(data)
    } catch (error) {
      console.error('Error loading quotes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterQuotes = () => {
    let filtered = quotes

    if (statusFilter !== 'all') {
      filtered = filtered.filter(quote => quote.status === statusFilter)
    }

    if (searchQuery) {
      filtered = filtered.filter(quote => 
        quote.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quote.client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        false
      )
    }

    setFilteredQuotes(filtered)
  }

  const handleCreateQuote = () => {
    setEditingQuote(null)
    setShowModal(true)
  }

  const handleEditQuote = (quote: Quote) => {
    setEditingQuote(quote)
    setShowModal(true)
  }

  const handleUpdateStatus = async (quote: Quote, newStatus: Quote['status']) => {
    try {
      await QuoteService.updateStatus(quote.id, newStatus)
      await loadQuotes()
    } catch (error) {
      console.error('Error updating quote status:', error)
      alert('Error al actualizar el estado de la cotización')
    }
  }

  const handleConvertToInvoice = async (quote: Quote) => {
    if (quote.converted_to_invoice) {
      alert('Esta cotización ya ha sido convertida a factura')
      return
    }

    if (!confirm(`¿Está seguro de convertir la cotización ${quote.quote_number} a factura?\n\nEsto creará una nueva factura con los mismos datos.`)) {
      return
    }

    try {
      setConvertingToInvoice(quote.id)
      const invoiceId = await QuoteService.convertToInvoice(quote.id)
      alert(`Cotización convertida exitosamente. ID de factura: ${invoiceId}`)
      await loadQuotes()
    } catch (error) {
      console.error('Error converting quote to invoice:', error)
      alert('Error al convertir la cotización a factura')
    } finally {
      setConvertingToInvoice(null)
    }
  }

  const handleDeleteQuote = async (quote: Quote) => {
    if (window.confirm(`¿Está seguro de eliminar la cotización ${quote.quote_number}?`)) {
      try {
        await QuoteService.delete(quote.id)
        await loadQuotes()
      } catch (error) {
        console.error('Error deleting quote:', error)
        alert('Error al eliminar la cotización')
      }
    }
  }

  const handleDownloadPDF = async (quote: Quote) => {
    if (!quote.client || !quote.items || quote.items.length === 0) {
      alert('No se puede generar el PDF: faltan datos de la cotización')
      return
    }

    try {
      setPdfLoading(quote.id)
      
      const company = {
        name: 'Su Empresa',
        address: 'Dirección de la empresa',
        phone: '+57 300 123 4567',
        email: 'contacto@suempresa.com',
        nit: '900.123.456-7'
      }

      const quoteData: QuotePDFData = {
        quote,
        client: quote.client,
        items: quote.items,
        company
      }

      const pdfBytes = await generateQuotePDF(quoteData)
      const filename = `Cotizacion_${quote.quote_number}.pdf`
      downloadPDF(pdfBytes, filename)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error al generar el PDF')
    } finally {
      setPdfLoading(null)
    }
  }

  const handleSaveQuote = async () => {
    setShowModal(false)
    await loadQuotes()
  }

  const getStatusOptions = (currentStatus: Quote['status']) => {
    const options = []
    
    if (currentStatus === 'draft') {
      options.push({ value: 'sent', label: 'Marcar como Enviada' })
    }
    if (currentStatus === 'sent') {
      options.push({ value: 'accepted', label: 'Marcar como Aceptada' })
      options.push({ value: 'rejected', label: 'Marcar como Rechazada' })
    }
    if (currentStatus === 'accepted') {
      options.push({ value: 'rejected', label: 'Marcar como Rechazada' })
    }
    
    return options
  }

  const columns = [
    {
      key: 'quote_number',
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
      key: 'expiry_date',
      title: 'Vencimiento',
      render: (value: string) => {
        if (!value) return '-'
        const expiryDate = new Date(value)
        const today = new Date()
        const isExpired = expiryDate < today
        return (
          <span className={isExpired ? 'text-red-600 font-medium' : 'text-gray-900'}>
            {expiryDate.toLocaleDateString()}
          </span>
        )
      }
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
        <StatusBadge status={value} variant="quote" />
      )
    },
    {
      key: 'actions',
      title: 'Acciones',
      render: (value: any, row: Quote) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEditQuote(row)}
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
          
          {row.status === 'accepted' && !row.converted_to_invoice && (
            <Button
              size="sm"
              variant="success"
              onClick={() => handleConvertToInvoice(row)}
              loading={convertingToInvoice === row.id}
            >
              → Factura
            </Button>
          )}
          
          {getStatusOptions(row.status).length > 0 && (
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleUpdateStatus(row, e.target.value as Quote['status'])
                  e.target.value = '' // Reset select
                }
              }}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="">Estado</option>
              {getStatusOptions(row.status).map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteQuote(row)}
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
    { value: 'accepted', label: 'Aceptadas' },
    { value: 'rejected', label: 'Rechazadas' },
    { value: 'expired', label: 'Vencidas' }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Cotizaciones</h1>
        <Button onClick={handleCreateQuote} variant="secondary">
          Nueva Cotización
        </Button>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Buscar cotizaciones..."
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
              {filteredQuotes.length} cotizacion{filteredQuotes.length !== 1 ? 'es' : ''}
            </div>
          </div>

          <Table
            data={filteredQuotes}
            columns={columns}
            loading={loading}
            emptyMessage="No hay cotizaciones registradas"
          />
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingQuote ? 'Editar Cotización' : 'Nueva Cotización'}
        maxWidth="2xl"
      >
        <QuoteForm
          quote={editingQuote}
          onSave={handleSaveQuote}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  )
}