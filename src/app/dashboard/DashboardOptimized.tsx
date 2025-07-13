'use client'

import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardService, DashboardData } from '@/services/dashboard'
import Card from '@/components/Card'
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
  const displayValue = isNaN(value) || value === null || value === undefined ? 0 : value
  const displayGrowth = isNaN(growth) || growth === null || growth === undefined ? 0 : growth
  
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
        console.error('Error loading dashboard data:', error)
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
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500 py-12">
          {error || 'Error al cargar los datos del dashboard'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      </div>
      
      {/* Métricas principales - Se cargan primero */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Ingresos"
            value={metrics.totalRevenue}
            growth={metrics.revenueGrowth}
            type="revenue"
            onClick={navigateToInvoices}
          />
          <MetricCard
            title="Total Egresos"
            value={metrics.totalExpenses}
            growth={metrics.expenseGrowth}
            type="expense"
            onClick={navigateToExpenses}
          />
          <MetricCard
            title="Balance Neto"
            value={metrics.netProfit}
            growth={0}
            type="balance"
            onClick={navigateToInvoices}
          />
          <MetricCard
            title="Facturas Pendientes"
            value={metrics.pendingInvoices}
            growth={0}
            type="invoices"
            onClick={navigateToInvoices}
          />
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

      <Suspense fallback={<LoadingSpinner />}>
        <RecentActivity activities={dashboardData.recentActivity} />
      </Suspense>
    </div>
  )
}