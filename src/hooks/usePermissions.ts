'use client';

import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';

export type Permission = 
  | 'view_dashboard'
  | 'manage_clients'
  | 'manage_products'
  | 'manage_invoices'
  | 'manage_quotes'
  | 'manage_expenses'
  | 'manage_payments'
  | 'manage_settings'
  | 'manage_organization'
  | 'manage_members'
  | 'invite_members'
  | 'view_reports'
  | 'manage_fiscal_documents';

export type Role = 'owner' | 'admin' | 'member';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    'view_dashboard',
    'manage_clients',
    'manage_products',
    'manage_invoices',
    'manage_quotes',
    'manage_expenses',
    'manage_payments',
    'manage_settings',
    'manage_organization',
    'manage_members',
    'invite_members',
    'view_reports',
    'manage_fiscal_documents',
  ],
  admin: [
    'view_dashboard',
    'manage_clients',
    'manage_products',
    'manage_invoices',
    'manage_quotes',
    'manage_expenses',
    'manage_payments',
    'manage_settings',
    'invite_members',
    'view_reports',
    'manage_fiscal_documents',
  ],
  member: [
    'view_dashboard',
    'manage_clients',
    'manage_products',
    'manage_invoices',
    'manage_quotes',
    'manage_expenses',
    'manage_payments',
    'view_reports',
  ],
};

export const usePermissions = () => {
  const { user } = useAuth();
  const { currentOrganization, userOrganizations } = useOrganization();

  const getCurrentUserRole = (): Role | null => {
    if (!user || !currentOrganization) return null;
    
    const userOrg = userOrganizations.find(
      org => org.organization_id === currentOrganization.id
    );
    
    return userOrg?.user_role as Role || null;
  };

  const hasPermission = (permission: Permission): boolean => {
    const userRole = getCurrentUserRole();
    if (!userRole) return false;
    
    return ROLE_PERMISSIONS[userRole].includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  const isOwner = (): boolean => {
    return getCurrentUserRole() === 'owner';
  };

  const isAdmin = (): boolean => {
    const role = getCurrentUserRole();
    return role === 'admin' || role === 'owner';
  };

  const isMember = (): boolean => {
    return getCurrentUserRole() === 'member';
  };

  const canManageUser = (targetUserId: string): boolean => {
    const currentRole = getCurrentUserRole();
    if (!currentRole) return false;
    
    // Owner can manage anyone
    if (currentRole === 'owner') return true;
    
    // Admin can manage members but not other admins or owners
    if (currentRole === 'admin') {
      // We would need to check the target user's role
      // For now, assume admin can manage if they have manage_members permission
      return hasPermission('manage_members');
    }
    
    // Members can only manage themselves
    return targetUserId === user?.id;
  };

  const getPermissionsByRole = (role: Role): Permission[] => {
    return ROLE_PERMISSIONS[role] || [];
  };

  const getAllRoles = (): Role[] => {
    return Object.keys(ROLE_PERMISSIONS) as Role[];
  };

  const getRoleDisplayName = (role: Role): string => {
    const displayNames: Record<Role, string> = {
      owner: 'Propietario',
      admin: 'Administrador',
      member: 'Miembro',
    };
    return displayNames[role] || role;
  };

  const getPermissionDisplayName = (permission: Permission): string => {
    const displayNames: Record<Permission, string> = {
      view_dashboard: 'Ver dashboard',
      manage_clients: 'Gestionar clientes',
      manage_products: 'Gestionar productos',
      manage_invoices: 'Gestionar facturas',
      manage_quotes: 'Gestionar cotizaciones',
      manage_expenses: 'Gestionar gastos',
      manage_payments: 'Gestionar pagos',
      manage_settings: 'Gestionar configuración',
      manage_organization: 'Gestionar organización',
      manage_members: 'Gestionar miembros',
      invite_members: 'Invitar miembros',
      view_reports: 'Ver reportes',
      manage_fiscal_documents: 'Gestionar documentos fiscales',
    };
    return displayNames[permission] || permission;
  };

  return {
    getCurrentUserRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isOwner,
    isAdmin,
    isMember,
    canManageUser,
    getPermissionsByRole,
    getAllRoles,
    getRoleDisplayName,
    getPermissionDisplayName,
  };
};