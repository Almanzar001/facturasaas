'use client'

import React, { useState, useEffect } from 'react'
import { PaymentAccount, PaymentAccountService, CreatePaymentAccountData } from '@/services/paymentAccounts'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card'
import Button from '@/components/Button'
import Table from '@/components/Table'
import Modal from '@/components/Modal'
import Input from '@/components/Input'
import Select from '@/components/Select'
import Textarea from '@/components/Textarea'
import StatusBadge from '@/components/StatusBadge'
import { FormGroup, FormActions } from '@/components/FormField'
import { formatCurrency } from '@/utils/formatCurrency'
import { withAuth } from '@/contexts/AuthContext'

function PaymentAccountsPage() {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null)
  const [formData, setFormData] = useState<CreatePaymentAccountData>({
    name: '',
    type: 'caja_chica',
    bank_name: '',
    account_number: '',
    account_holder: '',
    initial_balance: 0,
    is_default: false,
    notes: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const data = await PaymentAccountService.getAll(true)
      setAccounts(data)
    } catch (error) {
      console.error('Error loading accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido'
    }

    if (formData.type === 'banco' && !formData.bank_name) {
      newErrors.bank_name = 'El nombre del banco es requerido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      setSaving(true)
      
      if (editingAccount) {
        await PaymentAccountService.update(editingAccount.id, formData)
      } else {
        await PaymentAccountService.create(formData)
      }

      await loadAccounts()
      handleCloseModal()
    } catch (error) {
      console.error('Error saving account:', error)
      alert('Error al guardar la cuenta')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (account: PaymentAccount) => {
    setEditingAccount(account)
    setFormData({
      name: account.name,
      type: account.type,
      bank_name: account.bank_name || '',
      account_number: account.account_number || '',
      account_holder: account.account_holder || '',
      initial_balance: account.initial_balance,
      is_default: account.is_default,
      notes: account.notes || ''
    })
    setShowModal(true)
  }

  const handleToggleActive = async (account: PaymentAccount) => {
    try {
      await PaymentAccountService.update(account.id, {
        is_active: !account.is_active
      })
      await loadAccounts()
    } catch (error) {
      console.error('Error toggling account status:', error)
      alert('Error al cambiar el estado de la cuenta')
    }
  }

  const handleSetDefault = async (account: PaymentAccount) => {
    try {
      await PaymentAccountService.setDefault(account.id)
      await loadAccounts()
    } catch (error) {
      console.error('Error setting default account:', error)
      alert('Error al establecer cuenta por defecto')
    }
  }

  const handleDelete = async (account: PaymentAccount) => {
    if (!confirm(`¿Estás seguro de eliminar la cuenta "${account.name}"?`)) return

    try {
      await PaymentAccountService.delete(account.id)
      await loadAccounts()
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Error al eliminar la cuenta. Puede tener transacciones asociadas.')
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingAccount(null)
    setFormData({
      name: '',
      type: 'caja_chica',
      bank_name: '',
      account_number: '',
      account_holder: '',
      initial_balance: 0,
      is_default: false,
      notes: ''
    })
    setErrors({})
  }

  const columns = [
    {
      key: 'name',
      title: 'Cuenta',
      render: (value: string, row: PaymentAccount) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-gray-500">
            {PaymentAccountService.getAccountTypeLabel(row.type)}
            {row.bank_name && ` - ${row.bank_name}`}
          </div>
          {row.account_number && (
            <div className="text-xs text-gray-400">
              Cuenta: {row.account_number}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'current_balance',
      title: 'Saldo Actual',
      render: (value: number) => (
        <div className={`font-medium ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatCurrency(value)}
        </div>
      ),
      align: 'right' as const
    },
    {
      key: 'is_active',
      title: 'Estado',
      render: (value: boolean, row: PaymentAccount) => (
        <div className="flex items-center gap-2">
          <StatusBadge 
            status={value ? 'active' : 'inactive'} 
            variant="general"
          />
          {row.is_default && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              Por defecto
            </span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      title: 'Acciones',
      render: (value: any, row: PaymentAccount) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEdit(row)}
          >
            Editar
          </Button>
          
          {!row.is_default && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSetDefault(row)}
            >
              Por defecto
            </Button>
          )}
          
          <Button
            size="sm"
            variant={row.is_active ? 'danger' : 'secondary'}
            onClick={() => handleToggleActive(row)}
          >
            {row.is_active ? 'Desactivar' : 'Activar'}
          </Button>
          
          {!row.is_default && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleDelete(row)}
            >
              Eliminar
            </Button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Cuentas y Métodos de Pago</h1>
        <Button onClick={() => setShowModal(true)}>
          Nueva Cuenta
        </Button>
      </div>

      <Card>
        <div className="space-y-4">
          <Table
            data={accounts}
            columns={columns}
            loading={loading}
            emptyMessage="No hay cuentas registradas"
          />
        </div>
      </Card>

      {/* Resumen de cuentas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total en Cajas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(
                accounts
                  .filter(a => a.type === 'caja_chica' && a.is_active)
                  .reduce((sum, a) => sum + a.current_balance, 0)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total en Bancos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(
                accounts
                  .filter(a => a.type === 'banco' && a.is_active)
                  .reduce((sum, a) => sum + a.current_balance, 0)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Balance Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(
                accounts
                  .filter(a => a.is_active)
                  .reduce((sum, a) => sum + a.current_balance, 0)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de creación/edición */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
          <FormGroup columns={2}>
            <Input
              label="Nombre de la Cuenta"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              placeholder="Ej: Caja Principal"
              required
            />
            
            <Select
              label="Tipo de Cuenta"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              options={[
                { value: 'caja_chica', label: 'Caja Chica' },
                { value: 'banco', label: 'Cuenta Bancaria' },
                { value: 'tarjeta', label: 'Tarjeta' },
                { value: 'digital', label: 'Billetera Digital' }
              ]}
              required
            />
          </FormGroup>

          {formData.type === 'banco' && (
            <FormGroup columns={2}>
              <Input
                label="Banco"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                error={errors.bank_name}
                placeholder="Ej: Banco Popular"
              />
              
              <Input
                label="Número de Cuenta"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="Ej: 123-456789-0"
              />
            </FormGroup>
          )}

          {['banco', 'tarjeta'].includes(formData.type) && (
            <Input
              label="Titular de la Cuenta"
              value={formData.account_holder}
              onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
              placeholder="Nombre del titular"
            />
          )}

          <FormGroup columns={2}>
            <Input
              label="Saldo Inicial"
              type="number"
              step="0.01"
              value={formData.initial_balance}
              onChange={(e) => setFormData({ ...formData, initial_balance: parseFloat(e.target.value) || 0 })}
              disabled={!!editingAccount}
            />
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="is_default" className="text-sm">
                Establecer como cuenta por defecto
              </label>
            </div>
          </FormGroup>

          <Textarea
            label="Notas"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder="Información adicional sobre la cuenta..."
          />

          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={saving}
              disabled={saving}
            >
              {editingAccount ? 'Guardar Cambios' : 'Crear Cuenta'}
            </Button>
          </FormActions>
        </form>
      </Modal>
    </div>
  )
}

export default withAuth(PaymentAccountsPage, { resource: 'settings', action: 'update' })