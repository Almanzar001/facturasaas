import { supabase } from './supabaseClient'
import { organizationService } from './organizations'

export interface PaymentAccount {
  id: string
  user_id: string
  organization_id: string
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
    // Get current organization ID
    const organizationId = await organizationService.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('No organization selected')
    }

    let query = supabase
      .from('payment_accounts')
      .select('*')
      .eq('organization_id', organizationId)
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
    // Get current organization ID
    const organizationId = await organizationService.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('No organization selected')
    }

    const { data, error } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
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
    // Get current organization ID
    const organizationId = await organizationService.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('No organization selected')
    }

    const { data, error } = await supabase
      .from('payment_accounts')
      .insert([{
        ...accountData,
        organization_id: organizationId,
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
    // Get current organization ID
    const organizationId = await organizationService.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('No organization selected')
    }

    const { data, error } = await supabase
      .from('payment_accounts')
      .update(accountData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Error updating payment account: ${error.message}`)
    }

    return data
  }

  static async delete(id: string): Promise<void> {
    // Get current organization ID
    const organizationId = await organizationService.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('No organization selected')
    }

    const { error } = await supabase
      .from('payment_accounts')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (error) {
      throw new Error(`Error deleting payment account: ${error.message}`)
    }
  }

  static async setDefault(id: string): Promise<void> {
    // Get current organization ID
    const organizationId = await organizationService.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('No organization selected')
    }

    // First, remove default from all accounts in this organization
    await supabase
      .from('payment_accounts')
      .update({ is_default: false })
      .eq('organization_id', organizationId)

    // Then set the new default
    const { error } = await supabase
      .from('payment_accounts')
      .update({ is_default: true })
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (error) {
      throw new Error(`Error setting default account: ${error.message}`)
    }
  }

  static async getDefault(): Promise<PaymentAccount | null> {
    // Get current organization ID
    const organizationId = await organizationService.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('No organization selected')
    }

    const { data, error } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('is_default', true)
      .eq('organization_id', organizationId)
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
    // Get current organization ID
    const organizationId = await organizationService.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('No organization selected')
    }

    const { data, error } = await supabase
      .from('payment_accounts_summary')
      .select('*')
      .eq('organization_id', organizationId)

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