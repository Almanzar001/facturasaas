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

    // Use single optimized query instead of 10 separate calls
    const { data: dashboardData, error: dashboardError } = await supabase
      .from('dashboard_metrics_cache')
      .select('*')
      .single()

    if (dashboardError) {
      console.error('Dashboard cache not available, falling back to individual queries')
      // Fallback to batch queries
      const [
        invoiceStats,
        clientStats,
        productStats,
        quoteStats
      ] = await Promise.all([
        supabase.from('invoice_statistics').select('*').single().then(r => r.data).catch(() => ({ total_revenue: 0, paid_invoices: 0, overdue_invoices: 0 })),
        supabase.from('clients').select('id').then(r => ({ total: r.data?.length || 0 })).catch(() => ({ total: 0 })),
        supabase.from('product_statistics').select('*').single().then(r => r.data).catch(() => ({ active_products: 0 })),
        supabase.from('quotes_with_details').select('id').then(r => ({ total: r.data?.length || 0 })).catch(() => ({ total: 0 }))
      ])
      
      const totalRevenueData = invoiceStats.total_revenue || 0
      const totalExpensesData = 0 // Will be calculated from expense_statistics
      const currentMonthRevenue = 0
      const previousMonthRevenue = 0
      const currentMonthExpenses = 0
      const previousMonthExpenses = 0
      
      return {
        totalRevenue: totalRevenueData,
        totalExpenses: totalExpensesData,
        netProfit: totalRevenueData - totalExpensesData,
        pendingInvoices: (invoiceStats.paid_invoices || 0) + (invoiceStats.overdue_invoices || 0),
        totalClients: clientStats.total || 0,
        totalProducts: productStats.active_products || 0,
        totalQuotes: quoteStats.total || 0,
        revenueGrowth: 0,
        expenseGrowth: 0,
        profitMargin: totalRevenueData > 0 ? ((totalRevenueData - totalExpensesData) / totalRevenueData) * 100 : 0
      }
    }

    // Use cached data if available
    const totalRevenue = dashboardData.total_revenue || 0
    const totalExpenses = dashboardData.total_expenses || 0
    const netProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      pendingInvoices: dashboardData.pending_invoices || 0,
      totalClients: dashboardData.total_clients || 0,
      totalProducts: dashboardData.total_products || 0,
      totalQuotes: dashboardData.total_quotes || 0,
      revenueGrowth: dashboardData.revenue_growth || 0,
      expenseGrowth: dashboardData.expense_growth || 0,
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
      .from('top_clients_optimized')
      .select('client_id, name, total_revenue, invoice_count')
      .limit(limit)

    if (error) {
      throw new Error(`Error fetching top clients: ${error.message}`)
    }

    return data?.map((client: any) => ({
      id: client.client_id,
      name: client.name,
      totalRevenue: client.total_revenue,
      invoiceCount: client.invoice_count
    })) || []
  }

  static async getTopProducts(limit: number = 5): Promise<TopProduct[]> {
    const { data, error } = await supabase
      .from('top_products_optimized')
      .select('product_id, product_name, total_revenue, total_quantity')
      .limit(limit)

    if (error) {
      throw new Error(`Error fetching top products: ${error.message}`)
    }

    return data?.map((product: any) => ({
      id: product.product_id,
      name: product.product_name,
      totalRevenue: product.total_revenue,
      timesSold: product.total_quantity
    })) || []
  }

  static async getRecentActivity(limit: number = 10): Promise<Array<{
    id: string
    type: 'invoice' | 'quote' | 'expense' | 'client'
    title: string
    subtitle: string
    amount?: number
    date: string
  }>> {
    const { data, error } = await supabase
      .from('recent_activity_optimized')
      .select('activity_type, id, title, client_name, amount, status, created_at')
      .limit(limit)

    if (error) {
      throw new Error(`Error fetching recent activity: ${error.message}`)
    }

    return data?.map((activity: any) => ({
      id: activity.id,
      type: activity.activity_type,
      title: activity.activity_type === 'invoice' ? `Factura ${activity.title}` :
             activity.activity_type === 'quote' ? `Cotización ${activity.title}` :
             activity.activity_type === 'client' ? `Cliente registrado: ${activity.title}` :
             activity.title,
      subtitle: activity.activity_type === 'client' ? 'Nuevo cliente' :
                activity.client_name ? `${activity.client_name} - ${activity.status}` :
                activity.client_name || activity.status || '',
      amount: activity.amount,
      date: activity.created_at
    })) || []
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
      .from('monthly_revenue_optimized')
      .select('total_revenue')
      .single()

    if (error) {
      console.error('Error fetching revenue from view:', error)
      return 0
    }

    return data?.total_revenue || 0
  }

  private static async getTotalExpensesFromView(): Promise<number> {
    const { data, error } = await supabase
      .from('expense_statistics')
      .select('total_expenses')
      .single()

    if (error) {
      console.error('Error fetching expenses from view:', error)
      return 0
    }

    return data?.total_expenses || 0
  }

  private static async getMonthlyRevenueFromView(year: number, month: number): Promise<number> {
    const monthKey = `${year}-${month.toString().padStart(2, '0')}-01`

    const { data, error } = await supabase
      .from('monthly_revenue_optimized')
      .select('total_revenue')
      .eq('month', monthKey)
      .single()

    if (error) {
      console.error('Error fetching monthly revenue from view:', error)
      return 0
    }

    return data?.total_revenue || 0
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