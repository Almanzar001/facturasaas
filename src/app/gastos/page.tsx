'use client'

import React, { useState, useEffect } from 'react'
import { ExpenseService, Expense, EXPENSE_CATEGORIES } from '@/services/expenses'
import Button from '@/components/Button'
import Table from '@/components/Table'
import Modal from '@/components/Modal'
import SearchInput from '@/components/SearchInput'
import Card from '@/components/Card'
import ExpenseForm from './ExpenseForm'
import { formatCurrency } from '@/utils/formatCurrency'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [monthFilter, setMonthFilter] = useState<string>('')

  useEffect(() => {
    loadExpenses()
  }, [])

  useEffect(() => {
    filterExpenses()
  }, [searchQuery, categoryFilter, monthFilter, expenses])

  const loadExpenses = async () => {
    try {
      setLoading(true)
      const data = await ExpenseService.getAll()
      setExpenses(data)
      setFilteredExpenses(data)
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const filterExpenses = () => {
    let filtered = expenses

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(expense => expense.category === categoryFilter)
    }

    if (monthFilter) {
      filtered = filtered.filter(expense => 
        expense.date.startsWith(monthFilter)
      )
    }

    if (searchQuery) {
      filtered = filtered.filter(expense => 
        expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredExpenses(filtered)
  }

  const handleCreateExpense = () => {
    setEditingExpense(null)
    setShowModal(true)
  }

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setShowModal(true)
  }

  const handleDeleteExpense = async (expense: Expense) => {
    if (window.confirm(`¿Está seguro de eliminar el gasto "${expense.description}"?`)) {
      try {
        await ExpenseService.delete(expense.id)
        await loadExpenses()
      } catch (error) {
        alert('Error al eliminar el gasto')
      }
    }
  }

  const handleSaveExpense = async () => {
    setShowModal(false)
    await loadExpenses()
  }

  const getTotalAmount = () => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  }

  const columns = [
    {
      key: 'description',
      title: 'Descripción',
      render: (value: string, row: Expense) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          {row.notes && (
            <div className="text-sm text-gray-500">{row.notes}</div>
          )}
        </div>
      )
    },
    {
      key: 'category',
      title: 'Categoría',
      render: (value: string) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {value}
        </span>
      )
    },
    {
      key: 'amount',
      title: 'Monto',
      render: (value: number) => formatCurrency(value),
      align: 'right' as const
    },
    {
      key: 'date',
      title: 'Fecha',
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      key: 'actions',
      title: 'Acciones',
      render: (value: any, row: Expense) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEditExpense(row)}
          >
            Editar
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteExpense(row)}
          >
            Eliminar
          </Button>
        </div>
      )
    }
  ]

  const categoryOptions = [
    { value: 'all', label: 'Todas las categorías' },
    ...EXPENSE_CATEGORIES.map(category => ({
      value: category,
      label: category
    }))
  ]

  const getMonthOptions = () => {
    const months = new Set(expenses.map(expense => expense.date.substring(0, 7)))
    return [
      { value: '', label: 'Todos los meses' },
      ...Array.from(months).sort().reverse().map(month => ({
        value: month,
        label: new Date(month + '-01').toLocaleDateString('es-ES', { 
          year: 'numeric', 
          month: 'long' 
        })
      }))
    ]
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Gastos</h1>
        <Button onClick={handleCreateExpense}>
          Nuevo Gasto
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(getTotalAmount())}
            </div>
            <div className="text-sm text-gray-500">Total Gastos</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {filteredExpenses.length}
            </div>
            <div className="text-sm text-gray-500">Registros</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {new Set(filteredExpenses.map(e => e.category)).size}
            </div>
            <div className="text-sm text-gray-500">Categorías</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {filteredExpenses.length > 0 ? formatCurrency(getTotalAmount() / filteredExpenses.length) : formatCurrency(0)}
            </div>
            <div className="text-sm text-gray-500">Promedio</div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Buscar gastos..."
                className="max-w-sm"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {getMonthOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Table
            data={filteredExpenses}
            columns={columns}
            loading={loading}
            emptyMessage="No hay gastos registrados"
          />
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
        maxWidth="lg"
      >
        <ExpenseForm
          expense={editingExpense}
          onSave={handleSaveExpense}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  )
}