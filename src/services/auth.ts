import { supabase } from './supabaseClient'

export interface User {
  id: string
  email: string
  full_name?: string
  company_name?: string
  role_id?: string
  role_name?: string
  role_description?: string
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}

export interface Permission {
  resource: string
  action: string
}

export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  full_name: string
  company_name?: string
  role_id?: string
}

export interface AuthResponse {
  user: User | null
  error: string | null
}

export class AuthService {
  // Login de usuario
  static async login({ email, password }: LoginData): Promise<AuthResponse> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        return { user: null, error: authError.message }
      }

      if (!authData.user) {
        return { user: null, error: 'No se pudo autenticar al usuario' }
      }

      // Obtener información completa del usuario
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name, company_name, role_id, is_active, last_login, created_at, updated_at')
        .eq('id', authData.user.id)
        .single()

      if (userError) {
        return { user: null, error: 'Error al obtener información del usuario' }
      }

      // Verificar si el usuario está activo
      if (!userData.is_active) {
        await supabase.auth.signOut()
        return { user: null, error: 'Tu cuenta ha sido desactivada' }
      }

      // Actualizar último login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', authData.user.id)

      return { 
        user: {
          ...userData,
          id: authData.user.id,
          email: authData.user.email!
        }, 
        error: null 
      }
    } catch (error) {
      return { user: null, error: 'Error al iniciar sesión' }
    }
  }

  // Registro de nuevo usuario
  static async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            company_name: data.company_name
          }
        }
      })

      if (authError) {
        return { user: null, error: authError.message }
      }

      if (!authData.user) {
        return { user: null, error: 'No se pudo crear el usuario' }
      }

      // Esperar un momento para que el trigger se ejecute
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Intentar crear/actualizar el perfil usando la función RPC
      const defaultRoleId = await this.getDefaultRoleId()
      const { error: profileError } = await supabase.rpc('create_user_profile', {
        user_id: authData.user.id,
        user_email: data.email,
        user_full_name: data.full_name,
        user_company_name: data.company_name
      })

      if (profileError) {
        console.error('Error creating profile:', profileError)
        // No eliminar el usuario de auth, el trigger debería haberlo creado
      }

      // Si hay rol específico, actualizarlo
      if (data.role_id || defaultRoleId) {
        await supabase
          .from('users')
          .update({ 
            role_id: data.role_id || defaultRoleId,
            full_name: data.full_name,
            company_name: data.company_name
          })
          .eq('id', authData.user.id)
      }

      // Obtener información completa del usuario
      const { data: userData } = await supabase
        .from('users')
        .select('id, email, full_name, company_name, role_id, is_active, last_login, created_at, updated_at')
        .eq('id', authData.user.id)
        .single()

      return { 
        user: {
          id: authData.user.id,
          email: authData.user.email!,
          full_name: data.full_name,
          company_name: data.company_name,
          role_id: data.role_id || defaultRoleId,
          role_name: 'viewer',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...(userData || {})
        }, 
        error: null 
      }
    } catch (error) {
      console.error('Registration error:', error)
      return { user: null, error: 'Error al registrar usuario' }
    }
  }

  // Cerrar sesión
  static async logout(): Promise<void> {
    await supabase.auth.signOut()
  }

  // Obtener usuario actual
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return null

      const { data: userData } = await supabase
        .from('users')
        .select('id, email, full_name, company_name, role_id, is_active, last_login, created_at, updated_at')
        .eq('id', user.id)
        .single()

      if (!userData || !userData.is_active) return null

      return {
        ...userData,
        id: user.id,
        email: user.email!
      }
    } catch (error) {
      return null
    }
  }

  // Verificar si el usuario tiene un permiso específico
  static async hasPermission(resource: string, action: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return false

      const { data, error } = await supabase
        .rpc('check_permission', {
          p_user_id: user.id,
          p_resource: resource,
          p_action: action
        })

      return data || false
    } catch (error) {
      return false
    }
  }

  // Obtener todos los permisos del usuario
  static async getUserPermissions(): Promise<Permission[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return []

      const { data, error } = await supabase
        .rpc('get_user_permissions', {
          p_user_id: user.id
        })

      return data || []
    } catch (error) {
      return []
    }
  }

  // Cambiar contraseña
  static async changePassword(newPassword: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      return { error: 'Error al cambiar la contraseña' }
    }
  }

  // Recuperar contraseña
  static async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      return { error: 'Error al enviar el correo de recuperación' }
    }
  }

  // Actualizar perfil
  static async updateProfile(data: Partial<User>): Promise<{ error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { error: 'Usuario no autenticado' }
      }

      const { error } = await supabase
        .from('users')
        .update({
          full_name: data.full_name,
          company_name: data.company_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      return { error: 'Error al actualizar el perfil' }
    }
  }

  // Obtener el ID del rol por defecto
  private static async getDefaultRoleId(): Promise<string> {
    const { data } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'viewer')
      .single()

    return data?.id || ''
  }

  // Verificar sesión activa
  static async checkSession(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  }

  // Listener para cambios de autenticación
  static onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser()
        callback(user)
      } else {
        callback(null)
      }
    })
  }
}