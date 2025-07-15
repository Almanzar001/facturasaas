'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Textarea from '@/components/Textarea'
import Select from '@/components/Select'
import { FormGroup, FormActions } from '@/components/FormField'
import { useAuth, withAuth } from '@/contexts/AuthContext'
import { SettingsService, UserSettings, UpdateSettingsData } from '@/services/settings'
import { useSettings } from '@/hooks/useSettings'

function ConfigurationPage() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { settings, loading, error, updateSettings } = useSettings()
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
    if (settings) {
      setFormData({
        company_name: settings.company_name || '',
        company_rnc: settings.company_rnc || '',
        company_address: settings.company_address || '',
        company_phone: settings.company_phone || '',
        company_email: settings.company_email || '',
        tax_rate: settings.tax_rate || 18,
        currency: settings.currency || 'RD$',
        invoice_prefix: settings.invoice_prefix || 'FACT',
        quote_prefix: settings.quote_prefix || 'COT'
      })
    }
  }, [settings])

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      await updateSettings(formData)
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
      await updateSettings({
        company_logo: logoUrl
      })
      alert('Logo subido exitosamente')
    } catch (error: any) {
      if (error.message?.includes('storage/bucket-not-found')) {
        alert('Error: El bucket "company-assets" no existe. Por favor, ejecuta el script SQL primero.')
      } else if (error.message?.includes('storage/object-not-found')) {
        alert('Error: No se pudo encontrar el archivo subido.')
      } else {
        alert(`Error al subir el logo: ${error.message || 'Error desconocido'}`)
      }
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (!confirm('¿Estás seguro de eliminar el logo?')) return

    try {
      setSaving(true)
      await updateSettings({
        company_logo: undefined
      })
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

      {/* Enlaces rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

        <a
          href="/configuracion/cuenta"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Mi Cuenta</p>
              <p className="text-xs text-gray-500">Perfil y contraseña</p>
            </div>
          </div>
        </a>

        <a
          href="/configuracion/usuarios"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Usuarios</p>
              <p className="text-xs text-gray-500">Gestionar accesos</p>
            </div>
          </div>
        </a>

        <a
          href="/configuracion/cuentas"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Cuentas Bancarias</p>
              <p className="text-xs text-gray-500">Métodos de pago</p>
            </div>
          </div>
        </a>

        <a
          href="/configuracion/secuencias"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Secuencias Fiscales</p>
              <p className="text-xs text-gray-500">Numeración personalizada</p>
            </div>
          </div>
        </a>
      </div>

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
                    <Image
                      src={settings.company_logo}
                      alt="Logo de la empresa"
                      width={96}
                      height={96}
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