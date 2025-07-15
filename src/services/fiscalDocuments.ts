import { supabase } from './supabaseClient'

export interface FiscalDocumentType {
  id: string
  code: string
  name: string
  description?: string
  requires_tax_id: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FiscalSequence {
  id: string
  user_id: string
  fiscal_document_type_id: string
  document_type?: FiscalDocumentType
  series: string
  current_number: number
  min_number: number
  max_number: number
  expiration_date?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateFiscalSequenceData {
  fiscal_document_type_id: string
  series: string
  min_number?: number
  max_number: number
  expiration_date?: string
}

export interface UpdateFiscalSequenceData {
  is_active?: boolean
  expiration_date?: string
}

export interface FiscalSequenceStatus {
  id: string
  document_type_code: string
  document_type_name: string
  series: string
  current_number: number
  max_number: number
  available_numbers: number
  status: 'disponible' | 'por_agotar' | 'agotada'
  expiration_date?: string
  expiring_soon: boolean
  is_active: boolean
}

export interface NextFiscalNumber {
  sequence_id: string
  fiscal_number: string
  series: string
  number: number
}

export class FiscalDocumentService {
  static async getDocumentTypes(): Promise<FiscalDocumentType[]> {
    // Primero asegurar que existan los tipos básicos
    await this.ensureBasicDocumentTypes()
    
    const { data, error } = await supabase
      .from('fiscal_document_types')
      .select('*')
      .eq('is_active', true)
      .order('code')

    if (error) {
      throw new Error(`Error fetching document types: ${error.message}`)
    }

    return data || []
  }

  static async ensureBasicDocumentTypes(): Promise<void> {
    try {
      // Verificar si existen tipos de documento
      const { data: existing } = await supabase
        .from('fiscal_document_types')
        .select('code')
        .in('code', ['B01', 'B02', 'B15'])

      const existingCodes = existing?.map(t => t.code) || []
      
      const typesToCreate = [
        { 
          code: 'B01', 
          name: 'Factura con Valor Fiscal', 
          description: 'Genera crédito fiscal', 
          requires_tax_id: true,
          is_active: true 
        },
        { 
          code: 'B02', 
          name: 'Factura Consumidor Final', 
          description: 'Para consumidores sin RNC', 
          requires_tax_id: false,
          is_active: true 
        },
        { 
          code: 'B15', 
          name: 'Factura Gubernamental', 
          description: 'Para instituciones del gobierno', 
          requires_tax_id: true,
          is_active: true 
        }
      ].filter(type => !existingCodes.includes(type.code))

      if (typesToCreate.length > 0) {
        const { error } = await supabase
          .from('fiscal_document_types')
          .insert(typesToCreate)
        
        if (error) {
          }
      }
    } catch (error) {
    }
  }

  static async getSequences(includeInactive: boolean = false): Promise<FiscalSequence[]> {
    // Get current user for authentication
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      throw new Error('No authenticated user')
    }

    let query = supabase
      .from('fiscal_sequences')
      .select(`
        *,
        document_type:fiscal_document_types(*)
      `)
      .order('created_at', { ascending: false })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Error fetching sequences: ${error.message}`)
    }

    return data || []
  }

  static async getSequenceById(id: string): Promise<FiscalSequence | null> {
    const { data, error } = await supabase
      .from('fiscal_sequences')
      .select(`
        *,
        document_type:fiscal_document_types(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Error fetching sequence: ${error.message}`)
    }

    return data
  }

  static async createSequence(sequenceData: CreateFiscalSequenceData): Promise<FiscalSequence> {
    // Get current user for authentication
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      throw new Error('No authenticated user')
    }
    
    // Verificar si ya existe una secuencia para este tipo de documento
    const { data: existingSequences } = await supabase
      .from('fiscal_sequences')
      .select('id, series, is_active')
      .eq('fiscal_document_type_id', sequenceData.fiscal_document_type_id)
    
    
    if (existingSequences && existingSequences.length > 0) {
      const activeSequence = existingSequences.find(s => s.is_active)
      if (activeSequence) {
        throw new Error(`Ya existe una secuencia activa (${activeSequence.series}) para este tipo de documento`)
      }
    }
    
    // Limpiar la fecha de expiración si está vacía
    let cleanedData = {
      ...sequenceData,
      min_number: sequenceData.min_number || 1,
      current_number: (sequenceData.min_number || 1) - 1,
      expiration_date: sequenceData.expiration_date || null
    }

    // Si expiration_date es una cadena vacía, establecerla como null
    if (cleanedData.expiration_date === '') {
      const { expiration_date, ...dataWithoutExpiration } = cleanedData;
      cleanedData = dataWithoutExpiration as any;
    }


    const { data, error } = await supabase
      .from('fiscal_sequences')
      .insert([cleanedData])
      .select(`
        *,
        document_type:fiscal_document_types(*)
      `)
      .single()

    if (error) {
      throw new Error(`Error creating sequence: ${error.message}`)
    }

    return data
  }

  static async updateSequence(id: string, sequenceData: UpdateFiscalSequenceData): Promise<FiscalSequence> {
    // Limpiar la fecha de expiración si está vacía
    let cleanedData = { ...sequenceData }
    if (cleanedData.expiration_date === '') {
      const { expiration_date, ...dataWithoutExpiration } = cleanedData;
      cleanedData = dataWithoutExpiration as any;
    }

    const { data, error } = await supabase
      .from('fiscal_sequences')
      .update(cleanedData)
      .eq('id', id)
      .select(`
        *,
        document_type:fiscal_document_types(*)
      `)
      .single()

    if (error) {
      throw new Error(`Error updating sequence: ${error.message}`)
    }

    return data
  }

  static async deleteSequence(id: string): Promise<void> {
    const { error } = await supabase
      .from('fiscal_sequences')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Error deleting sequence: ${error.message}`)
    }
  }

