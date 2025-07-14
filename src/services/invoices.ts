import { supabase } from './supabaseClient'
import { Client } from './clients'
import { Product } from './products'
import { FiscalDocumentService } from './fiscalDocumentsAutoCreate'

export interface InvoiceItem {
  id: string
  invoice_id: string
  product_id?: string
  product_name: string
  description?: string
  quantity: number
  price: number
  total: number
  created_at: string
}

export interface Invoice {
  id: string
  user_id: string
  client_id: string
  invoice_number: string
  fiscal_document_type_id?: string
  fiscal_sequence_id?: string
  fiscal_number?: string
  client_tax_id?: string
  date: string
  due_date?: string
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  subtotal: number
  tax_amount: number
  total: number
  balance_due?: number
  total_paid?: number
  notes?: string
  created_at: string
  updated_at: string
  client?: Client
  items?: InvoiceItem[]
}

export interface CreateInvoiceData {
  client_id: string
  invoice_number: string
  fiscal_document_type_id?: string
  client_tax_id?: string
  date: string
  due_date?: string
  status?: 'draft' | 'sent' | 'paid' | 'overdue'
  notes?: string
  apply_tax?: boolean
  tax_rate?: number
  items: Array<{
    product_id?: string
    product_name: string
    description?: string
    quantity: number
    price: number
  }>
}

export interface UpdateInvoiceData extends Partial<CreateInvoiceData> {
  id: string
}

export class InvoiceService {
  static async getAll(includeClient: boolean = true): Promise<Invoice[]> {
    if (includeClient) {
      const { data, error } = await supabase
        .from('invoices_with_details')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        throw new Error(`Error fetching invoices: ${error.message}`)
      }

      return data || []
    } else {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        throw new Error(`Error fetching invoices: ${error.message}`)
      }

