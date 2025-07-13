import { supabase } from './supabaseClient'

export interface PaymentAccount {
  id: string
  user_id: string
  name: string
  type: 'caja_chica' | 'banco' | 'tarjeta' | 'digital'
  bank_name?: string
  account_number?: string
  account_holder?: string
  currency: string
  initial_balance: number
  current_balance: number
  is_active: boolean
  is_default: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface CreatePaymentAccountData {
  name: string
  type: 'caja_chica' | 'banco' | 'tarjeta' | 'digital'
  bank_name?: string
  account_number?: string
  account_holder?: string
  currency?: string
  initial_balance?: number
  is_default?: boolean
  notes?: string
}

export interface UpdatePaymentAccountData extends Partial<CreatePaymentAccountData> {
  is_active?: boolean
}

export class PaymentAccountService {
  static async getAll(includeInactive: boolean = false): Promise<PaymentAccount[]> {
    let query = supabase
      .from('payment_accounts')
      .select('*')
      .order('name', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Error fetching payment accounts: ${error.message}`)
    }

    return data || []
  }

  static async getById(id: string): Promise<PaymentAccount | null> {
    const { data, error } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Error fetching payment account: ${error.message}`)
    }

    return data
  }

  static async create(accountData: CreatePaymentAccountData): Promise<PaymentAccount> {
    const { data, error } = await supabase
      .from('payment_accounts')
      .insert([{
        ...accountData,
        currency: accountData.currency || 'DOP',
        initial_balance: accountData.initial_balance || 0,
        current_balance: accountData.initial_balance || 0
      }])
      .select('*')
      .single()

    if (error) {
      throw new Error(`Error creating payment account: ${error.message}`)
    }

    return data
  }

  static async update(id: string, accountData: UpdatePaymentAccountData): Promise<PaymentAccount> {
    const { data, error } = await supabase
      .from('payment_accounts')
      .update(accountData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Error updating payment account: ${error.message}`)
    }

    return data
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('payment_accounts')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Error deleting payment account: ${error.message}`)
    }
  }

  static async setDefault(id: string): Promise<void> {
    const { error } = await supabase
      .from('payment_accounts')
      .update({ is_default: true })
      .eq('id', id)

    if (error) {
      throw new Error(`Error setting default account: ${error.message}`)
    }
  }

  static async getDefault(): Promise<PaymentAccount | null> {
    const { data, error } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('is_default', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Error fetching default account: ${error.message}`)
    }

    return data
  }

  static async getAccountSummary(): Promise<Array<{
    account: PaymentAccount
    total_income: number
    total_expense: number
    transaction_count: number
  }>> {
    const { data, error } = await supabase
      .from('payment_accounts_summary')
      .select('*')

    if (error) {
      throw new Error(`Error fetching account summary: ${error.message}`)
    }

    return data || []
  }

  static getAccountTypeLabel(type: string): string {
    const types: Record<string, string> = {
      caja_chica: 'Caja Chica',
      banco: 'Cuenta Bancaria',
      tarjeta: 'Tarjeta',
      digital: 'Billetera Digital'
    }
    return types[type] || type
  }
}