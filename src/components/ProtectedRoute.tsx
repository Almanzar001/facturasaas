'use client';

import { ReactNode } from 'react';
import { usePermissions, Permission } from '@/hooks/usePermissions';
import { useOrganization } from '@/contexts/OrganizationContext';

// Simple SVG icon as fallback
const ExclamationTriangleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showFallback?: boolean;
}

export default function ProtectedRoute({
  children,
  permission,
  permissions = [],
  requireAll = false,
  fallback,
  showFallback = true,
}: ProtectedRouteProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();
  const { currentOrganization } = useOrganization();

  // If no organization is selected, don't render anything
  if (!currentOrganization) {
    return null;
  }

  // Build permissions array
  const permissionsToCheck = [
    ...(permission ? [permission] : []),
    ...permissions,
  ];

  if (permissionsToCheck.length === 0) {
    return <>{children}</>;
  }

  // Check permissions
  const hasAccess = requireAll 
    ? hasAllPermissions(permissionsToCheck)
    : hasAnyPermission(permissionsToCheck);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show fallback if no access
  if (fallback) {
    return <>{fallback}</>;
  }

  if (showFallback) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Acceso denegado
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            No tienes permisos para ver este contenido.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

// Higher-order component version
export function withPermissions<T extends object>(
  Component: React.ComponentType<T>,
  permission?: Permission,
  permissions?: Permission[],
  requireAll?: boolean
) {
  return function ProtectedComponent(props: T) {
    return (
      <ProtectedRoute
        permission={permission}
        permissions={permissions}
        requireAll={requireAll}
      >
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

// Hook version for conditional rendering
export function usePermissionCheck(
  permission?: Permission,
  permissions?: Permission[],
  requireAll?: boolean
): boolean {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();
  const { currentOrganization } = useOrganization();

  if (!currentOrganization) {
    return false;
  }

  const permissionsToCheck = [
    ...(permission ? [permission] : []),
    ...(permissions || []),
  ];

  if (permissionsToCheck.length === 0) {
    return true;
  }

  return requireAll 
    ? hasAllPermissions(permissionsToCheck)
    : hasAnyPermission(permissionsToCheck);
}