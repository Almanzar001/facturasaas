'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/services/supabaseClient'
import Link from 'next/link'

export default function HomePage() {
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'error'>('connected') // Cambiar a 'connected' directamente
  const [error, setError] = useState<string>('')

  // Comentar temporalmente el useEffect
  /*
  useEffect(() => {
    async function testConnection() {
      // ... código de conexión
    }
    testConnection()
  }, [])
  */

  if (connectionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Conectando a la base de datos...</p>
        </div>
      </div>
    )
  }

  if (connectionStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error de Conexión</h1>
          <p className="text-xl text-gray-600 mb-8">
            Sistema de facturación para PYMES
          </p>
          <div className="space-x-4">
            <Link href="/dashboard">
              <button className="bg-primary text-white px-6 py-3 rounded-2xl hover:bg-blue-900 transition-colors">
                Ir al Dashboard
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            FacturaSaaS
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Sistema de facturación para PYMES
          </p>
          
          <div className="flex justify-center space-x-4">
            <Link 
              href="/login" 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link 
              href="/register" 
              className="bg-white text-blue-600 px-6 py-3 rounded-lg border border-blue-600 hover:bg-blue-50 transition-colors"
            >
              Registrarse
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-lg font-semibold mb-2">Dashboard</h3>
            <p className="text-gray-600">Visualiza tus métricas de negocio</p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <div className="text-3xl mb-4">📄</div>
            <h3 className="text-lg font-semibold mb-2">Facturas</h3>
            <p className="text-gray-600">Crea y gestiona facturas fácilmente</p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <div className="text-3xl mb-4">👥</div>
            <h3 className="text-lg font-semibold mb-2">Clientes</h3>
            <p className="text-gray-600">Administra tu cartera de clientes</p>
          </div>
        </div>
      </div>
    </div>
  )
}
