import React from 'react'
import LoadingSpinner from './LoadingSpinner'

interface LoadingFallbackProps {
  message?: string
  className?: string
}

export default function LoadingFallback({ 
  message = 'Cargando...', 
  className = 'flex justify-center items-center h-64' 
}: LoadingFallbackProps) {
  return (
    <div className={className}>
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      </div>
    </div>
  )
}