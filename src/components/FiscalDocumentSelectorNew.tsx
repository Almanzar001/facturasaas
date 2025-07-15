'use client'

import React, { useState, useEffect } from 'react'
import { FiscalDocumentType, FiscalSequence, FiscalDocumentService } from '@/services/fiscalDocumentsAutoCreate'
import Select from './Select'
import Input from './Input'
import { FormGroup } from './FormField'

// ============================================
// NUEVO SELECTOR DE COMPROBANTES FISCALES
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

const FiscalDocumentSelectorNew: React.FC<FiscalDocumentSelectorProps> = ({
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
    }
  }, [value.documentTypeId, documentTypes])

  const loadDocumentTypes = async () => {
    try {
      const types = await FiscalDocumentService.getDocumentTypes()
      setDocumentTypes(types)
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const checkActiveSequence = async (typeId: string) => {
    try {
      // Encontrar el tipo seleccionado
      const type = documentTypes.find(t => t.id === typeId)
      setSelectedType(type || null)
      
      // Buscar secuencia activa
      const sequence = await FiscalDocumentService.getActiveSequenceForType(typeId)
      setActiveSequence(sequence)
      
      // Calcular próximo número
      if (sequence) {
        const next = FiscalDocumentService.formatFiscalNumber(
          sequence.prefix, 
          sequence.current_number + 1
        )
        setNextNumber(next)
      } else {
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
              {hasValidSequence ? (
                <div className="p-2 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="font-medium">Secuencia activa</span>
                  </div>
                  <div className="text-gray-600">
                    Próximo NCF: <span className="font-mono font-medium">{nextNumber}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Disponibles: {(activeSequence!.max_number - activeSequence!.current_number).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-red-50 border border-red-200 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-red-600">⚠️</span>
                    <span className="font-medium text-red-800">Sin secuencia activa</span>
                  </div>
                  <div className="text-xs text-red-600 mt-1">
                    Debes crear una secuencia en Configuración → Comprobantes
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

export default FiscalDocumentSelectorNew