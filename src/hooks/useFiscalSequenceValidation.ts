import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiscalSequenceValidator, FiscalSequenceValidation } from '@/services/fiscal-sequence-validator'

export function useFiscalSequenceValidation(documentType: 'invoice' | 'quote' | 'all') {
  const [validation, setValidation] = useState<FiscalSequenceValidation | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const validateSequences = async () => {
      setLoading(true)
      try {
        let result: FiscalSequenceValidation

        switch (documentType) {
          case 'invoice':
            result = await FiscalSequenceValidator.validateInvoiceSequences()
            break
          case 'quote':
            result = await FiscalSequenceValidator.validateQuoteSequences()
            break
          case 'all':
            result = await FiscalSequenceValidator.validateAllSequences()
            break
          default:
            throw new Error('Invalid document type')
        }

        setValidation(result)

        // Si no es válido, mostrar alerta y redirigir
        if (!result.isValid) {
          alert(result.message)
          if (result.redirectUrl) {
            router.push(result.redirectUrl)
          }
        }
      } catch (error) {
        setValidation({
          isValid: false,
          message: 'Error al validar las secuencias fiscales',
          missingSequences: [],
          redirectUrl: '/configuracion/secuencias'
        })
      } finally {
        setLoading(false)
      }
    }

    validateSequences()
  }, [documentType, router])

  return { validation, loading }
}

export function useRequireFiscalSequences(documentType: 'invoice' | 'quote' | 'all') {
  const { validation, loading } = useFiscalSequenceValidation(documentType)
  const router = useRouter()

  // Si no es válido, no permitir continuar
  if (!loading && validation && !validation.isValid) {
    return {
      canProceed: false,
      validation,
      loading: false
    }
  }

  return {
    canProceed: !loading && validation?.isValid === true,
    validation,
    loading
  }
}