'use client'

import React, { useState, useEffect } from 'react'
import { FiscalDocumentType, FiscalSequence, FiscalDocumentService } from '@/services/fiscalDocuments'
import Select from './Select'
import Input from './Input'
import { FormGroup } from './FormField'

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

const FiscalDocumentSelector: React.FC<FiscalDocumentSelectorProps> = ({
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

  useEffect(() => {
    loadDocumentTypes()
  }, [])

  useEffect(() => {
    if (value.documentTypeId) {
      checkActiveSequence(value.documentTypeId)
    }
  }, [value.documentTypeId])

  const loadDocumentTypes = async () => {
    try {
      const types = await FiscalDocumentService.getDocumentTypes()
      setDocumentTypes(types)
      setLoading(false)
    } catch (error) {
      console.error('Error loading document types:', error)
      setLoading(false)
    }
  }

  const checkActiveSequence = async (typeId: string) => {
    try {
      const type = documentTypes.find(t => t.id === typeId)
      setSelectedType(type || null)
      
      const sequence = await FiscalDocumentService.getActiveSequenceForType(typeId)
      setActiveSequence(sequence)
      
      if (sequence) {
        const next = FiscalDocumentService.formatFiscalNumber(
          sequence.series, 
          sequence.current_number + 1
        )
        setNextNumber(next)
      } else {
        setNextNumber('')
      }
    } catch (error) {
      console.error('Error checking sequence:', error)
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

  const requiresTaxId = selectedType?.requires_tax_id || false
  const hasValidSequence = activeSequence && activeSequence.current_number < activeSequence.max_number

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
          
          {value.documentTypeId && (
            <div className="mt-2 text-sm">
              {hasValidSequence ? (
                <div>
                  <span className="text-gray-600">Próximo NCF: </span>
                  <span className="font-mono font-medium">{nextNumber}</span>
                  <div className="text-xs text-gray-500 mt-1">
                    Disponibles: {(activeSequence.max_number - activeSequence.current_number).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="text-red-600">
                  <div className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span>No hay secuencia activa para este tipo de comprobante</span>
                  </div>
                  <div className="text-xs text-red-500 mt-1">
                    Crea una secuencia en Configuración &gt; Comprobantes Fiscales
                  </div>
                </div>
              )}
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
              Este tipo de comprobante requiere RNC/Cédula
            </p>
          )}
        </div>
      </FormGroup>

      {selectedType?.description && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
          <strong>Nota:</strong> {selectedType.description}
        </div>
      )}
    </div>
  )
}

export default FiscalDocumentSelector