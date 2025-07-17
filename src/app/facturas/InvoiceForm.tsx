'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { InvoiceService, Invoice, CreateInvoiceData } from '@/services/invoices'
import { ClientService, Client } from '@/services/clients'
import { ProductService, Product } from '@/services/products'
import { PaymentService, Payment } from '@/services/payments'
import { PaymentAccountService, PaymentAccount } from '@/services/paymentAccounts'
import { SettingsService, UserSettings } from '@/services/settings'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import Textarea from '@/components/Textarea'
import { FormGroup, FormActions } from '@/components/FormField'
import FiscalDocumentSelectorAutoCreate from '@/components/FiscalDocumentSelectorAutoCreate'
import { validateRequired } from '@/utils/validators'
import { formatCurrency } from '@/utils/formatCurrency'
import { generateInvoicePDF, downloadPDF, InvoicePDFData } from '@/pdf/generateInvoicePDF'
import { useRequireDocumentTypeSequences } from '@/hooks/useDocumentTypeValidation'

interface InvoiceFormProps {
  invoice?: Invoice | null
  preselectedClientId?: string | null
  onSave: () => void
  onCancel: () => void
}

interface InvoiceItem {
  product_id?: string
  product_name: string
  description?: string
  quantity: number
  price: number
  total: number
}

interface FormData {
  client_id: string
  invoice_number: string
  date: string
  due_date: string
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  notes: string
  items: InvoiceItem[]
  fiscal_document_type_id?: string
  client_tax_id?: string
  apply_tax: boolean
}

interface InitialPaymentData {
  amount: number
  payment_date: string
  payment_method: 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque' | 'otro'
  payment_account_id: string
  notes: string
}

