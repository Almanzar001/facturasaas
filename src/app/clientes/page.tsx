'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ClientService, Client } from '@/services/clients'
import Button from '@/components/Button'
import Table from '@/components/Table'
import Modal from '@/components/Modal'
import SearchInput from '@/components/SearchInput'
import Card from '@/components/Card'
import ClientForm from './ClientForm'
import { formatCurrency } from '@/utils/formatCurrency'

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deleteClient, setDeleteClient] = useState<Client | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    loadClients()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      searchClients(searchQuery)
    } else {
      setFilteredClients(clients)
    }
  }, [searchQuery, clients])

  const loadClients = async () => {
    try {
      setLoading(true)
      setErrorMsg(null)
      setSuccessMsg(null)
      const data = await ClientService.getAll()
      setClients(data)
      setFilteredClients(data)
    } catch (error: any) {
      console.error('Error loading clients:', error)
      setErrorMsg('Error al conectar con la base de datos: ' + (error.message || error.toString()))
    } finally {
      setLoading(false)
    }
  }

  const searchClients = async (query: string) => {
    try {
      const data = await ClientService.search(query)
      setFilteredClients(data)
    } catch (error) {
      console.error('Error searching clients:', error)
    }
  }

  const handleCreateClient = () => {
    setEditingClient(null)
    setShowModal(true)
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setShowModal(true)
  }

  const handleDeleteClient = async (client: Client) => {
    if (window.confirm(`¿Está seguro de eliminar el cliente "${client.name}"?`)) {
      try {
        await ClientService.delete(client.id)
        await loadClients()
      } catch (error) {
        console.error('Error deleting client:', error)
        alert('Error al eliminar el cliente')
      }
    }
  }

  const handleSaveClient = async () => {
    setShowModal(false)
    await loadClients()
  }

  const columns = [
    {
      key: 'name',
      title: 'Nombre',
      render: (value: string, row: Client) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          {row.email && <div className="text-sm text-gray-500">{row.email}</div>}
        </div>
      )
    },
    {
      key: 'identification',
      title: 'Identificación',
      render: (value: string, row: Client) => (
        <div>
          <div className="text-sm text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">{row.identification_type}</div>
        </div>
      )
    },
    {
      key: 'phone',
      title: 'Teléfono',
      render: (value: string) => value || '-'
    },
    {
      key: 'city',
      title: 'Ciudad',
      render: (value: string) => value || '-'
    },
    {
      key: 'created_at',
      title: 'Fecha Registro',
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      key: 'actions',
      title: 'Acciones',
      render: (value: any, row: Client) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => router.push(`/clientes/${row.id}`)}
          >
            Ver
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEditClient(row)}
          >
            Editar
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteClient(row)}
          >
            Eliminar
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
        <Button onClick={handleCreateClient}>
          Nuevo Cliente
        </Button>
      </div>

      <Card>
        <div className="space-y-4">
          {errorMsg && (
            <div className="bg-red-100 text-red-700 p-2 rounded">{errorMsg}</div>
          )}
          {successMsg && (
            <div className="bg-green-100 text-green-700 p-2 rounded">{successMsg}</div>
          )}
          <div className="flex justify-between items-center">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar clientes..."
              className="max-w-sm"
            />
            <div className="text-sm text-gray-500">
              {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''}
            </div>
          </div>

          <Table
            data={filteredClients}
            columns={columns}
            loading={loading}
            emptyMessage="No hay clientes registrados"
          />
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
        maxWidth="lg"
      >
        <ClientForm
          client={editingClient}
          onSave={handleSaveClient}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  )
}