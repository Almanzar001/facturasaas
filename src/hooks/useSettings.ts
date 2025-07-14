import { useState, useEffect } from 'react'
import { SettingsService, UserSettings } from '@/services/settings'

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await SettingsService.getSettings()
      setSettings(data)
    } catch (err: any) {
      setError(err.message || 'Error loading settings')
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (data: any) => {
    try {
      const updated = await SettingsService.updateSettings(data)
      setSettings(updated)
      return updated
    } catch (err: any) {
      setError(err.message || 'Error updating settings')
      throw err
    }
  }

  return {
    settings,
    loading,
    error,
    loadSettings,
    updateSettings
  }
}