      return data || []
    }
  }

  static async getAllPaginated(page: number = 1, pageSize: number = 20, includeClient: boolean = true): Promise<{ data: Invoice[], count: number }> {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Primero obtener el conteo total
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })

    // Luego obtener los datos paginados
    if (includeClient) {
      const { data, error } = await supabase
        .from('invoices_with_details')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        throw new Error(`Error fetching invoices: ${error.message}`)
      }

      return { data: data || [], count: count || 0 }
    } else {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        throw new Error(`Error fetching invoices: ${error.message}`)
      }

      return { data: data || [], count: count || 0 }
    }
  }

  static async getById(id: string): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, client:clients(*), items:invoice_items(*)')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Error fetching invoice: ${error.message}`)
    }

    return data
  }

  static async create(invoiceData: CreateInvoiceData): Promise<Invoice> {
    const { items, apply_tax = true, tax_rate = 18, ...invoice } = invoiceData

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    const taxAmount = apply_tax ? subtotal * (tax_rate / 100) : 0
    const total = subtotal + taxAmount

    // Generar número fiscal si se especificó tipo de comprobante
    let fiscalData: any = {}
    if (invoice.fiscal_document_type_id) {
      try {
        const nextFiscal = await FiscalDocumentService.getNextFiscalNumber(invoice.fiscal_document_type_id)
        
        if (!nextFiscal.success) {
          throw new Error(nextFiscal.error || 'Error generando número fiscal')
        }
        
        fiscalData = {
          fiscal_sequence_id: nextFiscal.sequence_id,
          fiscal_number: nextFiscal.fiscal_number
        }
      } catch (error) {
        throw new Error(`Error generando número fiscal: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
    }

    const { data: invoiceRecord, error: invoiceError } = await supabase
      .from('invoices')
      .insert([{
        ...invoice,
        ...fiscalData,
        subtotal,
        tax_amount: taxAmount,
        total,
        status: invoice.status || 'draft'
      }])
      .select('*')
      .single()

    if (invoiceError) {
      throw new Error(`Error creating invoice: ${invoiceError.message}`)
    }

    const invoiceItems = items.map(item => ({
      invoice_id: invoiceRecord.id,
      product_id: item.product_id,
      product_name: item.product_name,
      description: item.description,
      quantity: item.quantity,
      price: item.price,
      total: item.quantity * item.price
    }))

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems)

    if (itemsError) {
      await supabase.from('invoices').delete().eq('id', invoiceRecord.id)
      throw new Error(`Error creating invoice items: ${itemsError.message}`)
    }

    return this.getById(invoiceRecord.id) as Promise<Invoice>
  }

  static async update(id: string, invoiceData: Partial<CreateInvoiceData>): Promise<Invoice> {
    const { items, apply_tax, tax_rate, ...invoiceFields } = invoiceData
    let updateData: any = { ...invoiceFields }

    if (items) {
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
      const useTax = apply_tax !== undefined ? apply_tax : true
      const taxRateToUse = tax_rate || 18
      const taxAmount = useTax ? subtotal * (taxRateToUse / 100) : 0
      const total = subtotal + taxAmount

      await supabase.from('invoice_items').delete().eq('invoice_id', id)

      const invoiceItems = items.map(item => ({
        invoice_id: id,
        product_id: item.product_id,
        product_name: item.product_name,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price
      }))

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems)

      if (itemsError) {
        throw new Error(`Error updating invoice items: ${itemsError.message}`)
      }

      updateData.subtotal = subtotal
      updateData.tax_amount = taxAmount
      updateData.total = total
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Error updating invoice: ${error.message}`)
    }

    return this.getById(id) as Promise<Invoice>
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Error deleting invoice: ${error.message}`)
    }
  }

  static async updateStatus(id: string, status: Invoice['status']): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .update({ status })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Error updating invoice status: ${error.message}`)
    }

    return this.getById(id) as Promise<Invoice>
  }

  static async getByClient(clientId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, client:clients(*), items:invoice_items(*)')
      .eq('client_id', clientId)
      .order('date', { ascending: false })

    if (error) {
      throw new Error(`Error fetching invoices by client: ${error.message}`)
    }

    return data || []
  }

  static async getByDateRange(startDate: string, endDate: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, client:clients(*), items:invoice_items(*)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (error) {
      throw new Error(`Error fetching invoices by date range: ${error.message}`)
    }

    return data || []
  }

  static async getOverdueInvoices(): Promise<Invoice[]> {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('invoices')
      .select('*, client:clients(*), items:invoice_items(*)')
      .lt('due_date', today)
      .neq('status', 'paid')
      .order('due_date', { ascending: true })

    if (error) {
      throw new Error(`Error fetching overdue invoices: ${error.message}`)
    }

    return data || []
  }

  static async getByMonth(year: number, month: number): Promise<Invoice[]> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    return this.getByDateRange(startDate, endDate)
  }

  static async getByYear(year: number): Promise<Invoice[]> {
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    return this.getByDateRange(startDate, endDate)
  }

  static async getInvoiceStats(): Promise<{
    total: number
    draft: number
    sent: number
    paid: number
    overdue: number
    totalAmount: number
    paidAmount: number
    pendingAmount: number
  }> {
    const { data, error } = await supabase
      .from('invoice_statistics')
      .select('*')
      .single()

    if (error) {
      throw new Error(`Error fetching invoice stats: ${error.message}`)
    }

    const stats = data || {}

    return {
      total: stats.total_invoices || 0,
      draft: stats.draft_invoices || 0,
      sent: stats.sent_invoices || 0,
      paid: stats.paid_invoices || 0,
      overdue: stats.overdue_invoices || 0,
      totalAmount: stats.total_amount || 0,
      paidAmount: stats.paid_amount || 0,
      pendingAmount: stats.sent_amount + stats.overdue_amount || 0
    }
  }

  static async generateInvoiceNumber(): Promise<string> {
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      throw new Error(`Error generating invoice number: ${error.message}`)
    }

    const lastInvoice = data?.[0]
    if (!lastInvoice) {
      return 'FAC-001'
    }

    const lastNumber = parseInt(lastInvoice.invoice_number.split('-')[1] || '0')
    return `FAC-${String(lastNumber + 1).padStart(3, '0')}`
  }
}