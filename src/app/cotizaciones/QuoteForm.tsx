'use client'

import React, { useState, useEffect } from 'react'
import { QuoteService, Quote, CreateQuoteData } from '@/services/quotes'
import { ClientService, Client } from '@/services/clients'
import { ProductService, Product } from '@/services/products'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import Textarea from '@/components/Textarea'
import { FormGroup, FormActions } from '@/components/FormField'
import ClientSearchAutocomplete from '@/components/ClientSearchAutocomplete'
import ProductSearchAutocomplete from '@/components/ProductSearchAutocomplete'
import { validateRequired } from '@/utils/validators'
import { formatCurrency } from '@/utils/formatCurrency'
import { generateQuotePDF, downloadPDF, QuotePDFData } from '@/pdf/generateQuotePDF'

interface QuoteFormProps {
  quote?: Quote | null
  onSave: () => void
  onCancel: () => void
}

interface QuoteItem {
  product_id?: string
  product_name: string
  description?: string
  quantity: number
  price: number
  total: number
}

interface FormData {
  client_id: string
  quote_number: string
  date: string
  expiry_date: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  notes: string
  items: QuoteItem[]
}

interface FormErrors {
  client_id?: string
  quote_number?: string
  date?: string
  expiry_date?: string
  items?: string
}

const QuoteForm: React.FC<QuoteFormProps> = ({ quote, onSave, onCancel }) => {
  const [formData, setFormData] = useState<FormData>({
    client_id: '',
    quote_number: '',
    date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 días
    status: 'draft',
    notes: '',
    items: []
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    loadClients()
    loadProducts()
    if (!quote) {
      generateQuoteNumber()
    }
  }, [])

  useEffect(() => {
    if (quote) {
      setFormData({
        client_id: quote.client_id,
        quote_number: quote.quote_number,
        date: quote.date,
        expiry_date: quote.expiry_date || '',
        status: quote.status,
        notes: quote.notes || '',
        items: quote.items?.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        })) || []
      })
    }
  }, [quote])

  const loadClients = async () => {
    try {
      const data = await ClientService.getAll()
      setClients(data)
    } catch (error) {
      console.error('Error loading clients:', error)
    }
  }

  const loadProducts = async () => {
    try {
      const data = await ProductService.getAll()
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  const generateQuoteNumber = async () => {
    try {
      const number = await QuoteService.generateQuoteNumber()
      setFormData(prev => ({ ...prev, quote_number: number }))
    } catch (error) {
      console.error('Error generating quote number:', error)
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

    const newItem: QuoteItem = {
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

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
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
    const tax = subtotal * 0.19
    const total = subtotal + tax
    return { subtotal, tax, total }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!validateRequired(formData.client_id)) {
      newErrors.client_id = 'El cliente es requerido'
    }

    if (!validateRequired(formData.quote_number)) {
      newErrors.quote_number = 'El número de cotización es requerido'
    }

    if (!validateRequired(formData.date)) {
      newErrors.date = 'La fecha es requerida'
    }

    if (formData.expiry_date && formData.expiry_date <= formData.date) {
      newErrors.expiry_date = 'La fecha de vencimiento debe ser posterior a la fecha de cotización'
    }

    if (formData.items.length === 0) {
      newErrors.items = 'Debe agregar al menos un producto'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      setLoading(true)
      
      const quoteData: CreateQuoteData = {
        client_id: formData.client_id,
        quote_number: formData.quote_number,
        date: formData.date,
        expiry_date: formData.expiry_date || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
        items: formData.items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          description: item.description,
          quantity: item.quantity,
          price: item.price
        }))
      }

      if (quote) {
        await QuoteService.update(quote.id, quoteData)
      } else {
        await QuoteService.create(quoteData)
      }

      onSave()
    } catch (error) {
      console.error('Error saving quote:', error)
      alert('Error al guardar la cotización')
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePDF = async () => {
    if (!formData.client_id || formData.items.length === 0) {
      alert('Debe seleccionar un cliente y agregar productos antes de generar el PDF')
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
        name: 'Su Empresa',
        address: 'Dirección de la empresa',
        phone: '+57 300 123 4567',
        email: 'contacto@suempresa.com',
        nit: '900.123.456-7'
      }

      const totals = calculateTotals()
      const quoteData: QuotePDFData = {
        quote: {
          id: 'preview',
          user_id: '',
          client_id: formData.client_id,
          quote_number: formData.quote_number,
          date: formData.date,
          expiry_date: formData.expiry_date,
          status: formData.status,
          subtotal: totals.subtotal,
          tax_amount: totals.tax,
          total: totals.total,
          notes: formData.notes,
          converted_to_invoice: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        client,
        items: formData.items.map(item => ({
          id: 'preview',
          quote_id: 'preview',
          product_id: item.product_id,
          product_name: item.product_name,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          created_at: new Date().toISOString()
        })),
        company
      }

      const pdfBytes = await generateQuotePDF(quoteData)
      const filename = `Cotizacion_${formData.quote_number || 'Preview'}.pdf`
      downloadPDF(pdfBytes, filename)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error al generar el PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  const totals = calculateTotals()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormGroup columns={2}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cliente *
          </label>
          <ClientSearchAutocomplete
            value={clients.find(c => c.id === formData.client_id) || null}
            onChange={(client) => setFormData(prev => ({ 
              ...prev, 
              client_id: client?.id || '' 
            }))}
            error={errors.client_id}
            required
          />
        </div>
        
        <Input
          label="Número de Cotización"
          value={formData.quote_number}
          onChange={(e) => setFormData(prev => ({ ...prev, quote_number: e.target.value }))}
          error={errors.quote_number}
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
          value={formData.expiry_date}
          onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
          error={errors.expiry_date}
          helperText="Fecha límite para aceptar la cotización"
        />
      </FormGroup>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Productos</h3>
          <div className="w-80">
            <ProductSearchAutocomplete
              onProductSelect={(product) => {
                const newItem: QuoteItem = {
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
              }}
              placeholder="Buscar y agregar producto..."
            />
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
                  <span>IVA (19%):</span>
                  <span>{formatCurrency(totals.tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-medium border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Textarea
        label="Notas"
        value={formData.notes}
        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        rows={3}
        placeholder="Notas adicionales sobre la cotización..."
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
          disabled={loading || !formData.client_id || formData.items.length === 0}
        >
          Vista Previa PDF
        </Button>
        <Button
          type="submit"
          loading={loading}
        >
          {quote ? 'Actualizar' : 'Crear'} Cotización
        </Button>
      </FormActions>
    </form>
  )
}

export default QuoteForm