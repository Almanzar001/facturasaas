'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { simpleOrganizationService, Organization, UserOrganization } from '../services/organizations-simple';

interface OrganizationContextType {
  currentOrganization: Organization | null;
  userOrganizations: UserOrganization[];
  isLoading: boolean;
  switchOrganization: (organizationId: string) => Promise<void>;
  createOrganization: (name: string, slug?: string) => Promise<Organization>;
  updateOrganization: (organizationId: string, updates: Partial<Organization>) => Promise<Organization>;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

interface OrganizationProviderProps {
  children: ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrganizations = async () => {
    if (!user) {
      setCurrentOrganization(null);
      setUserOrganizations([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Load user's organizations
      const organizations = await simpleOrganizationService.getUserOrganizations();
      setUserOrganizations(organizations);

      // Load current organization
      const current = await simpleOrganizationService.getCurrentOrganization();
      setCurrentOrganization(current);

      // If user has no current organization but has organizations, set the first one
      if (!current && organizations.length > 0) {
        // Para SaaS real: cada usuario debe tener exactamente una organización
        // Seleccionar automáticamente la primera (y debería ser la única)
        await simpleOrganizationService.switchOrganization(organizations[0].organization_id);
        const newCurrent = await simpleOrganizationService.getCurrentOrganization();
        setCurrentOrganization(newCurrent);
      }
    } catch (error) {
      // Error loading organizations
    } finally {
      setIsLoading(false);
    }
  };

  const switchOrganization = async (organizationId: string) => {
    try {
      setIsLoading(true);
      const success = await simpleOrganizationService.switchOrganization(organizationId);
      
      if (success) {
        const newCurrent = await simpleOrganizationService.getCurrentOrganization();
        setCurrentOrganization(newCurrent);
        
        // Update user organizations to reflect current status
        const updatedOrganizations = await simpleOrganizationService.getUserOrganizations();
        setUserOrganizations(updatedOrganizations);
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const createOrganization = async (name: string, slug?: string): Promise<Organization> => {
    try {
      setIsLoading(true);
      const newOrganization = await simpleOrganizationService.createOrganization(name, slug);
      
      // Refresh organizations after creation
      await loadOrganizations();
      
      return newOrganization;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrganization = async (
    organizationId: string, 
    updates: Partial<Organization>
  ): Promise<Organization> => {
    try {
      const updatedOrganization = await simpleOrganizationService.updateOrganization(organizationId, updates);
      
      // Update current organization if it's the one being updated
      if (currentOrganization?.id === organizationId) {
        setCurrentOrganization(updatedOrganization);
      }
      
      // Refresh organizations list
      await loadOrganizations();
      
      return updatedOrganization;
    } catch (error) {
      throw error;
    }
  };

  const refreshOrganizations = async () => {
    await loadOrganizations();
  };

  useEffect(() => {
    if (!authLoading) {
      loadOrganizations();
    }
  }, [user, authLoading]);

  // Refresh organizations when user state changes (e.g., after registration)
  useEffect(() => {
    if (user && !authLoading && !isLoading) {
      const timer = setTimeout(() => {
        loadOrganizations();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const value: OrganizationContextType = {
    currentOrganization,
    userOrganizations,
    isLoading,
    switchOrganization,
    createOrganization,
    updateOrganization,
    refreshOrganizations,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

export default OrganizationProvider;