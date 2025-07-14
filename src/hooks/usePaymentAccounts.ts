import { useState, useEffect, useCallback } from 'react'
import { PaymentAccountService, PaymentAccount } from '@/services/paymentAccounts'

export function usePaymentAccounts() {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await PaymentAccountService.getAll(true)
      setAccounts(data)
    } catch (err: any) {
      setError(err.message || 'Error loading accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const createAccount = async (data: any) => {
    try {
      const newAccount = await PaymentAccountService.create(data)
      setAccounts(prev => [...prev, newAccount])
      return newAccount
    } catch (err: any) {
      setError(err.message || 'Error creating account')
      throw err
    }
  }

  const updateAccount = async (id: string, data: any) => {
    try {
      const updated = await PaymentAccountService.update(id, data)
      setAccounts(prev => prev.map(acc => acc.id === id ? updated : acc))
      return updated
    } catch (err: any) {
      setError(err.message || 'Error updating account')
      throw err
    }
  }

  const deleteAccount = async (id: string) => {
    try {
      await PaymentAccountService.delete(id)
      setAccounts(prev => prev.filter(acc => acc.id !== id))
    } catch (err: any) {
      setError(err.message || 'Error deleting account')
      throw err
    }
  }

  const toggleAccountActive = async (id: string) => {
    try {
      const account = accounts.find(acc => acc.id === id)
      if (!account) return

      const updated = await PaymentAccountService.update(id, { 
        is_active: !account.is_active 
      })
      setAccounts(prev => prev.map(acc => acc.id === id ? updated : acc))
      return updated
    } catch (err: any) {
      setError(err.message || 'Error toggling account')
      throw err
    }
  }

  const setDefaultAccount = async (id: string) => {
    try {
      await PaymentAccountService.setDefault(id)
      // Update all accounts to reflect the new default
      setAccounts(prev => prev.map(acc => ({
        ...acc,
        is_default: acc.id === id
      })))
    } catch (err: any) {
      setError(err.message || 'Error setting default account')
      throw err
    }
  }

  return {
    accounts,
    loading,
    error,
    loadAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    toggleAccountActive,
    setDefaultAccount
  }
}