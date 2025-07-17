'use client';

import { useState, useRef, useEffect } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';

// Simple SVG icons as fallback
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const BuildingOfficeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

export default function OrganizationSelector() {
  const { 
    currentOrganization, 
    userOrganizations, 
    switchOrganization, 
    createOrganization,
    isLoading 
  } = useOrganization();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitchOrganization = async (organizationId: string) => {
    try {
      await switchOrganization(organizationId);
      setIsOpen(false);
    } catch (error) {
      // Error switching organization
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    try {
      await createOrganization(newOrgName);
      setIsCreating(false);
      setNewOrgName('');
      setIsOpen(false);
    } catch (error) {
      // Error creating organization - show error message to user
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 animate-pulse">
        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
        <div className="w-32 h-4 bg-gray-300 rounded"></div>
      </div>
    );
  }

  // Para SaaS real: no mostrar selector si solo hay una organización
  if (userOrganizations.length <= 1) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700">
        <BuildingOfficeIcon className="w-5 h-5" />
        <span className="max-w-32 truncate">
          {currentOrganization?.name || 'Sin organización'}
        </span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
      >
        <BuildingOfficeIcon className="w-5 h-5" />
        <span className="max-w-32 truncate">
          {currentOrganization?.name || 'Sin organización'}
        </span>
        <ChevronDownIcon className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            {/* Current Organization */}
            {currentOrganization && (
              <div className="px-4 py-2 text-xs text-gray-500 border-b">
                Organización actual
              </div>
            )}

            {/* Organization List */}
            {userOrganizations.map((org) => (
              <button
                key={org.organization_id}
                onClick={() => handleSwitchOrganization(org.organization_id)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                  org.is_current ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <div>
                  <div className="font-medium">{org.organization_name}</div>
                  <div className="text-xs text-gray-500 capitalize">{org.user_role}</div>
                </div>
                {org.is_current && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </button>
            ))}

            {/* Para SaaS verdadero: no permitir crear nuevas organizaciones desde aquí */}
            {/* Las organizaciones se crean automáticamente durante el registro */}
          </div>
        </div>
      )}
    </div>
  );
}