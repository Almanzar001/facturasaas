'use client'

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { AuthService, User, Permission, LoginData, RegisterData } from '@/services/auth'
import { useRouter, usePathname } from 'next/navigation'

interface AuthContextType {
  user: User | null
  loading: boolean
  permissions: Permission[]
  login: (data: LoginData) => Promise<{ error: string | null }>
  register: (data: RegisterData) => Promise<{ error: string | null }>
  logout: () => Promise<void>
  hasPermission: (resource: string, action: string) => boolean
  canAccess: (resource: string) => boolean
  isAdmin: () => boolean
  isSuperAdmin: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/']

// Permisos requeridos por ruta
const ROUTE_PERMISSIONS: Record<string, { resource: string; action: string }> = {
  '/dashboard': { resource: 'dashboard', action: 'read' },
  '/clientes': { resource: 'clients', action: 'read' },
  '/productos': { resource: 'products', action: 'read' },
  '/facturas': { resource: 'invoices', action: 'read' },
  '/cotizaciones': { resource: 'quotes', action: 'read' },
  '/gastos': { resource: 'expenses', action: 'read' },
  '/reportes': { resource: 'reports', action: 'read' },
  '/configuracion': { resource: 'settings', action: 'read' },
  '/usuarios': { resource: 'users', action: 'read' },
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkAuth()
    
    // Suscribirse a cambios de autenticación
    const { data: { subscription } } = AuthService.onAuthStateChange((user) => {
      setUser(user)
      if (user) {
        loadPermissions()
      } else {
        setPermissions([])
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    // Verificar permisos cuando cambia la ruta
    if (!loading && user && !PUBLIC_ROUTES.includes(pathname)) {
      checkRoutePermission()
    }
  }, [pathname, user, permissions, loading])

  const checkAuth = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser()
      setUser(currentUser)
      
      if (currentUser) {
        await loadPermissions()
      }

      // Redirigir si no está autenticado y no está en ruta pública
      if (!currentUser && !PUBLIC_ROUTES.includes(pathname)) {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error checking auth:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPermissions = async () => {
    try {
      const userPermissions = await AuthService.getUserPermissions()
      setPermissions(userPermissions)
    } catch (error) {
      console.error('Error loading permissions:', error)
    }
  }

  const checkRoutePermission = () => {
    const routePermission = ROUTE_PERMISSIONS[pathname]
    
    if (routePermission && !hasPermission(routePermission.resource, routePermission.action)) {
      router.push('/dashboard')
    }
  }

  const login = async (data: LoginData): Promise<{ error: string | null }> => {
    const response = await AuthService.login(data)
    
    if (response.user) {
      setUser(response.user)
      await loadPermissions()
      router.push('/dashboard')
      return { error: null }
    }
    
    return { error: response.error }
  }

  const register = async (data: RegisterData): Promise<{ error: string | null }> => {
    const response = await AuthService.register(data)
    
    if (response.user) {
      setUser(response.user)
      await loadPermissions()
      router.push('/dashboard')
      return { error: null }
    }
    
    return { error: response.error }
  }

  const logout = async () => {
    await AuthService.logout()
    setUser(null)
    setPermissions([])
    router.push('/login')
  }

  const hasPermission = (resource: string, action: string): boolean => {
    if (!user) return false
    
    // Super admin tiene todos los permisos
    if (user.role_name === 'super_admin') return true
    
    return permissions.some(p => p.resource === resource && p.action === action)
  }

  const canAccess = (resource: string): boolean => {
    return hasPermission(resource, 'read')
  }

  const isAdmin = (): boolean => {
    return user?.role_name === 'admin' || user?.role_name === 'super_admin'
  }

  const isSuperAdmin = (): boolean => {
    return user?.role_name === 'super_admin'
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      permissions,
      login,
      register,
      logout,
      hasPermission,
      canAccess,
      isAdmin,
      isSuperAdmin
    }}>
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

// HOC para proteger componentes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission?: { resource: string; action: string }
) {
  return function ProtectedComponent(props: P) {
    const { user, loading, hasPermission } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!loading) {
        if (!user) {
          router.push('/login')
        } else if (requiredPermission && !hasPermission(requiredPermission.resource, requiredPermission.action)) {
          router.push('/dashboard')
        }
      }
    }, [user, loading])

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando...</p>
          </div>
        </div>
      )
    }

    if (!user) {
      return null
    }

    if (requiredPermission && !hasPermission(requiredPermission.resource, requiredPermission.action)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
            <p className="text-gray-600">No tienes permisos para acceder a esta sección.</p>
          </div>
        </div>
      )
    }

    return <Component {...props} />
  }
}