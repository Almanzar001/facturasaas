import { supabase } from './supabaseClient'

export interface UserSettings {
  id: string
  user_id: string
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

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.user.id)
      .single()

    if (error) {
      // Si no existe configuración, crear una por defecto
      if (error.code === 'PGRST116') {
        return this.createDefaultSettings()
      }
      throw new Error(`Error fetching settings: ${error.message}`)
    }

    return data
  }

  static async createDefaultSettings(): Promise<UserSettings> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('No authenticated user')

    const defaultSettings = {
      user_id: user.user.id,
      company_name: 'Mi Empresa',
      tax_rate: 18, // ITBIS por defecto 18%
      currency: 'RD$',
      invoice_prefix: 'FACT',
      quote_prefix: 'COT'
    }

    const { data, error } = await supabase
      .from('user_settings')
      .insert([defaultSettings])
      .select()
      .single()

    if (error) {
      throw new Error(`Error creating default settings: ${error.message}`)
    }

    return data
  }

  static async updateSettings(settingsData: UpdateSettingsData): Promise<UserSettings> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('No authenticated user')

    const { data, error } = await supabase
      .from('user_settings')
      .update(settingsData)
      .eq('user_id', user.user.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Error updating settings: ${error.message}`)
    }

    return data
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
        console.error('Upload error:', uploadError)
        throw uploadError
      }

      const { data } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Error uploading logo:', error)
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