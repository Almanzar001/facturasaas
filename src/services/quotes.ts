import { supabase } from './supabaseClient'
import { Client } from './clients'
import { CreateInvoiceData, InvoiceService } from './invoices'

export interface QuoteItem {
  id: string
  quote_id: string
  product_id?: string
  product_name: string
  description?: string
  quantity: number
  price: number
  total: number
  created_at: string
}

export interface Quote {
  id: string
  user_id: string
  client_id: string
  quote_number: string
  date: string
  expiry_date?: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  subtotal: number
  tax_amount: number
  total: number
  notes?: string
  converted_to_invoice?: string
  created_at: string
  updated_at: string
  client?: Client
  items?: QuoteItem[]
}

export interface CreateQuoteData {
  client_id: string
  quote_number: string
  date: string
  expiry_date?: string
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  notes?: string
  items: Array<{
    product_id?: string
    product_name: string
    description?: string
    quantity: number
    price: number
  }>
}

export interface UpdateQuoteData extends Partial<CreateQuoteData> {
  id: string
}

export class QuoteService {
  static async getAll(includeClient: boolean = true): Promise<Quote[]> {
    if (includeClient) {
      const { data, error } = await supabase
        .from('quotes')
        .select('*, client:clients(*), items:quote_items(*)')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Error fetching quotes: ${error.message}`)
      }

      return data || []
    } else {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Error fetching quotes: ${error.message}`)
      }

