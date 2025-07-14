import { useState, useEffect, useCallback } from 'react'
import { DashboardService, DashboardMetrics } from '@/services/dashboard'

interface CacheEntry {
  data: DashboardMetrics
  timestamp: number
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds
const CACHE_KEY = 'dashboard_metrics'

export function useDashboardCache() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getCachedData = useCallback((): CacheEntry | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) return null
      
      const parsed: CacheEntry = JSON.parse(cached)
      const now = Date.now()
      
      if (now - parsed.timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY)
        return null
      }
      
      return parsed
    } catch {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
  }, [])

  const setCachedData = useCallback((data: DashboardMetrics) => {
    try {
      const cacheEntry: CacheEntry = {
        data,
        timestamp: Date.now()
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry))
    } catch {
      // Ignore storage errors
    }
  }, [])

  const loadMetrics = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)

      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cached = getCachedData()
        if (cached) {
          setMetrics(cached.data)
          setLoading(false)
          return cached.data
        }
      }

      // Fetch fresh data
      const data = await DashboardService.getMetrics()
      setMetrics(data)
      setCachedData(data)
      
      return data
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard metrics')
      throw err
    } finally {
      setLoading(false)
    }
  }, [getCachedData, setCachedData])

  const refreshMetrics = useCallback(() => {
    return loadMetrics(true)
  }, [loadMetrics])

  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY)
  }, [])

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  return {
    metrics,
    loading,
    error,
    refreshMetrics,
    clearCache,
    loadMetrics
  }
}