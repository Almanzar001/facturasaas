'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  const [profileError, setProfileError] = useState<string>('')
  const [passwordError, setPasswordError] = useState<string>('')
  const [profileSuccess, setProfileSuccess] = useState<string>('')
  const [passwordSuccess, setPasswordSuccess] = useState<string>('')

  // Memoized initial profile data
  const initialProfileData = useMemo(() => ({
    email: user?.email || '',
    full_name: (user as any)?.user_metadata?.full_name || ''
  }), [user])

  // Clear success messages after 3 seconds
  useEffect(() => {
    if (profileSuccess) {
      const timer = setTimeout(() => setProfileSuccess(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [profileSuccess])

  useEffect(() => {
    if (passwordSuccess) {
      const timer = setTimeout(() => setPasswordSuccess(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [passwordSuccess])

  // Update profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData(initialProfileData)
    }
  }, [user, initialProfileData])

  // Memoized password validation
  const validatePasswordForm = useCallback((): boolean => {
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
  }, [passwordData])

  // Memoized check if profile has changes
  const hasProfileChanges = useMemo(() => {
    return profileData.full_name !== initialProfileData.full_name
  }, [profileData.full_name, initialProfileData.full_name])

  // Memoized check if password form is valid
  const isPasswordFormValid = useMemo(() => {
    return passwordData.current_password && 
           passwordData.new_password && 
           passwordData.confirm_password &&
           passwordData.new_password === passwordData.confirm_password &&
           passwordData.new_password.length >= 6
  }, [passwordData])

  // Memoized formatted dates
  const formattedDates = useMemo(() => ({
    updated_at: user?.updated_at ? new Date(user.updated_at).toLocaleString('es-DO') : 'N/A',
    created_at: user?.created_at ? new Date(user.created_at).toLocaleString('es-DO') : 'N/A'
  }), [user?.updated_at, user?.created_at])

  // Optimized profile update handler
  const handleUpdateProfile = useCallback(async () => {
    if (!hasProfileChanges) return

    try {
      setLoading(true)
      setProfileError('')
      setProfileSuccess('')
      
      const { error } = await supabase.auth.updateUser({
        data: { full_name: profileData.full_name }
      })

      if (error) throw error

      setProfileSuccess('Perfil actualizado exitosamente')
    } catch (error: any) {
      console.error('Error updating profile:', error)
      setProfileError('Error al actualizar el perfil: ' + (error.message || 'Error desconocido'))
    } finally {
      setLoading(false)
    }
  }, [profileData.full_name, hasProfileChanges])

  // Optimized password change handler
  const handleChangePassword = useCallback(async () => {
    if (!validatePasswordForm()) return

    try {
      setLoading(true)
      setPasswordError('')
      setPasswordSuccess('')

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

      setPasswordSuccess('Contraseña cambiada exitosamente')
    } catch (error: any) {
      console.error('Error changing password:', error)
      setPasswordError('Error al cambiar la contraseña: ' + (error.message || 'Error desconocido'))
    } finally {
      setLoading(false)
    }
  }, [validatePasswordForm, user?.email, passwordData.current_password, passwordData.new_password])

  // Optimized profile input handlers
  const handleProfileNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData(prev => ({ ...prev, full_name: e.target.value }))
    setProfileError('')
  }, [])

  // Optimized password input handlers
  const handleCurrentPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({ ...prev, current_password: e.target.value }))
    setPasswordErrors(prev => ({ ...prev, current_password: '' }))
    setPasswordError('')
  }, [])

  const handleNewPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({ ...prev, new_password: e.target.value }))
    setPasswordErrors(prev => ({ ...prev, new_password: '' }))
    setPasswordError('')
  }, [])

  const handleConfirmPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))
    setPasswordErrors(prev => ({ ...prev, confirm_password: '' }))
    setPasswordError('')
  }, [])

  // Optimized form submit handler
  const handlePasswordFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    handleChangePassword()
  }, [handleChangePassword])

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
            {/* Profile Error Message */}
            {profileError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {profileError}
              </div>
            )}

            {/* Profile Success Message */}
            {profileSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
                {profileSuccess}
              </div>
            )}

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
              onChange={handleProfileNameChange}
              placeholder="Tu nombre completo"
            />

            <div className="flex justify-end">
              <Button
                onClick={handleUpdateProfile}
                loading={loading}
                disabled={loading || !hasProfileChanges}
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
          <form onSubmit={handlePasswordFormSubmit} className="space-y-4">
            {/* Password Error Message */}
            {passwordError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {passwordError}
              </div>
            )}

            {/* Password Success Message */}
            {passwordSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
                {passwordSuccess}
              </div>
            )}

            <Input
              label="Contraseña Actual"
              type="password"
              value={passwordData.current_password}
              onChange={handleCurrentPasswordChange}
              error={passwordErrors.current_password}
              required
            />

            <FormGroup columns={2}>
              <Input
                label="Nueva Contraseña"
                type="password"
                value={passwordData.new_password}
                onChange={handleNewPasswordChange}
                error={passwordErrors.new_password}
                helperText="Mínimo 6 caracteres"
                required
              />

              <Input
                label="Confirmar Nueva Contraseña"
                type="password"
                value={passwordData.confirm_password}
                onChange={handleConfirmPasswordChange}
                error={passwordErrors.confirm_password}
                required
              />
            </FormGroup>

            <div className="flex justify-end">
              <Button
                type="submit"
                loading={loading}
                disabled={loading || !isPasswordFormValid}
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
              <span>{formattedDates.updated_at}</span>
            </div>
            <div className="flex justify-between">
              <span>Cuenta creada:</span>
              <span>{formattedDates.created_at}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default withAuth(AccountPage)