      return data || []
    }
  }

  static async getById(id: string): Promise<Quote | null> {
    const { data, error } = await supabase
      .from('quotes')
      .select('*, client:clients(*), items:quote_items(*)')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Error fetching quote: ${error.message}`)
    }

    return data
  }

  static async create(quoteData: CreateQuoteData): Promise<Quote> {
    const { items, ...quote } = quoteData

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    const taxAmount = subtotal * 0.19
    const total = subtotal + taxAmount

    const { data: quoteRecord, error: quoteError } = await supabase
      .from('quotes')
      .insert([{
        ...quote,
        subtotal,
        tax_amount: taxAmount,
        total,
        status: quote.status || 'draft'
      }])
      .select('*')
      .single()

    if (quoteError) {
      throw new Error(`Error creating quote: ${quoteError.message}`)
    }

    const quoteItems = items.map(item => ({
      quote_id: quoteRecord.id,
      product_id: item.product_id,
      product_name: item.product_name,
      description: item.description,
      quantity: item.quantity,
      price: item.price,
      total: item.quantity * item.price
    }))

    const { error: itemsError } = await supabase
      .from('quote_items')
      .insert(quoteItems)

    if (itemsError) {
      await supabase.from('quotes').delete().eq('id', quoteRecord.id)
      throw new Error(`Error creating quote items: ${itemsError.message}`)
    }

    return this.getById(quoteRecord.id) as Promise<Quote>
  }

  static async update(id: string, quoteData: Partial<CreateQuoteData>): Promise<Quote> {
    const { items, ...quoteFields } = quoteData
    let updateData: any = { ...quoteFields }

    if (items) {
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
      const taxAmount = subtotal * 0.19
      const total = subtotal + taxAmount

      await supabase.from('quote_items').delete().eq('quote_id', id)

      const quoteItems = items.map(item => ({
        quote_id: id,
        product_id: item.product_id,
        product_name: item.product_name,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price
      }))

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(quoteItems)

      if (itemsError) {
        throw new Error(`Error updating quote items: ${itemsError.message}`)
      }

      updateData.subtotal = subtotal
      updateData.tax_amount = taxAmount
      updateData.total = total
    }

    const { data, error } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Error updating quote: ${error.message}`)
    }

    return this.getById(id) as Promise<Quote>
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Error deleting quote: ${error.message}`)
    }
  }

  static async updateStatus(id: string, status: Quote['status']): Promise<Quote> {
    const { data, error } = await supabase
      .from('quotes')
      .update({ status })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Error updating quote status: ${error.message}`)
    }

    return this.getById(id) as Promise<Quote>
  }

  static async convertToInvoice(quoteId: string): Promise<string> {
    const quote = await this.getById(quoteId)
    if (!quote) {
      throw new Error('Cotización no encontrada')
    }

    if (quote.converted_to_invoice) {
      throw new Error('Esta cotización ya ha sido convertida a factura')
    }

    // Permitir conversión desde cualquier estado, no solo 'accepted'
    // if (quote.status !== 'accepted') {
    //   throw new Error('La cotización debe estar aceptada antes de convertirla a factura')
    // }

    const invoiceNumber = await InvoiceService.generateInvoiceNumber()
    
    const invoiceData: CreateInvoiceData = {
      client_id: quote.client_id,
      invoice_number: invoiceNumber,
      date: new Date().toISOString().split('T')[0],
      notes: quote.notes ? `Convertido desde cotización ${quote.quote_number}. ${quote.notes}` : `Convertido desde cotización ${quote.quote_number}`,
      items: quote.items?.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        description: item.description,
        quantity: item.quantity,
        price: item.price
      })) || []
    }

    const invoice = await InvoiceService.create(invoiceData)

    await supabase
      .from('quotes')
      .update({ converted_to_invoice: invoice.id })
      .eq('id', quoteId)

    return invoice.id
  }

  static async getByClient(clientId: string): Promise<Quote[]> {
    const { data, error } = await supabase
      .from('quotes')
      .select('*, client:clients(*), items:quote_items(*)')
      .eq('client_id', clientId)
      .order('date', { ascending: false })

    if (error) {
      throw new Error(`Error fetching quotes by client: ${error.message}`)
    }

    return data || []
  }

  static async getExpiredQuotes(): Promise<Quote[]> {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('quotes')
      .select('*, client:clients(*), items:quote_items(*)')
      .lt('expiry_date', today)
      .neq('status', 'accepted')
      .neq('status', 'rejected')
      .neq('status', 'expired')
      .order('expiry_date', { ascending: true })

    if (error) {
      throw new Error(`Error fetching expired quotes: ${error.message}`)
    }

    const expiredQuotes = data || []
    
    for (const quote of expiredQuotes) {
      await this.updateStatus(quote.id, 'expired')
    }

    return expiredQuotes
  }

  static async getQuoteStats(): Promise<{
    total: number
    draft: number
    sent: number
    accepted: number
    rejected: number
    expired: number
    totalAmount: number
    acceptedAmount: number
    conversionRate: number
  }> {
    const { data, error } = await supabase
      .from('quotes')
      .select('id, status, total')

    if (error) {
      throw new Error(`Error fetching quote stats: ${error.message}`)
    }

    const quotes = data || []
    const totalAmount = quotes.reduce((sum, quote) => sum + quote.total, 0)
    const acceptedAmount = quotes.filter(quote => quote.status === 'accepted').reduce((sum, quote) => sum + quote.total, 0)
    const acceptedCount = quotes.filter(quote => quote.status === 'accepted').length
    const sentCount = quotes.filter(quote => quote.status === 'sent').length
    const conversionRate = sentCount > 0 ? (acceptedCount / sentCount) * 100 : 0

    return {
      total: quotes.length,
      draft: quotes.filter(quote => quote.status === 'draft').length,
      sent: sentCount,
      accepted: acceptedCount,
      rejected: quotes.filter(quote => quote.status === 'rejected').length,
      expired: quotes.filter(quote => quote.status === 'expired').length,
      totalAmount,
      acceptedAmount,
      conversionRate
    }
  }

  static async generateQuoteNumber(): Promise<string> {
    const { data, error } = await supabase
      .from('quotes')
      .select('quote_number')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      throw new Error(`Error generating quote number: ${error.message}`)
    }

    const lastQuote = data?.[0]
    if (!lastQuote) {
      return 'COT-001'
    }

    const lastNumber = parseInt(lastQuote.quote_number.split('-')[1] || '0')
    return `COT-${String(lastNumber + 1).padStart(3, '0')}`
  }
}