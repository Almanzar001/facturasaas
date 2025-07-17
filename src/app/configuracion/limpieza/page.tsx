'use client'

import { useState, useEffect } from 'react'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card'
import Button from '@/components/Button'
import LoadingSpinner from '@/components/LoadingSpinner'
import { OrganizationCleanupService, CleanupOptions } from '@/services/organization-cleanup'

export default function LimpiezaPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [dataCounts, setDataCounts] = useState({
    clients: 0,
    products: 0,
    invoices: 0,
    quotes: 0,
    expenses: 0,
    invoiceItems: 0,
    quoteItems: 0
  })
  const [selectedOptions, setSelectedOptions] = useState<CleanupOptions>({})
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')
  const [result, setResult] = useState<{ success: boolean; message: string; deletedCounts?: any } | null>(null)

  useEffect(() => {
    loadDataCounts()
  }, [])

  const loadDataCounts = async () => {
    try {
      const counts = await OrganizationCleanupService.getOrganizationDataCounts()
      setDataCounts(counts)
    } catch (error) {
      // Error loading data counts
    }
  }

  const handleOptionChange = (option: keyof CleanupOptions) => {
    setSelectedOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }))
  }

  const handleCleanup = async () => {
    if (confirmationText !== 'LIMPIAR') {
      alert('Debes escribir "LIMPIAR" para confirmar')
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const result = await OrganizationCleanupService.cleanupOrganizationData(selectedOptions)
      setResult(result)
      
      if (result.success) {
        // Reload counts after successful cleanup
        await loadDataCounts()
        setSelectedOptions({})
        setShowConfirmation(false)
        setConfirmationText('')
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getTotalSelected = () => {
    return Object.entries(selectedOptions).reduce((total, [key, selected]) => {
      if (selected) {
        return total + dataCounts[key as keyof typeof dataCounts]
      }
      return total
    }, 0)
  }

  const dataOptions = [
    { key: 'clients', label: 'Clientes', count: dataCounts.clients },
    { key: 'products', label: 'Productos', count: dataCounts.products },
    { key: 'invoices', label: 'Facturas', count: dataCounts.invoices },
    { key: 'quotes', label: 'Cotizaciones', count: dataCounts.quotes },
    { key: 'expenses', label: 'Gastos', count: dataCounts.expenses },
    { key: 'invoiceItems', label: 'Elementos de Facturas', count: dataCounts.invoiceItems },
    { key: 'quoteItems', label: 'Elementos de Cotizaciones', count: dataCounts.quoteItems }
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Limpieza de Organización</h1>
      
      {/* Warning Banner */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              ¡Atención! Esta acción es irreversible
            </h3>
            <p className="text-sm text-red-700 mt-1">
              Una vez que elimines los datos, no podrás recuperarlos. Asegúrate de hacer un respaldo antes de continuar.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Selecciona los datos a limpiar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dataOptions.map((option) => (
                <div key={option.key} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={option.key}
                      checked={selectedOptions[option.key as keyof CleanupOptions] || false}
                      onChange={() => handleOptionChange(option.key as keyof CleanupOptions)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={option.key} className="ml-2 text-sm font-medium text-gray-900">
                      {option.label}
                    </label>
                  </div>
                  <span className="text-sm text-gray-500">
                    {option.count} registros
                  </span>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total a eliminar:</span>
                <span className="font-bold text-red-600">{getTotalSelected()} registros</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation */}
        <Card>
          <CardHeader>
            <CardTitle>Confirmación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Para confirmar, escribe "LIMPIAR" en el campo siguiente:
                </label>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Escribe LIMPIAR para confirmar"
                />
              </div>
              
              <Button
                onClick={handleCleanup}
                disabled={
                  isLoading || 
                  getTotalSelected() === 0 || 
                  confirmationText !== 'LIMPIAR'
                }
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                    Limpiando...
                  </div>
                ) : (
                  'Limpiar Datos Seleccionados'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className={result.success ? 'text-green-600' : 'text-red-600'}>
              {result.success ? 'Limpieza Completada' : 'Error en la Limpieza'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{result.message}</p>
            
            {result.success && result.deletedCounts && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Registros eliminados:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(result.deletedCounts).map(([key, count]) => (
                    (count as number) > 0 && (
                      <div key={key} className="flex justify-between">
                        <span>{dataOptions.find(opt => opt.key === key)?.label}:</span>
                        <span className="font-medium">{count as number}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}