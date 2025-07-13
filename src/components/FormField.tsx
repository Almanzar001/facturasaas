import React from 'react'

interface FormFieldProps {
  children: React.ReactNode
  className?: string
}

const FormField: React.FC<FormFieldProps> = ({ children, className = '' }) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {children}
    </div>
  )
}

interface FormGroupProps {
  children: React.ReactNode
  className?: string
  columns?: 1 | 2 | 3 | 4
}

export const FormGroup: React.FC<FormGroupProps> = ({ 
  children, 
  className = '', 
  columns = 1 
}) => {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }
  
  return (
    <div className={`grid ${columnClasses[columns]} gap-4 ${className}`}>
      {children}
    </div>
  )
}

interface FormActionsProps {
  children: React.ReactNode
  className?: string
  align?: 'left' | 'center' | 'right'
}

export const FormActions: React.FC<FormActionsProps> = ({ 
  children, 
  className = '', 
  align = 'right' 
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  }
  
  return (
    <div className={`flex ${alignClasses[align]} space-x-3 pt-4 ${className}`}>
      {children}
    </div>
  )
}

export default FormField