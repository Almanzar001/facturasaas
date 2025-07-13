import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: React.ReactNode
  required?: boolean
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  icon,
  required = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors'
  const normalClasses = 'border-gray-300 focus:ring-primary focus:border-primary'
  const errorClasses = 'border-red-300 focus:ring-red-500 focus:border-red-500'
  const iconClasses = icon ? 'pl-10' : ''
  
  const inputClasses = `${baseClasses} ${error ? errorClasses : normalClasses} ${iconClasses} ${className}`
  
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {icon}
          </div>
        )}
        
        <input
          className={inputClasses}
          {...props}
        />
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
}

export default Input