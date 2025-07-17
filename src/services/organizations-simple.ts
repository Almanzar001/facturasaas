import { supabase } from './supabaseClient';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  logo_url?: string;
  settings?: Record<string, any>;
  plan?: 'free' | 'pro' | 'enterprise';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserOrganization {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  user_role: string;
  is_current: boolean;
}

class SimpleOrganizationService {
  // Get user's organizations (simple direct query)
  // Para SaaS verdadero: cada usuario debe tener solo UNA organización
  async getUserOrganizations(): Promise<UserOrganization[]> {
    try {
      const { data: userSession } = await supabase.auth.getUser();
      if (!userSession.user) return [];

      // Get user's current organization
      const { data: userData } = await supabase
        .from('users')
        .select('current_organization_id')
        .eq('id', userSession.user.id)
        .single();

      // Para SaaS verdadero: solo devolver la organización actual del usuario
      // No todas las organizaciones donde es miembro
      if (!userData?.current_organization_id) {
        return [];
      }

      // Get only the current organization
      const { data: memberships, error } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          organizations!inner (
            id,
            name,
            slug,
            is_active
          )
        `)
        .eq('user_id', userSession.user.id)
        .eq('organization_id', userData.current_organization_id)
        .eq('is_active', true);

      if (error) {
        return [];
      }

      return (memberships || []).map((membership: any) => ({
        organization_id: membership.organization_id,
        organization_name: membership.organizations.name,
        organization_slug: membership.organizations.slug,
        user_role: membership.role,
        is_current: true // Siempre true ya que solo devolvemos la organización actual
      }));
    } catch (error) {
      return [];
    }
  }

  // Get current organization (simple direct query)
  async getCurrentOrganization(): Promise<Organization | null> {
    try {
      const { data: userSession } = await supabase.auth.getUser();
      if (!userSession.user) return null;

      const { data: userData } = await supabase
        .from('users')
        .select('current_organization_id')
        .eq('id', userSession.user.id)
        .single();

      if (!userData?.current_organization_id) return null;

      const { data: organization, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', userData.current_organization_id)
        .single();

      if (error) {
        return null;
      }

      return organization;
    } catch (error) {
      return null;
    }
  }

  // Switch to organization
  async switchOrganization(organizationId: string): Promise<boolean> {
    try {
      const { data: userSession } = await supabase.auth.getUser();
      if (!userSession.user) return false;

      // Check if user is member of the organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', userSession.user.id)
        .eq('is_active', true)
        .single();

      if (!membership) return false;

      // Update user's current organization
      const { error } = await supabase
        .from('users')
        .update({ current_organization_id: organizationId })
        .eq('id', userSession.user.id);

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // Create organization (simple direct method)
  async createOrganization(name: string, slug?: string, userId?: string): Promise<Organization> {
    try {
      // If userId is provided (during registration), use it directly
      let currentUserId: string;
      
      if (userId) {
        currentUserId = userId;
      } else {
        // Try to get user session with retry logic for existing sessions
        let userSession;
        let authError;
        let retries = 3;
        
        while (retries > 0) {
          const result = await supabase.auth.getUser();
          userSession = result.data;
          authError = result.error;
          
          if (!authError && userSession?.user) {
            break;
          }
          
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        if (authError) {
          throw new Error('Authentication error: ' + authError.message);
        }
        if (!userSession?.user) {
          throw new Error('Auth session missing!');
        }
        
        currentUserId = userSession.user.id;
      }

      // Generate slug if not provided
      if (!slug) {
        slug = name.toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      }

      // Ensure slug is unique
      let finalSlug = slug;
      let counter = 1;
      while (true) {
        const { data: existingOrg } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', finalSlug)
          .single();

        if (!existingOrg) break;
        finalSlug = `${slug}-${counter}`;
        counter++;
      }

      // Create organization
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name,
          slug: finalSlug,
          is_active: true
        })
        .select()
        .single();

      if (orgError) {
        throw orgError;
      }

      // Add user as owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organization.id,
          user_id: currentUserId,
          role: 'owner',
          joined_at: new Date().toISOString(),
          is_active: true
        });

      if (memberError) {
        throw memberError;
      }

      // Set as current organization
      const { error: updateError } = await supabase
        .from('users')
        .update({ current_organization_id: organization.id })
        .eq('id', currentUserId);

      if (updateError) {
        // Don't throw here, organization was created successfully
      }

      return organization;
    } catch (error) {
      throw error;
    }
  }

  // Get current organization ID
  async getCurrentOrganizationId(): Promise<string | null> {
    try {
      const { data: userSession } = await supabase.auth.getUser();
      if (!userSession.user) return null;

      const { data: userData } = await supabase
        .from('users')
        .select('current_organization_id')
        .eq('id', userSession.user.id)
        .single();

      return userData?.current_organization_id || null;
    } catch (error) {
      return null;
    }
  }

  // Update organization
  async updateOrganization(
    organizationId: string, 
    updates: Partial<Organization>
  ): Promise<Organization> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', organizationId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }
}

export const simpleOrganizationService = new SimpleOrganizationService();