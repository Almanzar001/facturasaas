'use client'

import React, { useState, useEffect } from 'react'
import { FiscalDocumentType, FiscalSequence, FiscalDocumentService } from '@/services/fiscalDocumentsAutoCreate'
import { FiscalSequenceManagementService } from '@/services/fiscalSequenceManagement'
import Select from './Select'
import Input from './Input'
import { FormGroup } from './FormField'

// ============================================
// SELECTOR FISCAL CON AUTO-CREACIÓN
// ============================================

interface FiscalDocumentSelectorProps {
  value?: {
    documentTypeId?: string
    clientTaxId?: string
  }
  onChange: (data: {
    documentTypeId: string
    clientTaxId?: string
  }) => void
  clientData?: {
    name: string
    tax_id?: string
  }
  errors?: {
    documentType?: string
    clientTaxId?: string
  }
}

const FiscalDocumentSelectorAutoCreate: React.FC<FiscalDocumentSelectorProps> = ({
  value = {},
  onChange,
  clientData,
  errors = {}
}) => {
  const [documentTypes, setDocumentTypes] = useState<FiscalDocumentType[]>([])
  const [activeSequence, setActiveSequence] = useState<FiscalSequence | null>(null)
  const [selectedType, setSelectedType] = useState<FiscalDocumentType | null>(null)
  const [loading, setLoading] = useState(true)
  const [nextNumber, setNextNumber] = useState<string>('')
  const [sequenceStatus, setSequenceStatus] = useState<'checking' | 'found' | 'creating' | 'ready' | 'error'>('checking')

  // Cargar tipos de comprobante
  useEffect(() => {
    loadDocumentTypes()
  }, [])

  // Verificar secuencia activa cuando cambia el tipo
  useEffect(() => {
    if (value.documentTypeId) {
      checkActiveSequence(value.documentTypeId)
    } else {
      setActiveSequence(null)
      setSelectedType(null)
      setNextNumber('')
      setSequenceStatus('checking')
    }
  }, [value.documentTypeId, documentTypes])

  const loadDocumentTypes = async () => {
    try {
      console.log('🔄 Cargando tipos de documento...')
      const types = await FiscalDocumentService.getDocumentTypes()
      console.log('✅ Tipos cargados:', types.length)
      setDocumentTypes(types)
    } catch (error) {
      console.error('❌ Error cargando tipos:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkActiveSequence = async (typeId: string) => {
    try {
      setSequenceStatus('checking')
      console.log('🔍 Verificando secuencia para tipo:', typeId)
      console.log('🔍 FiscalSequenceManagementService disponible:', typeof FiscalSequenceManagementService)
      
      // Encontrar el tipo seleccionado
      const type = documentTypes.find(t => t.id === typeId)
      setSelectedType(type || null)
      
      // Buscar secuencia personalizada primero
      setSequenceStatus('creating')
      console.log('🔍 Buscando secuencia personalizada para tipo ID:', typeId)
      
      let customSequence = null
      try {
        console.log('🔄 Llamando a FiscalSequenceManagementService...')
        customSequence = await FiscalSequenceManagementService.getSequenceByDocumentType(typeId)
        console.log('🔍 Resultado de búsqueda personalizada:', customSequence)
      } catch (error) {
        console.error('❌ Error en servicio personalizado:', error)
      }
      
      if (customSequence) {
        console.log('✅ Secuencia personalizada encontrada:', customSequence.id)
        setActiveSequence(customSequence as any) // Cast para compatibilidad
        setSequenceStatus('ready')
        
        // Calcular próximo número usando el sistema personalizado
        const nextNum = Math.max(customSequence.current_number + 1, customSequence.start_number)
        const next = FiscalSequenceManagementService.previewFiscalNumber(
          customSequence.prefix,
          customSequence.suffix,
          nextNum,
          customSequence.padding_length
        )
        setNextNumber(next)
        console.log('📝 Próximo número personalizado será:', next)
      } else {
        console.log('🔄 No hay secuencia personalizada, usando sistema por defecto...')
        
        // Fallback al sistema original
        const sequence = await FiscalDocumentService.getActiveSequenceForType(typeId)
        
        if (sequence) {
          console.log('✅ Secuencia por defecto encontrada/creada:', sequence.id)
          setActiveSequence(sequence)
          setSequenceStatus('ready')
          
          // Calcular próximo número con sistema original
          const next = FiscalDocumentService.formatFiscalNumber(
            sequence.prefix, 
            sequence.current_number + 1
          )
          setNextNumber(next)
          console.log('📝 Próximo número por defecto será:', next)
        } else {
          console.log('❌ No se pudo crear/encontrar secuencia')
          setActiveSequence(null)
          setNextNumber('')
          setSequenceStatus('error')
        }
      }
    } catch (error) {
      console.error('❌ Error verificando secuencia:', error)
      setActiveSequence(null)
      setNextNumber('')
      setSequenceStatus('error')
    }
  }

  const handleTypeChange = (typeId: string) => {
    console.log('🔄 Tipo cambiado a:', typeId)
    onChange({
      documentTypeId: typeId,
      clientTaxId: value.clientTaxId
    })
  }

  const handleTaxIdChange = (taxId: string) => {
    onChange({
      documentTypeId: value.documentTypeId || '',
      clientTaxId: taxId
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando tipos de comprobante...</span>
      </div>
    )
  }

  const requiresTaxId = selectedType?.requires_tax_id || false
  const hasValidSequence = activeSequence && activeSequence.current_number < activeSequence.max_number

  const getSequenceStatusMessage = () => {
    switch (sequenceStatus) {
      case 'checking':
        return { type: 'info', message: 'Verificando secuencia...', icon: '🔍' }
      case 'creating':
        return { type: 'info', message: 'Creando secuencia automáticamente...', icon: '⚙️' }
      case 'ready':
        return { type: 'success', message: 'Secuencia lista', icon: '✅' }
      case 'error':
        return { type: 'error', message: 'Error con la secuencia fiscal', icon: '❌' }
      default:
        return { type: 'info', message: 'Selecciona un tipo de comprobante', icon: '📋' }
    }
  }

  return (
    <div className="space-y-4">
      <FormGroup columns={2}>
        <div>
          <Select
            label="Tipo de Comprobante"
            value={value.documentTypeId || ''}
            onChange={(e) => handleTypeChange(e.target.value)}
            error={errors.documentType}
            options={[
              { value: '', label: 'Seleccionar tipo...' },
              ...documentTypes.map(type => ({
                value: type.id,
                label: `${type.code} - ${type.name}`
              }))
            ]}
            required
          />
          
          {/* Mostrar estado de la secuencia */}
          {value.documentTypeId && (
            <div className="mt-2 text-sm">
              {(() => {
                const status = getSequenceStatusMessage()
                const isSuccess = status.type === 'success'
                const isError = status.type === 'error'
                const isInfo = status.type === 'info'
                
                return (
                  <div className={`p-2 border rounded ${
                    isSuccess ? 'bg-green-50 border-green-200' :
                    isError ? 'bg-red-50 border-red-200' :
                    'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>{status.icon}</span>
                      <span className={`font-medium ${
                        isSuccess ? 'text-green-800' :
                        isError ? 'text-red-800' :
                        'text-blue-800'
                      }`}>{status.message}</span>
                    </div>
                    
                    {hasValidSequence && nextNumber && (
                      <>
                        <div className="text-gray-600 mt-1">
                          Próximo NCF: <span className="font-mono font-medium">{nextNumber}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Disponibles: {(activeSequence!.max_number - activeSequence!.current_number).toLocaleString()}
                        </div>
                      </>
                    )}
                    
                    {sequenceStatus === 'error' && (
                      <div className="text-xs text-red-600 mt-1">
                        No se pudo crear la secuencia fiscal. Verifica los permisos en Supabase.
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        <div>
          <Input
            label={`RNC/Cédula del Cliente ${requiresTaxId ? '*' : '(opcional)'}`}
            value={value.clientTaxId || clientData?.tax_id || ''}
            onChange={(e) => handleTaxIdChange(e.target.value)}
            error={errors.clientTaxId}
            placeholder="000-00000-0"
            required={requiresTaxId}
            disabled={!requiresTaxId && !!clientData?.tax_id}
          />
          
          {requiresTaxId && !value.clientTaxId && !clientData?.tax_id && (
            <p className="text-sm text-red-600 mt-1">
              Este tipo de comprobante requiere RNC/Cédula del cliente
            </p>
          )}
        </div>
      </FormGroup>

      {/* Descripción del tipo seleccionado */}
      {selectedType?.description && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-blue-600">ℹ️</span>
            <div>
              <strong className="text-blue-800">{selectedType.name}:</strong>
              <p className="text-blue-700 mt-1">{selectedType.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FiscalDocumentSelectorAutoCreate