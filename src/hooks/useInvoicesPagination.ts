import { useState, useEffect, useCallback, useMemo } from 'react'
import { InvoiceService, Invoice } from '@/services/invoices'

interface UseInvoicesPaginationProps {
  pageSize?: number
  searchQuery?: string
}

export function useInvoicesPagination({ pageSize = 20, searchQuery = '' }: UseInvoicesPaginationProps = {}) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const filteredInvoices = useMemo(() => {
    if (!searchQuery) return invoices
    
    return invoices.filter(invoice =>
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.client?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [invoices, searchQuery])

  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return filteredInvoices.slice(0, endIndex)
  }, [filteredInvoices, currentPage, pageSize])

  const totalPages = useMemo(() => {
    return Math.ceil(filteredInvoices.length / pageSize)
  }, [filteredInvoices.length, pageSize])

  const loadInvoices = useCallback(async (page: number = 1, reset: boolean = false) => {
    try {
      setLoading(true)
      setError(null)
      
      const offset = (page - 1) * pageSize
      const { data, count } = await InvoiceService.getAllPaginated(page, pageSize)
      
      if (reset || page === 1) {
        setInvoices(data)
      } else {
        setInvoices(prev => [...prev, ...data])
      }
      
      setTotalCount(count || 0)
      setHasMore(data.length === pageSize)
      setCurrentPage(page)
    } catch (err: any) {
      setError(err.message || 'Error loading invoices')
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadInvoices(currentPage + 1, false)
    }
  }, [loading, hasMore, currentPage, loadInvoices])

  const refresh = useCallback(() => {
    loadInvoices(1, true)
  }, [loadInvoices])

  const createInvoice = useCallback(async (data: any) => {
    try {
      const newInvoice = await InvoiceService.create(data)
      setInvoices(prev => [newInvoice, ...prev])
      setTotalCount(prev => prev + 1)
      return newInvoice
    } catch (err: any) {
      setError(err.message || 'Error creating invoice')
      throw err
    }
  }, [])

  const updateInvoice = useCallback(async (id: string, data: any) => {
    try {
      const updated = await InvoiceService.update(id, data)
      setInvoices(prev => prev.map(inv => inv.id === id ? updated : inv))
      return updated
    } catch (err: any) {
      setError(err.message || 'Error updating invoice')
      throw err
    }
  }, [])

  const deleteInvoice = useCallback(async (id: string) => {
    try {
      await InvoiceService.delete(id)
      setInvoices(prev => prev.filter(inv => inv.id !== id))
      setTotalCount(prev => prev - 1)
    } catch (err: any) {
      setError(err.message || 'Error deleting invoice')
      throw err
    }
  }, [])

  useEffect(() => {
    loadInvoices(1, true)
  }, [loadInvoices])

  return {
    invoices: paginatedInvoices,
    filteredInvoices,
    loading,
    error,
    currentPage,
    totalPages,
    totalCount,
    hasMore,
    loadMore,
    refresh,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    setCurrentPage: (page: number) => {
      setCurrentPage(page)
    }
  }
}