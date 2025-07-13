'use client'

import React from 'react'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card'
import { useAuth, withAuth } from '@/contexts/AuthContext'

function UsersPage() {
  const { user } = useAuth()

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <a href="/configuracion" className="text-blue-600 hover:text-blue-800">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </a>
        <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
      </div>

      {/* Usuario actual */}
      <Card>
        <CardHeader>
          <CardTitle>Usuario Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <div className="font-medium">{(user as any)?.user_metadata?.full_name || 'Usuario'}</div>
                <div className="text-sm text-gray-500">{user?.email}</div>
              </div>
            </div>
            <div className="border-t pt-3">
              <div className="text-sm text-gray-600">
                <div className="flex justify-between py-1">
                  <span>Rol:</span>
                  <span className="font-medium">Administrador</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Estado:</span>
                  <span className="text-green-600 font-medium">Activo</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información sobre múltiples usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Función próximamente disponible</p>
                <p>
                  La gestión de múltiples usuarios estará disponible en una próxima actualización. 
                  Podrás invitar a colaboradores, asignar roles y permisos específicos para cada usuario.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <h3 className="font-medium text-gray-900">Funciones previstas:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-700">Invitar usuarios</p>
                  <p className="text-sm text-gray-500">Invita a tu equipo por correo electrónico</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-700">Roles y permisos</p>
                  <p className="text-sm text-gray-500">Controla el acceso a diferentes funciones</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-700">Registro de actividad</p>
                  <p className="text-sm text-gray-500">Audita las acciones de cada usuario</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-700">Límites por usuario</p>
                  <p className="text-sm text-gray-500">Establece límites de transacciones</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default withAuth(UsersPage)