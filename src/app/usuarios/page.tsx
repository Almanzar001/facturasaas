'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/services/supabaseClient'
import Button from '@/components/Button'
import Table from '@/components/Table'
import Modal from '@/components/Modal'
import SearchInput from '@/components/SearchInput'
import Card from '@/components/Card'
import StatusBadge from '@/components/StatusBadge'
import Input from '@/components/Input'
import Select from '@/components/Select'
import { FormGroup, FormActions } from '@/components/FormField'
import { useAuth, withAuth } from '@/contexts/AuthContext'

interface User {
  id: string
  email: string
  full_name?: string
  company_name?: string
  role_id?: string
  role?: {
    id: string
    name: string
    description: string
  }
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}

interface Role {
  id: string
  name: string
  description: string
}

function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteData, setInviteData] = useState({
    email: '',
    full_name: '',
    role_id: ''
  })
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({})
  const [inviting, setInviting] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createData, setCreateData] = useState({
    email: '',
    password: '',
    full_name: '',
    role_id: ''
  })
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({})
  const [creating, setCreating] = useState(false)
  const [showMethodModal, setShowMethodModal] = useState(false)
  const { user: currentUser, hasPermission } = useAuth()

  useEffect(() => {
    loadUsers()
    loadRoles()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [searchQuery, users])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          role:roles(id, name, description)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name')

      if (error) throw error
      setRoles(data || [])
    } catch (error) {
      console.error('Error loading roles:', error)
    }
  }

  const filterUsers = () => {
    let filtered = users

    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        false
      )
    }

    setFilteredUsers(filtered)
  }

  const handleToggleUserStatus = async (user: User) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !user.is_active })
        .eq('id', user.id)

      if (error) throw error

      await loadUsers()
      alert(`Usuario ${!user.is_active ? 'activado' : 'desactivado'} exitosamente`)
    } catch (error) {
      console.error('Error updating user status:', error)
      alert('Error al actualizar el estado del usuario')
    }
  }

  const handleUpdateUserRole = async (userId: string, roleId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role_id: roleId })
        .eq('id', userId)

      if (error) throw error

      await loadUsers()
      alert('Rol actualizado exitosamente')
    } catch (error) {
      console.error('Error updating user role:', error)
      alert('Error al actualizar el rol')
    }
  }

  const validateInviteForm = () => {
    const errors: Record<string, string> = {}

    if (!inviteData.email) {
      errors.email = 'El correo es requerido'
    } else if (!/\S+@\S+\.\S+/.test(inviteData.email)) {
      errors.email = 'Correo inválido'
    }

    if (!inviteData.full_name) {
      errors.full_name = 'El nombre es requerido'
    }

    if (!inviteData.role_id) {
      errors.role_id = 'Selecciona un rol'
    }

    setInviteErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInviteUser = async () => {
    if (!validateInviteForm()) return

    try {
      setInviting(true)

      // Intentar enviar invitación
      const { error } = await supabase.auth.admin.inviteUserByEmail(inviteData.email, {
        data: {
          full_name: inviteData.full_name,
          role_id: inviteData.role_id
        }
      })

      if (error) {
        // Si el email no está configurado, guardar la invitación pendiente
        const { error: pendingError } = await supabase
          .from('pending_invitations')
          .insert({
            email: inviteData.email,
            full_name: inviteData.full_name,
            role_id: inviteData.role_id,
            invited_by: currentUser?.id,
            status: 'pending'
          })

        if (pendingError) {
          console.error('Error saving pending invitation:', pendingError)
        }

        alert(`La invitación se ha guardado pero el email no se pudo enviar.

Para completar el registro:
1. Comparte estos datos con el usuario:
   Email: ${inviteData.email}
   Contraseña temporal: ${generateTempPassword()}
   
2. O crea el usuario desde el Dashboard de Supabase`)
      } else {
        alert('Invitación enviada exitosamente')
      }

      setShowInviteModal(false)
      setInviteData({ email: '', full_name: '', role_id: '' })
      setInviteErrors({})
      await loadUsers()
    } catch (error) {
      console.error('Error inviting user:', error)
      alert('Error al enviar la invitación')
    } finally {
      setInviting(false)
    }
  }

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
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

      // Intentar crear el usuario usando auth.signUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: createData.email,
        password: createData.password,
        options: {
          data: {
            full_name: createData.full_name,
            role_id: createData.role_id
          }
        }
      })

      if (authError) {
        console.error('Error creating user:', authError)
        
        // Mostrar instrucciones detalladas
        const instructions = `
Usuario no creado. Instrucciones para crear manualmente:

1. Ve a Supabase Dashboard > Authentication > Users
2. Click en "Add user" 
3. Ingresa estos datos:
   - Email: ${createData.email}
   - Password: ${createData.password}
   - Auto Confirm User: ✓ (activado)

4. Después de crear el usuario, actualiza su perfil:
   - Ve a Table Editor > users
   - Busca el usuario por email
   - Actualiza:
     - full_name: ${createData.full_name}
     - role_id: ${createData.role_id}

5. Comparte las credenciales con el usuario de forma segura.`

        alert(instructions)
        
        // Copiar instrucciones al portapapeles
        try {
          await navigator.clipboard.writeText(instructions)
          console.log('Instrucciones copiadas al portapapeles')
        } catch (e) {
          console.error('No se pudo copiar al portapapeles:', e)
        }
        
        return
      }

      // Si se creó exitosamente
      if (authData.user) {
        // Actualizar el perfil del usuario
        const { error: updateError } = await supabase
          .from('users')
          .update({
            full_name: createData.full_name,
            role_id: createData.role_id
          })
          .eq('id', authData.user.id)

        if (updateError) {
          console.error('Error updating user profile:', updateError)
        }

        const successMessage = `
Usuario creado exitosamente!

Credenciales del usuario:
Email: ${createData.email}
Contraseña: ${createData.password}

Por favor, comparte estas credenciales de forma segura con el usuario.`

        alert(successMessage)
        
        // Copiar credenciales al portapapeles
        try {
          await navigator.clipboard.writeText(successMessage)
          console.log('Credenciales copiadas al portapapeles')
        } catch (e) {
          console.error('No se pudo copiar al portapapeles:', e)
        }
      }

      setShowCreateModal(false)
      setCreateData({ email: '', password: '', full_name: '', role_id: '' })
      setCreateErrors({})
      await loadUsers()
    } catch (error) {
      console.error('Error creating user:', error)
      alert('Error inesperado al crear el usuario. Intenta desde el Dashboard de Supabase.')
    } finally {
      setCreating(false)
    }
  }

  const columns = [
    {
      key: 'email',
      title: 'Usuario',
      render: (value: string, row: User) => (
        <div>
          <div className="font-medium text-gray-900">{row.full_name || 'Sin nombre'}</div>
          <div className="text-sm text-gray-500">{value}</div>
          {row.company_name && (
            <div className="text-xs text-gray-400">{row.company_name}</div>
          )}
        </div>
      )
    },
    {
      key: 'role',
      title: 'Rol',
      render: (value: any) => (
        <div>
          <div className="font-medium text-gray-900">{value?.name || 'Sin rol'}</div>
          <div className="text-xs text-gray-500">{value?.description}</div>
        </div>
      )
    },
    {
      key: 'is_active',
      title: 'Estado',
      render: (value: boolean) => (
        <StatusBadge 
          status={value ? 'active' : 'inactive'} 
          variant="general"
        />
      )
    },
    {
      key: 'last_login',
      title: 'Último Acceso',
      render: (value: string) => value ? new Date(value).toLocaleString() : 'Nunca'
    },
    {
      key: 'created_at',
      title: 'Registrado',
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      key: 'actions',
      title: 'Acciones',
      render: (value: any, row: User) => (
        <div className="flex space-x-2">
          {hasPermission('users', 'update') && row.id !== currentUser?.id && (
            <>
              <select
                value={row.role_id || ''}
                onChange={(e) => handleUpdateUserRole(row.id, e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1"
                title="Cambiar rol"
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
                variant={row.is_active ? 'danger' : 'secondary'}
                onClick={() => handleToggleUserStatus(row)}
              >
                {row.is_active ? 'Desactivar' : 'Activar'}
              </Button>
            </>
          )}
          
          {row.id === currentUser?.id && (
            <span className="text-xs text-gray-500 italic">Tu cuenta</span>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
        {hasPermission('users', 'create') && (
          <Button onClick={() => setShowMethodModal(true)}>
            Agregar Usuario
          </Button>
        )}
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar usuarios..."
              className="max-w-sm"
            />
            <div className="text-sm text-gray-500">
              {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''}
            </div>
          </div>

          <Table
            data={filteredUsers}
            columns={columns}
            loading={loading}
            emptyMessage="No hay usuarios registrados"
          />
        </div>
      </Card>

      {/* Modal de selección de método */}
      <Modal
        isOpen={showMethodModal}
        onClose={() => setShowMethodModal(false)}
        title="Agregar Usuario"
      >
        <div className="space-y-4">
          <p className="text-gray-600">Selecciona cómo deseas agregar el nuevo usuario:</p>
          
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => {
                setShowMethodModal(false)
                setShowInviteModal(true)
              }}
              className="p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors"
            >
              <h4 className="font-medium text-gray-900">Enviar Invitación por Email</h4>
              <p className="text-sm text-gray-600 mt-1">
                El usuario recibirá un email para crear su contraseña (requiere configuración SMTP)
              </p>
            </button>

            <button
              onClick={() => {
                setShowMethodModal(false)
                setShowCreateModal(true)
              }}
              className="p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors"
            >
              <h4 className="font-medium text-gray-900">Crear Usuario Directamente</h4>
              <p className="text-sm text-gray-600 mt-1">
                Crea el usuario con una contraseña temporal que deberás compartir
              </p>
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
            <strong>Nota:</strong> Si el email no está configurado, la invitación se guardará 
            y se generará una contraseña temporal para compartir manualmente.
          </div>

          <FormActions>
            <Button
              variant="outline"
              onClick={() => setShowMethodModal(false)}
            >
              Cancelar
            </Button>
          </FormActions>
        </div>
      </Modal>

      {/* Modal de invitación */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false)
          setInviteData({ email: '', full_name: '', role_id: '' })
          setInviteErrors({})
        }}
        title="Invitar Usuario"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleInviteUser(); }} className="space-y-4">
          <Input
            label="Nombre Completo"
            value={inviteData.full_name}
            onChange={(e) => setInviteData({ ...inviteData, full_name: e.target.value })}
            error={inviteErrors.full_name}
            placeholder="Juan Pérez"
            required
          />

          <Input
            label="Correo Electrónico"
            type="email"
            value={inviteData.email}
            onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
            error={inviteErrors.email}
            placeholder="usuario@ejemplo.com"
            required
          />

          <Select
            label="Rol"
            value={inviteData.role_id}
            onChange={(e) => setInviteData({ ...inviteData, role_id: e.target.value })}
            error={inviteErrors.role_id}
            options={[
              { value: '', label: 'Seleccionar rol...' },
              ...roles.map(role => ({
                value: role.id,
                label: `${role.name} - ${role.description}`
              }))
            ]}
            required
          />

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
            Se enviará una invitación por correo electrónico. El usuario deberá crear su contraseña para activar su cuenta.
          </div>

          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowInviteModal(false)
                setInviteData({ email: '', full_name: '', role_id: '' })
                setInviteErrors({})
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={inviting}
              disabled={inviting}
            >
              Enviar Invitación
            </Button>
          </FormActions>
        </form>
      </Modal>

      {/* Modal de creación directa */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setCreateData({ email: '', password: '', full_name: '', role_id: '' })
          setCreateErrors({})
        }}
        title="Crear Usuario Directamente"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleCreateUser(); }} className="space-y-4">
          <Input
            label="Nombre Completo"
            value={createData.full_name}
            onChange={(e) => setCreateData({ ...createData, full_name: e.target.value })}
            error={createErrors.full_name}
            placeholder="Juan Pérez"
            required
          />

          <Input
            label="Correo Electrónico"
            type="email"
            value={createData.email}
            onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
            error={createErrors.email}
            placeholder="usuario@ejemplo.com"
            required
          />

          <div>
            <Input
              label="Contraseña Temporal"
              type="password"
              value={createData.password}
              onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
              error={createErrors.password}
              placeholder="••••••••"
              required
              helperText="Mínimo 6 caracteres. El usuario deberá cambiarla en su primer acceso."
            />
            <button
              type="button"
              onClick={() => setCreateData({ ...createData, password: generateTempPassword() })}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Generar contraseña aleatoria
            </button>
          </div>

          <Select
            label="Rol"
            value={createData.role_id}
            onChange={(e) => setCreateData({ ...createData, role_id: e.target.value })}
            error={createErrors.role_id}
            options={[
              { value: '', label: 'Seleccionar rol...' },
              ...roles.map(role => ({
                value: role.id,
                label: `${role.name} - ${role.description}`
              }))
            ]}
            required
          />

          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
              <strong>Requisitos de contraseña:</strong>
              <ul className="list-disc list-inside mt-1">
                <li>Mínimo 6 caracteres</li>
                <li>Se recomienda usar mayúsculas, minúsculas y números</li>
              </ul>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
              <strong>Importante:</strong> Deberás compartir estas credenciales con el usuario de forma segura.
            </div>
          </div>

          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false)
                setCreateData({ email: '', password: '', full_name: '', role_id: '' })
                setCreateErrors({})
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={creating}
              disabled={creating}
            >
              Crear Usuario
            </Button>
          </FormActions>
        </form>
      </Modal>

      {/* Información sobre roles */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Roles Disponibles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

export default withAuth(UsersPage, { resource: 'users', action: 'read' })