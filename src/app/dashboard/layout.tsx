'use client'

import { Inter } from 'next/font/google'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

const inter = Inter({ subsets: ['latin'] })

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { user, logout, canAccess, loading } = useAuth()

  // Menu items with their required permissions
  const allMenuItems = [
    { href: '/dashboard', label: 'Dashboard', resource: 'dashboard' },
    { href: '/clientes', label: 'Clientes', resource: 'clients' },
    { href: '/productos', label: 'Productos', resource: 'products' },
    { href: '/facturas', label: 'Facturas', resource: 'invoices' },
    { href: '/cotizaciones', label: 'Cotizaciones', resource: 'quotes' },
    { href: '/gastos', label: 'Gastos', resource: 'expenses' },
    { href: '/reportes', label: 'Reportes', resource: 'reports' },
    { href: '/configuracion', label: 'Configuración', resource: 'settings' },
    { href: '/usuarios', label: 'Usuarios', resource: 'users' },
  ]

  // Filter menu items based on user permissions
  const menuItems = allMenuItems.filter(item => canAccess(item.resource))

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  const isActive = (href: string) => pathname === href

  // Show loading state while checking authentication
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

  // Prevent unauthorized access
  if (!user) {
    return null
  }

  return (
    <div className={`min-h-screen bg-background ${inter.className}`}>
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Botón hamburguesa para móvil */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              >
                <span className="sr-only">Abrir menú</span>
                {/* Icono hamburguesa */}
                <svg
                  className={`${isSidebarOpen ? 'hidden' : 'block'} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                {/* Icono X */}
                <svg
                  className={`${isSidebarOpen ? 'block' : 'hidden'} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h1 className="ml-2 lg:ml-0 text-xl font-bold text-primary">FacturaSaaS</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {user.full_name || user.email}
                </div>
                {user.role_description && (
                  <div className="text-xs text-gray-500">
                    {user.role_description}
                  </div>
                )}
              </div>
              <button 
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar para desktop */}
        <aside className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:translate-x-0 lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-sm transition-transform duration-300 ease-in-out lg:block`}>
          <nav className="mt-8">
            <div className="px-4 space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                    isActive(item.href)
                      ? 'text-gray-900 bg-gray-100'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </aside>

        {/* Overlay para móvil */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}