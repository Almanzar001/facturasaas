import { supabase } from './supabaseClient'

// Simplified interfaces that work with any database schema
export interface FiscalDocumentType {
  id: string
  code: string
  name: string
  description?: string
  requires_tax_id: boolean
  is_active: boolean
}

export interface FiscalSequence {
  id: string
  user_id: string
  fiscal_document_type_id: string
  document_type?: FiscalDocumentType
  prefix: string
  suffix: string
  current_number: number
  start_number: number
  max_number: number
  padding_length: number
  is_active: boolean
}

export interface NextFiscalNumber {
  success: boolean
  sequence_id?: string
  fiscal_number?: string
  series?: string
  number?: number
  error?: string
}

export class FiscalDocumentServiceSimplified {
  // Get document types using JSON function (avoids type mismatch)
  static async getDocumentTypes(): Promise<FiscalDocumentType[]> {
    try {
      console.log('🔧 Fetching document types using simplified method...')

      // Use the JSON function to avoid type mismatch issues
      const { data, error } = await supabase.rpc('get_fiscal_doc_types_json')
      
      if (error) {
        console.warn('RPC function not available, trying direct query:', error)
        
        // Fallback to direct query
        const { data: directData, error: directError } = await supabase
          .from('fiscal_document_types')
          .select('id, code, name, description, is_active')
          .eq('is_active', true)
          .order('code')
          
        if (directError) {
          console.error('Direct query failed:', directError)
          return []
        }

        return (directData || []).map(item => ({
          id: item.id,
          code: item.code,
          name: item.name,
          description: item.description,
          requires_tax_id: item.code === 'B01' || item.code === 'B15',
          is_active: item.is_active
        }))
      }

      // Parse JSON result
      const types = Array.isArray(data) ? data : (data ? [data] : [])
      
      const result = types.map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        description: item.description,
        requires_tax_id: item.code === 'B01' || item.code === 'B15',
        is_active: item.is_active
      }))

      console.log('✅ Document types fetched:', result.length)
      return result
    } catch (error) {
      console.error('Error in getDocumentTypes:', error)
      return []
    }
  }

  // Ensure document types exist
  static async ensureDocumentTypes(): Promise<void> {
    try {
      const existing = await this.getDocumentTypes()
      
      if (existing.length > 0) {
        console.log('✅ Document types already exist:', existing.length)
        return
      }

      console.log('🔧 Creating default document types...')
      
      // Try to create basic types
      const typesToCreate = [
        { code: 'B01', name: 'Factura con Valor Fiscal', description: 'Genera crédito fiscal', is_active: true },
        { code: 'B02', name: 'Factura Consumidor Final', description: 'Para consumidores sin RNC', is_active: true },
        { code: 'B15', name: 'Factura Gubernamental', description: 'Para instituciones del gobierno', is_active: true }
      ]

      const { error } = await supabase
        .from('fiscal_document_types')
        .insert(typesToCreate)

      if (error) {
        console.warn('Could not create document types:', error)
      } else {
        console.log('✅ Default document types created')
      }
    } catch (error) {
      console.error('Error ensuring document types:', error)
    }
  }

  // Generate next fiscal number using simplified function
  static async getNextFiscalNumber(documentTypeId: string): Promise<NextFiscalNumber> {
    try {
      console.log('🔢 Generating fiscal number for type:', documentTypeId)

      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (userError || !userData.user) {
        return {
          success: false,
          error: 'Usuario no autenticado'
        }
      }

      // Use the simplified RPC function
      const { data, error } = await supabase.rpc('generate_fiscal_number_simple', {
        p_user_id: userData.user.id,
        p_document_type_id: documentTypeId
      })

      if (error) {
        console.error('❌ RPC function error:', error)
        
        // Fallback to direct sequence handling
        return await this.generateFiscalNumberFallback(documentTypeId, userData.user.id)
      }

      // Parse JSON result
      const result = data || {}
      
      if (result.success) {
        console.log('✅ Fiscal number generated:', result.fiscal_number)
        
        return {
          success: true,
          sequence_id: result.sequence_id,
          fiscal_number: result.fiscal_number,
          series: result.fiscal_number?.substring(0, result.fiscal_number.length - 8) || '',
          number: result.current_number
        }
      } else {
        console.error('❌ Generation failed:', result.error)
        return {
          success: false,
          error: result.error || 'Error generating fiscal number'
        }
      }

    } catch (error) {
      console.error('❌ Error generating fiscal number:', error)
      return {
        success: false,
        error: 'Error inesperado al generar número fiscal'
      }
    }
  }

  // Fallback method for direct sequence handling
  private static async generateFiscalNumberFallback(documentTypeId: string, userId: string): Promise<NextFiscalNumber> {
    try {
      console.log('🔄 Using fallback sequence generation...')

      // Get or create sequence
      let { data: sequence, error: seqError } = await supabase
        .from('fiscal_sequences')
        .select('*')
        .eq('user_id', userId)
        .eq('fiscal_document_type_id', documentTypeId)
        .eq('is_active', true)
        .single()

      if (seqError && seqError.code === 'PGRST116') {
        // No sequence exists, create one
        console.log('🆕 Creating new sequence...')
        
        const { data: docType } = await supabase
          .from('fiscal_document_types')
          .select('code')
          .eq('id', documentTypeId)
          .single()

        const sequenceData = {
          user_id: userId,
          fiscal_document_type_id: documentTypeId,
          prefix: docType?.code || 'DOC',
          suffix: '',
          current_number: 0,
          start_number: 1,
          max_number: 10000,
          padding_length: 8,
          is_active: true
        }

        const { data: newSeq, error: createError } = await supabase
          .from('fiscal_sequences')
          .insert([sequenceData])
          .select('*')
          .single()

        if (createError) {
          return {
            success: false,
            error: 'Error creating sequence: ' + createError.message
          }
        }

        sequence = newSeq
      } else if (seqError) {
        return {
          success: false,
          error: 'Error fetching sequence: ' + seqError.message
        }
      }

      if (!sequence) {
        return {
          success: false,
          error: 'No sequence available'
        }
      }

      // Check if exhausted
      if (sequence.current_number >= sequence.max_number) {
        return {
          success: false,
          error: 'Sequence exhausted'
        }
      }

      // Calculate next number
      const nextNumber = Math.max(sequence.current_number + 1, sequence.start_number || 1)

      // Update sequence
      const { error: updateError } = await supabase
        .from('fiscal_sequences')
        .update({ current_number: nextNumber })
        .eq('id', sequence.id)

      if (updateError) {
        return {
          success: false,
          error: 'Error updating sequence'
        }
      }

      // Format number
      const paddingLength = sequence.padding_length || 8
      const fiscalNumber = `${sequence.prefix || ''}${nextNumber.toString().padStart(paddingLength, '0')}${sequence.suffix || ''}`

      console.log('✅ Fiscal number generated (fallback):', fiscalNumber)

      return {
        success: true,
        sequence_id: sequence.id,
        fiscal_number: fiscalNumber,
        series: sequence.prefix,
        number: nextNumber
      }

    } catch (error) {
      console.error('❌ Fallback generation failed:', error)
      return {
        success: false,
        error: 'Fallback generation failed'
      }
    }
  }

  // Get active sequence for type
  static async getActiveSequenceForType(documentTypeId: string): Promise<FiscalSequence | null> {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return null

      const { data, error } = await supabase
        .from('fiscal_sequences')
        .select('*')
        .eq('user_id', userData.user.id)
        .eq('fiscal_document_type_id', documentTypeId)
        .eq('is_active', true)
        .single()

      if (error) {
        console.error('Error getting active sequence:', error)
        return null
      }

      return {
        id: data.id,
        user_id: data.user_id,
        fiscal_document_type_id: data.fiscal_document_type_id,
        prefix: data.prefix || '',
        suffix: data.suffix || '',
        current_number: data.current_number || 0,
        start_number: data.start_number || 1,
        max_number: data.max_number || 10000,
        padding_length: data.padding_length || 8,
        is_active: data.is_active
      }
    } catch (error) {
      console.error('Error in getActiveSequenceForType:', error)
      return null
    }
  }

  // Format fiscal number
  static formatFiscalNumber(prefix: string, number: number, suffix: string = '', paddingLength: number = 8): string {
    return `${prefix}${number.toString().padStart(paddingLength, '0')}${suffix}`
  }
}