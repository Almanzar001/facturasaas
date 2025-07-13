import { supabase } from './supabaseClient'
import { InvoiceService } from './invoices'
import { ExpenseService } from './expenses'
import { ClientService } from './clients'
import { ProductService } from './products'
import { QuoteService } from './quotes'

export interface DashboardMetrics {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  pendingInvoices: number
  totalClients: number
  totalProducts: number
  totalQuotes: number
  revenueGrowth: number
  expenseGrowth: number
  profitMargin: number
}

export interface RevenueByMonth {
  month: string
  revenue: number
  expenses: number
  profit: number
}

export interface TopClient {
  id: string
  name: string
  totalRevenue: number
  invoiceCount: number
}

export interface TopProduct {
  id: string
  name: string
  totalRevenue: number
  timesSold: number
}

export interface DashboardData {
  metrics: DashboardMetrics
  revenueByMonth: RevenueByMonth[]
  topClients: TopClient[]
  topProducts: TopProduct[]
  recentActivity: Array<{
    id: string
    type: 'invoice' | 'quote' | 'expense' | 'client'
    title: string
    subtitle: string
    amount?: number
    date: string
  }>
}

export class DashboardService {
  static async getDashboardData(): Promise<DashboardData> {
    const [
      metrics,
      revenueByMonth,
      topClients,
      topProducts,
      recentActivity
    ] = await Promise.all([
      this.getMetrics(),
      this.getRevenueByMonth(),
      this.getTopClients(),
      this.getTopProducts(),
      this.getRecentActivity()
    ])

    return {
      metrics,
      revenueByMonth,
      topClients,
      topProducts,
      recentActivity
    }
  }

