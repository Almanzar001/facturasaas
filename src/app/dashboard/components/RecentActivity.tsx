'use client'

import React from 'react'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card'
import { formatCurrency } from '@/utils/formatCurrency'

interface Activity {
  id: string
  type: 'invoice' | 'quote' | 'expense' | 'client'
  title: string
  subtitle: string
  amount?: number
  date: string
}

interface RecentActivityProps {
  activities: Activity[]
}

const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => {
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'invoice': return '📄'
      case 'quote': return '📋'
      case 'expense': return '💸'
      case 'client': return '👥'
      default: return '📌'
    }
  }

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'invoice': return 'text-blue-600'
      case 'quote': return 'text-indigo-600'
      case 'expense': return 'text-red-600'
      case 'client': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad Reciente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <span className="text-2xl">{getActivityIcon(activity.type)}</span>
              <div className="flex-1">
                <p className="text-sm text-gray-900 font-medium">{activity.title}</p>
                <p className="text-xs text-gray-600">{activity.subtitle}</p>
                {activity.amount && (
                  <p className={`text-sm font-medium ${getActivityColor(activity.type)}`}>
                    {formatCurrency(activity.amount)}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  {new Date(activity.date).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {activities.length === 0 && (
            <p className="text-center text-gray-500 py-4">No hay actividad reciente</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default React.memo(RecentActivity)