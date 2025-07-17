import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiscalSequenceValidator, FiscalSequenceValidation } from '@/services/fiscal-sequence-validator'

export function useDocumentTypeValidation(documentTypeId: string | null) {
  const [validation, setValidation] = useState<FiscalSequenceValidation | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!documentTypeId) {
      setValidation(null)
      return
    }

    const validateDocumentType = async () => {
      setLoading(true)
      try {
        const result = await FiscalSequenceValidator.validateSpecificDocumentType(documentTypeId)
        setValidation(result)
      } catch (error) {
        setValidation({
          isValid: false,
          message: 'Error al validar el tipo de comprobante',
          missingSequences: [],
          redirectUrl: '/configuracion/secuencias'
        })
      } finally {
        setLoading(false)
      }
    }

    validateDocumentType()
  }, [documentTypeId])

  const showValidationError = () => {
    if (!validation || validation.isValid) return false

    const confirmed = confirm(`${validation.message}\n\n¿Quieres ir a configurar las secuencias fiscales ahora?`)
    if (confirmed && validation.redirectUrl) {
      router.push(validation.redirectUrl)
    }
    return true
  }

  return {
    validation,
    loading,
    showValidationError,
    isValid: validation?.isValid || false
  }
}

export function useRequireDocumentTypeSequences(documentTypeId: string | null) {
  const { validation, loading, showValidationError, isValid } = useDocumentTypeValidation(documentTypeId)

  const validateBeforeSubmit = (): boolean => {
    if (!documentTypeId) {
      alert('Debes seleccionar un tipo de comprobante primero')
      return false
    }

    if (!loading && !isValid) {
      showValidationError()
      return false
    }

    return true
  }

  return {
    validation,
    loading,
    isValid,
    validateBeforeSubmit
  }
}