interface FormErrors {
  client_id?: string
  invoice_number?: string
  date?: string
  items?: string
  documentType?: string
  clientTaxId?: string
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ invoice, preselectedClientId, onSave, onCancel }) => {
  const [formData, setFormData] = useState<FormData>({
    client_id: preselectedClientId || '',
    invoice_number: '',
    date: new Date().toISOString().split('T')[0],
    due_date: '',
    status: 'draft',
    notes: '',
    items: [],
    fiscal_document_type_id: '',
    client_tax_id: '',
    apply_tax: true
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([])
  const [initialPayment, setInitialPayment] = useState<InitialPaymentData>({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'efectivo',
    payment_account_id: '',
    notes: ''
  })
  const [newPayment, setNewPayment] = useState<InitialPaymentData>({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'efectivo',
    payment_account_id: '',
    notes: ''
  })
  const [showInitialPayment, setShowInitialPayment] = useState(false)
  const [showNewPayment, setShowNewPayment] = useState(false)

  // Validación específica para tipo de comprobante
  const { validateBeforeSubmit, isValid: sequenceValid } = useRequireDocumentTypeSequences(formData.fiscal_document_type_id || null)

  useEffect(() => {
    loadClients()
    loadProducts()
    loadSettings()
    loadPaymentAccounts()
    if (!invoice) {
      generateInvoiceNumber()
    }
  }, [])

  useEffect(() => {
    if (invoice) {
      setFormData({
        client_id: invoice.client_id,
        invoice_number: invoice.invoice_number,
        date: invoice.date,
        due_date: invoice.due_date || '',
        status: invoice.status,
        notes: invoice.notes || '',
        items: invoice.items?.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        })) || [],
        fiscal_document_type_id: invoice.fiscal_document_type_id || '',
        client_tax_id: invoice.client_tax_id || '',
        apply_tax: (invoice.tax_amount || 0) > 0
      })
      loadPayments(invoice.id)
    }
  }, [invoice])

  const loadClients = async () => {
    try {
      const data = await ClientService.getAll()
      setClients(data)
    } catch (error) {
      // Handle error silently for now
    }
  }

  const loadProducts = async () => {
    try {
      const data = await ProductService.getAll()
      setProducts(data)
    } catch (error) {
      // Handle error silently for now
    }
  }

  const loadPayments = async (invoiceId: string) => {
    try {
      const data = await PaymentService.getByInvoice(invoiceId)
      setPayments(data)
    } catch (error) {
      // Handle error silently for now
    }
  }

  const loadSettings = async () => {
    try {
      const data = await SettingsService.getSettings()
      setSettings(data)
    } catch (error) {
      // Handle error silently for now
    }
  }

  const loadPaymentAccounts = async () => {
    try {
      const accounts = await PaymentAccountService.getAll()
      setPaymentAccounts(accounts)
      
      // Establecer cuenta por defecto si existe
      const defaultAccount = accounts.find(a => a.is_default)
      if (defaultAccount) {
        setInitialPayment(prev => ({ ...prev, payment_account_id: defaultAccount.id }))
      }
    } catch (error) {
      // Handle error silently for now
    }
  }

  const generateInvoiceNumber = async () => {
    try {
      const number = await InvoiceService.generateInvoiceNumber()
      setFormData(prev => ({ ...prev, invoice_number: number }))
    } catch (error) {
      // Handle error silently for now
    }
  }

  const clientOptions = clients.map(client => ({
    value: client.id,
    label: client.name
  }))

  const productOptions = products.map(product => ({
    value: product.id,
    label: `${product.name} - ${formatCurrency(product.price)}`
  }))

  const addProduct = () => {
    if (!selectedProduct) return

    const product = products.find(p => p.id === selectedProduct)
    if (!product) return

    const newItem: InvoiceItem = {
      product_id: product.id,
      product_name: product.name,
      description: product.description,
      quantity: 1,
      price: product.price,
      total: product.price
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))

    setSelectedProduct('')
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    if (field === 'quantity' || field === 'price') {
      newItems[index].total = newItems[index].quantity * newItems[index].price
    }
    
    setFormData(prev => ({ ...prev, items: newItems }))
  }

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0)
    const taxRate = settings?.tax_rate || 18 // ITBIS por defecto 18%
    const tax = formData.apply_tax ? SettingsService.calculateTax(subtotal, taxRate) : 0
    const total = subtotal + tax
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const balance_due = total - totalPaid
    return { subtotal, tax, total, totalPaid, balance_due }
  }

  const handleAddPayment = async () => {
    if (!invoice || newPayment.amount <= 0) return
    
    try {
      setLoading(true)
      const payment = await PaymentService.create({
        invoice_id: invoice.id,
        amount: newPayment.amount,
        payment_method: newPayment.payment_method,
        notes: newPayment.notes || undefined
      })
      
      setPayments(prev => [payment, ...prev])
      setNewPayment({ amount: 0, payment_date: new Date().toISOString().split('T')[0], payment_method: 'efectivo', payment_account_id: '', notes: '' })
      setShowNewPayment(false)
      
      // Update invoice status if fully paid
      const totals = calculateTotals()
      if (totals.balance_due - newPayment.amount <= 0) {
        await InvoiceService.updateStatus(invoice.id, 'paid')
        setFormData(prev => ({ ...prev, status: 'paid' }))
      }
    } catch (error) {
      alert('Error al agregar el pago')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!validateRequired(formData.client_id)) {
      newErrors.client_id = 'El cliente es requerido'
    }

    if (!validateRequired(formData.invoice_number)) {
      newErrors.invoice_number = 'El número de factura es requerido'
    }

    if (!validateRequired(formData.date)) {
      newErrors.date = 'La fecha es requerida'
    }

    if (formData.items.length === 0) {
      newErrors.items = 'Debe agregar al menos un producto'
    }

    // Validar cuenta de pago si hay un pago inicial
    if (showInitialPayment && initialPayment.amount > 0 && !initialPayment.payment_account_id) {
      alert('Por favor selecciona una cuenta de destino para el pago inicial')
      return false
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    // Validar secuencias fiscales para el tipo de comprobante seleccionado
    if (!validateBeforeSubmit()) return

    try {
      setLoading(true)
      
      // Determine status based on initial payment
      let invoiceStatus = formData.status
      if (!invoice && showInitialPayment && initialPayment.amount > 0) {
        invoiceStatus = 'sent'
      }
      
      const invoiceData: CreateInvoiceData = {
        client_id: formData.client_id,
        invoice_number: formData.invoice_number,
        fiscal_document_type_id: formData.fiscal_document_type_id || undefined,
        client_tax_id: formData.client_tax_id || undefined,
        date: formData.date,
        due_date: formData.due_date || undefined,
        status: invoiceStatus,
        notes: formData.notes || undefined,
        apply_tax: formData.apply_tax,
        tax_rate: settings?.tax_rate || 18,
        items: formData.items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          description: item.description,
          quantity: item.quantity,
          price: item.price
        }))
      }

      let savedInvoice: Invoice
      if (invoice) {
        savedInvoice = await InvoiceService.update(invoice.id, invoiceData)
      } else {
        savedInvoice = await InvoiceService.create(invoiceData)
        
        // Create initial payment if specified
        if (showInitialPayment && initialPayment.amount > 0) {
          await PaymentService.create({
            invoice_id: savedInvoice.id,
            amount: initialPayment.amount,
            payment_method: initialPayment.payment_method,
            payment_account_id: initialPayment.payment_account_id || undefined,
            notes: initialPayment.notes || undefined
          })
          
          // Check if invoice should be marked as paid
          const totals = calculateTotals()
          if (initialPayment.amount >= totals.total) {
            await InvoiceService.updateStatus(savedInvoice.id, 'paid')
          }
        }
      }

      onSave()
    } catch (error: any) {
      
      // Mensaje de error específico para secuencias fiscales
      if (error.message?.includes('No se pudo generar el número fiscal') || error.message?.includes('No hay secuencia activa')) {
        alert(error.message)
      } else {
        alert('Error al guardar la factura: ' + (error.message || 'Error desconocido'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePDF = async () => {
    // Validaciones más amigables
    if (!formData.client_id) {
      alert('⚠️ Debe seleccionar un cliente antes de generar el PDF')
      return
    }
    
    if (formData.items.length === 0) {
      alert('⚠️ Debe agregar al menos un producto antes de generar el PDF')
      return
    }

    try {
      setPdfLoading(true)
      
      const client = clients.find(c => c.id === formData.client_id)
      if (!client) {
        alert('Cliente no encontrado')
        return
      }

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
        invoice: {
          id: 'preview',
          user_id: '',
          client_id: formData.client_id,
          invoice_number: formData.invoice_number,
          date: formData.date,
          due_date: formData.due_date,
          status: formData.status,
          subtotal: totals.subtotal,
          tax_amount: totals.tax,
          total: totals.total,
          notes: formData.notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any,
        client,
        items: formData.items.map(item => ({
          id: 'preview',
          invoice_id: 'preview',
          product_id: item.product_id,
          product_name: item.product_name,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          created_at: new Date().toISOString()
        })),
        payments: payments || [],
        company
      }

      const pdfBytes = await generateInvoicePDF(invoiceData)
      const filename = `Factura_${formData.invoice_number || 'Preview'}.pdf`
      downloadPDF(pdfBytes, filename)
    } catch (error) {
      alert('Error al generar el PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  const totals = useMemo(() => calculateTotals(), [formData.items, formData.apply_tax])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormGroup columns={2}>
        <Select
          label="Cliente"
          value={formData.client_id}
          onChange={(e) => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
          options={clientOptions}
          placeholder="Seleccionar cliente..."
          error={errors.client_id}
          required
        />
        
        <Input
          label="Número de Factura"
          value={formData.invoice_number}
          onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
          error={errors.invoice_number}
          required
        />
      </FormGroup>

      <FormGroup columns={2}>
        <Input
          label="Fecha"
          type="date"
          value={formData.date}
          onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
          error={errors.date}
          required
        />
        
        <Input
          label="Fecha de Vencimiento"
          type="date"
          value={formData.due_date}
          onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
        />
      </FormGroup>

      {/* Selector de documento fiscal */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <h3 className="text-lg font-medium mb-4">Información Fiscal</h3>
        <FiscalDocumentSelectorAutoCreate
          value={{
            documentTypeId: formData.fiscal_document_type_id,
            clientTaxId: formData.client_tax_id
          }}
          onChange={(data) => setFormData(prev => ({
            ...prev,
            fiscal_document_type_id: data.documentTypeId,
            client_tax_id: data.clientTaxId
          }))}
          clientData={clients.find(c => c.id === formData.client_id)}
          errors={errors}
        />
      </div>

      {/* Checkbox para aplicar ITBIS */}
      <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
        <input
          type="checkbox"
          id="apply_tax"
          checked={formData.apply_tax}
          onChange={(e) => setFormData(prev => ({ ...prev, apply_tax: e.target.checked }))}
          className="h-4 w-4 text-blue-600 rounded"
        />
        <label htmlFor="apply_tax" className="text-sm font-medium text-gray-700">
          Aplicar ITBIS ({settings?.tax_rate || 18}%)
        </label>
        {formData.apply_tax && (
          <span className="text-sm text-gray-600 ml-auto">
            ITBIS: {formatCurrency(totals.tax)}
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Productos</h3>
          <div className="flex space-x-2">
            <Select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              options={productOptions}
              placeholder="Seleccionar producto..."
              className="w-64"
            />
            <Button
              type="button"
              onClick={addProduct}
              disabled={!selectedProduct}
              size="sm"
            >
              Agregar
            </Button>
          </div>
        </div>

        {errors.items && (
          <p className="text-sm text-red-600">{errors.items}</p>
        )}

        {formData.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Producto
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Cantidad
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Precio
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2">
                      <div className="text-sm font-medium text-gray-900">
                        {item.product_name}
                      </div>
                      {item.description && (
                        <div className="text-sm text-gray-500">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price}
                        onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {formatCurrency(item.total)}
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        Eliminar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {formData.items.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>ITBIS ({settings?.tax_rate || 18}%):</span>
                  <span>{formatCurrency(totals.tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-medium border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Pagado:</span>
                  <span>{formatCurrency(totals.totalPaid)}</span>
                </div>
                <div className="flex justify-between text-lg font-medium border-t pt-2">
                  <span>Saldo Pendiente:</span>
                  <span>{formatCurrency(totals.balance_due)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Initial Payment Section - Only for new invoices */}
      {!invoice && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Pago Inicial</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowInitialPayment(!showInitialPayment)}
            >
              {showInitialPayment ? 'Ocultar' : 'Agregar Pago Inicial'}
            </Button>
          </div>
          
          {showInitialPayment && (
            <div className="border rounded-lg p-4 space-y-4 bg-blue-50">
              <div className="text-sm text-blue-700 mb-3">
                💡 El pago inicial se aplicará automáticamente al crear la factura
              </div>
              <FormGroup columns={3}>
                <Input
                  label="Fecha del Pago"
                  type="date"
                  value={initialPayment.payment_date}
                  onChange={(e) => setInitialPayment(prev => ({ ...prev, payment_date: e.target.value }))}
                  required
                />
                <Input
                  label="Monto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={initialPayment.amount}
                  onChange={(e) => setInitialPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
                <Select
                  label="Método de Pago"
                  value={initialPayment.payment_method}
                  onChange={(e) => setInitialPayment(prev => ({ ...prev, payment_method: e.target.value as any }))}
                  options={[
                    { value: 'efectivo', label: 'Efectivo' },
                    { value: 'transferencia', label: 'Transferencia' },
                    { value: 'tarjeta', label: 'Tarjeta' },
                    { value: 'cheque', label: 'Cheque' },
                    { value: 'otro', label: 'Otro' }
                  ]}
                />
              </FormGroup>
              <FormGroup columns={2}>
                <Select
                  label="Cuenta de Destino"
                  value={initialPayment.payment_account_id}
                  onChange={(e) => setInitialPayment(prev => ({ ...prev, payment_account_id: e.target.value }))}
                  options={[
                    { value: '', label: 'Seleccionar cuenta...' },
                    ...paymentAccounts.filter(a => a.is_active).map(account => ({
                      value: account.id,
                      label: `${account.name} (${PaymentAccountService.getAccountTypeLabel(account.type)})`
                    }))
                  ]}
                  required
                />
                <Input
                  label="Notas del Pago"
                  value={initialPayment.notes}
                  onChange={(e) => setInitialPayment(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notas opcionales..."
                />
              </FormGroup>
              {initialPayment.amount > 0 && (
                <div className="mt-3 p-3 bg-green-100 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✓ Se registrará un pago de {formatCurrency(initialPayment.amount)} al crear la factura
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Payment History Section - Only for existing invoices */}
      {invoice && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Historial de Pagos</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewPayment(!showNewPayment)}
            >
              {showNewPayment ? 'Cancelar' : 'Agregar Pago'}
            </Button>
          </div>
          
          {showNewPayment && (
            <div className="border rounded-lg p-4 space-y-4">
              <FormGroup columns={3}>
                <Input
                  label="Fecha del Pago"
                  type="date"
                  value={newPayment.payment_date}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, payment_date: e.target.value }))}
                  required
                />
                <Input
                  label="Monto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
                <Select
                  label="Método de Pago"
                  value={newPayment.payment_method}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, payment_method: e.target.value as any }))}
                  options={[
                    { value: 'efectivo', label: 'Efectivo' },
                    { value: 'transferencia', label: 'Transferencia' },
                    { value: 'tarjeta', label: 'Tarjeta' },
                    { value: 'cheque', label: 'Cheque' },
                    { value: 'otro', label: 'Otro' }
                  ]}
                />
              </FormGroup>
              <Input
                label="Notas del Pago"
                value={newPayment.notes}
                onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas opcionales..."
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowNewPayment(false)
                    setNewPayment({ amount: 0, payment_date: new Date().toISOString().split('T')[0], payment_method: 'efectivo', payment_account_id: '', notes: '' })
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddPayment}
                  disabled={newPayment.amount <= 0 || loading}
                >
                  Agregar Pago
                </Button>
              </div>
            </div>
          )}
          
          {payments.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Monto
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Método
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Notas
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 capitalize">
                        {payment.payment_method}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500">
                        {payment.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {payments.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No hay pagos registrados para esta factura
            </div>
          )}
        </div>
      )}

      <Textarea
        label="Notas"
        value={formData.notes}
        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        rows={3}
        placeholder="Notas adicionales..."
      />

      <FormActions>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleGeneratePDF}
          loading={pdfLoading}
          disabled={loading}
        >
          Vista Previa PDF
        </Button>
        <Button
          type="submit"
          loading={loading}
          disabled={loading || (!sequenceValid && !!formData.fiscal_document_type_id)}
          title={!sequenceValid && formData.fiscal_document_type_id ? 'Configura las secuencias fiscales para este tipo de comprobante' : undefined}
        >
          {invoice ? 'Actualizar' : 'Crear'} Factura
        </Button>
      </FormActions>
    </form>
  )
}

export default InvoiceForm