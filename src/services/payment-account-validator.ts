import { supabase } from './supabaseClient'
import { organizationService } from './organizations'

export interface PaymentAccountValidation {
  isValid: boolean
  message: string
  redirectUrl?: string
  accountsCount: number
}

export class PaymentAccountValidator {
  private static async getCurrentOrganizationId() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      throw new Error('No authenticated user')
    }

    const organizationId = await organizationService.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('No organization selected')
    }

    return organizationId
  }

  static async validatePaymentAccounts(): Promise<PaymentAccountValidation> {
    try {
      const organizationId = await this.getCurrentOrganizationId()
      
      // Buscar cuentas de pago activas
      const { data: accounts, error } = await supabase
        .from('payment_accounts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)

      if (error) {
        throw error
      }

      const accountsCount = accounts?.length || 0

      if (accountsCount === 0) {
        return {
          isValid: false,
          message: 'No tienes cuentas de destino configuradas para recibir pagos. Debes configurar al menos una cuenta antes de crear facturas.',
          redirectUrl: '/configuracion/cuentas',
          accountsCount: 0
        }
      }

      return {
        isValid: true,
        message: 'Cuentas de destino configuradas correctamente',
        accountsCount
      }
    } catch (error) {
      return {
        isValid: false,
        message: 'Error al validar las cuentas de destino',
        redirectUrl: '/configuracion/cuentas',
        accountsCount: 0
      }
    }
  }
}