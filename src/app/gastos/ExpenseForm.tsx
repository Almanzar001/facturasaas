'use client'

import React, { useState, useEffect } from 'react'
import { ExpenseService, Expense, CreateExpenseData, EXPENSE_CATEGORIES } from '@/services/expenses'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import Textarea from '@/components/Textarea'
import { FormGroup, FormActions } from '@/components/FormField'
import { validateRequired, validatePositiveNumber } from '@/utils/validators'

interface ExpenseFormProps {
  expense?: Expense | null
  onSave: () => void
  onCancel: () => void
}

interface FormData {
  description: string
  amount: string
  category: string
  date: string
  notes: string
}

interface FormErrors {
  description?: string
  amount?: string
  category?: string
  date?: string
  notes?: string
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ expense, onSave, onCancel }) => {
  const [formData, setFormData] = useState<FormData>({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (expense) {
      setFormData({
        description: expense.description || '',
        amount: expense.amount.toString(),
        category: expense.category || '',
        date: expense.date || new Date().toISOString().split('T')[0],
        notes: expense.notes || ''
      })
    }
  }, [expense])

  const categoryOptions = EXPENSE_CATEGORIES.map(category => ({
    value: category,
    label: category
  }))

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!validateRequired(formData.description)) {
      newErrors.description = 'La descripción es requerida'
    }

    if (!validateRequired(formData.amount)) {
      newErrors.amount = 'El monto es requerido'
    } else if (!validatePositiveNumber(formData.amount)) {
      newErrors.amount = 'El monto debe ser un número positivo'
    }

    if (!validateRequired(formData.category)) {
      newErrors.category = 'La categoría es requerida'
    }

    if (!validateRequired(formData.date)) {
      newErrors.date = 'La fecha es requerida'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      setLoading(true)
      
      const expenseData: CreateExpenseData = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: formData.date,
        notes: formData.notes || undefined
      }

      if (expense) {
        await ExpenseService.update(expense.id, expenseData)
      } else {
        await ExpenseService.create(expenseData)
      }

      onSave()
    } catch (error) {
      alert('Error al guardar el gasto')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Descripción"
        value={formData.description}
        onChange={(e) => handleInputChange('description', e.target.value)}
        error={errors.description}
        placeholder="Ej: Pago de servicios, compra de suministros..."
        required
      />

      <FormGroup columns={2}>
        <Input
          label="Monto"
          type="number"
          step="0.01"
          min="0"
          value={formData.amount}
          onChange={(e) => handleInputChange('amount', e.target.value)}
          error={errors.amount}
          placeholder="0.00"
          required
        />
        
        <Select
          label="Categoría"
          value={formData.category}
          onChange={(e) => handleInputChange('category', e.target.value)}
          options={categoryOptions}
          placeholder="Seleccionar categoría..."
          error={errors.category}
          required
        />
      </FormGroup>

      <Input
        label="Fecha"
        type="date"
        value={formData.date}
        onChange={(e) => handleInputChange('date', e.target.value)}
        error={errors.date}
        required
      />

      <Textarea
        label="Notas"
        value={formData.notes}
        onChange={(e) => handleInputChange('notes', e.target.value)}
        rows={3}
        placeholder="Notas adicionales sobre el gasto..."
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
          type="submit"
          loading={loading}
        >
          {expense ? 'Actualizar' : 'Crear'} Gasto
        </Button>
      </FormActions>
    </form>
  )
}

export default ExpenseForm