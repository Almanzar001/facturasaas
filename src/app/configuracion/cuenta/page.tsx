'use client'

import React, { useState, useEffect } from 'react'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card'
import Button from '@/components/Button'
import Input from '@/components/Input'
import { FormGroup, FormActions } from '@/components/FormField'
import { useAuth, withAuth } from '@/contexts/AuthContext'
import { supabase } from '@/services/supabaseClient'

function AccountPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [profileData, setProfileData] = useState({
    email: '',
    full_name: ''
  })
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user) {
      setProfileData({
        email: user.email || '',
        full_name: (user as any).user_metadata?.full_name || ''
      })
    }
  }, [user])

  const validatePasswordForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!passwordData.current_password) {
      errors.current_password = 'La contraseña actual es requerida'
    }

    if (!passwordData.new_password) {
      errors.new_password = 'La nueva contraseña es requerida'
    } else if (passwordData.new_password.length < 6) {
      errors.new_password = 'La contraseña debe tener al menos 6 caracteres'
    }

    if (!passwordData.confirm_password) {
      errors.confirm_password = 'Confirma la nueva contraseña'
    } else if (passwordData.new_password !== passwordData.confirm_password) {
      errors.confirm_password = 'Las contraseñas no coinciden'
    }

    setPasswordErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleUpdateProfile = async () => {
    try {
      setLoading(true)
      
      const { error } = await supabase.auth.updateUser({
        data: { full_name: profileData.full_name }
      })

      if (error) throw error

      alert('Perfil actualizado exitosamente')
    } catch (error: any) {
      console.error('Error updating profile:', error)
      alert('Error al actualizar el perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return

    try {
      setLoading(true)

      // Verificar contraseña actual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordData.current_password
      })

      if (signInError) {
        setPasswordErrors({ current_password: 'Contraseña actual incorrecta' })
        return
      }

      // Cambiar contraseña
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password
      })

      if (error) throw error

      // Limpiar formulario
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      })
      setPasswordErrors({})

      alert('Contraseña cambiada exitosamente')
    } catch (error: any) {
      console.error('Error changing password:', error)
      alert('Error al cambiar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <a href="/configuracion" className="text-blue-600 hover:text-blue-800">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </a>
        <h1 className="text-3xl font-bold text-gray-900">Mi Cuenta</h1>
      </div>

      {/* Información del perfil */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={profileData.email}
              disabled
              helperText="El email no puede ser cambiado"
            />

            <Input
              label="Nombre Completo"
              value={profileData.full_name}
              onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
              placeholder="Tu nombre completo"
            />

            <div className="flex justify-end">
              <Button
                onClick={handleUpdateProfile}
                loading={loading}
                disabled={loading}
              >
                Actualizar Perfil
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cambiar contraseña */}
      <Card>
        <CardHeader>
          <CardTitle>Cambiar Contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }} className="space-y-4">
            <Input
              label="Contraseña Actual"
              type="password"
              value={passwordData.current_password}
              onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
              error={passwordErrors.current_password}
              required
            />

            <FormGroup columns={2}>
              <Input
                label="Nueva Contraseña"
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                error={passwordErrors.new_password}
                helperText="Mínimo 6 caracteres"
                required
              />

              <Input
                label="Confirmar Nueva Contraseña"
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                error={passwordErrors.confirm_password}
                required
              />
            </FormGroup>

            <div className="flex justify-end">
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
              >
                Cambiar Contraseña
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Información de la sesión */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Sesión</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>ID de Usuario:</span>
              <span className="font-mono text-xs">{user?.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Última actualización:</span>
              <span>{user?.updated_at ? new Date(user.updated_at).toLocaleString('es-DO') : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>Cuenta creada:</span>
              <span>{user?.created_at ? new Date(user.created_at).toLocaleString('es-DO') : 'N/A'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default withAuth(AccountPage)