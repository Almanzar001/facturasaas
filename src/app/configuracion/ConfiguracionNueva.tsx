'use client'

import React, { useState, useEffect, useRef } from 'react'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Textarea from '@/components/Textarea'
import Select from '@/components/Select'
import { FormGroup, FormActions } from '@/components/FormField'
import { useAuth, withAuth } from '@/contexts/AuthContext'
import { SettingsService, UserSettings, UpdateSettingsData } from '@/services/settings'

function ConfigurationPage() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [formData, setFormData] = useState<UpdateSettingsData>({
    company_name: '',
    company_rnc: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    tax_rate: 18,
    currency: 'RD$',
    invoice_prefix: 'FACT',
    quote_prefix: 'COT'
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await SettingsService.getSettings()
      if (data) {
        setSettings(data)
        setFormData({
          company_name: data.company_name || '',
          company_rnc: data.company_rnc || '',
          company_address: data.company_address || '',
          company_phone: data.company_phone || '',
          company_email: data.company_email || '',
          tax_rate: data.tax_rate || 18,
          currency: data.currency || 'RD$',
          invoice_prefix: data.invoice_prefix || 'FACT',
          quote_prefix: data.quote_prefix || 'COT'
        })
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      const updatedSettings = await SettingsService.updateSettings(formData)
      setSettings(updatedSettings)
      alert('Configuración guardada exitosamente')
    } catch (error) {
      alert('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen')
      return
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('El archivo es muy grande. Máximo 2MB')
      return
    }

    try {
      setUploadingLogo(true)
      const logoUrl = await SettingsService.uploadLogo(file)
      
      // Actualizar el logo en la configuración
      const updatedSettings = await SettingsService.updateSettings({
        company_logo: logoUrl
      })
      
      setSettings(updatedSettings)
      alert('Logo subido exitosamente')
    } catch (error) {
      alert('Error al subir el logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (!confirm('¿Estás seguro de eliminar el logo?')) return

    try {
      setSaving(true)
      const updatedSettings = await SettingsService.updateSettings({
        company_logo: undefined
      })
      setSettings(updatedSettings)
      alert('Logo eliminado')
    } catch (error) {
      alert('Error al eliminar el logo')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>

      {/* Información de la Empresa */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Logo de la empresa */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Logo de la Empresa
              </label>
              <div className="flex items-center space-x-4">
                {settings?.company_logo ? (
                  <div className="relative">
                    <img
                      src={settings.company_logo}
                      alt="Logo de la empresa"
                      className="h-24 w-24 object-contain border rounded-lg"
                    />
                    <button
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      title="Eliminar logo"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="h-24 w-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    loading={uploadingLogo}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? 'Subiendo...' : 'Subir Logo'}
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG o JPEG, máximo 2MB
                  </p>
                </div>
              </div>
            </div>

            <FormGroup columns={2}>
              <Input
                label="Nombre de la Empresa"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Mi Empresa SRL"
                required
              />
              <Input
                label="RNC"
                value={formData.company_rnc}
                onChange={(e) => setFormData({ ...formData, company_rnc: e.target.value })}
                placeholder="123456789"
              />
            </FormGroup>

            <Textarea
              label="Dirección"
              value={formData.company_address}
              onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
              placeholder="Calle Principal #123, Santo Domingo"
              rows={2}
            />

            <FormGroup columns={2}>
              <Input
                label="Teléfono"
                value={formData.company_phone}
                onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                placeholder="809-555-1234"
              />
              <Input
                label="Email"
                type="email"
                value={formData.company_email}
                onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                placeholder="info@miempresa.com"
              />
            </FormGroup>
          </div>
        </CardContent>
      </Card>

      {/* Configuración Fiscal */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración Fiscal</CardTitle>
        </CardHeader>
        <CardContent>
          <FormGroup columns={3}>
            <Input
              label="Tasa de ITBIS (%)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.tax_rate}
              onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
              placeholder="18"
            />
            <Select
              label="Moneda"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              options={[
                { value: 'RD$', label: 'Peso Dominicano (RD$)' },
                { value: 'USD', label: 'Dólar (USD)' },
                { value: 'EUR', label: 'Euro (EUR)' }
              ]}
            />
          </FormGroup>
        </CardContent>
      </Card>

      {/* Prefijos de Documentos */}
      <Card>
        <CardHeader>
          <CardTitle>Prefijos de Documentos</CardTitle>
        </CardHeader>
        <CardContent>
          <FormGroup columns={2}>
            <Input
              label="Prefijo de Facturas"
              value={formData.invoice_prefix}
              onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
              placeholder="FACT"
            />
            <Input
              label="Prefijo de Cotizaciones"
              value={formData.quote_prefix}
              onChange={(e) => setFormData({ ...formData, quote_prefix: e.target.value })}
              placeholder="COT"
            />
          </FormGroup>
        </CardContent>
      </Card>

      {/* Botón de guardar */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          loading={saving}
          disabled={saving}
          size="lg"
        >
          Guardar Cambios
        </Button>
      </div>
    </div>
  )
}

export default withAuth(ConfigurationPage)