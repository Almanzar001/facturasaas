'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { 
  CreateCustomSequenceData,
  UpdateCustomSequenceData
} from '@/services/fiscalSequenceManagement'
import { FiscalDocumentType } from '@/services/fiscalDocumentsAutoCreate'
import { useFiscalSequences } from '@/hooks/useFiscalSequences'
import Button from './Button'
import Input from './Input'
import Select from './Select'
import Modal from './Modal'
import Card from './Card'

interface FiscalSequenceManagerProps {
  onSequenceChange?: () => void
}

const FiscalSequenceManager: React.FC<FiscalSequenceManagerProps> = ({ onSequenceChange }) => {
  
  // Use the custom hook for state management
  const {
    sequences,
    documentTypes,
    loading,
    error,
    createSequence,
    updateSequence,
    deleteSequence,
    resetSequence,
    validateSequenceConfig,
    previewFiscalNumber,
    clearError
  } = useFiscalSequences()
  
  // Local UI state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSequence, setEditingSequence] = useState<any>(null)

  // Form data for creating/editing sequences
  const [formData, setFormData] = useState<CreateCustomSequenceData & UpdateCustomSequenceData>({
    fiscal_document_type_id: '',
    prefix: '',
    suffix: '',
    start_number: 1,
    max_number: 10000,
    padding_length: 8,
    current_number: 0
  })

  // No need for useEffect or loadData - the hook handles this

  const handleCreateSequence = useCallback(async () => {
    try {
      clearError()
      
      // Validate form
      const errors = validateSequenceConfig(formData)
      if (errors.length > 0) {
        throw new Error(errors.join(', '))
      }

      if (!formData.fiscal_document_type_id) {
        throw new Error('Debe seleccionar un tipo de documento')
      }


      const result = await createSequence({
        fiscal_document_type_id: formData.fiscal_document_type_id,
        prefix: formData.prefix,
        suffix: formData.suffix,
        start_number: formData.start_number,
        max_number: formData.max_number,
        padding_length: formData.padding_length
      })
      

      setShowCreateModal(false)
      resetForm()
      onSequenceChange?.()
    } catch (error: any) {
      // Error is already set by the hook
    }
  }, [formData, validateSequenceConfig, createSequence, onSequenceChange, clearError])

  const handleEditSequence = useCallback(async () => {
    if (!editingSequence) return

    try {
      clearError()
      
      // Validate form
      const errors = validateSequenceConfig(formData)
      if (errors.length > 0) {
        throw new Error(errors.join(', '))
      }

      await updateSequence(editingSequence.id, {
        prefix: formData.prefix,
        suffix: formData.suffix,
        current_number: formData.current_number,
        start_number: formData.start_number,
        max_number: formData.max_number,
        padding_length: formData.padding_length,
        is_active: formData.is_active
      })

      setShowEditModal(false)
      setEditingSequence(null)
      resetForm()
      onSequenceChange?.()
    } catch (error: any) {
      // Error is already set by the hook
    }
  }, [editingSequence, formData, validateSequenceConfig, updateSequence, onSequenceChange, clearError])

  const handleDeleteSequence = useCallback(async (sequence: any) => {
    if (!confirm(`¿Está seguro de eliminar la secuencia para ${sequence.document_type?.name}?`)) {
      return
    }

    try {
      await deleteSequence(sequence.id)
      onSequenceChange?.()
    } catch (error: any) {
      // Error is already set by the hook
    }
  }, [deleteSequence, onSequenceChange])

  const handleResetSequence = useCallback(async (sequence: any) => {
    if (!confirm(`¿Está seguro de reiniciar la secuencia para ${sequence.document_type?.name}? Esto restablecerá el contador al número inicial.`)) {
      return
    }

    try {
      await resetSequence(sequence.id)
      onSequenceChange?.()
    } catch (error: any) {
      // Error is already set by the hook
    }
  }, [resetSequence, onSequenceChange])

  const resetForm = useCallback(() => {
    setFormData({
      fiscal_document_type_id: '',
      prefix: '',
      suffix: '',
      start_number: 1,
      max_number: 10000,
      padding_length: 8,
      current_number: 0
    })
    clearError()
  }, [clearError])

  const openCreateModal = useCallback(() => {
    resetForm()
    setShowCreateModal(true)
  }, [resetForm])

  const openEditModal = useCallback((sequence: any) => {
    setEditingSequence(sequence)
    setFormData({
      fiscal_document_type_id: sequence.fiscal_document_type_id,
      prefix: sequence.prefix,
      suffix: sequence.suffix,
      start_number: sequence.start_number,
      max_number: sequence.max_number,
      padding_length: sequence.padding_length,
      current_number: sequence.current_number,
      is_active: sequence.is_active
    })
    setShowEditModal(true)
  }, [])

  // Memoized preview calculation to prevent unnecessary recalculations
  const preview = useMemo(() => {
    return previewFiscalNumber(
      formData.prefix || '',
      formData.suffix || '',
      Math.max(formData.current_number || 0, formData.start_number || 1),
      formData.padding_length || 8
    )
  }, [formData.prefix, formData.suffix, formData.current_number, formData.start_number, formData.padding_length, previewFiscalNumber])

  // Memoized available document types to prevent unnecessary filtering
  const availableDocumentTypes = useMemo(() => {
    const usedTypeIds = sequences.map(seq => seq.fiscal_document_type_id)
    const availableTypes = documentTypes.filter(dt => !usedTypeIds.includes(dt.id))
    return availableTypes
  }, [sequences, documentTypes])

  // Memoized sequence status calculation
  const getSequenceStatus = useCallback((sequence: any) => {
    const used = sequence.current_number - (sequence.start_number - 1)
    const total = sequence.max_number - (sequence.start_number - 1)
    const percentage = total > 0 ? (used / total) * 100 : 0

    if (percentage >= 100) return { color: 'text-red-600', text: 'Agotada' }
    if (percentage >= 80) return { color: 'text-yellow-600', text: 'Por agotarse' }
    return { color: 'text-green-600', text: 'Disponible' }
  }, [])

  // Memoized form handlers to prevent unnecessary re-renders
  const handleFormChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false)
  }, [])

  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false)
  }, [])

  if (loading) {
    return <div className="p-6 text-center">Cargando secuencias fiscales...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestión de Secuencias Fiscales</h2>
        <Button
          onClick={openCreateModal}
          variant="primary"
          disabled={availableDocumentTypes.length === 0}
        >
          Nueva Secuencia
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {sequences.length === 0 ? (
          <Card>
            <div className="text-center py-8 text-gray-500">
              <p>No hay secuencias fiscales configuradas.</p>
              <p className="text-sm mt-2">Cree una nueva secuencia para comenzar a generar números fiscales personalizados.</p>
            </div>
          </Card>
        ) : (
          sequences.map((sequence) => {
            const status = getSequenceStatus(sequence)
            const nextNumber = previewFiscalNumber(
              sequence.prefix,
              sequence.suffix,
              Math.max(sequence.current_number + 1, sequence.start_number),
              sequence.padding_length
            )

            return (
              <Card key={sequence.id}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {sequence.document_type?.name}
                      </h3>
                      <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {sequence.document_type?.code}
                      </span>
                      <span className={`text-sm font-medium ${status.color}`}>
                        {status.text}
                      </span>
                      {!sequence.is_active && (
                        <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded">
                          Inactiva
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Formato:</span>
                        <div className="font-mono text-blue-600">
                          {sequence.prefix || '[Sin prefijo]'}
                          {'X'.repeat(sequence.padding_length)}
                          {sequence.suffix || '[Sin sufijo]'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Próximo número:</span>
                        <div className="font-mono font-semibold">{nextNumber}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Progreso:</span>
                        <div>
                          {sequence.current_number} / {sequence.max_number}
                          {' '}({Math.round(((sequence.current_number - sequence.start_number + 1) / (sequence.max_number - sequence.start_number + 1)) * 100)}%)
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Rango:</span>
                        <div>{sequence.start_number} - {sequence.max_number}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(sequence)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleResetSequence(sequence)}
                      disabled={sequence.current_number === sequence.start_number - 1}
                    >
                      Reiniciar
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteSequence(sequence)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        title="Nueva Secuencia Fiscal"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <Select
            label="Tipo de Documento"
            value={formData.fiscal_document_type_id}
            onChange={(e) => {
              handleFormChange('fiscal_document_type_id', e.target.value)
            }}
            options={[
              { value: '', label: 'Seleccionar tipo de documento...' },
              ...availableDocumentTypes.map(dt => ({
                value: dt.id,
                label: `${dt.code} - ${dt.name}`
              }))
            ]}
            required
          />
          {availableDocumentTypes.length === 0 && (
            <div className="text-red-600 text-sm">
              No hay tipos de documento disponibles. Verifica la conexión a la base de datos.
            </div>
          )}
          <div className="text-xs text-gray-500">
            Tipos disponibles: {availableDocumentTypes.length}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prefijo"
              value={formData.prefix}
              onChange={(e) => handleFormChange('prefix', e.target.value)}
              placeholder="Ej: FAC-"
              maxLength={10}
            />
            <Input
              label="Sufijo"
              value={formData.suffix}
              onChange={(e) => handleFormChange('suffix', e.target.value)}
              placeholder="Ej: -DR"
              maxLength={10}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Número Inicial"
              type="number"
              value={formData.start_number}
              onChange={(e) => handleFormChange('start_number', parseInt(e.target.value) || 1)}
              min={1}
              required
            />
            <Input
              label="Número Máximo"
              type="number"
              value={formData.max_number}
              onChange={(e) => handleFormChange('max_number', parseInt(e.target.value) || 10000)}
              min={1}
              required
            />
            <Input
              label="Longitud de Relleno"
              type="number"
              value={formData.padding_length}
              onChange={(e) => handleFormChange('padding_length', parseInt(e.target.value) || 8)}
              min={1}
              max={20}
              required
            />
          </div>

          <div className="bg-gray-50 p-3 rounded">
            <span className="text-sm text-gray-600">Vista previa: </span>
            <span className="font-mono text-lg font-semibold text-blue-600">
              {preview}
            </span>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={handleCloseCreateModal}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateSequence}
            >
              Crear Secuencia
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        title="Editar Secuencia Fiscal"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded">
            <span className="text-sm font-medium text-blue-800">
              {editingSequence?.document_type?.code} - {editingSequence?.document_type?.name}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prefijo"
              value={formData.prefix}
              onChange={(e) => handleFormChange('prefix', e.target.value)}
              placeholder="Ej: FAC-"
              maxLength={10}
            />
            <Input
              label="Sufijo"
              value={formData.suffix}
              onChange={(e) => handleFormChange('suffix', e.target.value)}
              placeholder="Ej: -DR"
              maxLength={10}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Input
              label="Número Actual"
              type="number"
              value={formData.current_number}
              onChange={(e) => handleFormChange('current_number', parseInt(e.target.value) || 0)}
              min={0}
              required
            />
            <Input
              label="Número Inicial"
              type="number"
              value={formData.start_number}
              onChange={(e) => handleFormChange('start_number', parseInt(e.target.value) || 1)}
              min={1}
              required
            />
            <Input
              label="Número Máximo"
              type="number"
              value={formData.max_number}
              onChange={(e) => handleFormChange('max_number', parseInt(e.target.value) || 10000)}
              min={1}
              required
            />
            <Input
              label="Longitud de Relleno"
              type="number"
              value={formData.padding_length}
              onChange={(e) => handleFormChange('padding_length', parseInt(e.target.value) || 8)}
              min={1}
              max={20}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleFormChange('is_active', e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="is_active" className="text-sm">
              Secuencia activa
            </label>
          </div>

          <div className="bg-gray-50 p-3 rounded">
            <span className="text-sm text-gray-600">Vista previa: </span>
            <span className="font-mono text-lg font-semibold text-blue-600">
              {preview}
            </span>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={handleCloseEditModal}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleEditSequence}
            >
              Guardar Cambios
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default FiscalSequenceManager