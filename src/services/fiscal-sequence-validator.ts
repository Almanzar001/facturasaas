import { supabase } from './supabaseClient'
import { organizationService } from './organizations'

export interface FiscalSequenceValidation {
  isValid: boolean
  message: string
  missingSequences: string[]
  redirectUrl?: string
}

export class FiscalSequenceValidator {
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

  static async validateSpecificDocumentType(documentTypeId: string): Promise<FiscalSequenceValidation> {
    try {
      const organizationId = await this.getCurrentOrganizationId()
      
      if (!documentTypeId) {
        return {
          isValid: false,
          message: 'Debes seleccionar un tipo de comprobante primero',
          missingSequences: [],
          redirectUrl: '/configuracion/secuencias'
        }
      }

      // Buscar secuencias fiscales activas para el tipo de documento específico
      const { data: sequences, error } = await supabase
        .from('fiscal_sequences')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('document_type_id', documentTypeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      if (!sequences || sequences.length === 0) {
        // Obtener información del tipo de documento para el mensaje
        const { data: documentType } = await supabase
          .from('fiscal_document_types')
          .select('name, code')
          .eq('id', documentTypeId)
          .single()

        return {
          isValid: false,
          message: `No tienes secuencias fiscales configuradas para el tipo de comprobante "${documentType?.name || 'seleccionado'}". Debes configurar al menos una secuencia antes de crear esta factura.`,
          missingSequences: [documentTypeId],
          redirectUrl: '/configuracion/secuencias'
        }
      }

      // Verificar que al menos una secuencia tenga números disponibles
      const activeSequence = sequences.find(seq => 
        seq.current_number < seq.end_number
      )

      if (!activeSequence) {
        // Obtener información del tipo de documento para el mensaje
        const { data: documentType } = await supabase
          .from('fiscal_document_types')
          .select('name, code')
          .eq('id', documentTypeId)
          .single()

        return {
          isValid: false,
          message: `Todas las secuencias fiscales para el tipo de comprobante "${documentType?.name || 'seleccionado'}" están agotadas. Debes configurar nuevas secuencias.`,
          missingSequences: [documentTypeId],
          redirectUrl: '/configuracion/secuencias'
        }
      }

      return {
        isValid: true,
        message: 'Secuencias fiscales disponibles para el tipo de comprobante seleccionado',
        missingSequences: []
      }
    } catch (error) {
      return {
        isValid: false,
        message: 'Error al validar las secuencias fiscales para el tipo de comprobante seleccionado',
        missingSequences: [documentTypeId],
        redirectUrl: '/configuracion/secuencias'
      }
    }
  }

  static async validateInvoiceSequences(): Promise<FiscalSequenceValidation> {
    try {
      const organizationId = await this.getCurrentOrganizationId()
      
      // Buscar secuencias fiscales activas para facturas
      const { data: sequences, error } = await supabase
        .from('fiscal_sequences')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('document_type', 'invoice')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      if (!sequences || sequences.length === 0) {
        return {
          isValid: false,
          message: 'No tienes secuencias fiscales configuradas para facturas. Debes configurar al menos una secuencia antes de crear facturas.',
          missingSequences: ['invoice'],
          redirectUrl: '/configuracion/secuencias'
        }
      }

      // Verificar que al menos una secuencia tenga números disponibles
      const activeSequence = sequences.find(seq => 
        seq.current_number < seq.end_number
      )

      if (!activeSequence) {
        return {
          isValid: false,
          message: 'Todas las secuencias fiscales para facturas están agotadas. Debes configurar nuevas secuencias.',
          missingSequences: ['invoice'],
          redirectUrl: '/configuracion/secuencias'
        }
      }

      return {
        isValid: true,
        message: 'Secuencias fiscales configuradas correctamente',
        missingSequences: []
      }
    } catch (error) {
      return {
        isValid: false,
        message: 'Error al validar las secuencias fiscales',
        missingSequences: ['invoice'],
        redirectUrl: '/configuracion/secuencias'
      }
    }
  }

  static async validateQuoteSequences(): Promise<FiscalSequenceValidation> {
    try {
      const organizationId = await this.getCurrentOrganizationId()
      
      // Buscar secuencias fiscales activas para cotizaciones
      const { data: sequences, error } = await supabase
        .from('fiscal_sequences')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('document_type', 'quote')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      if (!sequences || sequences.length === 0) {
        return {
          isValid: false,
          message: 'No tienes secuencias fiscales configuradas para cotizaciones. Debes configurar al menos una secuencia antes de crear cotizaciones.',
          missingSequences: ['quote'],
          redirectUrl: '/configuracion/secuencias'
        }
      }

      // Verificar que al menos una secuencia tenga números disponibles
      const activeSequence = sequences.find(seq => 
        seq.current_number < seq.end_number
      )

      if (!activeSequence) {
        return {
          isValid: false,
          message: 'Todas las secuencias fiscales para cotizaciones están agotadas. Debes configurar nuevas secuencias.',
          missingSequences: ['quote'],
          redirectUrl: '/configuracion/secuencias'
        }
      }

      return {
        isValid: true,
        message: 'Secuencias fiscales configuradas correctamente',
        missingSequences: []
      }
    } catch (error) {
      return {
        isValid: false,
        message: 'Error al validar las secuencias fiscales',
        missingSequences: ['quote'],
        redirectUrl: '/configuracion/secuencias'
      }
    }
  }

  static async validateAllSequences(): Promise<FiscalSequenceValidation> {
    try {
      const organizationId = await this.getCurrentOrganizationId()
      
      // Buscar todas las secuencias fiscales activas
      const { data: sequences, error } = await supabase
        .from('fiscal_sequences')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)

      if (error) {
        throw error
      }

      const missingSequences: string[] = []
      const documentTypes = ['invoice', 'quote']

      for (const docType of documentTypes) {
        const typeSequences = sequences?.filter(seq => seq.document_type === docType) || []
        
        if (typeSequences.length === 0) {
          missingSequences.push(docType)
        } else {
          // Verificar que al menos una secuencia tenga números disponibles
          const activeSequence = typeSequences.find(seq => 
            seq.current_number < seq.end_number
          )
          
          if (!activeSequence) {
            missingSequences.push(docType)
          }
        }
      }

      if (missingSequences.length > 0) {
        const docTypeNames = {
          invoice: 'facturas',
          quote: 'cotizaciones'
        }

        const missingNames = missingSequences.map(type => docTypeNames[type as keyof typeof docTypeNames])

        return {
          isValid: false,
          message: `Faltan secuencias fiscales para: ${missingNames.join(', ')}. Debes configurar las secuencias antes de crear documentos.`,
          missingSequences,
          redirectUrl: '/configuracion/secuencias'
        }
      }

      return {
        isValid: true,
        message: 'Todas las secuencias fiscales están configuradas correctamente',
        missingSequences: []
      }
    } catch (error) {
      return {
        isValid: false,
        message: 'Error al validar las secuencias fiscales',
        missingSequences: ['invoice', 'quote'],
        redirectUrl: '/configuracion/secuencias'
      }
    }
  }
}