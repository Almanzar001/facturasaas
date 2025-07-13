import { supabase } from './supabaseClient'

export interface CustomFiscalSequence {
  id: string
  user_id: string
  fiscal_document_type_id: string
  document_type?: {
    id: string
    code: string
    name: string
    description?: string
  }
  prefix: string
  suffix: string
  current_number: number
  start_number: number
  max_number: number
  padding_length: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateCustomSequenceData {
  fiscal_document_type_id: string
  prefix?: string
  suffix?: string
  start_number?: number
  max_number?: number
  padding_length?: number
}

export interface UpdateCustomSequenceData {
  prefix?: string
  suffix?: string
  current_number?: number
  start_number?: number
  max_number?: number
  padding_length?: number
  is_active?: boolean
}

export interface FiscalNumberResult {
  success: boolean
  fiscal_number?: string
  sequence_id?: string
  error?: string
}

export class FiscalSequenceManagementService {
  // Get all custom fiscal sequences for the user
  static async getAllSequences(): Promise<CustomFiscalSequence[]> {
    try {
      const { data, error } = await supabase
        .from('fiscal_sequences')
        .select(`
          *,
          document_type:fiscal_document_types(id, code, name, description)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching sequences:', error)
        throw new Error(`Error fetching sequences: ${error.message}`)
      }

      return data?.map(seq => ({
        id: seq.id,
        user_id: seq.user_id,
        fiscal_document_type_id: seq.fiscal_document_type_id,
        document_type: seq.document_type,
        prefix: seq.prefix || '',
        suffix: seq.suffix || '',
        current_number: seq.current_number || 0,
        start_number: seq.start_number || 1,
        max_number: seq.max_number || 10000,
        padding_length: seq.padding_length || 8,
        is_active: seq.is_active || false,
        created_at: seq.created_at,
        updated_at: seq.updated_at
      })) || []
    } catch (error) {
      console.error('Error in getAllSequences:', error)
      throw error
    }
  }

  // Get sequence by document type
  static async getSequenceByDocumentType(documentTypeId: string): Promise<CustomFiscalSequence | null> {
    try {
      console.log('🔍 FiscalSequenceManagementService: Buscando secuencia para ID:', documentTypeId)
      
      // Primero ver todas las secuencias que existen
      const { data: allSequences, error: allError } = await supabase
        .from('fiscal_sequences')
        .select('id, fiscal_document_type_id, is_active, prefix, suffix, current_number')
      
      console.log('🔍 Todas las secuencias en BD:', allSequences)
      console.log('🔍 Error al obtener todas:', allError)
      
      const { data, error } = await supabase
        .from('fiscal_sequences')
        .select(`
          *,
          document_type:fiscal_document_types(id, code, name, description)
        `)
        .eq('fiscal_document_type_id', documentTypeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)

      console.log('🔍 Query result:', { data, error })

      if (error) {
        console.error('❌ Error en query:', error)
        throw new Error(`Error fetching sequence: ${error.message}`)
      }

      if (!data || data.length === 0) {
        console.log('❌ No data returned')
        return null
      }

      // Tomar el primer resultado (más reciente)
      const sequence = data[0]

      console.log('✅ Secuencia personalizada encontrada:', sequence)
      
      return {
        id: sequence.id,
        user_id: sequence.user_id,
        fiscal_document_type_id: sequence.fiscal_document_type_id,
        document_type: sequence.document_type,
        prefix: sequence.prefix || '',
        suffix: sequence.suffix || '',
        current_number: sequence.current_number || 0,
        start_number: sequence.start_number || 1,
        max_number: sequence.max_number || 10000,
        padding_length: sequence.padding_length || 8,
        is_active: sequence.is_active || false,
        created_at: sequence.created_at,
        updated_at: sequence.updated_at
      }
    } catch (error) {
      console.error('Error in getSequenceByDocumentType:', error)
      throw error
    }
  }

  // Create a new custom fiscal sequence
  static async createCustomSequence(data: CreateCustomSequenceData): Promise<CustomFiscalSequence> {
    try {
      // Check if sequence already exists for this document type
      const existing = await this.getSequenceByDocumentType(data.fiscal_document_type_id)
      if (existing) {
        throw new Error('Ya existe una secuencia para este tipo de documento')
      }

      const startNumber = data.start_number || 1
      const sequenceData = {
        fiscal_document_type_id: data.fiscal_document_type_id,
        prefix: data.prefix || '',
        suffix: data.suffix || '',
        current_number: startNumber - 1, // El próximo número será start_number
        start_number: startNumber,
        max_number: data.max_number || 10000,
        padding_length: data.padding_length || 8,
        is_active: true
      }

      const { data: result, error } = await supabase
        .from('fiscal_sequences')
        .insert([sequenceData])
        .select(`
          *,
          document_type:fiscal_document_types(id, code, name, description)
        `)
        .single()

      if (error) {
        throw new Error(`Error creating sequence: ${error.message}`)
      }

      return {
        id: result.id,
        user_id: result.user_id,
        fiscal_document_type_id: result.fiscal_document_type_id,
        document_type: result.document_type,
        prefix: result.prefix || '',
        suffix: result.suffix || '',
        current_number: result.current_number || 0,
        start_number: result.start_number || 1,
        max_number: result.max_number || 10000,
        padding_length: result.padding_length || 8,
        is_active: result.is_active || false,
        created_at: result.created_at,
        updated_at: result.updated_at
      }
    } catch (error) {
      console.error('Error in createCustomSequence:', error)
      throw error
    }
  }

  // Update an existing custom fiscal sequence
  static async updateCustomSequence(id: string, data: UpdateCustomSequenceData): Promise<CustomFiscalSequence> {
    try {
      const { data: result, error } = await supabase
        .from('fiscal_sequences')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          document_type:fiscal_document_types(id, code, name, description)
        `)
        .single()

      if (error) {
        throw new Error(`Error updating sequence: ${error.message}`)
      }

      return {
        id: result.id,
        user_id: result.user_id,
        fiscal_document_type_id: result.fiscal_document_type_id,
        document_type: result.document_type,
        prefix: result.prefix || '',
        suffix: result.suffix || '',
        current_number: result.current_number || 0,
        start_number: result.start_number || 1,
        max_number: result.max_number || 10000,
        padding_length: result.padding_length || 8,
        is_active: result.is_active || false,
        created_at: result.created_at,
        updated_at: result.updated_at
      }
    } catch (error) {
      console.error('Error in updateCustomSequence:', error)
      throw error
    }
  }

