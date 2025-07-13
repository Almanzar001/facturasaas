import { supabase } from './supabaseClient'

// ============================================
// SERVICIO FISCAL CON AUTO-CREACIÓN
// ============================================

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

export interface CreateFiscalSequenceData {
  fiscal_document_type_id: string
  prefix: string
  suffix?: string
  start_number?: number
  max_number?: number
  padding_length?: number
}

export interface NextFiscalNumber {
  success: boolean
  sequence_id?: string
  fiscal_number?: string
  series?: string
  number?: number
  error?: string
}

export class FiscalDocumentService {
  // Asegurar que existan tipos de documento básicos
  static async ensureDocumentTypes(): Promise<void> {
    try {
      const { data: existing } = await supabase
        .from('fiscal_document_types')
        .select('code')
        .in('code', ['B01', 'B02', 'B15'])

      const existingCodes = existing?.map(t => t.code) || []
      
      const typesToCreate = [
        { code: 'B01', name: 'Factura con Valor Fiscal', description: 'Genera crédito fiscal', requires_tax_id: true },
        { code: 'B02', name: 'Factura Consumidor Final', description: 'Para consumidores sin RNC', requires_tax_id: false },
        { code: 'B15', name: 'Factura Gubernamental', description: 'Para instituciones del gobierno', requires_tax_id: true }
      ].filter(type => !existingCodes.includes(type.code))

      if (typesToCreate.length > 0) {
        await supabase
          .from('fiscal_document_types')
          .insert(typesToCreate.map(type => ({ ...type, is_active: true })))
      }
    } catch (error) {
      console.error('Error ensuring document types:', error)
    }
  }

