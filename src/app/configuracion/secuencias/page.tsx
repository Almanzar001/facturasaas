'use client'

import React from 'react'
import { withAuth } from '@/contexts/AuthContext'
import FiscalSequenceManager from '@/components/FiscalSequenceManager'

function FiscalSequencesPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <a
          href="/configuracion"
          className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Volver a Configuración</span>
        </a>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Secuencias Fiscales Personalizadas</h1>
        <p className="text-gray-600 mt-2">
          Configure secuencias numéricas personalizadas para sus comprobantes fiscales. 
          Puede definir prefijos, sufijos, rangos de numeración y formato de relleno.
        </p>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Información Importante
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Cada tipo de documento fiscal (B01, B02, B15) puede tener solo una secuencia activa</li>
                <li>El formato incluye: Prefijo + Número (con relleno) + Sufijo</li>
                <li>Una vez creada una secuencia, asegúrese de configurarla antes de generar facturas</li>
                <li>Puede reiniciar secuencias, pero tenga cuidado con la duplicación de números</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <FiscalSequenceManager />
    </div>
  )
}

export default withAuth(FiscalSequencesPage)