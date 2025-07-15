'use client'

import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardService, DashboardData } from '@/services/dashboard'
import Card from '@/components/Card'
import Button from '@/components/Button'
import LoadingSpinner from '@/components/LoadingSpinner'
import { formatCurrency } from '@/utils/formatCurrency'

// Lazy load componentes pesados
const TopClients = lazy(() => import('./components/TopClients'))
const TopProducts = lazy(() => import('./components/TopProducts'))
const RecentActivity = lazy(() => import('./components/RecentActivity'))

interface MetricCardProps {
  title: string
  value: number
  growth: number
  type: 'revenue' | 'expense' | 'balance' | 'invoices'
  onClick?: () => void
}

const MetricCard = React.memo<MetricCardProps>(({ title, value, growth, type, onClick }) => {
  // Ensure value is a valid number
  const displayValue = isNaN(value) || value === null || value === undefined ? 0 : Number(value)
  const displayGrowth = isNaN(growth) || growth === null || growth === undefined ? 0 : Number(growth)
  
  const getColor = () => {
    switch (type) {
      case 'revenue': return 'text-green-600'
      case 'expense': return 'text-red-600'
      case 'balance': return displayValue >= 0 ? 'text-blue-600' : 'text-red-600'
      default: return 'text-gray-900'
    }
  }

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600'
    if (growth < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return '↗'
    if (growth < 0) return '↘'
    return '→'
  }

  return (
    <Card>
      <div 
        className={`text-center ${onClick ? 'cursor-pointer hover:bg-gray-50 transition-colors p-4 rounded' : ''}`}
        onClick={onClick}
      >
        <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
        <p className={`text-2xl font-bold ${getColor()}`}>
          {type === 'invoices' ? displayValue : formatCurrency(displayValue)}
        </p>
        <div className={`text-sm mt-1 ${getGrowthColor(displayGrowth)}`}>
          {getGrowthIcon(displayGrowth)} {Math.abs(displayGrowth).toFixed(1)}%
        </div>
        {onClick && (
          <div className="text-xs text-blue-600 mt-1 opacity-75">
            Click para ver detalles →
          </div>
        )}
      </div>
    </Card>
  )
})

MetricCard.displayName = 'MetricCard'

export default function DashboardOptimized() {
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const loadDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const data = await DashboardService.getDashboardData()
        
        if (mounted) {
          setDashboardData(data)
        }
      } catch (error) {
        if (mounted) {
          setError('Error al cargar los datos del dashboard')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadDashboardData()

    return () => {
      mounted = false
    }
  }, [])

  // Memoizar las métricas para evitar recálculos
  const metrics = useMemo(() => {
    if (!dashboardData) return null
    return dashboardData.metrics
  }, [dashboardData])

  // Navegation handlers for metric cards
  const navigateToInvoices = () => router.push('/facturas')
  const navigateToExpenses = () => router.push('/gastos')
  const navigateToClients = () => router.push('/clientes')
  const navigateToProducts = () => router.push('/productos')

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-96">
        <LoadingSpinner size="lg" />
        <div className="ml-4 text-gray-500">Cargando dashboard...</div>
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium">Error del Dashboard</h3>
            <p className="text-red-600 mt-1">{error || 'Error al cargar los datos del dashboard'}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Recargar página
            </button>
          </div>
        </div>
      </div>
    )
  }


  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-2">
          {dashboardData && dashboardData.metrics.totalInvoices === 0 && (
            <div className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
              ⚠️ No hay datos - Crea tu primera factura
            </div>
          )}
        </div>
      </div>
      
      {/* Métricas principales - Se cargan primero */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Ingresos"
          value={metrics?.totalRevenue || 0}
          growth={metrics?.revenueGrowth || 0}
          type="revenue"
          onClick={navigateToInvoices}
        />
        <MetricCard
          title="Total Egresos"
          value={metrics?.totalExpenses || 0}
          growth={metrics?.expenseGrowth || 0}
          type="expense"
          onClick={navigateToExpenses}
        />
        <MetricCard
          title="Balance Neto"
          value={metrics?.netProfit || 0}
          growth={0}
          type="balance"
          onClick={navigateToInvoices}
        />
        <MetricCard
          title="Facturas Pendientes"
          value={metrics?.pendingInvoices || 0}
          growth={0}
          type="invoices"
          onClick={navigateToInvoices}
        />
      </div>

      {/* Mostrar información si no hay datos */}
      {dashboardData && (
        dashboardData.metrics.totalInvoices === 0 && 
        dashboardData.metrics.totalExpenses === 0 && 
        dashboardData.metrics.totalClients === 0
      ) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="text-blue-600 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-blue-900 mb-2">¡Bienvenido a tu Dashboard!</h3>
          <p className="text-blue-700 mb-4">
            Tu dashboard estará lleno de datos una vez que comiences a usar la aplicación.
          </p>
          <div className="space-y-2 text-sm text-blue-600">
            <p>• <a href="/clientes" className="underline hover:text-blue-800">Agrega tus primeros clientes</a></p>
            <p>• <a href="/productos" className="underline hover:text-blue-800">Crea tu catálogo de productos</a></p>
            <p>• <a href="/facturas" className="underline hover:text-blue-800">Genera tu primera factura</a></p>
          </div>
        </div>
      )}


      {/* Secciones secundarias - Se cargan de forma diferida */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<LoadingSpinner />}>
          <TopClients clients={dashboardData.topClients} />
        </Suspense>
        
        <Suspense fallback={<LoadingSpinner />}>
          <TopProducts products={dashboardData.topProducts} />
        </Suspense>
      </div>

      {/* Actividad reciente comentada temporalmente */}
      {/* <Suspense fallback={<LoadingSpinner />}>
        <RecentActivity activities={dashboardData.recentActivity} />
      </Suspense> */}
    </div>
  )
}