  // Delete a fiscal sequence
  static async deleteSequence(id: string): Promise<void> {
    try {
      console.log('Deleting sequence with ID:', id)
      
      const { data, error } = await supabase
        .from('fiscal_sequences')
        .delete()
        .eq('id', id)
        .select()

      console.log('Delete result:', { data, error })

      if (error) {
        console.error('Supabase delete error:', error)
        throw new Error(`Error deleting sequence: ${error.message}`)
      }
      
      console.log('Sequence deleted successfully')
    } catch (error) {
      console.error('Error in deleteSequence:', error)
      throw error
    }
  }

  // Reset sequence to start number
  static async resetSequence(id: string): Promise<CustomFiscalSequence> {
    try {
      // Get current sequence to get start_number
      const { data: sequence, error: getError } = await supabase
        .from('fiscal_sequences')
        .select('start_number')
        .eq('id', id)
        .single()

      if (getError) {
        throw new Error(`Error getting sequence: ${getError.message}`)
      }

      // Reset current_number to start_number - 1 (so next number will be start_number)
      const resetData = {
        current_number: (sequence.start_number || 1) - 1
      }

      return await this.updateCustomSequence(id, resetData)
    } catch (error) {
      console.error('Error in resetSequence:', error)
      throw error
    }
  }

  // Generate next fiscal number using custom format
  static async generateNextFiscalNumber(documentTypeId: string): Promise<FiscalNumberResult> {
    try {
      const sequence = await this.getSequenceByDocumentType(documentTypeId)
      
      if (!sequence) {
        return {
          success: false,
          error: 'No se encontró una secuencia activa para este tipo de documento'
        }
      }

      if (!sequence.is_active) {
        return {
          success: false,
          error: 'La secuencia está desactivada'
        }
      }

      // Check if sequence is exhausted
      if (sequence.current_number >= sequence.max_number) {
        return {
          success: false,
          error: 'La secuencia ha alcanzado su número máximo'
        }
      }

      // Calculate next number
      const nextNumber = Math.max(sequence.current_number + 1, sequence.start_number)

      // Update sequence
      const { error: updateError } = await supabase
        .from('fiscal_sequences')
        .update({ current_number: nextNumber })
        .eq('id', sequence.id)

      if (updateError) {
        return {
          success: false,
          error: 'Error al actualizar la secuencia'
        }
      }

      // Format fiscal number
      const paddedNumber = nextNumber.toString().padStart(sequence.padding_length, '0')
      const fiscalNumber = `${sequence.prefix}${paddedNumber}${sequence.suffix}`

      return {
        success: true,
        fiscal_number: fiscalNumber,
        sequence_id: sequence.id
      }
    } catch (error) {
      console.error('Error in generateNextFiscalNumber:', error)
      return {
        success: false,
        error: 'Error inesperado al generar número fiscal'
      }
    }
  }