  static async getSequencesStatus(): Promise<FiscalSequenceStatus[]> {
    const { data, error } = await supabase
      .from('fiscal_sequences_status')
      .select('*')
      .order('document_type_code')

    if (error) {
      throw new Error(`Error fetching sequences status: ${error.message}`)
    }

    return data || []
  }

  static async getNextFiscalNumber(documentTypeId: string): Promise<NextFiscalNumber> {
    // Obtener el usuario primero
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      throw new Error('Error de autenticación: No se pudo obtener el usuario actual')
    }

    // MÉTODO ALTERNATIVO: Generar número fiscal sin usar RPC
    try {
      // 1. Buscar secuencia activa disponible
      const { data: sequences, error: seqError } = await supabase
        .from('fiscal_sequences')
        .select(`
          *,
          document_type:fiscal_document_types(*)
        `)
        .eq('fiscal_document_type_id', documentTypeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (seqError || !sequences || sequences.length === 0) {
        throw new Error('No se pudo generar el número fiscal: No hay secuencia activa disponible para este tipo de comprobante.\n\nPara resolver este problema:\n1. Ve a Configuración > Comprobantes Fiscales\n2. Haz clic en "Nueva Secuencia"\n3. Selecciona el tipo de comprobante correspondiente\n4. Configura la serie y el rango de números\n5. Asegúrate de que la secuencia esté activa')
      }

      // Filtrar secuencias que tengan números disponibles
      const availableSequences = sequences.filter(seq => seq.current_number < seq.max_number)

      if (availableSequences.length === 0) {
        throw new Error('No se pudo generar el número fiscal: Todas las secuencias están agotadas.')
      }

      const sequence = availableSequences[0]



      // 2. Incrementar el número actual
      const nextNumber = sequence.current_number + 1

      // 3. Actualizar la secuencia
      const { error: updateError } = await supabase
        .from('fiscal_sequences')
        .update({
          current_number: nextNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', sequence.id)

      if (updateError) {
        throw new Error(`Error actualizando secuencia: ${updateError.message}`)
      }

      // 4. Formatear número fiscal
      const fiscalNumber = `${sequence.series}${nextNumber.toString().padStart(8, '0')}`

      return {
        sequence_id: sequence.id,
        fiscal_number: fiscalNumber,
        series: sequence.series,
        number: nextNumber
      }

    } catch (error) {
      throw error
    }
  }

  static async getActiveSequenceForType(documentTypeId: string): Promise<FiscalSequence | null> {
    const { data, error } = await supabase
      .from('fiscal_sequences')
      .select(`
        *,
        document_type:fiscal_document_types(*)
      `)
      .eq('fiscal_document_type_id', documentTypeId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Error fetching active sequence: ${error.message}`)
    }

    // Filter sequences that have available numbers
    const availableSequences = data?.filter(sequence => 
      sequence.current_number < sequence.max_number
    ) || []

    return availableSequences[0] || null
  }

  static formatFiscalNumber(series: string, number: number): string {
    return `${series}${number.toString().padStart(8, '0')}`
  }

  static getDocumentTypeLabel(code: string): string {
    const types: Record<string, string> = {
      '01': 'Crédito Fiscal',
      '02': 'Consumidor Final',
      '03': 'Nota de Débito',
      '04': 'Nota de Crédito',
      '11': 'Compras',
      '12': 'Único de Ingresos',
      '13': 'Gastos Menores',
      '14': 'Régimen Especial',
      '15': 'Gubernamental'
    }
    return types[code] || code
  }
}