'use client'

import React, { useState, useEffect } from 'react'
import { ProductService, Product, CreateProductData } from '@/services/products'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import Textarea from '@/components/Textarea'
import { FormGroup, FormActions } from '@/components/FormField'
import { validateRequired, validatePositiveNumber } from '@/utils/validators'

interface ProductFormProps {
  product?: Product | null
  onSave: () => void
  onCancel: () => void
}

interface FormData {
  name: string
  description: string
  price: string
  category: string
  unit: string
  is_active: boolean
}

interface FormErrors {
  name?: string
  price?: string
  category?: string
  unit?: string
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onSave, onCancel }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    price: '',
    category: '',
    unit: 'unidad',
    is_active: true
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price.toString(),
        category: product.category || '',
        unit: product.unit || 'unidad',
        is_active: product.is_active
      })
    }
  }, [product])

  const loadCategories = async () => {
    try {
      const data = await ProductService.getCategories()
      setCategories(data)
    } catch (error) {
    }
  }

  const unitOptions = [
    { value: 'unidad', label: 'Unidad' },
    { value: 'hora', label: 'Hora' },
    { value: 'día', label: 'Día' },
    { value: 'mes', label: 'Mes' },
    { value: 'año', label: 'Año' },
    { value: 'proyecto', label: 'Proyecto' },
    { value: 'kg', label: 'Kilogramo' },
    { value: 'lt', label: 'Litro' },
    { value: 'm', label: 'Metro' },
    { value: 'm2', label: 'Metro cuadrado' },
    { value: 'm3', label: 'Metro cúbico' }
  ]

  const categoryOptions = [
    ...categories.map(cat => ({ value: cat, label: cat })),
    { value: 'Servicios', label: 'Servicios' },
    { value: 'Productos', label: 'Productos' },
    { value: 'Consultoría', label: 'Consultoría' },
    { value: 'Software', label: 'Software' },
    { value: 'Hardware', label: 'Hardware' },
    { value: 'Otros', label: 'Otros' }
  ].filter((option, index, self) => 
    index === self.findIndex(o => o.value === option.value)
  )

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!validateRequired(formData.name)) {
      newErrors.name = 'El nombre es requerido'
    }

    if (!validateRequired(formData.price)) {
      newErrors.price = 'El precio es requerido'
    } else if (!validatePositiveNumber(formData.price)) {
      newErrors.price = 'El precio debe ser un número positivo'
    }

    if (!validateRequired(formData.unit)) {
      newErrors.unit = 'La unidad es requerida'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      setLoading(true)
      
      const productData: CreateProductData = {
        name: formData.name,
        description: formData.description || undefined,
        price: parseFloat(formData.price),
        category: formData.category || undefined,
        unit: formData.unit,
        is_active: formData.is_active
      }

      if (product) {
        await ProductService.update(product.id, productData)
      } else {
        await ProductService.create(productData)
      }

      onSave()
    } catch (error) {
      alert('Error al guardar el producto')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
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
          label="Precio"
          type="number"
          step="0.01"
          min="0"
          value={formData.price}
          onChange={(e) => handleInputChange('price', e.target.value)}
          error={errors.price}
          required
        />
      </FormGroup>

      <Textarea
        label="Descripción"
        value={formData.description}
        onChange={(e) => handleInputChange('description', e.target.value)}
        rows={3}
        placeholder="Descripción del producto o servicio..."
      />

      <FormGroup columns={2}>
        <Select
          label="Categoría"
          value={formData.category}
          onChange={(e) => handleInputChange('category', e.target.value)}
          options={categoryOptions}
          placeholder="Seleccionar categoría..."
        />
        
        <Select
          label="Unidad"
          value={formData.unit}
          onChange={(e) => handleInputChange('unit', e.target.value)}
          options={unitOptions}
          required
        />
      </FormGroup>

      <div className="flex items-center">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => handleInputChange('is_active', e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">
            Producto activo
          </span>
        </label>
      </div>

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
          {product ? 'Actualizar' : 'Crear'} Producto
        </Button>
      </FormActions>
    </form>
  )
}

export default ProductForm