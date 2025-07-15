import { useState, useEffect, useCallback, useRef } from 'react'
import { cachedQuery } from '@/services/supabaseClient'

interface QueryOptions {
  enabled?: boolean
  cacheTime?: number
  staleTime?: number
  refetchOnWindowFocus?: boolean
}

export function useOptimizedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  options: QueryOptions = {}
) {
  const {
    enabled = true,
    cacheTime = 5 * 60 * 1000,
    staleTime = 1 * 60 * 1000,
    refetchOnWindowFocus = false,
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController>()

  const fetchData = useCallback(async () => {
    if (!enabled) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    setLoading(true)
    setError(null)

    try {
      const result = await cachedQuery(key, queryFn, cacheTime)
      setData(result)
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err as Error)
      }
    } finally {
      setLoading(false)
    }
  }, [key, queryFn, enabled, cacheTime])

  useEffect(() => {
    fetchData()

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchData])

  useEffect(() => {
    if (!refetchOnWindowFocus) return

    const handleFocus = () => fetchData()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchData, refetchOnWindowFocus])

  return { data, loading, error, refetch: fetchData }
}