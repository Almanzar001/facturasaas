import { supabase } from './supabaseClient'

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  payment_date: string
  payment_method: 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque' | 'otro'
  payment_account_id?: string
  payment_account?: {
    id: string
    name: string
    type: string
  }
  reference_number?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface CreatePaymentData {
  invoice_id: string
  amount: number
  payment_date?: string
  payment_method?: 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque' | 'otro'
  payment_account_id?: string
  reference_number?: string
  notes?: string
}

export interface UpdatePaymentData {
  amount?: number
  payment_date?: string
  payment_method?: 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque' | 'otro'
  payment_account_id?: string
  reference_number?: string
  notes?: string
}

export class PaymentService {
  static async getByInvoice(invoiceId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        payment_account:payment_accounts(id, name, type)
      `)
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false })

    if (error) {
      throw new Error(`Error fetching payments: ${error.message}`)
    }

    return data || []
  }

  static async create(paymentData: CreatePaymentData): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .insert([{
        ...paymentData,
        payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
        payment_method: paymentData.payment_method || 'efectivo'
      }])
      .select('*')
      .single()

    if (error) {
      throw new Error(`Error creating payment: ${error.message}`)
    }

    return data
  }

  static async update(id: string, paymentData: UpdatePaymentData): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .update(paymentData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Error updating payment: ${error.message}`)
    }

    return data
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Error deleting payment: ${error.message}`)
    }
  }

  static async getTotalPaidForInvoice(invoiceId: string): Promise<number> {
    const { data, error } = await supabase
      .from('payments')
      .select('amount')
      .eq('invoice_id', invoiceId)

    if (error) {
      throw new Error(`Error calculating total paid: ${error.message}`)
    }

    return data?.reduce((sum, payment) => sum + payment.amount, 0) || 0
  }
}