'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { InvoiceService, Invoice } from '@/services/invoices'
import { PaymentService } from '@/services/payments'
import PaymentManager from '@/components/PaymentManager'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card'
import Button from '@/components/Button'
import StatusBadge from '@/components/StatusBadge'
import LoadingSpinner from '@/components/LoadingSpinner'
import { formatCurrency } from '@/utils/formatCurrency'
import { generateInvoicePDF, downloadPDF } from '@/pdf/generateInvoicePDF'
import { withAuth } from '@/contexts/AuthContext'
import { SettingsService } from '@/services/settings'

function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.id as string
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    if (invoiceId) {
      loadInvoice()
    }
  }, [invoiceId])

  const loadInvoice = async () => {
    try {
      setLoading(true)
      const data = await InvoiceService.getById(invoiceId)
      if (!data) {
        router.push('/facturas')
        return
      }
      setInvoice(data)
    } catch (error) {
      router.push('/facturas')
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePDF = async () => {
    if (!invoice) return

    try {
      setPdfLoading(true)
      
      // Cargar los pagos y la configuración
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
      
      // Validate client data
      if (!invoice.client) {
        alert('Error: No se encontró información del cliente para generar el PDF')
        return
      }

      const pdfData = {
        invoice,
        client: invoice.client,
        items: invoice.items || [],
        payments,
        company
      }
      
      const pdfBytes = await generateInvoicePDF(pdfData)
      const filename = `Factura_${invoice.invoice_number}.pdf`
      downloadPDF(pdfBytes, filename)
    } catch (error) {
      alert('Error al generar el PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  const handlePaymentUpdate = async () => {
    // Recargar la factura después de actualizar pagos
    await loadInvoice()
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500 py-12">
          Factura no encontrada
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Factura {invoice.invoice_number}
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <StatusBadge status={invoice.status} />
            <span className="text-gray-600">
              {new Date(invoice.date).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/facturas')}
          >
            Volver
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/facturas/editar/${invoice.id}`)}
          >
            Editar
          </Button>
          <Button
            onClick={handleGeneratePDF}
            loading={pdfLoading}
          >
            Descargar PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información del cliente */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="text-gray-600">Nombre:</span>
                <p className="font-medium">{invoice.client?.name}</p>
              </div>
              <div>
                <span className="text-gray-600">Teléfono:</span>
                <p className="font-medium">{invoice.client?.phone || 'No especificado'}</p>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <p className="font-medium">{invoice.client?.email || 'No especificado'}</p>
              </div>
              <div>
                <span className="text-gray-600">Dirección:</span>
                <p className="font-medium">{invoice.client?.address || 'No especificada'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen de la factura */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ITBIS:</span>
                <span className="font-medium">{formatCurrency(invoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
              {invoice.due_date && (
                <div className="pt-2 border-t">
                  <span className="text-gray-600">Fecha de vencimiento:</span>
                  <p className="font-medium">
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items de la factura */}
      <Card>
        <CardHeader>
          <CardTitle>Productos/Servicios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Descripción</th>
                  <th className="text-right py-2">Cantidad</th>
                  <th className="text-right py-2">Precio</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">
                      <div>{item.product_name}</div>
                      {item.description && (
                        <div className="text-sm text-gray-600">{item.description}</div>
                      )}
                    </td>
                    <td className="text-right py-2">{item.quantity}</td>
                    <td className="text-right py-2">{formatCurrency(item.price)}</td>
                    <td className="text-right py-2">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Gestor de pagos */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentManager
            invoiceId={invoice.id}
            invoiceTotal={invoice.total}
            onPaymentUpdate={handlePaymentUpdate}
          />
        </CardContent>
      </Card>

      {/* Notas */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default withAuth(InvoiceDetailPage, { resource: 'invoices', action: 'read' })