  // Preview fiscal number format
  static previewFiscalNumber(
    prefix: string = '', 
    suffix: string = '', 
    number: number = 1, 
    paddingLength: number = 8
  ): string {
    const paddedNumber = number.toString().padStart(paddingLength, '0')
    return `${prefix}${paddedNumber}${suffix}`
  }

  // Get sequence statistics
  static async getSequenceStats(id: string): Promise<{
    total_used: number
    remaining: number
    percentage_used: number
    next_number: string
    is_near_limit: boolean
  } | null> {
    try {
      const { data, error } = await supabase
        .from('fiscal_sequences')
        .select('current_number, max_number, start_number, prefix, suffix, padding_length')
        .eq('id', id)
        .single()

      if (error || !data) {
        return null
      }

      const used = data.current_number - (data.start_number - 1)
      const total = data.max_number - (data.start_number - 1)
      const remaining = data.max_number - data.current_number
      const percentageUsed = total > 0 ? (used / total) * 100 : 0
      
      const nextNumber = this.previewFiscalNumber(
        data.prefix || '',
        data.suffix || '',
        data.current_number + 1,
        data.padding_length || 8
      )

      return {
        total_used: used,
        remaining,
        percentage_used: Math.round(percentageUsed * 100) / 100,
        next_number: nextNumber,
        is_near_limit: percentageUsed > 80
      }
    } catch (error) {
      console.error('Error in getSequenceStats:', error)
      return null
    }
  }

  // Validate sequence configuration
  static validateSequenceConfig(data: Partial<CreateCustomSequenceData & UpdateCustomSequenceData>): string[] {
    const errors: string[] = []

    if (data.start_number !== undefined && data.start_number < 1) {
      errors.push('El número inicial debe ser mayor a 0')
    }

    if (data.max_number !== undefined && data.max_number < 1) {
      errors.push('El número máximo debe ser mayor a 0')
    }

    if (data.start_number !== undefined && data.max_number !== undefined && data.start_number > data.max_number) {
      errors.push('El número inicial no puede ser mayor al número máximo')
    }

    if (data.padding_length !== undefined && (data.padding_length < 1 || data.padding_length > 20)) {
      errors.push('La longitud de relleno debe estar entre 1 y 20')
    }

    if (data.prefix !== undefined && data.prefix.length > 10) {
      errors.push('El prefijo no puede tener más de 10 caracteres')
    }

    if (data.suffix !== undefined && data.suffix.length > 10) {
      errors.push('El sufijo no puede tener más de 10 caracteres')
    }

    return errors
  }
}