import { supabase } from './supabaseClient'
import { organizationService } from './organizations'

export interface UserSettings {
  id: string
  user_id: string
  organization_id: string
  company_name: string
  company_rnc?: string
  company_address?: string
  company_phone?: string
  company_email?: string
  company_logo?: string // URL del logo
  tax_rate: number // Porcentaje de ITBIS (ej: 18 para 18%)
  currency: string
  invoice_prefix?: string
  quote_prefix?: string
  created_at: string
  updated_at: string
}

export interface UpdateSettingsData {
  company_name?: string
  company_rnc?: string
  company_address?: string
  company_phone?: string
  company_email?: string
  company_logo?: string
  tax_rate?: number
  currency?: string
  invoice_prefix?: string
  quote_prefix?: string
}

export class SettingsService {
  static async getSettings(): Promise<UserSettings | null> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return null

    // Get current organization ID
    const organizationId = await organizationService.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('No organization selected')
    }

    // Use organization table since user_settings doesn't exist yet
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (error) {
      throw new Error(`Error fetching settings: ${error.message}`)
    }

    if (!data) {
      return this.createDefaultSettings()
    }

    // Map organization data to UserSettings format
    const settings: UserSettings = {
      id: data.id,
      user_id: user.user.id,
      organization_id: data.id,
      company_name: data.name || 'Mi Empresa',
      company_rnc: data.tax_id || undefined,
      company_address: data.address || undefined,
      company_phone: data.phone || undefined,
      company_email: data.email || undefined,
      company_logo: data.logo_url || undefined,
      tax_rate: data.settings?.tax_rate || 18,
      currency: data.settings?.currency || 'RD$',
      invoice_prefix: data.settings?.invoice_prefix || 'FACT',
      quote_prefix: data.settings?.quote_prefix || 'COT',
      created_at: data.created_at,
      updated_at: data.updated_at
    }

    return settings
  }

  static async createDefaultSettings(): Promise<UserSettings> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('No authenticated user')

    // Get current organization ID
    const organizationId = await organizationService.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('No organization selected')
    }

    const defaultSettings = {
      settings: {
        tax_rate: 18, // ITBIS por defecto 18%
        currency: 'RD$',
        invoice_prefix: 'FACT',
        quote_prefix: 'COT'
      }
    }

    const { data, error } = await supabase
      .from('organizations')
      .update(defaultSettings)
      .eq('id', organizationId)
      .select()
      .single()

    if (error) {
      throw new Error(`Error creating default settings: ${error.message}`)
    }

    // Map back to UserSettings format
    const settings: UserSettings = {
      id: data.id,
      user_id: user.user.id,
      organization_id: data.id,
      company_name: data.name || 'Mi Empresa',
      company_rnc: data.tax_id || undefined,
      company_address: data.address || undefined,
      company_phone: data.phone || undefined,
      company_email: data.email || undefined,
      company_logo: data.logo_url || undefined,
      tax_rate: data.settings?.tax_rate || 18,
      currency: data.settings?.currency || 'RD$',
      invoice_prefix: data.settings?.invoice_prefix || 'FACT',
      quote_prefix: data.settings?.quote_prefix || 'COT',
      created_at: data.created_at,
      updated_at: data.updated_at
    }

    return settings
  }

  static async updateSettings(settingsData: UpdateSettingsData): Promise<UserSettings> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('No authenticated user')

    // Get current organization ID
    const organizationId = await organizationService.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('No organization selected')
    }

    // Get current organization data to merge with new data
    const { data: currentOrg } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()
    
    // Prepare update data for organizations table
    const updateData: any = {}
    
    // Map settings data to organization table columns
    if (settingsData.company_name) updateData.name = settingsData.company_name
    if (settingsData.company_rnc) updateData.tax_id = settingsData.company_rnc
    if (settingsData.company_address) updateData.address = settingsData.company_address
    if (settingsData.company_phone) updateData.phone = settingsData.company_phone
    if (settingsData.company_email) updateData.email = settingsData.company_email
    if (settingsData.company_logo) updateData.logo_url = settingsData.company_logo
    
    // Update settings object
    const newSettings = {
      ...currentOrg?.settings,
      ...(settingsData.tax_rate && { tax_rate: settingsData.tax_rate }),
      ...(settingsData.currency && { currency: settingsData.currency }),
      ...(settingsData.invoice_prefix && { invoice_prefix: settingsData.invoice_prefix }),
      ...(settingsData.quote_prefix && { quote_prefix: settingsData.quote_prefix })
    }
    
    updateData.settings = newSettings

    const { data, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select()
      .single()

    if (error) {
      throw new Error(`Error updating settings: ${error.message}`)
    }

    // Map back to UserSettings format
    const settings: UserSettings = {
      id: data.id,
      user_id: user.user.id,
      organization_id: data.id,
      company_name: data.name || 'Mi Empresa',
      company_rnc: data.tax_id || undefined,
      company_address: data.address || undefined,
      company_phone: data.phone || undefined,
      company_email: data.email || undefined,
      company_logo: data.logo_url || undefined,
      tax_rate: data.settings?.tax_rate || 18,
      currency: data.settings?.currency || 'RD$',
      invoice_prefix: data.settings?.invoice_prefix || 'FACT',
      quote_prefix: data.settings?.quote_prefix || 'COT',
      created_at: data.created_at,
      updated_at: data.updated_at
    }

    return settings
  }

  static formatTaxRate(rate: number): string {
    return `${rate}%`
  }

  static calculateTax(subtotal: number, taxRate: number): number {
    return subtotal * (taxRate / 100)
  }

  static async uploadLogo(file: File): Promise<string> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('No authenticated user')

      // Comprimir la imagen antes de subirla
      const compressedFile = await this.compressImage(file)
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      // Usar el user ID en la ruta para las políticas de seguridad
      const filePath = `${user.user.id}/logos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, compressedFile)

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      throw error
    }
  }

  static async compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          // Tamaño máximo 200x200
          const maxWidth = 200
          const maxHeight = 200
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height
              height = maxHeight
            }
          }

          canvas.width = width
          canvas.height = height
          ctx?.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error('Error al comprimir imagen'))
              }
            },
            'image/jpeg',
            0.7 // Calidad 70%
          )
        }
      }
    })
  }
}