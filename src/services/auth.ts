import { supabase } from './supabaseClient'
import { simpleOrganizationService } from './organizations-simple'

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
  current_organization_id?: string
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
  organization_email?: string
  role_id?: string
  skip_organization_creation?: boolean // Para usuarios invitados
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


      // Obtener información del usuario y actualizar último login en paralelo
      const [userResult, updateResult] = await Promise.all([
        supabase
          .from('users')
          .select('id, email, full_name, company_name, role_id, is_active, last_login, created_at, updated_at, current_organization_id')
          .eq('id', authData.user.id)
          .single(),
        
        supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', authData.user.id)
      ])

      if (userResult.error) {
        return { user: null, error: 'Error al obtener información del usuario' }
      }

      // Verificar si el usuario está activo
      if (!userResult.data.is_active) {
        await supabase.auth.signOut()
        return { user: null, error: 'Tu cuenta ha sido desactivada' }
      }

      // Después del login, asegurar que el usuario tenga una organización seleccionada
      if (!userResult.data.current_organization_id) {
        // Buscar la organización del usuario
        const { data: userOrgs } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', authData.user.id)
          .eq('is_active', true)
          .limit(1)

        if (userOrgs && userOrgs.length > 0) {
          // Seleccionar automáticamente la primera organización
          await supabase
            .from('users')
            .update({ current_organization_id: userOrgs[0].organization_id })
            .eq('id', authData.user.id)
        }
      }

      return { 
        user: {
          ...userResult.data,
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

      // Crear organización automáticamente - SOLO si no es un usuario invitado
      if (!data.skip_organization_creation) {
        if (data.company_name) {
          try {
            // Crear organización con el email del usuario como identificador único
            const organization = await simpleOrganizationService.createOrganization(data.company_name, undefined, authData.user.id);
            
            // Actualizar la organización con el email de la organización
            const organizationEmail = data.organization_email || data.email;
            await simpleOrganizationService.updateOrganization(organization.id, {
              email: organizationEmail
            });
            
          } catch (orgError) {
            // Fallar el registro si no se puede crear la organización
            throw new Error('No se pudo crear la organización. Intenta nuevamente.');
          }
        } else {
          // Si no hay company_name, fallar el registro
          throw new Error('El nombre de la empresa es requerido');
        }
      }
      // Si skip_organization_creation es true, no crear organización
      // El usuario se unirá a una organización existente via invitación

      // Obtener información completa del usuario
      const { data: userData } = await supabase
        .from('users')
        .select('id, email, full_name, company_name, role_id, is_active, last_login, created_at, updated_at, current_organization_id')
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
      return { user: null, error: 'Error al registrar usuario' }
    }
  }

  // Cerrar sesión
  static async logout(): Promise<void> {
    await supabase.auth.signOut()
    // Redirigir al login después de cerrar sesión
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  // Obtener usuario actual
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return null

      // Solo hacer la consulta a la BD si realmente necesitamos más datos
      // Por ahora usar los datos básicos del auth
      return {
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || '',
        company_name: user.user_metadata?.company_name || '',
        role_id: '',
        role_name: 'user',
        is_active: true,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at
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

  // Obtener datos del usuario
  static async getUserData(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, email, full_name, company_name, role_id, is_active, 
          last_login, created_at, updated_at, current_organization_id,
          role:roles(name, description)
        `)
        .eq('id', userId)
        .single()

      if (error) {
        return null
      }

      return {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        company_name: data.company_name,
        role_id: data.role_id,
        role_name: (data.role as any)?.[0]?.name || 'viewer',
        role_description: (data.role as any)?.[0]?.description || '',
        is_active: data.is_active,
        last_login: data.last_login,
        created_at: data.created_at,
        updated_at: data.updated_at,
        current_organization_id: data.current_organization_id
      }
    } catch (error) {
      return null
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