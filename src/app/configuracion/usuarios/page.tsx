'use client';

import { useState, useEffect } from 'react';
import { InvitationService, OrganizationInvitation } from '@/services/invitations';
import { organizationService, OrganizationMember } from '@/services/organizations';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';

export default function ConfiguracionUsuariosPage() {
  const [activeTab, setActiveTab] = useState<'miembros' | 'invitar' | 'permisos'>('miembros');
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' as 'admin' | 'member' });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [invitationUrl, setInvitationUrl] = useState('');

  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { hasPermission, getCurrentUserRole } = usePermissions();

  useEffect(() => {
    if (currentOrganization) {
      loadData();
    }
  }, [currentOrganization]);

  const loadData = async () => {
    if (!currentOrganization) return;
    
    setIsLoading(true);
    try {
      // TEMPORAL: Deshabilitar carga de datos hasta que se arregle la base de datos
      console.log('🚧 Sistema de invitaciones deshabilitado temporalmente');
      setMembers([]);
      setInvitations([]);
      setMessage('⚠️ Sistema de invitaciones temporalmente deshabilitado');
    } catch (error) {
      setMessage('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // TEMPORAL: Deshabilitar invitaciones hasta que se arregle la base de datos
    setMessage('⚠️ Sistema de invitaciones temporalmente deshabilitado');
    return;
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('¿Cancelar esta invitación?')) return;

    try {
      const result = await InvitationService.cancelInvitation(invitationId);
      if (result.success) {
        setMessage('✅ Invitación cancelada');
        await loadData();
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    if (!confirm('¿Reenviar esta invitación?')) return;

    try {
      const result = await InvitationService.resendInvitation(invitationId);
      if (result.success) {
        const url = InvitationService.getInvitationUrl(result.token!);
        setMessage(`✅ Invitación reenviada. Nuevo enlace: ${url}`);
        await loadData();
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  const copyToClipboard = () => {
    if (invitationUrl) {
      navigator.clipboard.writeText(invitationUrl);
      setMessage('✅ Enlace copiado al portapapeles');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentOrganization) return;
    if (!confirm('¿Estás seguro de eliminar este miembro?')) return;

    try {
      await organizationService.removeMember(currentOrganization.id, userId);
      await loadData();
      setMessage('✅ Miembro eliminado');
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto mt-8 p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Acceso denegado</h1>
        <p className="text-gray-600">Debes iniciar sesión para acceder a esta página.</p>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="max-w-4xl mx-auto mt-8 p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Sin organización</h1>
        <p className="text-gray-600">No tienes una organización seleccionada.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'miembros', label: 'Miembros', icon: '👥' },
    { id: 'invitar', label: 'Invitar Usuarios', icon: '✉️' },
    { id: 'permisos', label: 'Permisos', icon: '🔒' },
  ];

  const canManageUsers = hasPermission('manage_members') || hasPermission('invite_members');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Usuarios</h1>
        <p className="text-gray-600">
          Administra los miembros de tu organización "{currentOrganization.name}"
        </p>
      </div>

      {/* Información del usuario actual */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h2 className="font-semibold text-blue-800 mb-2">Usuario actual:</h2>
        <p className="text-sm text-blue-700">
          <strong>Email:</strong> {user.email} | <strong>Rol:</strong> {getCurrentUserRole()} | 
          <strong>Puede gestionar usuarios:</strong> {canManageUsers ? '✅ Sí' : '❌ No'}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Mensaje de estado */}
      {message && (
        <div className="mb-6 p-4 bg-gray-100 rounded-md">
          <p className="text-sm">{message}</p>
        </div>
      )}

      {/* Contenido de las pestañas */}
      <div className="space-y-6">
        {/* Pestaña Miembros */}
        {activeTab === 'miembros' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">
              Miembros Actuales ({members.length})
            </h2>
            {isLoading ? (
              <p className="text-gray-500">Cargando miembros...</p>
            ) : members.length === 0 ? (
              <p className="text-gray-500">No hay miembros en esta organización</p>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {member.user?.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.user?.email}</p>
                        <p className="text-sm text-gray-500">
                          {member.role === 'owner' ? 'Propietario' : 
                           member.role === 'admin' ? 'Administrador' : 'Miembro'}
                        </p>
                        <p className="text-xs text-gray-400">
                          Se unió: {new Date(member.joined_at || member.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        member.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {member.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                      {canManageUsers && member.role !== 'owner' && member.user_id !== user.id && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pestaña Invitar */}
        {activeTab === 'invitar' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulario de invitación */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Invitar Nuevo Usuario</h2>
              
              {canManageUsers ? (
                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email del usuario
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="usuario@ejemplo.com"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                      Rol del usuario
                    </label>
                    <select
                      id="role"
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as 'admin' | 'member' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="member">Miembro</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Creando...' : 'Crear Invitación'}
                  </button>
                </form>
              ) : (
                <div className="text-center p-8 bg-gray-50 rounded-md">
                  <p className="text-gray-500">No tienes permisos para invitar usuarios</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Contacta a un administrador para que te asigne los permisos necesarios
                  </p>
                </div>
              )}

              {/* URL de invitación */}
              {invitationUrl && (
                <div className="mt-4 p-3 bg-green-50 rounded-md">
                  <p className="text-sm text-green-800 mb-2">
                    <strong>Enlace de invitación:</strong>
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={invitationUrl}
                      readOnly
                      className="flex-1 px-2 py-1 text-xs border border-green-300 rounded bg-white"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Copiar
                    </button>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Comparte este enlace con el usuario para que pueda aceptar la invitación.
                  </p>
                </div>
              )}
            </div>

            {/* Lista de invitaciones pendientes */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                Invitaciones Pendientes ({invitations.length})
              </h2>
              {isLoading ? (
                <p className="text-gray-500">Cargando invitaciones...</p>
              ) : invitations.length === 0 ? (
                <p className="text-gray-500">No hay invitaciones pendientes</p>
              ) : (
                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="p-3 bg-yellow-50 rounded-md border border-yellow-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{invitation.email}</p>
                          <p className="text-sm text-gray-600">
                            Rol: {invitation.role === 'admin' ? 'Administrador' : 'Miembro'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Expira: {new Date(invitation.expires_at).toLocaleDateString()}
                          </p>
                          {invitation.invited_by_user && (
                            <p className="text-xs text-gray-400">
                              Invitado por: {invitation.invited_by_user.email}
                            </p>
                          )}
                        </div>
                        {canManageUsers && (
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleResendInvitation(invitation.id)}
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Reenviar
                            </button>
                            <button
                              onClick={() => handleCancelInvitation(invitation.id)}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pestaña Permisos */}
        {activeTab === 'permisos' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Sistema de Permisos</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Roles Disponibles:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-purple-50 rounded-md">
                    <h4 className="font-medium text-purple-800">Owner (Propietario)</h4>
                    <ul className="text-sm text-purple-700 mt-2 space-y-1">
                      <li>• Acceso completo al sistema</li>
                      <li>• Puede invitar usuarios</li>
                      <li>• Puede gestionar todos los miembros</li>
                      <li>• Puede eliminar la organización</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-md">
                    <h4 className="font-medium text-blue-800">Admin (Administrador)</h4>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1">
                      <li>• Acceso completo al sistema</li>
                      <li>• Puede invitar usuarios</li>
                      <li>• Puede gestionar miembros</li>
                      <li>• No puede eliminar owners</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-green-50 rounded-md">
                    <h4 className="font-medium text-green-800">Member (Miembro)</h4>
                    <ul className="text-sm text-green-700 mt-2 space-y-1">
                      <li>• Acceso a funciones básicas</li>
                      <li>• Puede ver y editar datos</li>
                      <li>• No puede invitar usuarios</li>
                      <li>• No puede gestionar miembros</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-2">Tu Rol Actual:</h3>
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm">
                    <strong>Rol:</strong> {getCurrentUserRole()} | 
                    <strong>Puede invitar:</strong> {hasPermission('invite_members') ? '✅ Sí' : '❌ No'} | 
                    <strong>Puede gestionar:</strong> {hasPermission('manage_members') ? '✅ Sí' : '❌ No'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instrucciones */}
      <div className="mt-8 p-4 bg-blue-50 rounded-md">
        <h3 className="font-medium text-blue-800 mb-2">📋 Instrucciones:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Miembros:</strong> Ve todos los usuarios actuales de la organización</li>
          <li>• <strong>Invitar:</strong> Crea invitaciones para nuevos usuarios</li>
          <li>• <strong>Permisos:</strong> Entiende los diferentes roles y permisos</li>
          <li>• Solo administradores y propietarios pueden invitar usuarios</li>
          <li>• Las invitaciones expiran en 7 días automáticamente</li>
        </ul>
      </div>
    </div>
  );
}