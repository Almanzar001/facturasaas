'use client'

import React, { useState, useEffect } from 'react'
import { ClientService, Client, CreateClientData } from '@/services/clients'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import { FormGroup, FormActions } from '@/components/FormField'
import { validateEmail, validateRequired } from '@/utils/validators'

interface ClientFormProps {
  client?: Client | null
  onSave: () => void
  onCancel: () => void
}

interface FormData {
  name: string
  email: string
  phone: string
  identification: string
  identification_type: 'CC' | 'NIT' | 'CE' | 'PP'
  address: string
  city: string
}

interface FormErrors {
  name?: string
  email?: string
  phone?: string
  identification?: string
  identification_type?: string
  address?: string
  city?: string
}

const ClientForm: React.FC<ClientFormProps> = ({ client, onSave, onCancel }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    identification: '',
    identification_type: 'CC',
    address: '',
    city: ''
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        identification: client.identification || '',
        identification_type: client.identification_type || 'CC',
        address: client.address || '',
        city: client.city || ''
      })
    }
  }, [client])

  const identificationTypes = [
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'NIT', label: 'NIT' },
    { value: 'CE', label: 'Cédula de Extranjería' },
    { value: 'PP', label: 'Pasaporte' }
  ]

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!validateRequired(formData.name)) {
      newErrors.name = 'El nombre es requerido'
    }

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'El email no es válido'
    }

    if (!validateRequired(formData.identification)) {
      newErrors.identification = 'La identificación es requerida'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      setLoading(true)
      
      const clientData: CreateClientData = {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        identification: formData.identification,
        identification_type: formData.identification_type,
        address: formData.address || undefined,
        city: formData.city || undefined
      }

      if (client) {
        await ClientService.update(client.id, clientData)
      } else {
        await ClientService.create(clientData)
      }

      onSave()
    } catch (error) {
      alert('Error al guardar el cliente')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormGroup columns={2}>
        <Input
          label="Nombre"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          error={errors.name}
          required
        />
        
        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          error={errors.email}
        />
      </FormGroup>

      <FormGroup columns={2}>
        <Input
          label="Teléfono"
          value={formData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          error={errors.phone}
        />
        
        <Input
          label="Ciudad"
          value={formData.city}
          onChange={(e) => handleInputChange('city', e.target.value)}
          error={errors.city}
        />
      </FormGroup>

      <FormGroup columns={2}>
        <Select
          label="Tipo de Identificación"
          value={formData.identification_type}
          onChange={(e) => handleInputChange('identification_type', e.target.value as any)}
          options={identificationTypes}
          required
        />
        
        <Input
          label="Número de Identificación"
          value={formData.identification}
          onChange={(e) => handleInputChange('identification', e.target.value)}
          error={errors.identification}
          required
        />
      </FormGroup>

      <Input
        label="Dirección"
        value={formData.address}
        onChange={(e) => handleInputChange('address', e.target.value)}
        error={errors.address}
      />

      <FormActions>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          loading={loading}
        >
          {client ? 'Actualizar' : 'Crear'} Cliente
        </Button>
      </FormActions>
    </form>
  )
}

export default ClientForm