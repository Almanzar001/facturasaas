'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService, User } from '@/services/auth'
import { supabase } from '@/services/supabaseClient'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (data: { email: string; password: string }) => Promise<{ error: string | null }>
  register: (data: { email: string; password: string; full_name: string; company_name?: string; organization_email?: string; skip_organization_creation?: boolean }) => Promise<{ error: string | null }>
  logout: () => Promise<void>
  canAccess: (resource: string) => boolean
  hasPermission: (resource: string, action: string) => Promise<boolean>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Obtener información correcta del usuario desde la tabla users
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          // Consultar la tabla users para obtener información actualizada con rol
          const { data: userData } = await supabase
            .from('users')
            .select(`
              id, email, full_name, company_name, role_id, is_active, 
              created_at, updated_at,
              role:roles(name, description)
            `)
            .eq('id', session.user.id)
            .single()
          
          if (userData) {
            const user: User = {
              id: userData.id,
              email: userData.email,
              full_name: userData.full_name || '',
              company_name: userData.company_name || '',
              role_id: userData.role_id || '',
              role_name: (userData.role as any)?.name || 'user',
              role_description: (userData.role as any)?.description || '',
              is_active: userData.is_active,
              created_at: userData.created_at,
              updated_at: userData.updated_at
            }
            setUser(user)
          }
        }
      } catch (error) {
        // Error loading user data
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Consultar la tabla users para obtener información actualizada con rol
        const { data: userData } = await supabase
          .from('users')
          .select(`
            id, email, full_name, company_name, role_id, is_active, 
            created_at, updated_at,
            role:roles(name, description)
          `)
          .eq('id', session.user.id)
          .single()
        
        if (userData) {
          const user: User = {
            id: userData.id,
            email: userData.email,
            full_name: userData.full_name || '',
            company_name: userData.company_name || '',
            role_id: userData.role_id || '',
            role_name: (userData.role as any)?.name || 'user',
            role_description: (userData.role as any)?.description || '',
            is_active: userData.is_active,
            created_at: userData.created_at,
            updated_at: userData.updated_at
          }
          setUser(user)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const login = async (data: { email: string; password: string }) => {
    const result = await AuthService.login(data)
    if (result.user) {
      setUser(result.user)
    }
    return { error: result.error }
  }

  const register = async (data: { email: string; password: string; full_name: string; company_name?: string; organization_email?: string; skip_organization_creation?: boolean }) => {
    const result = await AuthService.register(data)
    if (result.user) {
      setUser(result.user)
    }
    return { error: result.error }
  }

  const logout = async () => {
    await AuthService.logout()
    setUser(null)
  }

  const canAccess = (resource: string) => {
    if (!user) return false
    
    // Por ahora, permitir acceso a todos los recursos para usuarios autenticados
    // Más tarde puedes implementar lógica de permisos más específica
    const allowedResources = [
      'dashboard', 'clients', 'products', 'invoices', 
      'quotes', 'expenses', 'reports', 'settings'
    ]
    
    // Solo admin o owner pueden acceder a usuarios
    if (resource === 'users') {
      return user.role_name === 'admin' || user.role_name === 'owner'
    }
    
    return allowedResources.includes(resource)
  }

  const hasPermission = async (resource: string, action: string) => {
    if (!user) return false
    
    try {
      return await AuthService.hasPermission(resource, action)
    } catch (error) {
      return false
    }
  }

  const refreshUser = async () => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        return
      }
      
      if (!authUser) {
        return
      }
      
      // Simplificar: solo actualizar los datos básicos sin consulta compleja
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name, company_name, role_id, is_active, created_at, updated_at')
        .eq('id', authUser.id)
        .single()
      
      if (userError) {
        // Usar datos básicos de auth si falla la consulta
        setUser(prev => prev ? { ...prev, full_name: authUser.user_metadata?.full_name || prev.full_name } : null)
        return
      }
      
      // Actualizar usuario con datos de la BD
      setUser({
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        company_name: userData.company_name,
        role_id: userData.role_id,
        role_name: 'viewer', // Por simplicidad
        role_description: '',
        is_active: userData.is_active,
        last_login: undefined,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
        current_organization_id: undefined
      })
    } catch (error) {
      // Error in refreshUser
    }
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    canAccess,
    hasPermission,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function withAuth<T extends {}>(
  Component: React.ComponentType<T>,
  options?: { resource?: string; action?: string }
) {
  return function AuthenticatedComponent(props: T) {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!loading && !user) {
        router.push('/login')
      }
    }, [user, loading, router])

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )
    }

    if (!user) {
      return null
    }

    return <Component {...props} />
  }
}
