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
  plan: 'free' | 'pro' | 'enterprise';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  invited_by?: string;
  invited_at: string;
  joined_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  organization?: Organization;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: 'admin' | 'member';
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  organization?: Organization;
  invited_by_user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface UserOrganization {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  user_role: string;
  is_current: boolean;
}

class OrganizationService {
  // Get user's organizations
  async getUserOrganizations(): Promise<UserOrganization[]> {
    try {
      // Try using RPC first
      const { data, error } = await supabase
        .rpc('get_user_organizations');

      if (error) {
        // Error with RPC, falling back to direct query
        return await this.getUserOrganizationsDirect();
      }

      return data || [];
    } catch (error) {
      // Error in getUserOrganizations, using fallback
      return await this.getUserOrganizationsDirect();
    }
  }

  // Direct query fallback method
  // Para SaaS verdadero: cada usuario debe tener solo UNA organización
  private async getUserOrganizationsDirect(): Promise<UserOrganization[]> {
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
            slug
          )
        `)
        .eq('user_id', userSession.user.id)
        .eq('organization_id', userData.current_organization_id)
        .eq('is_active', true);

      if (error) {
        return [];
      }

      // Transform data to match UserOrganization interface
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

  // Get current organization
  async getCurrentOrganization(): Promise<Organization | null> {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('current_organization_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (userError || !userData?.current_organization_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', userData.current_organization_id)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  // Switch to organization
  async switchOrganization(organizationId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('switch_organization', { org_id: organizationId });

    if (error) {
      throw error;
    }

    return data;
  }

  // Create organization
  async createOrganization(name: string, slug?: string): Promise<Organization> {
    try {
      // Try using the SQL function first
      const { data: orgId, error: rpcError } = await supabase
        .rpc('create_organization_simple', {
          org_name: name,
          org_slug: slug
        });

      if (rpcError) {
        // RPC error, falling back to direct method
        return await this.createOrganizationDirect(name, slug);
      }

      // Get the created organization
      const { data: organization, error: fetchError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      return organization;
    } catch (error) {
      throw error;
    }
  }

  // Direct method fallback
  private async createOrganizationDirect(name: string, slug?: string): Promise<Organization> {
    try {
      // Get current user
      const { data: userSession } = await supabase.auth.getUser();
      if (!userSession.user) {
        throw new Error('No authenticated user');
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
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name,
          slug: finalSlug,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Add user as owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: data.id,
          user_id: userSession.user.id,
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
        .update({ current_organization_id: data.id })
        .eq('id', userSession.user.id);

      if (updateError) {
        // Don't throw here, organization was created successfully
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Update organization
  async updateOrganization(
    organizationId: string, 
    updates: Partial<Omit<Organization, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Organization> {
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
  }

  // Get organization members
  async getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        user:users!organization_members_user_id_fkey (
          id,
          email,
          name
        )
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at');

    if (error) {
      throw error;
    }

    return data || [];
  }

  // Note: Invitation functions moved to InvitationService for better organization

  // Remove member from organization
  async removeMember(organizationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('organization_members')
      .update({ is_active: false })
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }

  // Update member role
  async updateMemberRole(
    organizationId: string, 
    userId: string, 
    role: 'admin' | 'member'
  ): Promise<void> {
    const { error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }

  // Cancel invitation
  async cancelInvitation(invitationId: string): Promise<void> {
    const { error } = await supabase
      .from('organization_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) {
      throw error;
    }
  }

  // Get invitation by token
  async getInvitationByToken(token: string): Promise<OrganizationInvitation | null> {
    const { data, error } = await supabase
      .from('organization_invitations')
      .select(`
        *,
        organization:organizations!organization_invitations_organization_id_fkey (
          id,
          name,
          slug
        ),
        invited_by_user:users!organization_invitations_invited_by_fkey (
          id,
          email,
          name
        )
      `)
      .eq('token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No invitation found
      }
      throw error;
    }

    return data;
  }

  // Get current organization ID (helper function)
  async getCurrentOrganizationId(): Promise<string | null> {
    try {
      // Try using RPC first
      const { data, error } = await supabase
        .rpc('get_current_organization_id');

      if (error) {
        // Error with RPC, falling back to direct query
        return await this.getCurrentOrganizationIdDirect();
      }

      return data;
    } catch (error) {
      // Error in getCurrentOrganizationId, using fallback
      return await this.getCurrentOrganizationIdDirect();
    }
  }

  // Direct query fallback method
  private async getCurrentOrganizationIdDirect(): Promise<string | null> {
    try {
      const { data: userSession } = await supabase.auth.getUser();
      if (!userSession.user) return null;

      const { data: userData, error } = await supabase
        .from('users')
        .select('current_organization_id')
        .eq('id', userSession.user.id)
        .single();

      if (error) {
        return null;
      }

      return userData?.current_organization_id || null;
    } catch (error) {
      return null;
    }
  }
}

export const organizationService = new OrganizationService();