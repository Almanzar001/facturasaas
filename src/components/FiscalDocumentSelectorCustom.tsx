'use client'

import React, { useState, useEffect } from 'react'
import { FiscalSequenceManagementService, CustomFiscalSequence } from '@/services/fiscalSequenceManagement'
import { FiscalDocumentService, FiscalDocumentType } from '@/services/fiscalDocumentsAutoCreate'
import Select from './Select'
import Input from './Input'

interface FiscalDocumentSelectorCustomProps {
  value?: {
    documentTypeId?: string
    clientTaxId?: string
  }
  onChange: (data: {
    documentTypeId: string
    clientTaxId?: string
  }) => void
  clientData?: any
  errors?: any
}

const FiscalDocumentSelectorCustom: React.FC<FiscalDocumentSelectorCustomProps> = ({
  value = {},
  onChange,
  clientData,
  errors
}) => {
  const [documentTypes, setDocumentTypes] = useState<FiscalDocumentType[]>([])
  const [activeSequence, setActiveSequence] = useState<CustomFiscalSequence | null>(null)
  const [nextNumber, setNextNumber] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDocumentTypes()
  }, [])

  useEffect(() => {
    if (value.documentTypeId) {
      checkCustomSequence(value.documentTypeId)
    } else {
      setActiveSequence(null)
      setNextNumber('')
    }
  }, [value.documentTypeId])

  const loadDocumentTypes = async () => {
    try {
      const types = await FiscalDocumentService.getDocumentTypes()
      setDocumentTypes(types)
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const checkCustomSequence = async (typeId: string) => {
    try {
      
      const customSequence = await FiscalSequenceManagementService.getSequenceByDocumentType(typeId)
      
      if (customSequence) {
        setActiveSequence(customSequence)
        
        // Calcular próximo número
        const nextNum = Math.max(customSequence.current_number + 1, customSequence.start_number)
        const next = FiscalSequenceManagementService.previewFiscalNumber(
          customSequence.prefix,
          customSequence.suffix,
          nextNum,
          customSequence.padding_length
        )
        setNextNumber(next)
      } else {
        setActiveSequence(null)
        setNextNumber('')
      }
    } catch (error) {
      setActiveSequence(null)
      setNextNumber('')
    }
  }

  const handleTypeChange = (typeId: string) => {
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

  const requiresTaxId = documentTypes.find(t => t.id === value.documentTypeId)?.requires_tax_id || false

  if (loading) {
    return <div>Cargando tipos de documento...</div>
  }

  return (
    <div className="space-y-4">
      <Select
        label="Tipo de Comprobante Fiscal"
        value={value.documentTypeId || ''}
        onChange={(e) => handleTypeChange(e.target.value)}
        error={errors?.fiscal_document_type_id}
        options={[
          { value: '', label: 'Seleccionar tipo...' },
          ...documentTypes.map(type => ({
            value: type.id,
            label: `${type.code} - ${type.name}`
          }))
        ]}
        required
      />

      {value.documentTypeId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Estado de la Secuencia</h4>
          
          {activeSequence ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✅</span>
                <span className="text-green-800 font-medium">Secuencia personalizada lista</span>
              </div>
              
              {nextNumber && (
                <div className="bg-white border border-blue-300 rounded p-3">
                  <div className="text-sm text-blue-700 mb-1">Próximo NCF:</div>
                  <div className="font-mono text-lg font-bold text-blue-900">{nextNumber}</div>
                </div>
              )}
              
              <div className="text-xs text-blue-600">
                Formato: {activeSequence.prefix || '[sin prefijo]'}{'X'.repeat(activeSequence.padding_length)}{activeSequence.suffix || '[sin sufijo]'} 
                | Rango: {activeSequence.start_number}-{activeSequence.max_number}
                | Actual: {activeSequence.current_number}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-red-600">❌</span>
              <span className="text-red-800">No hay secuencia personalizada configurada</span>
            </div>
          )}
        </div>
      )}

      <Input
        label={`RNC/Cédula del Cliente ${requiresTaxId ? '*' : '(opcional)'}`}
        value={value.clientTaxId || clientData?.tax_id || ''}
        onChange={(e) => handleTaxIdChange(e.target.value)}
        error={errors?.client_tax_id}
        placeholder="Ej: 131234567"
        required={requiresTaxId}
        helperText={requiresTaxId ? 'Requerido para este tipo de comprobante' : 'Opcional'}
      />
    </div>
  )
}

export default FiscalDocumentSelectorCustom