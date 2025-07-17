import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PaymentAccountValidator, PaymentAccountValidation } from '@/services/payment-account-validator'

export function usePaymentAccountValidation() {
  const [validation, setValidation] = useState<PaymentAccountValidation | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const validateAccounts = async () => {
      setLoading(true)
      try {
        const result = await PaymentAccountValidator.validatePaymentAccounts()
        setValidation(result)

        // Si no es válido, mostrar alerta y redirigir
        if (!result.isValid) {
          const confirmed = confirm(`${result.message}\n\n¿Quieres ir a configurar las cuentas ahora?`)
          if (confirmed && result.redirectUrl) {
            router.push(result.redirectUrl)
          }
        }
      } catch (error) {
        setValidation({
          isValid: false,
          message: 'Error al validar las cuentas de destino',
          redirectUrl: '/configuracion/cuentas',
          accountsCount: 0
        })
      } finally {
        setLoading(false)
      }
    }

    validateAccounts()
  }, [router])

  return { validation, loading }
}

export function useRequirePaymentAccounts() {
  const { validation, loading } = usePaymentAccountValidation()

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