'use client'

import React, { useState, useEffect } from 'react'
import { Payment, PaymentService, UpdatePaymentData } from '@/services/payments'
import { PaymentAccount, PaymentAccountService } from '@/services/paymentAccounts'
import { formatCurrency } from '@/utils/formatCurrency'
import Button from './Button'
import Modal from './Modal'
import Input from './Input'
import Select from './Select'
import Textarea from './Textarea'
import { FormGroup, FormActions } from './FormField'
import StatusBadge from './StatusBadge'

interface PaymentManagerProps {
  invoiceId: string
  invoiceTotal: number
  onPaymentUpdate?: () => void
}

interface PaymentFormData {
  amount: number
  payment_date: string
  payment_method: 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque' | 'otro'
  payment_account_id?: string
  reference_number?: string
  notes?: string
}

const PaymentManager: React.FC<PaymentManagerProps> = ({ 
  invoiceId, 
  invoiceTotal,
  onPaymentUpdate 
}) => {
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'efectivo',
    payment_account_id: '',
    reference_number: '',
    notes: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPayments()
    loadPaymentAccounts()
  }, [invoiceId])

  const loadPayments = async () => {
    try {
      setLoading(true)
      const data = await PaymentService.getByInvoice(invoiceId)
      setPayments(data)
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const loadPaymentAccounts = async () => {
    try {
      const accounts = await PaymentAccountService.getAll()
      setPaymentAccounts(accounts)
      
      // Establecer cuenta por defecto si existe
      const defaultAccount = accounts.find(a => a.is_default)
      if (defaultAccount && !formData.payment_account_id) {
        setFormData(prev => ({ ...prev, payment_account_id: defaultAccount.id }))
      }
    } catch (error) {
    }
  }

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const balanceDue = invoiceTotal - totalPaid

  const getPaymentMethodLabel = (method: string): string => {
    const methods: Record<string, string> = {
      'efectivo': 'Efectivo',
      'transferencia': 'Transferencia',
      'tarjeta': 'Tarjeta',
      'cheque': 'Cheque',
      'otro': 'Otro'
    }
    return methods[method] || method
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0'
    }

    if (formData.amount > balanceDue && !editingPayment) {
      newErrors.amount = `El monto no puede ser mayor al saldo pendiente (${formatCurrency(balanceDue)})`
    }

    if (!formData.payment_date) {
      newErrors.payment_date = 'La fecha es requerida'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment)
    setFormData({
      amount: payment.amount,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      payment_account_id: payment.payment_account_id || '',
      reference_number: payment.reference_number || '',
      notes: payment.notes || ''
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!validateForm() || !editingPayment) return

    try {
      setSaving(true)
      
      // Actualizar pago con timeout
      const updatePromise = PaymentService.update(editingPayment.id, formData)
      
      // Timeout de 10 segundos
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: La operación tardó demasiado')), 10000)
      )
      
      await Promise.race([updatePromise, timeoutPromise])
      
      await loadPayments()
      setShowEditModal(false)
      resetForm()
      if (onPaymentUpdate) onPaymentUpdate()
    } catch (error) {
      alert(`Error al actualizar el pago: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleAddPayment = async () => {
    if (!validateForm()) return

    try {
      setSaving(true)
      
      // Crear pago con timeout
      const paymentPromise = PaymentService.create({
        invoice_id: invoiceId,
        ...formData
      })
      
      // Timeout de 10 segundos
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: La operación tardó demasiado')), 10000)
      )
      
      await Promise.race([paymentPromise, timeoutPromise])
      
      await loadPayments()
      setShowAddModal(false)
      resetForm()
      if (onPaymentUpdate) onPaymentUpdate()
    } catch (error) {
      alert(`Error al agregar el pago: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (paymentId: string) => {
    if (!confirm('¿Estás seguro de eliminar este pago?')) return

    try {
      await PaymentService.delete(paymentId)
      await loadPayments()
      if (onPaymentUpdate) onPaymentUpdate()
    } catch (error) {
      alert('Error al eliminar el pago')
    }
  }

  const resetForm = () => {
    const defaultAccount = paymentAccounts.find(a => a.is_default)
    setFormData({
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'efectivo',
      payment_account_id: defaultAccount?.id || '',
      reference_number: '',
      notes: ''
    })
    setErrors({})
    setEditingPayment(null)
  }


  if (loading) {
    return <div className="text-center py-4">Cargando pagos...</div>
  }

  return (
    <div className="space-y-4">
      {/* Resumen de pagos */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Factura:</span>
            <div className="font-semibold">{formatCurrency(invoiceTotal)}</div>
          </div>
          <div>
            <span className="text-gray-600">Total Pagado:</span>
            <div className="font-semibold text-green-600">{formatCurrency(totalPaid)}</div>
          </div>
          <div>
            <span className="text-gray-600">Saldo Pendiente:</span>
            <div className={`font-semibold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(balanceDue)}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de pagos */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="font-medium">Historial de Pagos</h3>
          {balanceDue > 0 && (
            <Button
              size="sm"
              onClick={() => {
                setFormData({ ...formData, amount: balanceDue })
                setShowAddModal(true)
              }}
            >
              Agregar Pago
            </Button>
          )}
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay pagos registrados
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">
                        {formatCurrency(payment.amount)}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                        {getPaymentMethodLabel(payment.payment_method)}
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </span>
                    </div>
                    {payment.payment_account && (
                      <div className="text-sm text-gray-600 mt-1">
                        Cuenta: {payment.payment_account.name}
                      </div>
                    )}
                    {payment.reference_number && (
                      <div className="text-sm text-gray-600 mt-1">
                        Ref: {payment.reference_number}
                      </div>
                    )}
                    {payment.notes && (
                      <div className="text-sm text-gray-600 mt-1">
                        {payment.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(payment)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(payment.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de edición */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          resetForm()
        }}
        title="Editar Pago"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-4">
          <FormGroup columns={2}>
            <Input
              label="Monto"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              error={errors.amount}
              required
            />
            <Input
              label="Fecha de Pago"
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              error={errors.payment_date}
              required
            />
          </FormGroup>

          <FormGroup columns={2}>
            <Select
              label="Método de Pago"
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
              options={[
                { value: 'efectivo', label: 'Efectivo' },
                { value: 'transferencia', label: 'Transferencia' },
                { value: 'tarjeta', label: 'Tarjeta' },
                { value: 'cheque', label: 'Cheque' },
                { value: 'otro', label: 'Otro' }
              ]}
              required
            />
            <Select
              label="Cuenta"
              value={formData.payment_account_id}
              onChange={(e) => setFormData({ ...formData, payment_account_id: e.target.value })}
              options={[
                { value: '', label: 'Seleccionar cuenta...' },
                ...paymentAccounts.filter(a => a.is_active).map(account => ({
                  value: account.id,
                  label: `${account.name} (${PaymentAccountService.getAccountTypeLabel(account.type)})`
                }))
              ]}
              required
            />
          </FormGroup>

          <Input
            label="Número de Referencia"
            value={formData.reference_number}
            onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
            placeholder="Ej: # de transferencia"
          />

          <Textarea
            label="Notas"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder="Notas adicionales sobre el pago..."
          />

          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowEditModal(false)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={saving}
              disabled={saving}
            >
              Guardar Cambios
            </Button>
          </FormActions>
        </form>
      </Modal>

      {/* Modal de nuevo pago */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          resetForm()
        }}
        title="Agregar Pago"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleAddPayment(); }} className="space-y-4">
          <FormGroup columns={2}>
            <Input
              label="Monto"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              error={errors.amount}
              required
            />
            <Input
              label="Fecha de Pago"
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              error={errors.payment_date}
              required
            />
          </FormGroup>

          <FormGroup columns={2}>
            <Select
              label="Método de Pago"
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
              options={[
                { value: 'efectivo', label: 'Efectivo' },
                { value: 'transferencia', label: 'Transferencia' },
                { value: 'tarjeta', label: 'Tarjeta' },
                { value: 'cheque', label: 'Cheque' },
                { value: 'otro', label: 'Otro' }
              ]}
              required
            />
            <Select
              label="Cuenta"
              value={formData.payment_account_id}
              onChange={(e) => setFormData({ ...formData, payment_account_id: e.target.value })}
              options={[
                { value: '', label: 'Seleccionar cuenta...' },
                ...paymentAccounts.filter(a => a.is_active).map(account => ({
                  value: account.id,
                  label: `${account.name} (${PaymentAccountService.getAccountTypeLabel(account.type)})`
                }))
              ]}
              required
            />
          </FormGroup>

          <Input
            label="Número de Referencia"
            value={formData.reference_number}
            onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
            placeholder="Ej: # de transferencia"
          />

          <Textarea
            label="Notas"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder="Notas adicionales sobre el pago..."
          />

          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddModal(false)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={saving}
              disabled={saving}
            >
              Agregar Pago
            </Button>
          </FormActions>
        </form>
      </Modal>
    </div>
  )
}

export default PaymentManager