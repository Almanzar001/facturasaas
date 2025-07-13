import React from 'react'

interface StatusBadgeProps {
  status: string
  variant?: 'invoice' | 'quote' | 'general'
  className?: string
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  variant = 'general', 
  className = '' 
}) => {
  const getStatusConfig = () => {
    switch (variant) {
      case 'invoice':
        return {
          draft: { color: 'bg-gray-100 text-gray-800', text: 'Borrador' },
          sent: { color: 'bg-blue-100 text-blue-800', text: 'Enviada' },
          paid: { color: 'bg-green-100 text-green-800', text: 'Pagada' },
          overdue: { color: 'bg-red-100 text-red-800', text: 'Vencida' }
        }
      case 'quote':
        return {
          draft: { color: 'bg-gray-100 text-gray-800', text: 'Borrador' },
          sent: { color: 'bg-blue-100 text-blue-800', text: 'Enviada' },
          accepted: { color: 'bg-green-100 text-green-800', text: 'Aceptada' },
          rejected: { color: 'bg-red-100 text-red-800', text: 'Rechazada' },
          expired: { color: 'bg-yellow-100 text-yellow-800', text: 'Vencida' }
        }
      default:
        return {
          active: { color: 'bg-green-100 text-green-800', text: 'Activo' },
          inactive: { color: 'bg-gray-100 text-gray-800', text: 'Inactivo' },
          pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pendiente' },
          completed: { color: 'bg-green-100 text-green-800', text: 'Completado' }
        }
    }
  }

  const statusConfig = getStatusConfig()
  const config = statusConfig[status as keyof typeof statusConfig] || {
    color: 'bg-gray-100 text-gray-800',
    text: status
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} ${className}`}>
      {config.text}
    </span>
  )
}

export default StatusBadge