import { supabase } from './supabaseClient'

// ============================================
// SERVICIO DE PAGOS CON DEBUG
// ============================================

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
    try {
      
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
    } catch (error) {
      throw error
    }
  }

  static async create(paymentData: CreatePaymentData): Promise<Payment> {
    try {

      // Verificar usuario autenticado
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (userError || !userData.user) {
        throw new Error('Usuario no autenticado')
      }


      // Verificar que la factura existe
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, total')
        .eq('id', paymentData.invoice_id)
        .single()

      if (invoiceError || !invoice) {
        throw new Error('Factura no encontrada')
      }


      // Limpiar datos para inserción
      const cleanPaymentData = {
        invoice_id: paymentData.invoice_id,
        amount: paymentData.amount,
        payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
        payment_method: paymentData.payment_method || 'efectivo',
        payment_account_id: paymentData.payment_account_id || null,
        reference_number: paymentData.reference_number || null,
        notes: paymentData.notes || null
      }


      const { data, error } = await supabase
        .from('payments')
        .insert([cleanPaymentData])
        .select('*')
        .single()

      if (error) {
        throw new Error(`Error creating payment: ${error.message}`)
      }

      return data
    } catch (error) {
      throw error
    }
  }

  static async update(id: string, paymentData: UpdatePaymentData): Promise<Payment> {
    try {

      // Limpiar datos nulos
      const cleanData = Object.fromEntries(
        Object.entries(paymentData).filter(([_, value]) => value !== null && value !== undefined && value !== '')
      )


      const { data, error } = await supabase
        .from('payments')
        .update(cleanData)
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        throw new Error(`Error updating payment: ${error.message}`)
      }

      return data
    } catch (error) {
      throw error
    }
  }

  static async delete(id: string): Promise<void> {
    try {

      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error(`Error deleting payment: ${error.message}`)
      }

    } catch (error) {
      throw error
    }
  }

  static async getTotalPaidForInvoice(invoiceId: string): Promise<number> {
    try {

      const { data, error } = await supabase
        .from('payments')
        .select('amount')
        .eq('invoice_id', invoiceId)

      if (error) {
        throw new Error(`Error calculating total paid: ${error.message}`)
      }

      const total = data?.reduce((sum, payment) => sum + payment.amount, 0) || 0
      return total
    } catch (error) {
      throw error
    }
  }

  // Función de debug para verificar estructura
  static async debugTableStructure(): Promise<void> {
    try {

      // Intentar una consulta simple
      const { data, error, count } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })

      if (error) {
        return
      }


      // Verificar políticas RLS
      const { data: userData } = await supabase.auth.getUser()

    } catch (error) {
    }
  }
}