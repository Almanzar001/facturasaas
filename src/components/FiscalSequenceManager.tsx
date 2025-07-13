'use client'

import React, { useState, useEffect } from 'react'
import { 
  FiscalSequenceManagementService, 
  CustomFiscalSequence, 
  CreateCustomSequenceData,
  UpdateCustomSequenceData
} from '@/services/fiscalSequenceManagement'
import { FiscalDocumentService, FiscalDocumentType } from '@/services/fiscalDocumentsAutoCreate'
import Button from './Button'
import Input from './Input'
import Select from './Select'
import Modal from './Modal'
import Card from './Card'
import { formatCurrency } from '@/utils/formatCurrency'

interface FiscalSequenceManagerProps {
  onSequenceChange?: () => void
}

const FiscalSequenceManager: React.FC<FiscalSequenceManagerProps> = ({ onSequenceChange }) => {
  console.log('FiscalSequenceManager component loaded')
  
  const [sequences, setSequences] = useState<CustomFiscalSequence[]>([])
  const [documentTypes, setDocumentTypes] = useState<FiscalDocumentType[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSequence, setEditingSequence] = useState<CustomFiscalSequence | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      console.log('Loading fiscal sequence data...')
      setLoading(true)
      setError(null)
      
      const [sequencesData, documentTypesData] = await Promise.all([
        FiscalSequenceManagementService.getAllSequences(),
        FiscalDocumentService.getDocumentTypes()
      ])
      
      console.log('Sequences loaded:', sequencesData)
      console.log('Document types loaded:', documentTypesData)
      
      setSequences(sequencesData)
      setDocumentTypes(documentTypesData)
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Error al cargar los datos de secuencias fiscales')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSequence = async () => {
    try {
      console.log('=== CREATING CUSTOM SEQUENCE ===')
      console.log('Form data:', formData)
      setError(null)
      
      // Validate form
      const errors = FiscalSequenceManagementService.validateSequenceConfig(formData)
      console.log('Validation errors:', errors)
      if (errors.length > 0) {
        setError(errors.join(', '))
        return
      }

      if (!formData.fiscal_document_type_id) {
        console.log('No document type selected')
        setError('Debe seleccionar un tipo de documento')
        return
      }

      console.log('Creating sequence with:', {
        fiscal_document_type_id: formData.fiscal_document_type_id,
        prefix: formData.prefix,
        suffix: formData.suffix,
        start_number: formData.start_number,
        max_number: formData.max_number,
        padding_length: formData.padding_length
      })

      const result = await FiscalSequenceManagementService.createCustomSequence({
        fiscal_document_type_id: formData.fiscal_document_type_id,
        prefix: formData.prefix,
        suffix: formData.suffix,
        start_number: formData.start_number,
        max_number: formData.max_number,
        padding_length: formData.padding_length
      })
      
      console.log('Sequence created successfully:', result)

      await loadData()
      setShowCreateModal(false)
      resetForm()
      onSequenceChange?.()
    } catch (error: any) {
      console.error('Error creating sequence:', error)
      setError(error.message || 'Error al crear la secuencia')
    }
  }

  const handleEditSequence = async () => {
    if (!editingSequence) return

    try {
      setError(null)
      
      // Validate form
      const errors = FiscalSequenceManagementService.validateSequenceConfig(formData)
      if (errors.length > 0) {
        setError(errors.join(', '))
        return
      }

      await FiscalSequenceManagementService.updateCustomSequence(editingSequence.id, {
        prefix: formData.prefix,
        suffix: formData.suffix,
        current_number: formData.current_number,
        start_number: formData.start_number,
        max_number: formData.max_number,
        padding_length: formData.padding_length,
        is_active: formData.is_active
      })

      await loadData()
      setShowEditModal(false)
      setEditingSequence(null)
      resetForm()
      onSequenceChange?.()
    } catch (error: any) {
      console.error('Error updating sequence:', error)
      setError(error.message || 'Error al actualizar la secuencia')
    }
  }

  const handleDeleteSequence = async (sequence: CustomFiscalSequence) => {
    console.log('Attempting to delete sequence:', sequence)
    
    if (!confirm(`¿Está seguro de eliminar la secuencia para ${sequence.document_type?.name}?`)) {
      console.log('Delete cancelled by user')
      return
    }

    try {
      console.log('Calling delete service for sequence ID:', sequence.id)
      await FiscalSequenceManagementService.deleteSequence(sequence.id)
      console.log('Delete successful, reloading data')
      await loadData()
      onSequenceChange?.()
    } catch (error: any) {
      console.error('Error deleting sequence:', error)
      console.error('Error message:', error.message)
      setError(error.message || 'Error al eliminar la secuencia')
    }
  }

  const handleResetSequence = async (sequence: CustomFiscalSequence) => {
    if (!confirm(`¿Está seguro de reiniciar la secuencia para ${sequence.document_type?.name}? Esto restablecerá el contador al número inicial.`)) {
      return
    }

    try {
      await FiscalSequenceManagementService.resetSequence(sequence.id)
      await loadData()
      onSequenceChange?.()
    } catch (error: any) {
      console.error('Error resetting sequence:', error)
      setError(error.message || 'Error al reiniciar la secuencia')
    }
  }

  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const openEditModal = (sequence: CustomFiscalSequence) => {
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
  }

  const resetForm = () => {
    setFormData({
      fiscal_document_type_id: '',
      prefix: '',
      suffix: '',
      start_number: 1,
      max_number: 10000,
      padding_length: 8,
      current_number: 0
    })
    setError(null)
  }

  const getPreview = () => {
    return FiscalSequenceManagementService.previewFiscalNumber(
      formData.prefix || '',
      formData.suffix || '',
      Math.max(formData.current_number || 0, formData.start_number || 1),
      formData.padding_length || 8
    )
  }

  const getAvailableDocumentTypes = () => {
    const usedTypeIds = sequences.map(seq => seq.fiscal_document_type_id)
    const availableTypes = documentTypes.filter(dt => !usedTypeIds.includes(dt.id))
    console.log('Available document types:', availableTypes)
    console.log('All document types:', documentTypes)
    console.log('Used type IDs:', usedTypeIds)
    return availableTypes
  }

  const getSequenceStatus = (sequence: CustomFiscalSequence) => {
    const used = sequence.current_number - (sequence.start_number - 1)
    const total = sequence.max_number - (sequence.start_number - 1)
    const percentage = total > 0 ? (used / total) * 100 : 0

    if (percentage >= 100) return { color: 'text-red-600', text: 'Agotada' }
    if (percentage >= 80) return { color: 'text-yellow-600', text: 'Por agotarse' }
    return { color: 'text-green-600', text: 'Disponible' }
  }

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
          disabled={getAvailableDocumentTypes().length === 0}
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
            const nextNumber = FiscalSequenceManagementService.previewFiscalNumber(
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
        onClose={() => setShowCreateModal(false)}
        title="Nueva Secuencia Fiscal"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <Select
            label="Tipo de Documento"
            value={formData.fiscal_document_type_id}
            onChange={(e) => {
              console.log('Document type selected:', e.target.value)
              setFormData(prev => ({ ...prev, fiscal_document_type_id: e.target.value }))
            }}
            options={[
              { value: '', label: 'Seleccionar tipo de documento...' },
              ...getAvailableDocumentTypes().map(dt => ({
                value: dt.id,
                label: `${dt.code} - ${dt.name}`
              }))
            ]}
            required
          />
          {getAvailableDocumentTypes().length === 0 && (
            <div className="text-red-600 text-sm">
              No hay tipos de documento disponibles. Verifica la conexión a la base de datos.
            </div>
          )}
          <div className="text-xs text-gray-500">
            Tipos disponibles: {getAvailableDocumentTypes().length}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prefijo"
              value={formData.prefix}
              onChange={(e) => setFormData(prev => ({ ...prev, prefix: e.target.value }))}
              placeholder="Ej: FAC-"
              maxLength={10}
            />
            <Input
              label="Sufijo"
              value={formData.suffix}
              onChange={(e) => setFormData(prev => ({ ...prev, suffix: e.target.value }))}
              placeholder="Ej: -DR"
              maxLength={10}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Número Inicial"
              type="number"
              value={formData.start_number}
              onChange={(e) => setFormData(prev => ({ ...prev, start_number: parseInt(e.target.value) || 1 }))}
              min={1}
              required
            />
            <Input
              label="Número Máximo"
              type="number"
              value={formData.max_number}
              onChange={(e) => setFormData(prev => ({ ...prev, max_number: parseInt(e.target.value) || 10000 }))}
              min={1}
              required
            />
            <Input
              label="Longitud de Relleno"
              type="number"
              value={formData.padding_length}
              onChange={(e) => setFormData(prev => ({ ...prev, padding_length: parseInt(e.target.value) || 8 }))}
              min={1}
              max={20}
              required
            />
          </div>

          <div className="bg-gray-50 p-3 rounded">
            <span className="text-sm text-gray-600">Vista previa: </span>
            <span className="font-mono text-lg font-semibold text-blue-600">
              {getPreview()}
            </span>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
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
        onClose={() => setShowEditModal(false)}
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
              onChange={(e) => setFormData(prev => ({ ...prev, prefix: e.target.value }))}
              placeholder="Ej: FAC-"
              maxLength={10}
            />
            <Input
              label="Sufijo"
              value={formData.suffix}
              onChange={(e) => setFormData(prev => ({ ...prev, suffix: e.target.value }))}
              placeholder="Ej: -DR"
              maxLength={10}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Input
              label="Número Actual"
              type="number"
              value={formData.current_number}
              onChange={(e) => setFormData(prev => ({ ...prev, current_number: parseInt(e.target.value) || 0 }))}
              min={0}
              required
            />
            <Input
              label="Número Inicial"
              type="number"
              value={formData.start_number}
              onChange={(e) => setFormData(prev => ({ ...prev, start_number: parseInt(e.target.value) || 1 }))}
              min={1}
              required
            />
            <Input
              label="Número Máximo"
              type="number"
              value={formData.max_number}
              onChange={(e) => setFormData(prev => ({ ...prev, max_number: parseInt(e.target.value) || 10000 }))}
              min={1}
              required
            />
            <Input
              label="Longitud de Relleno"
              type="number"
              value={formData.padding_length}
              onChange={(e) => setFormData(prev => ({ ...prev, padding_length: parseInt(e.target.value) || 8 }))}
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
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <label htmlFor="is_active" className="text-sm">
              Secuencia activa
            </label>
          </div>

          <div className="bg-gray-50 p-3 rounded">
            <span className="text-sm text-gray-600">Vista previa: </span>
            <span className="font-mono text-lg font-semibold text-blue-600">
              {getPreview()}
            </span>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
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