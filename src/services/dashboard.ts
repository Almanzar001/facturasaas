import { supabase } from './supabaseClient'
import { organizationService } from './organizations'

export interface DashboardMetrics {
  totalRevenue: number
  totalExpenses: number
  totalInvoices: number
  totalClients: number
  pendingInvoices: number
  overdueInvoices: number
  netProfit: number
  revenueGrowth: number
  expenseGrowth: number
}

export interface RevenueByMonth {
  month: string
  revenue: number
  invoices: number
}

export interface TopClient {
  client_id: string
  name: string
  email?: string
  total_revenue: number
  invoice_count: number
}

export interface TopProduct {
  product_id: string
  name: string
  total_revenue: number
  times_sold?: number
  total_quantity?: number
}

export interface DashboardData extends DashboardMetrics {
  topClients: TopClient[]
  topProducts: TopProduct[]
  recentActivity: any[]
  revenueByMonth: RevenueByMonth[]
  metrics: DashboardMetrics
}

export class DashboardService {
  static async getDashboardData(): Promise<DashboardData> {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      throw new Error('No authenticated user')
    }

    // Get current organization ID
    const organizationId = await organizationService.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('No organization selected')
    }

    try {

      // Calcular métricas básicas en paralelo
      const [invoicesResult, expensesResult, clientsResult] = await Promise.all([
        // Total de ingresos de facturas (incluyendo pagos parciales)
        supabase
          .from('invoices')
          .select('total, status, date, total_paid')
          .eq('organization_id', organizationId),
        
        // Total de gastos
        supabase
          .from('expenses')
          .select('amount, date')
          .eq('organization_id', organizationId),
        
        // Total de clientes
        supabase
          .from('clients')
          .select('id')
          .eq('organization_id', organizationId)
      ])


      // Procesar facturas
      const invoices = invoicesResult.data || []
      const paidInvoices = invoices.filter(inv => inv.status === 'paid')
      const pendingInvoices = invoices.filter(inv => inv.status === 'sent' || inv.status === 'draft')
      const overdueInvoices = invoices.filter(inv => {
        if (inv.status !== 'sent') return false
        // Simplificado: facturas enviadas hace más de 30 días
        const invoiceDate = new Date(inv.date)
        const now = new Date()
        const diffTime = now.getTime() - invoiceDate.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays > 30
      })


      // Calcular ingresos totales incluyendo pagos parciales
      const totalRevenue = invoices.reduce((sum, inv) => {
        if (inv.status === 'paid') {
          // Factura completamente pagada
          return sum + (parseFloat(inv.total?.toString() || '0') || 0)
        } else if (inv.total_paid && inv.total_paid > 0) {
          // Pagos parciales
          return sum + (parseFloat(inv.total_paid?.toString() || '0') || 0)
        }
        return sum
      }, 0)
      
      // Procesar gastos
      const expenses = expensesResult.data || []
      const totalExpenses = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount?.toString() || '0') || 0), 0)


      // Cálculo de crecimiento (simplificado: comparar último mes vs mes anterior)
      const now = new Date()
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)

      const lastMonthRevenue = paidInvoices
        .filter(inv => {
          const invDate = new Date(inv.date)
          return invDate >= lastMonth && invDate < now
        })
        .reduce((sum, inv) => sum + (parseFloat(inv.total?.toString() || '0') || 0), 0)

      const previousMonthRevenue = paidInvoices
        .filter(inv => {
          const invDate = new Date(inv.date)
          return invDate >= twoMonthsAgo && invDate < lastMonth
        })
        .reduce((sum, inv) => sum + (parseFloat(inv.total?.toString() || '0') || 0), 0)

      const revenueGrowth = previousMonthRevenue > 0 
        ? ((lastMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
        : 0

      const metrics: DashboardMetrics = {
        totalRevenue,
        totalExpenses,
        totalInvoices: invoices.length,
        totalClients: clientsResult.data?.length || 0,
        pendingInvoices: pendingInvoices.length,
        overdueInvoices: overdueInvoices.length,
        netProfit: totalRevenue - totalExpenses,
        revenueGrowth,
        expenseGrowth: 0, // Simplificado por ahora
      }



      // Obtener top clientes y productos
      const [topClientsResult, topProductsResult] = await Promise.all([
        this.getTopClients(),
        this.getTopProducts()
      ])

      return {
        ...metrics,
        topClients: topClientsResult,
        topProducts: topProductsResult,
        recentActivity: [], // Por implementar
        revenueByMonth: [], // Por implementar
        metrics,
      }

    } catch (error) {
      throw error
    }
  }

  private static async getTopClients(): Promise<TopClient[]> {
    try {
      // Get current organization ID
      const organizationId = await organizationService.getCurrentOrganizationId()
      if (!organizationId) {
        throw new Error('No organization selected')
      }

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          client_id,
          total,
          clients!inner(name, email)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'paid')

      if (error) throw error

      const clientsMap = new Map<string, { name: string; email?: string; total: number; count: number }>()
      
      data?.forEach(invoice => {
        const clientId = invoice.client_id
        const total = parseFloat(invoice.total?.toString() || '0') || 0
        const client = invoice.clients as any

        if (clientsMap.has(clientId)) {
          const existing = clientsMap.get(clientId)!
          existing.total += total
          existing.count += 1
        } else {
          clientsMap.set(clientId, {
            name: client.name,
            email: client.email,
            total: total,
            count: 1
          })
        }
      })

      return Array.from(clientsMap.entries())
        .map(([clientId, data]) => ({
          client_id: clientId,
          name: data.name,
          email: data.email,
          total_revenue: data.total,
          invoice_count: data.count
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 5)

    } catch (error) {
      return []
    }
  }

  private static async getTopProducts(): Promise<TopProduct[]> {
    try {
      // Get current organization ID
      const organizationId = await organizationService.getCurrentOrganizationId()
      if (!organizationId) {
        throw new Error('No organization selected')
      }

      const { data, error } = await supabase
        .from('invoice_items')
        .select(`
          product_id,
          product_name,
          quantity,
          price,
          total,
          invoices!inner(status, organization_id)
        `)
        .eq('invoices.organization_id', organizationId)
        .eq('invoices.status', 'paid')

      if (error) throw error

      const productsMap = new Map<string, { total: number; quantity: number; count: number }>()
      
      data?.forEach(item => {
        const productName = item.product_name
        const total = parseFloat(item.total?.toString() || '0') || 0
        const quantity = parseFloat(item.quantity?.toString() || '0') || 0

        if (productsMap.has(productName)) {
          const existing = productsMap.get(productName)!
          existing.total += total
          existing.quantity += quantity
          existing.count += 1
        } else {
          productsMap.set(productName, {
            total: total,
            quantity: quantity,
            count: 1
          })
        }
      })

      return Array.from(productsMap.entries())
        .map(([productName, data]) => ({
          product_id: productName.toLowerCase().replace(/\s+/g, '-'),
          name: productName,
          total_revenue: data.total,
          total_quantity: data.quantity,
          times_sold: data.count
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 5)

    } catch (error) {
      return []
    }
  }
}
