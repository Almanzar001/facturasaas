'use client'

import React, { useState, Suspense } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Input from '@/components/Input'
import Button from '@/components/Button'
import Card from '@/components/Card'

function RegisterContent() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    company_name: '',
    organization_email: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register } = useAuth()

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    const redirectUrl = searchParams.get('redirect')
    const isFromInvitation = redirectUrl && redirectUrl.includes('/invitations?token=')

    if (!formData.full_name) {
      newErrors.full_name = 'El nombre es requerido'
    }

    if (!formData.email) {
      newErrors.email = 'El correo es requerido'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Correo inválido'
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida'
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden'
    }

    // Solo validar campos de empresa si NO viene desde invitación
    if (!isFromInvitation) {
      if (!formData.company_name) {
        newErrors.company_name = 'El nombre de la empresa es requerido'
      }

      if (!formData.organization_email) {
        newErrors.organization_email = 'El correo de la organización es requerido'
      } else if (!/\S+@\S+\.\S+/.test(formData.organization_email)) {
        newErrors.organization_email = 'Correo de organización inválido'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setLoading(true)
      // Detectar si viene desde una invitación
      const redirectUrl = searchParams.get('redirect')
      const isFromInvitation = redirectUrl && redirectUrl.includes('/invitations?token=')
      
      const { error } = await register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        company_name: isFromInvitation ? 'Invitado' : formData.company_name, // Valor temporal si es invitación
        organization_email: formData.organization_email,
        skip_organization_creation: Boolean(isFromInvitation) // No crear org si es invitación
      })

      if (error) {
        setErrors({ general: error })
      } else {
        // Successful registration - redirect to login with success message and preserve redirect param
        const redirectUrl = searchParams.get('redirect')
        const loginUrl = redirectUrl 
          ? `/login?message=registered&redirect=${encodeURIComponent(redirectUrl)}`
          : '/login?message=registered'
        router.push(loginUrl)
      }
    } catch (error) {
      setErrors({ general: 'Error al crear la cuenta' })
    } finally {
      setLoading(false)
    }
  }

  const redirectUrl = searchParams.get('redirect')
  const isFromInvitation = redirectUrl && redirectUrl.includes('/invitations?token=')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-4xl font-bold text-primary">
            FacturaSaaS
          </h1>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isFromInvitation ? 'Crea tu cuenta para aceptar la invitación' : 'Crea tu cuenta'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            O{' '}
            <Link href="/login" className="font-medium text-primary hover:text-blue-800">
              inicia sesión si ya tienes una cuenta
            </Link>
          </p>
          {isFromInvitation && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800 text-center">
                📧 Estás creando una cuenta para aceptar una invitación a una organización.
              </p>
            </div>
          )}
        </div>

        <Card className="mt-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {errors.general}
              </div>
            )}

            <Input
              label="Nombre completo"
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              error={errors.full_name}
              placeholder="Juan Pérez"
              required
            />

            {!isFromInvitation && (
              <>
                <Input
                  label="Nombre de la empresa"
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  error={errors.company_name}
                  placeholder="Mi Empresa S.A."
                  required
                />

                <Input
                  label="Correo de la organización"
                  type="email"
                  value={formData.organization_email}
                  onChange={(e) => setFormData({ ...formData, organization_email: e.target.value })}
                  error={errors.organization_email}
                  placeholder="admin@miempresa.com"
                  autoComplete="email"
                  required
                />
              </>
            )}

            <Input
              label="Correo electrónico"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
              placeholder="tu@correo.com"
              autoComplete="email"
              required
            />

            <Input
              label="Contraseña"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={errors.password}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />

            <Input
              label="Confirmar contraseña"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              error={errors.confirmPassword}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />

            <div className="flex items-center">
              <input
                type="checkbox"
                id="terms"
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                required
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-900">
                Acepto los{' '}
                <Link href="/terms" className="text-primary hover:text-blue-800">
                  Términos de Servicio
                </Link>{' '}
                y la{' '}
                <Link href="/privacy" className="text-primary hover:text-blue-800">
                  Política de Privacidad
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={loading}
              disabled={loading}
            >
              Crear Cuenta
            </Button>

            <div className="text-center text-sm text-gray-600">
              <p>Tu cuenta iniciará con un plan gratuito.</p>
              <p>Podrás cambiar de plan en cualquier momento.</p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  )
}