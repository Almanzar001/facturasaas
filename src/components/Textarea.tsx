import React from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
}

const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helperText,
  required = false,
  className = '',
  rows = 4,
  ...props
}) => {
  const baseClasses = 'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors resize-vertical'
  const normalClasses = 'border-gray-300 focus:ring-primary focus:border-primary'
  const errorClasses = 'border-red-300 focus:ring-red-500 focus:border-red-500'
  
  const textareaClasses = `${baseClasses} ${error ? errorClasses : normalClasses} ${className}`
  
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <textarea
        className={textareaClasses}
        rows={rows}
        {...props}
      />
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
}

export default Textarea