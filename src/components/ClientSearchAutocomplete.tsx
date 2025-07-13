'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Client, ClientService } from '@/services/clients'
import { useDebounce } from '@/hooks/useDebounce'

// ============================================
// AUTOCOMPLETADO OPTIMIZADO PARA CLIENTES
// ============================================

interface ClientSearchAutocompleteProps {
  value?: Client | null
  onChange: (client: Client | null) => void
  placeholder?: string
  error?: string
  required?: boolean
  onClear?: () => void
}

const ClientSearchAutocomplete: React.FC<ClientSearchAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Buscar cliente...',
  error,
  required = false,
  onClear
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Buscar clientes cuando cambia el término de búsqueda
  useEffect(() => {
    if (debouncedSearchTerm.length >= 2) {
      searchClients(debouncedSearchTerm)
    } else {
      setClients([])
      setIsOpen(false)
    }
  }, [debouncedSearchTerm])

  // Actualizar el input cuando cambia el valor seleccionado
  useEffect(() => {
    if (value) {
      setSearchTerm(value.name)
      setIsOpen(false)
    } else {
      setSearchTerm('')
    }
  }, [value])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchClients = async (term: string) => {
    try {
      setLoading(true)
      const results = await ClientService.search(term)
      setClients(results)
      setIsOpen(results.length > 0)
      setHighlightedIndex(-1)
    } catch (error) {
      console.error('Error buscando clientes:', error)
      setClients([])
      setIsOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchTerm(newValue)
    
    // Si se limpia el input, limpiar la selección
    if (!newValue.trim()) {
      onChange(null)
      if (onClear) onClear()
    }
  }

  const handleClientSelect = (client: Client) => {
    setSearchTerm(client.name)
    setIsOpen(false)
    setHighlightedIndex(-1)
    onChange(client)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < clients.length - 1 ? prev + 1 : 0
        )
        break
      
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : clients.length - 1
        )
        break
      
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && clients[highlightedIndex]) {
          handleClientSelect(clients[highlightedIndex])
        }
        break
      
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  const handleClear = () => {
    setSearchTerm('')
    setIsOpen(false)
    onChange(null)
    if (onClear) onClear()
    inputRef.current?.focus()
  }

  const highlightMatch = (text: string, term: string) => {
    if (!term) return text
    
    const regex = new RegExp(`(${term})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 font-medium">
          {part}
        </span>
      ) : part
    )
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (clients.length > 0) setIsOpen(true)
          }}
          placeholder={placeholder}
          className={`block w-full pl-10 pr-10 py-2 border rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            error ? 'border-red-300' : 'border-gray-300'
          }`}
          required={required}
        />
        
        {/* Loading/Clear button */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          ) : searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && clients.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <ul ref={listRef} className="py-1">
            {clients.map((client, index) => (
              <li
                key={client.id}
                onClick={() => handleClientSelect(client)}
                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                  index === highlightedIndex ? 'bg-blue-100' : ''
                }`}
              >
                <div className="flex flex-col">
                  <div className="font-medium text-gray-900">
                    {highlightMatch(client.name, debouncedSearchTerm)}
                  </div>
                  {client.email && (
                    <div className="text-sm text-gray-500">
                      {highlightMatch(client.email, debouncedSearchTerm)}
                    </div>
                  )}
                  {client.phone && (
                    <div className="text-sm text-gray-500">
                      {highlightMatch(client.phone, debouncedSearchTerm)}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* No results message */}
      {isOpen && !loading && clients.length === 0 && debouncedSearchTerm.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="px-3 py-2 text-gray-500 text-center">
            No se encontraron clientes
          </div>
        </div>
      )}

      {/* Selected client info */}
      {value && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium text-green-800">
                Cliente seleccionado: {value.name}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-green-600 hover:text-green-800"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientSearchAutocomplete