'use client'

import React, { useState, useEffect } from 'react'
import { UsersService, User, Role } from '@/services/users'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Input from '@/components/Input'
import Select from '@/components/Select'
import Modal from '@/components/Modal'
import { useAuth, withAuth } from '@/contexts/AuthContext'

function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createData, setCreateData] = useState({
    email: '',
    password: '',
    full_name: '',
    role_id: ''
  })
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({})
  const { user: currentUser } = useAuth()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersData, rolesData] = await Promise.all([
        UsersService.getUsers(),
        UsersService.getRoles()
      ])
      setUsers(usersData)
      setRoles(rolesData)
    } catch (error) {
      // Error loading data
    } finally {
      setLoading(false)
    }
  }

  const validateCreateForm = () => {
    const errors: Record<string, string> = {}

    if (!createData.email) {
      errors.email = 'El correo es requerido'
    } else if (!/\S+@\S+\.\S+/.test(createData.email)) {
      errors.email = 'Correo inválido'
    }

    if (!createData.password) {
      errors.password = 'La contraseña es requerida'
    } else if (createData.password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres'
    }

    if (!createData.full_name) {
      errors.full_name = 'El nombre es requerido'
    }

    if (!createData.role_id) {
      errors.role_id = 'Selecciona un rol'
    }

    setCreateErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreateUser = async () => {
    if (!validateCreateForm()) return

    try {
      setCreating(true)
      
      const result = await UsersService.createUser({
        email: createData.email,
        password: createData.password,
        full_name: createData.full_name,
        role_id: createData.role_id
      })

      if (result.success) {
        alert('✅ Usuario creado exitosamente!')
        setShowCreateModal(false)
        setCreateData({ email: '', password: '', full_name: '', role_id: '' })
        setCreateErrors({})
        await loadData()
      } else {
        // Mostrar instrucciones detalladas
        const message = `❌ Error al crear usuario automaticamente.

${result.error}

📋 INSTRUCCIONES MANUALES:

1. Ve a tu Supabase Dashboard
2. Authentication > Users > Add user
3. Completa:
   📧 Email: ${createData.email}
   🔐 Password: ${createData.password}
   ✅ Auto Confirm User: ACTIVADO

4. El perfil se creará automáticamente.

¿Quieres abrir Supabase Dashboard?`

        if (confirm(message)) {
          window.open('https://supabase.com/dashboard', '_blank')
        }
        
        // Copiar al portapapeles
        try {
          await navigator.clipboard.writeText(`Email: ${createData.email}\nPassword: ${createData.password}`)
          alert('📋 Credenciales copiadas al portapapeles')
        } catch (e) {
          // No se pudo copiar al portapapeles
        }
      }
    } catch (error) {
      alert('Error inesperado al crear el usuario')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleUserStatus = async (user: User) => {
    try {
      const result = await UsersService.toggleUserStatus(user.id, !user.is_active)
      
      if (result.success) {
        alert(`Usuario ${!user.is_active ? 'activado' : 'desactivado'} exitosamente`)
        await loadData()
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      alert('Error al actualizar el estado del usuario')
    }
  }

  const handleUpdateUserRole = async (userId: string, roleId: string) => {
    try {
      const result = await UsersService.updateUserRole(userId, roleId)
      
      if (result.success) {
        alert('Rol actualizado exitosamente')
        await loadData()
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      alert('Error al actualizar el rol')
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`¿Eliminar usuario "${user.full_name || user.email}"?`)) return

    try {
      const result = await UsersService.deleteUser(user.id)
      
      if (result.success) {
        alert('Usuario eliminado exitosamente')
        await loadData()
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      alert('Error al eliminar el usuario')
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Cargando usuarios...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios 👥</h1>
          <p className="text-sm text-gray-500 mt-1">
            Usuario actual: {currentUser?.full_name} ({currentUser?.role_name})
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          Agregar Usuario
        </Button>
      </div>

      <Card>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registrado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.full_name || 'Sin nombre'}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.role?.name || 'Sin rol'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {user.id !== currentUser?.id && (
                        <div className="flex space-x-2">
                          <select
                            value={user.role_id || ''}
                            onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                            className="text-xs border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="">Cambiar rol...</option>
                            {roles.map(role => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>

                          <Button
                            size="sm"
                            variant={user.is_active ? 'danger' : 'secondary'}
                            onClick={() => handleToggleUserStatus(user)}
                          >
                            {user.is_active ? 'Desactivar' : 'Activar'}
                          </Button>

                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteUser(user)}
                          >
                            🗑️
                          </Button>
                        </div>
                      )}
                      {user.id === currentUser?.id && (
                        <span className="text-xs text-gray-500 italic">Tu cuenta</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No hay usuarios registrados</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Modal de Crear Usuario */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Crear Nuevo Usuario"
      >
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={createData.email}
            onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
            error={createErrors.email}
            required
          />

          <Input
            label="Contraseña"
            type="password"
            value={createData.password}
            onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
            error={createErrors.password}
            helperText="Mínimo 6 caracteres"
            required
          />

          <Input
            label="Nombre Completo"
            value={createData.full_name}
            onChange={(e) => setCreateData({ ...createData, full_name: e.target.value })}
            error={createErrors.full_name}
            required
          />

          <Select
            label="Rol"
            value={createData.role_id}
            onChange={(e) => setCreateData({ ...createData, role_id: e.target.value })}
            error={createErrors.role_id}
            required
            options={roles.map(role => ({
              value: role.id,
              label: role.name
            }))}
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateUser}
              loading={creating}
              disabled={creating}
            >
              Crear Usuario
            </Button>
          </div>
        </div>
      </Modal>

      {/* Información sobre roles */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Roles Disponibles</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roles.map(role => (
              <div key={role.id} className="border rounded-lg p-3">
                <h4 className="font-medium text-gray-900">{role.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{role.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

export default withAuth(UsersPage)