import { useState, useEffect, useCallback } from 'react'
import { FiscalSequenceManagementService, CustomFiscalSequence } from '@/services/fiscalSequenceManagement'
import { FiscalDocumentService } from '@/services/fiscalDocumentsAutoCreate'

export function useFiscalSequences() {
  const [sequences, setSequences] = useState<CustomFiscalSequence[]>([])
  const [documentTypes, setDocumentTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSequences = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await FiscalSequenceManagementService.getAllSequences()
      setSequences(data)
    } catch (err: any) {
      setError(err.message || 'Error loading sequences')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDocumentTypes = useCallback(async () => {
    try {
      const data = await FiscalDocumentService.getDocumentTypes()
      setDocumentTypes(data)
    } catch (err: any) {
      setError(err.message || 'Error loading document types')
    }
  }, [])

  useEffect(() => {
    Promise.all([loadSequences(), loadDocumentTypes()])
  }, [loadSequences, loadDocumentTypes])

  const createSequence = useCallback(async (data: any) => {
    try {
      const newSequence = await FiscalSequenceManagementService.createCustomSequence(data)
      setSequences(prev => [newSequence, ...prev])
      return newSequence
    } catch (err: any) {
      setError(err.message || 'Error creating sequence')
      throw err
    }
  }, [])

  const updateSequence = useCallback(async (id: string, data: any) => {
    try {
      const updated = await FiscalSequenceManagementService.updateCustomSequence(id, data)
      setSequences(prev => prev.map(seq => seq.id === id ? updated : seq))
      return updated
    } catch (err: any) {
      setError(err.message || 'Error updating sequence')
      throw err
    }
  }, [])

  const deleteSequence = useCallback(async (id: string) => {
    try {
      await FiscalSequenceManagementService.deleteSequence(id)
      setSequences(prev => prev.filter(seq => seq.id !== id))
    } catch (err: any) {
      setError(err.message || 'Error deleting sequence')
      throw err
    }
  }, [])

  const resetSequence = useCallback(async (id: string) => {
    try {
      const reset = await FiscalSequenceManagementService.resetSequence(id)
      setSequences(prev => prev.map(seq => seq.id === id ? reset : seq))
      return reset
    } catch (err: any) {
      setError(err.message || 'Error resetting sequence')
      throw err
    }
  }, [])

  const toggleSequenceActive = useCallback(async (id: string) => {
    try {
      const sequence = sequences.find(seq => seq.id === id)
      if (!sequence) return

      const updated = await FiscalSequenceManagementService.updateCustomSequence(id, {
        is_active: !sequence.is_active
      })
      setSequences(prev => prev.map(seq => seq.id === id ? updated : seq))
      return updated
    } catch (err: any) {
      setError(err.message || 'Error toggling sequence')
      throw err
    }
  }, [sequences])

  const generateFiscalNumber = useCallback(async (documentTypeId: string) => {
    try {
      const result = await FiscalSequenceManagementService.generateNextFiscalNumber(documentTypeId)
      if (result.success && result.sequence_id) {
        // Update the sequence current_number in local state
        setSequences(prev => prev.map(seq => 
          seq.id === result.sequence_id 
            ? { ...seq, current_number: seq.current_number + 1 }
            : seq
        ))
      }
      return result
    } catch (err: any) {
      setError(err.message || 'Error generating fiscal number')
      throw err
    }
  }, [])

  const getSequenceStats = useCallback(async (id: string) => {
    try {
      return await FiscalSequenceManagementService.getSequenceStats(id)
    } catch (err: any) {
      setError(err.message || 'Error getting sequence stats')
      throw err
    }
  }, [])

  const validateSequenceConfig = useCallback((data: any) => {
    return FiscalSequenceManagementService.validateSequenceConfig(data)
  }, [])

  const previewFiscalNumber = useCallback((prefix: string, suffix: string, number: number, paddingLength: number) => {
    return FiscalSequenceManagementService.previewFiscalNumber(prefix, suffix, number, paddingLength)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    sequences,
    documentTypes,
    loading,
    error,
    loadSequences,
    loadDocumentTypes,
    createSequence,
    updateSequence,
    deleteSequence,
    resetSequence,
    toggleSequenceActive,
    generateFiscalNumber,
    getSequenceStats,
    validateSequenceConfig,
    previewFiscalNumber,
    clearError
  }
}