  // Obtener tipos de comprobante
  static async getDocumentTypes(): Promise<FiscalDocumentType[]> {
    try {
      // Asegurar que existan los tipos básicos
      await this.ensureDocumentTypes()

      const { data, error } = await supabase
        .from('fiscal_document_types')
        .select('*')
        .eq('is_active', true)
        .order('code')

      if (error) {
        console.error('Error fetching document types:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getDocumentTypes:', error)
      return []
    }
  }

  // Obtener secuencias del usuario
  static async getSequences(): Promise<FiscalSequence[]> {
    try {
      const { data, error } = await supabase
        .from('fiscal_sequences')
        .select(`
          *,
          document_type:fiscal_document_types(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching sequences:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getSequences:', error)
      return []
    }
  }

  // Crear secuencia automáticamente si no existe
  static async ensureSequenceExists(documentTypeId: string, userId: string): Promise<FiscalSequence | null> {
    try {
      console.log('Verificando secuencia para usuario:', userId, 'tipo:', documentTypeId)

      // Buscar secuencia existente - Handle both old and new column names
      let existing = null
      let searchError = null

      // Try with new column name first
      const { data: existingNew, error: searchErrorNew } = await supabase
        .from('fiscal_sequences')
        .select('*')
        .eq('user_id', userId)
        .eq('fiscal_document_type_id', documentTypeId)
        .eq('is_active', true)
        .maybeSingle()

      if (!searchErrorNew) {
        existing = existingNew
      } else {
        // If new column doesn't exist, the migration might not have run
        console.log('fiscal_document_type_id column not found - migration may be needed')
        searchError = searchErrorNew
      }

      if (searchError) {
        console.error('Error buscando secuencia existente:', searchError)
        // Continue to try creating a new one
      }

      if (existing) {
        console.log('Secuencia existente encontrada:', existing.id)
        return existing
      }

      console.log('No hay secuencia existente, creando nueva...')

      // Obtener tipo de documento para la serie
      const { data: docType, error: docTypeError } = await supabase
        .from('fiscal_document_types')
        .select('code')
        .eq('id', documentTypeId)
        .single()

      if (docTypeError) {
        console.error('Error obteniendo tipo de documento:', docTypeError)
        return null
      }

      if (!docType) {
        console.error('Tipo de documento no encontrado')
        return null
      }

      // Crear nueva secuencia con el esquema actualizado
      const sequenceData = {
        user_id: userId,
        fiscal_document_type_id: documentTypeId,
        prefix: docType.code,
        suffix: '',
        current_number: 0,
        start_number: 1,
        max_number: 10000,
        padding_length: 8,
        is_active: true
      }

      console.log('Creando secuencia con datos:', sequenceData)

      const { data: newSequence, error: createError } = await supabase
        .from('fiscal_sequences')
        .insert([sequenceData])
        .select('*')
        .single()

      if (createError) {
        console.error('Error creando secuencia:', createError)
        console.error('Código de error:', createError.code)
        console.error('Mensaje de error:', createError.message)
        console.error('Detalles:', createError.details)
        
        // If the error is about missing columns, provide helpful guidance
        if (createError.message?.includes('column') && createError.message?.includes('does not exist')) {
          console.error('⚠️  SCHEMA MISMATCH: La tabla fiscal_sequences no tiene las columnas requeridas.')
          console.error('💡 SOLUCIÓN: Ejecuta la migración 005_update_fiscal_sequences_table.sql en Supabase')
        }
        
        return null
      }

      console.log('Nueva secuencia creada:', newSequence.id)
      return newSequence
    } catch (error) {
      console.error('Error in ensureSequenceExists:', error)
      return null
    }
  }

  // Crear nueva secuencia manualmente
  static async createSequence(sequenceData: CreateFiscalSequenceData): Promise<FiscalSequence | null> {
    try {
      // Verificar usuario autenticado
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (userError || !userData.user) {
        console.error('Usuario no autenticado:', userError)
        return null
      }

      return await this.ensureSequenceExists(sequenceData.fiscal_document_type_id, userData.user.id)
    } catch (error) {
      console.error('Error in createSequence:', error)
      return null
    }
  }

  // Obtener siguiente número fiscal (CON AUTO-CREACIÓN Y FORMATO PERSONALIZADO)
  static async getNextFiscalNumber(documentTypeId: string): Promise<NextFiscalNumber> {
    try {
      console.log('=== INICIANDO GENERACIÓN DE NÚMERO FISCAL ===')
      console.log('Tipo de documento solicitado:', documentTypeId)

      // Verificar usuario autenticado
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (userError || !userData.user) {
        console.error('Usuario no autenticado:', userError)
        return {
          success: false,
          error: 'Usuario no autenticado'
        }
      }

      console.log('Usuario autenticado:', userData.user.id)

      // Intentar usar el sistema personalizado primero
      try {
        const { FiscalSequenceManagementService } = await import('./fiscalSequenceManagement')
        const result = await FiscalSequenceManagementService.generateNextFiscalNumber(documentTypeId)
        
        if (result.success) {
          console.log('Número fiscal generado con sistema personalizado:', result.fiscal_number)
          return {
            success: true,
            sequence_id: result.sequence_id,
            fiscal_number: result.fiscal_number,
            series: result.fiscal_number?.substring(0, result.fiscal_number.length - 8) || '',
            number: parseInt(result.fiscal_number?.slice(-8) || '0')
          }
        }
      } catch (error) {
        console.log('Sistema personalizado no disponible, usando sistema por defecto')
      }

      // Fallback al sistema original
      const sequence = await this.ensureSequenceExists(documentTypeId, userData.user.id)
      
      if (!sequence) {
        return {
          success: false,
          error: 'No se pudo crear o encontrar una secuencia fiscal'
        }
      }

      console.log('Secuencia encontrada/creada:', sequence.id, 'número actual:', sequence.current_number)

      // Verificar que la secuencia no esté agotada
      if (sequence.current_number >= sequence.max_number) {
        return {
          success: false,
          error: 'La secuencia fiscal está agotada'
        }
      }

      // Calcular siguiente número
      const nextNumber = sequence.current_number + 1

      // Actualizar secuencia
      const { error: updateError } = await supabase
        .from('fiscal_sequences')
        .update({
          current_number: nextNumber
        })
        .eq('id', sequence.id)

      if (updateError) {
        console.error('Error actualizando secuencia:', updateError)
        return {
          success: false,
          error: 'Error actualizando secuencia'
        }
      }

      // Formatear número fiscal con formato básico
      const paddingLength = sequence.padding_length || 8
      const fiscalNumber = `${sequence.prefix || ''}${nextNumber.toString().padStart(paddingLength, '0')}${sequence.suffix || ''}`

      console.log('Número fiscal generado exitosamente:', fiscalNumber)

      return {
        success: true,
        sequence_id: sequence.id,
        fiscal_number: fiscalNumber,
        series: sequence.prefix,
        number: nextNumber
      }

    } catch (error) {
      console.error('Error in getNextFiscalNumber:', error)
      return {
        success: false,
        error: 'Error inesperado al generar número fiscal'
      }
    }
  }

  // Obtener secuencia activa para un tipo
  static async getActiveSequenceForType(documentTypeId: string): Promise<FiscalSequence | null> {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return null

      // Intentar obtener secuencia existente o crear una nueva
      return await this.ensureSequenceExists(documentTypeId, userData.user.id)
    } catch (error) {
      console.error('Error in getActiveSequenceForType:', error)
      return null
    }
  }

  // Formatear número fiscal
  static formatFiscalNumber(prefix: string, number: number, suffix: string = '', paddingLength: number = 8): string {
    return `${prefix}${number.toString().padStart(paddingLength, '0')}${suffix}`
  }

  // Obtener estado de secuencias
  static async getSequencesStatus() {
    try {
      const { data, error } = await supabase
        .from('fiscal_sequences')
        .select(`
          *,
          document_type:fiscal_document_types(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching sequences status:', error)
        return []
      }

      return (data || []).map(seq => ({
        ...seq,
        document_type_code: seq.document_type?.code,
        document_type_name: seq.document_type?.name,
        available_numbers: (seq.max_number || 10000) - (seq.current_number || 0),
        status: (seq.current_number || 0) >= (seq.max_number || 10000) ? 'agotada' : 
                ((seq.max_number || 10000) - (seq.current_number || 0)) <= 100 ? 'por_agotar' : 'disponible'
      }))
    } catch (error) {
      console.error('Error in getSequencesStatus:', error)
      return []
    }
  }

  // Eliminar secuencia
  static async deleteSequence(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('fiscal_sequences')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting sequence:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deleteSequence:', error)
      return false
    }
  }

  // Activar/desactivar secuencia
  static async toggleSequence(id: string, isActive: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('fiscal_sequences')
        .update({ is_active: !isActive })
        .eq('id', id)

      if (error) {
        console.error('Error toggling sequence:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in toggleSequence:', error)
      return false
    }
  }
}