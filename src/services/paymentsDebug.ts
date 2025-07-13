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
      console.log('🔍 Obteniendo pagos para factura:', invoiceId)
      
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          payment_account:payment_accounts(id, name, type)
        `)
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: false })

      if (error) {
        console.error('❌ Error obteniendo pagos:', error)
        throw new Error(`Error fetching payments: ${error.message}`)
      }

      console.log('✅ Pagos obtenidos:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('❌ Error en getByInvoice:', error)
      throw error
    }
  }

  static async create(paymentData: CreatePaymentData): Promise<Payment> {
    try {
      console.log('💰 Creando nuevo pago...')
      console.log('📋 Datos del pago:', paymentData)

      // Verificar usuario autenticado
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (userError || !userData.user) {
        console.error('❌ Usuario no autenticado:', userError)
        throw new Error('Usuario no autenticado')
      }

      console.log('👤 Usuario autenticado:', userData.user.id)

      // Verificar que la factura existe
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, total')
        .eq('id', paymentData.invoice_id)
        .single()

      if (invoiceError || !invoice) {
        console.error('❌ Factura no encontrada:', invoiceError)
        throw new Error('Factura no encontrada')
      }

      console.log('📄 Factura encontrada:', invoice.id, 'total:', invoice.total)

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

      console.log('🔧 Datos limpios para inserción:', cleanPaymentData)

      const { data, error } = await supabase
        .from('payments')
        .insert([cleanPaymentData])
        .select('*')
        .single()

      if (error) {
        console.error('❌ Error en inserción:', error)
        console.error('❌ Código de error:', error.code)
        console.error('❌ Detalles:', error.details)
        console.error('❌ Hint:', error.hint)
        throw new Error(`Error creating payment: ${error.message}`)
      }

      console.log('✅ Pago creado exitosamente:', data.id)
      return data
    } catch (error) {
      console.error('❌ Error en create:', error)
      throw error
    }
  }

  static async update(id: string, paymentData: UpdatePaymentData): Promise<Payment> {
    try {
      console.log('✏️ Actualizando pago:', id)
      console.log('📋 Nuevos datos:', paymentData)

      // Limpiar datos nulos
      const cleanData = Object.fromEntries(
        Object.entries(paymentData).filter(([_, value]) => value !== null && value !== undefined && value !== '')
      )

      console.log('🔧 Datos limpios para actualización:', cleanData)

      const { data, error } = await supabase
        .from('payments')
        .update(cleanData)
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        console.error('❌ Error actualizando pago:', error)
        throw new Error(`Error updating payment: ${error.message}`)
      }

      console.log('✅ Pago actualizado exitosamente:', data.id)
      return data
    } catch (error) {
      console.error('❌ Error en update:', error)
      throw error
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      console.log('🗑️ Eliminando pago:', id)

      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('❌ Error eliminando pago:', error)
        throw new Error(`Error deleting payment: ${error.message}`)
      }

      console.log('✅ Pago eliminado exitosamente')
    } catch (error) {
      console.error('❌ Error en delete:', error)
      throw error
    }
  }

  static async getTotalPaidForInvoice(invoiceId: string): Promise<number> {
    try {
      console.log('📊 Calculando total pagado para factura:', invoiceId)

      const { data, error } = await supabase
        .from('payments')
        .select('amount')
        .eq('invoice_id', invoiceId)

      if (error) {
        console.error('❌ Error calculando total:', error)
        throw new Error(`Error calculating total paid: ${error.message}`)
      }

      const total = data?.reduce((sum, payment) => sum + payment.amount, 0) || 0
      console.log('💰 Total pagado:', total)
      return total
    } catch (error) {
      console.error('❌ Error en getTotalPaidForInvoice:', error)
      throw error
    }
  }

  // Función de debug para verificar estructura
  static async debugTableStructure(): Promise<void> {
    try {
      console.log('🔍 Verificando estructura de tabla payments...')

      // Intentar una consulta simple
      const { data, error, count } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.error('❌ Error verificando tabla:', error)
        return
      }

      console.log('✅ Tabla payments accesible, registros:', count)

      // Verificar políticas RLS
      const { data: userData } = await supabase.auth.getUser()
      console.log('👤 Usuario para RLS:', userData?.user?.id || 'No autenticado')

    } catch (error) {
      console.error('❌ Error en debug:', error)
    }
  }
}