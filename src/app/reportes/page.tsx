'use client'

import React, { useState, useEffect } from 'react'
import { DashboardService } from '@/services/dashboard'
import { InvoiceService, Invoice } from '@/services/invoices'
import { ExpenseService, Expense } from '@/services/expenses'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card'
import Button from '@/components/Button'
import Select from '@/components/Select'
import { formatCurrency } from '@/utils/formatCurrency'
import { useAuth, withAuth } from '@/contexts/AuthContext'

function ReportsPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [reportType, setReportType] = useState<'monthly' | 'yearly' | 'custom'>('monthly')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const { hasPermission } = useAuth()

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const months = [
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' }
  ]

  useEffect(() => {
    loadReportData()
  }, [selectedYear, selectedMonth, reportType])

  const loadReportData = async () => {
    try {
      setLoading(true)
      
      const [dashboardData, invoiceStats, expenseStats] = await Promise.all([
        DashboardService.getDashboardData(),
        InvoiceService.getInvoiceStats(),
        ExpenseService.getExpenseStats()
      ])

      // Calcular datos específicos del período
      let periodRevenue = 0
      let periodExpenses = 0
      let periodInvoices: Invoice[] = []
      let periodExpensesList: Expense[] = []

      if (reportType === 'monthly') {
        periodInvoices = await InvoiceService.getByMonth(selectedYear, selectedMonth)
        periodExpensesList = await ExpenseService.getMonthlyExpenses(selectedYear, selectedMonth)
        periodRevenue = periodInvoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + inv.total, 0)
        periodExpenses = periodExpensesList.reduce((sum, exp) => sum + exp.amount, 0)
      } else if (reportType === 'yearly') {
        periodInvoices = await InvoiceService.getByYear(selectedYear)
        periodExpensesList = await ExpenseService.getYearlyExpenses(selectedYear)
        periodRevenue = periodInvoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + inv.total, 0)
        periodExpenses = periodExpensesList.reduce((sum, exp) => sum + exp.amount, 0)
      }

      setReportData({
        dashboard: dashboardData,
        invoiceStats,
        expenseStats,
        period: {
          revenue: periodRevenue,
          expenses: periodExpenses,
          profit: periodRevenue - periodExpenses,
          invoiceCount: periodInvoices.length,
          expenseCount: periodExpensesList.length,
          invoices: periodInvoices,
          expensesList: periodExpensesList
        }
      })
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!reportData) return

    const headers = ['Tipo', 'Fecha', 'Cliente/Categoría', 'Descripción', 'Monto']
    const rows: any[] = []

    // Agregar ingresos
    reportData.period.invoices.forEach((invoice: any) => {
      rows.push([
        'Ingreso',
        new Date(invoice.date).toLocaleDateString(),
        invoice.client?.name || 'Cliente',
        `Factura ${invoice.invoice_number}`,
        invoice.total
      ])
    })

    // Agregar gastos
    reportData.period.expensesList.forEach((expense: any) => {
      rows.push([
        'Gasto',
        new Date(expense.date).toLocaleDateString(),
        expense.category,
        expense.description,
        -expense.amount
      ])
    })

    // Crear CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map((cell: any) => `"${cell}"`).join(','))
    ].join('\n')

    // Descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `reporte_${selectedYear}_${selectedMonth}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getMonthName = (month: number) => {
    return months.find(m => m.value === month.toString())?.label || ''
  }

  if (loading || !reportData) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando reporte...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        <Button onClick={exportToCSV}>
          Exportar CSV
        </Button>
      </div>

      {/* Controles de filtro */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Tipo de Reporte"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              options={[
                { value: 'monthly', label: 'Mensual' },
                { value: 'yearly', label: 'Anual' },
                { value: 'custom', label: 'Personalizado (Próximamente)' }
              ]}
            />
            
            <Select
              label="Año"
              value={selectedYear.toString()}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              options={years.map(year => ({ value: year.toString(), label: year.toString() }))}
            />
            
            {reportType === 'monthly' && (
              <Select
                label="Mes"
                value={selectedMonth.toString()}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                options={months}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumen del período */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent>
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Ingresos del Período</h3>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(reportData.period.revenue)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {reportData.period.invoiceCount} facturas
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Gastos del Período</h3>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(reportData.period.expenses)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {reportData.period.expenseCount} gastos
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Ganancia del Período</h3>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(reportData.period.profit)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Margen: {reportData.period.revenue > 0 
                  ? ((reportData.period.profit / reportData.period.revenue) * 100).toFixed(1) 
                  : 0}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Balance General</h3>
              <p className="text-2xl font-bold text-indigo-600">
                {formatCurrency(reportData.dashboard.metrics.netProfit)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Histórico total
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de tendencias */}
      <Card>
        <CardHeader>
          <CardTitle>
            Tendencia de Ingresos vs Gastos - {reportType === 'monthly' ? getMonthName(selectedMonth) : ''} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-500">Gráfico próximamente disponible</p>
          </div>
        </CardContent>
      </Card>

      {/* Desglose por categorías */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Clientes del Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportData.dashboard.topClients.slice(0, 5).map((client: any, index: number) => (
                <div key={client.client_id || index} className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-900">{client.name}</div>
                    <div className="text-sm text-gray-500">
                      {client.invoice_count} factura{client.invoice_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {formatCurrency(client.total_revenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(reportData.expenseStats.categories)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([category, amount]) => (
                  <div key={category} className="flex justify-between items-center">
                    <div className="font-medium text-gray-900">{category}</div>
                    <div className="font-medium text-gray-900">
                      {formatCurrency(amount as number)}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de detalles */}
      <Card>
        <CardHeader>
          <CardTitle>Movimientos del Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente/Categoría
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Combinar y ordenar facturas y gastos por fecha */}
                {[
                  ...reportData.period.invoices.map((inv: any) => ({
                    date: inv.date,
                    type: 'income',
                    description: `Factura ${inv.invoice_number}`,
                    reference: inv.client?.name || 'Cliente',
                    amount: inv.total
                  })),
                  ...reportData.period.expensesList.map((exp: any) => ({
                    date: exp.date,
                    type: 'expense',
                    description: exp.description,
                    reference: exp.category,
                    amount: exp.amount
                  }))
                ]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 20)
                  .map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.type === 'income' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.type === 'income' ? 'Ingreso' : 'Gasto'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.reference}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                        item.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default withAuth(ReportsPage, { resource: 'reports', action: 'read' })