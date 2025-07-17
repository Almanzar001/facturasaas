import { supabase } from './supabaseClient'

export interface User {
  id: string
  email: string
  full_name?: string
  company_name?: string
  role_id?: string
  role?: {
    id: string
    name: string
    description: string
  }
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}

export interface CreateUserData {
  email: string
  password: string
  full_name: string
  role_id: string
  company_name?: string
}

export interface Role {
  id: string
  name: string
  description: string
  is_active: boolean
}

export class UsersService {
  // Obtener todos los usuarios
  static async getUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          role:roles(id, name, description)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      return []
    }
  }

  // Obtener todos los roles
  static async getRoles(): Promise<Role[]> {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      return []
    }
  }

  // Crear usuario (método principal)
  static async createUser(userData: CreateUserData): Promise<{ success: boolean; error?: string; user?: User }> {
    try {

      // Método simplificado: usar signUp directamente
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
            role_id: userData.role_id
          }
        }
      })

      if (authError) {
        return {
          success: false,
          error: `Error al crear usuario: ${authError.message}. 

📋 INSTRUCCIONES MANUALES:
1. Ve a Supabase Dashboard > Authentication > Users
2. Click "Add user"
3. Datos:
   - Email: ${userData.email}
   - Password: ${userData.password}
   - Auto Confirm User: ✓

4. El perfil se creará automáticamente.`
        }
      }

      if (authData.user) {
        // Si el usuario se creó, crear/actualizar perfil
        const profileResult = await this.createUserProfile(authData.user.id, userData)
        if (profileResult.success) {
          return { success: true, user: profileResult.user }
        }
      }

      return {
        success: false,
        error: 'No se pudo crear el usuario'
      }

    } catch (error: any) {
      return { success: false, error: error.message || 'Error desconocido' }
    }
  }

  // Crear usuario en Supabase Auth
  private static async createUserInAuth(userData: CreateUserData): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      // Método 1: Intentar con admin.createUser (requiere service role key)
      try {
        const { data, error } = await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            full_name: userData.full_name,
            role_id: userData.role_id
          }
        })

        if (!error && data.user) {
          return { success: true, userId: data.user.id }
        }
      } catch (adminError) {
        // Admin method not available
      }

      // Método 2: signUp normal (requiere email confirmation deshabilitado)
      try {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            data: {
              full_name: userData.full_name,
              role_id: userData.role_id
            }
          }
        })

        if (!signUpError && signUpData.user) {
          return { success: true, userId: signUpData.user.id }
        }
      } catch (signUpError) {
        // SignUp method not available
      }

      // Si llegamos aquí, ambos métodos fallaron
      return {
        success: false,
        error: 'No se pudo crear usuario con ningún método de Auth. Verifica la configuración de Supabase.'
      }

    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Crear perfil de usuario en tabla personalizada
  private static async createUserProfile(userId: string, userData: CreateUserData): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Obtener la organización del usuario que está creando (el super admin)
      const { data: { user: currentAuthUser } } = await supabase.auth.getUser()
      
      let currentOrganizationId = null
      if (currentAuthUser) {
        const { data: currentUserData } = await supabase
          .from('users')
          .select('current_organization_id')
          .eq('id', currentAuthUser.id)
          .single()
        
        currentOrganizationId = currentUserData?.current_organization_id
      }

      // Crear perfil del nuevo usuario
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: userData.email,
          full_name: userData.full_name,
          company_name: userData.company_name,
          role_id: userData.role_id,
          current_organization_id: currentOrganizationId, // Asignar a la misma organización
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select(`
          *,
          role:roles(id, name, description)
        `)
        .single()

      if (error) throw error

      // Si hay organización, agregar como miembro
      if (currentOrganizationId) {
        try {
          const { error: memberError } = await supabase
            .from('organization_members')
            .upsert({
              organization_id: currentOrganizationId,
              user_id: userId,
              role: 'member', // Rol de empleado
              joined_at: new Date().toISOString(),
              is_active: true
            }, {
              onConflict: 'organization_id,user_id'
            })

          if (!memberError) {
            // Verificar que el current_organization_id esté correcto
            const { error: updateError } = await supabase
              .from('users')
              .update({ current_organization_id: currentOrganizationId })
              .eq('id', userId)
          }
        } catch (error) {
          // Error handling
        }
      }

      return { success: true, user: data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }


  // Actualizar estado de usuario
  static async toggleUserStatus(userId: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Actualizar rol de usuario
  static async updateUserRole(userId: string, roleId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          role_id: roleId,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Eliminar usuario
  static async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Primero eliminar de tabla personalizada
      const { error: tableError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (tableError) throw tableError

      // Intentar eliminar de Auth si es posible
      try {
        if (supabase.auth.admin?.deleteUser) {
          await supabase.auth.admin.deleteUser(userId)
        }
      } catch (authError) {
        // No fallar por esto
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}