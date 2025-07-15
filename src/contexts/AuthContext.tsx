'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService, User } from '@/services/auth'
import { supabase } from '@/services/supabaseClient'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (data: { email: string; password: string }) => Promise<{ error: string | null }>
  register: (data: { email: string; password: string; full_name: string; company_name?: string }) => Promise<{ error: string | null }>
  logout: () => Promise<void>
  canAccess: (resource: string) => boolean
  hasPermission: (resource: string, action: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Optimización: usar getSession en lugar de getCurrentUser al inicio
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          // Crear usuario básico sin consulta extra a la BD
          const user: User = {
            id: session.user.id,
            email: session.user.email!,
            full_name: session.user.user_metadata?.full_name || '',
            company_name: session.user.user_metadata?.company_name || '',
            role_id: '',
            role_name: 'user',
            is_active: true,
            created_at: session.user.created_at,
            updated_at: session.user.updated_at || session.user.created_at
          }
          setUser(user)
        }
      } catch (error) {
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user: User = {
          id: session.user.id,
          email: session.user.email!,
          full_name: session.user.user_metadata?.full_name || '',
          company_name: session.user.user_metadata?.company_name || '',
          role_id: '',
          role_name: 'user',
          is_active: true,
          created_at: session.user.created_at,
          updated_at: session.user.updated_at || session.user.created_at
        }
        setUser(user)
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

  const register = async (data: { email: string; password: string; full_name: string; company_name?: string }) => {
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
    
    // Solo admin puede acceder a usuarios
    if (resource === 'users') {
      return user.role_name === 'admin'
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

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    canAccess,
    hasPermission,
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
