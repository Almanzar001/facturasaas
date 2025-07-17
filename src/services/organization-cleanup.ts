import { supabase } from './supabaseClient'
import { organizationService } from './organizations'

export interface CleanupOptions {
  clients?: boolean
  products?: boolean
  invoices?: boolean
  quotes?: boolean
  expenses?: boolean
  invoiceItems?: boolean
  quoteItems?: boolean
}

export interface CleanupResult {
  success: boolean
  message: string
  deletedCounts: {
    clients: number
    products: number
    invoices: number
    quotes: number
    expenses: number
    invoiceItems: number
    quoteItems: number
  }
}

export class OrganizationCleanupService {
  private static async createOrganizationFilter() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      throw new Error('No authenticated user')
    }

    const organizationId = await organizationService.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('No organization selected')
    }

    return { 
      filter: `organization_id.eq.${organizationId},and(organization_id.is.null,user_id.eq.${userData.user.id})`,
      userId: userData.user.id,
      organizationId
    }
  }

  static async cleanupOrganizationData(options: CleanupOptions): Promise<CleanupResult> {
    try {
      const { filter, organizationId } = await this.createOrganizationFilter()
      
      const deletedCounts = {
        clients: 0,
        products: 0,
        invoices: 0,
        quotes: 0,
        expenses: 0,
        invoiceItems: 0,
        quoteItems: 0
      }

      // Delete in correct order to respect foreign key constraints
      
      // 1. Delete invoice items first
      if (options.invoiceItems) {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id')
          .or(filter)
        
        if (invoices && invoices.length > 0) {
          const invoiceIds = invoices.map(inv => inv.id)
          const { data: invoiceItems } = await supabase
            .from('invoice_items')
            .select('id')
            .in('invoice_id', invoiceIds)
          
          if (invoiceItems && invoiceItems.length > 0) {
            const { error } = await supabase
              .from('invoice_items')
              .delete()
              .in('id', invoiceItems.map(item => item.id))
            
            if (error) throw error
            deletedCounts.invoiceItems = invoiceItems.length
          }
        }
      }

      // 2. Delete quote items
      if (options.quoteItems) {
        const { data: quotes } = await supabase
          .from('quotes')
          .select('id')
          .or(filter)
        
        if (quotes && quotes.length > 0) {
          const quoteIds = quotes.map(quote => quote.id)
          const { data: quoteItems } = await supabase
            .from('quote_items')
            .select('id')
            .in('quote_id', quoteIds)
          
          if (quoteItems && quoteItems.length > 0) {
            const { error } = await supabase
              .from('quote_items')
              .delete()
              .in('id', quoteItems.map(item => item.id))
            
            if (error) throw error
            deletedCounts.quoteItems = quoteItems.length
          }
        }
      }

      // 3. Delete invoices
      if (options.invoices) {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id')
          .or(filter)
        
        if (invoices && invoices.length > 0) {
          const { error } = await supabase
            .from('invoices')
            .delete()
            .or(filter)
          
          if (error) throw error
          deletedCounts.invoices = invoices.length
        }
      }

      // 4. Delete quotes
      if (options.quotes) {
        const { data: quotes } = await supabase
          .from('quotes')
          .select('id')
          .or(filter)
        
        if (quotes && quotes.length > 0) {
          const { error } = await supabase
            .from('quotes')
            .delete()
            .or(filter)
          
          if (error) throw error
          deletedCounts.quotes = quotes.length
        }
      }

      // 5. Delete expenses
      if (options.expenses) {
        const { data: expenses } = await supabase
          .from('expenses')
          .select('id')
          .or(filter)
        
        if (expenses && expenses.length > 0) {
          const { error } = await supabase
            .from('expenses')
            .delete()
            .or(filter)
          
          if (error) throw error
          deletedCounts.expenses = expenses.length
        }
      }

      // 6. Delete products
      if (options.products) {
        const { data: products } = await supabase
          .from('products')
          .select('id')
          .or(filter)
        
        if (products && products.length > 0) {
          const { error } = await supabase
            .from('products')
            .delete()
            .or(filter)
          
          if (error) throw error
          deletedCounts.products = products.length
        }
      }

      // 7. Delete clients
      if (options.clients) {
        const { data: clients } = await supabase
          .from('clients')
          .select('id')
          .or(filter)
        
        if (clients && clients.length > 0) {
          const { error } = await supabase
            .from('clients')
            .delete()
            .or(filter)
          
          if (error) throw error
          deletedCounts.clients = clients.length
        }
      }

      const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0)
      
      return {
        success: true,
        message: `Limpieza completada. Se eliminaron ${totalDeleted} registros en total.`,
        deletedCounts
      }
    } catch (error) {
      return {
        success: false,
        message: `Error durante la limpieza: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        deletedCounts: {
          clients: 0,
          products: 0,
          invoices: 0,
          quotes: 0,
          expenses: 0,
          invoiceItems: 0,
          quoteItems: 0
        }
      }
    }
  }

  static async getOrganizationDataCounts(): Promise<{
    clients: number
    products: number
    invoices: number
    quotes: number
    expenses: number
    invoiceItems: number
    quoteItems: number
  }> {
    const { filter } = await this.createOrganizationFilter()
    
    const [
      clientsResult,
      productsResult,
      invoicesResult,
      quotesResult,
      expensesResult
    ] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact' }).or(filter),
      supabase.from('products').select('*', { count: 'exact' }).or(filter),
      supabase.from('invoices').select('*', { count: 'exact' }).or(filter),
      supabase.from('quotes').select('*', { count: 'exact' }).or(filter),
      supabase.from('expenses').select('*', { count: 'exact' }).or(filter)
    ])

    // Get invoice items count
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id')
      .or(filter)
    
    const invoiceIds = invoices?.map(inv => inv.id) || []
    const invoiceItemsResult = await supabase
      .from('invoice_items')
      .select('*', { count: 'exact' })
      .in('invoice_id', invoiceIds)

    // Get quote items count
    const { data: quotes } = await supabase
      .from('quotes')
      .select('id')
      .or(filter)
    
    const quoteIds = quotes?.map(quote => quote.id) || []
    const quoteItemsResult = await supabase
      .from('quote_items')
      .select('*', { count: 'exact' })
      .in('quote_id', quoteIds)

    return {
      clients: (clientsResult.count as number) || 0,
      products: (productsResult.count as number) || 0,
      invoices: (invoicesResult.count as number) || 0,
      quotes: (quotesResult.count as number) || 0,
      expenses: (expensesResult.count as number) || 0,
      invoiceItems: (invoiceItemsResult.count as number) || 0,
      quoteItems: (quoteItemsResult.count as number) || 0
    }
  }
}