  static async getMetrics(): Promise<DashboardMetrics> {
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear

    const [
      totalRevenueData,
      totalExpensesData,
      invoiceStats,
      clientStats,
      productStats,
      quoteStats,
      currentMonthRevenue,
      previousMonthRevenue,
      currentMonthExpenses,
      previousMonthExpenses
    ] = await Promise.all([
      this.getTotalRevenueFromView().catch(() => 0),
      this.getTotalExpensesFromView().catch(() => 0),
      InvoiceService.getInvoiceStats().catch(() => ({ paidAmount: 0, sent: 0, overdue: 0 })),
      ClientService.getClientStats().catch(() => ({ total: 0 })),
      ProductService.getProductStats().catch(() => ({ active: 0 })),
      QuoteService.getQuoteStats().catch(() => ({ total: 0 })),
      this.getMonthlyRevenueFromView(currentYear, currentMonth).catch(() => 0),
      this.getMonthlyRevenueFromView(previousYear, previousMonth).catch(() => 0),
      this.getMonthlyExpensesFromView(currentYear, currentMonth).catch(() => 0),
      this.getMonthlyExpensesFromView(previousYear, previousMonth).catch(() => 0)
    ])

    const totalRevenue = totalRevenueData || 0
    const totalExpenses = totalExpensesData || 0
    const netProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    const revenueGrowth = previousMonthRevenue > 0 
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
      : 0

    const expenseGrowth = previousMonthExpenses > 0
      ? ((currentMonthExpenses - previousMonthExpenses) / previousMonthExpenses) * 100
      : 0

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      pendingInvoices: (invoiceStats.sent || 0) + (invoiceStats.overdue || 0),
      totalClients: clientStats.total || 0,
      totalProducts: productStats.active || 0,
      totalQuotes: quoteStats.total || 0,
      revenueGrowth: isNaN(revenueGrowth) ? 0 : revenueGrowth,
      expenseGrowth: isNaN(expenseGrowth) ? 0 : expenseGrowth,
      profitMargin: isNaN(profitMargin) ? 0 : profitMargin
    }
  }

  static async getRevenueByMonth(months: number = 12): Promise<RevenueByMonth[]> {
    const result: RevenueByMonth[] = []
    const today = new Date()

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`

      const [revenue, expenses] = await Promise.all([
        this.getMonthlyRevenueFromView(year, month),
        this.getMonthlyExpensesFromView(year, month)
      ])

      result.push({
        month: monthKey,
        revenue,
        expenses,
        profit: revenue - expenses
      })
    }

    return result
  }

  static async getTopClients(limit: number = 5): Promise<TopClient[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        client_id,
        total,
        client:clients(id, name)
      `)
      .eq('status', 'paid')

    if (error) {
      throw new Error(`Error fetching top clients: ${error.message}`)
    }

    const clientRevenue: Record<string, { name: string; total: number; count: number }> = {}

    data?.forEach((invoice: any) => {
      if (invoice.client) {
        const clientId = invoice.client.id
        if (!clientRevenue[clientId]) {
          clientRevenue[clientId] = {
            name: invoice.client.name,
            total: 0,
            count: 0
          }
        }
        clientRevenue[clientId].total += invoice.total
        clientRevenue[clientId].count += 1
      }
    })

    return Object.entries(clientRevenue)
      .map(([id, data]) => ({
        id,
        name: data.name,
        totalRevenue: data.total,
        invoiceCount: data.count
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit)
  }

  static async getTopProducts(limit: number = 5): Promise<TopProduct[]> {
    const { data, error } = await supabase
      .from('invoice_items')
      .select(`
        product_id,
        product_name,
        total,
        quantity,
        invoice:invoices!inner(status)
      `)
      .eq('invoice.status', 'paid')

    if (error) {
      throw new Error(`Error fetching top products: ${error.message}`)
    }

    const productRevenue: Record<string, { name: string; total: number; count: number }> = {}

    data?.forEach((item: any) => {
      const productKey = item.product_id || item.product_name
      if (!productRevenue[productKey]) {
        productRevenue[productKey] = {
          name: item.product_name,
          total: 0,
          count: 0
        }
      }
      productRevenue[productKey].total += item.total
      productRevenue[productKey].count += item.quantity
    })

    return Object.entries(productRevenue)
      .map(([id, data]) => ({
        id,
        name: data.name,
        totalRevenue: data.total,
        timesSold: data.count
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit)
  }

  static async getRecentActivity(limit: number = 10): Promise<Array<{
    id: string
    type: 'invoice' | 'quote' | 'expense' | 'client'
    title: string
    subtitle: string
    amount?: number
    date: string
  }>> {
    const [invoices, quotes, expenses, clients] = await Promise.all([
      supabase.from('invoices').select('id, invoice_number, total, status, created_at, client:clients(name)').order('created_at', { ascending: false }).limit(3),
      supabase.from('quotes').select('id, quote_number, total, status, created_at, client:clients(name)').order('created_at', { ascending: false }).limit(3),
      supabase.from('expenses').select('id, description, amount, category, created_at').order('created_at', { ascending: false }).limit(3),
      supabase.from('clients').select('id, name, created_at').order('created_at', { ascending: false }).limit(2)
    ])

    const activities: Array<{
      id: string
      type: 'invoice' | 'quote' | 'expense' | 'client'
      title: string
      subtitle: string
      amount?: number
      date: string
    }> = []

    invoices.data?.forEach((invoice: any) => {
      activities.push({
        id: invoice.id,
        type: 'invoice',
        title: `Factura ${invoice.invoice_number}`,
        subtitle: `${invoice.client?.name || 'Cliente'} - ${invoice.status}`,
        amount: invoice.total,
        date: invoice.created_at
      })
    })

    quotes.data?.forEach((quote: any) => {
      activities.push({
        id: quote.id,
        type: 'quote',
        title: `Cotización ${quote.quote_number}`,
        subtitle: `${quote.client?.name || 'Cliente'} - ${quote.status}`,
        amount: quote.total,
        date: quote.created_at
      })
    })

    expenses.data?.forEach((expense: any) => {
      activities.push({
        id: expense.id,
        type: 'expense',
        title: expense.description,
        subtitle: expense.category,
        amount: expense.amount,
        date: expense.created_at
      })
    })

    clients.data?.forEach((client: any) => {
      activities.push({
        id: client.id,
        type: 'client',
        title: `Cliente registrado: ${client.name}`,
        subtitle: 'Nuevo cliente',
        date: client.created_at
      })
    })

    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit)
  }

  private static async getMonthlyRevenue(year: number, month: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('invoices')
      .select('total')
      .eq('status', 'paid')
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) {
      throw new Error(`Error fetching monthly revenue: ${error.message}`)
    }

    return data?.reduce((sum, invoice) => sum + invoice.total, 0) || 0
  }

  private static async getMonthlyExpenses(year: number, month: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .eq('transaction_type', 'expense')
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) {
      throw new Error(`Error fetching monthly expenses: ${error.message}`)
    }

    return data?.reduce((sum, expense) => sum + expense.amount, 0) || 0
  }

  // Nuevos métodos que usan las vistas de Supabase
  private static async getTotalRevenueFromView(): Promise<number> {
    const { data, error } = await supabase
      .from('vista_ingresos_reales')
      .select('total_ingresos_reales')
      .single()

    if (error) {
      console.error('Error fetching revenue from view:', error)
      return 0
    }

    return data?.total_ingresos_reales || 0
  }

  private static async getTotalExpensesFromView(): Promise<number> {
    const { data, error } = await supabase
      .from('vista_egresos_reales')
      .select('total_egresos_reales')
      .single()

    if (error) {
      console.error('Error fetching expenses from view:', error)
      return 0
    }

    return data?.total_egresos_reales || 0
  }

  private static async getMonthlyRevenueFromView(year: number, month: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('payments')
      .select(`
        amount,
        invoice:invoices!inner(date, user_id)
      `)
      .gte('invoice.date', startDate)
      .lte('invoice.date', endDate)

    if (error) {
      console.error('Error fetching monthly revenue from view:', error)
      return 0
    }

    return data?.reduce((sum, payment) => sum + payment.amount, 0) || 0
  }

  private static async getMonthlyExpensesFromView(year: number, month: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .eq('transaction_type', 'expense')
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) {
      console.error('Error fetching monthly expenses:', error)
      return 0
    }

    return data?.reduce((sum, expense) => sum + expense.amount, 0) || 0
  }
}