import { supabase } from './supabaseClient';

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
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  invited_by_user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface InvitationResponse {
  success: boolean;
  invitation_id?: string;
  token?: string;
  expires_at?: string;
  organization_name?: string;
  email?: string;
  role?: string;
  error?: string;
}

export interface AcceptInvitationResponse {
  success: boolean;
  organization_id?: string;
  role?: string;
  joined_at?: string;
  error?: string;
}

export class InvitationService {
  /**
   * Create a new organization invitation
   */
  static async createInvitation(
    organizationId: string,
    email: string,
    role: 'admin' | 'member' = 'member'
  ): Promise<InvitationResponse> {
    try {
      // Validate inputs
      if (!organizationId || !email) {
        throw new Error('Organization ID and email are required');
      }

      if (!['admin', 'member'].includes(role)) {
        throw new Error('Role must be either admin or member');
      }

      // Call RPC function
      const { data, error } = await supabase
        .rpc('create_organization_invitation', {
          org_id: organizationId,
          invite_email: email.toLowerCase().trim(),
          invite_role: role
        });

      if (error) {
        throw new Error(error.message);
      }

      return data as InvitationResponse;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create invitation'
      };
    }
  }

  /**
   * Accept an organization invitation
   */
  static async acceptInvitation(token: string): Promise<AcceptInvitationResponse> {
    try {
      if (!token) {
        throw new Error('Invitation token is required');
      }

      const { data, error } = await supabase
        .rpc('accept_organization_invitation', {
          invitation_token: token
        });

      if (error) {
        throw new Error(error.message);
      }

      return data as AcceptInvitationResponse;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to accept invitation'
      };
    }
  }

  /**
   * Get invitation details by token
   */
  static async getInvitationByToken(token: string): Promise<OrganizationInvitation | null> {
    try {
      if (!token) {
        throw new Error('Token is required');
      }

      const { data, error } = await supabase
        .rpc('get_invitation_by_token', {
          invitation_token: token
        });

      if (error) {
        throw new Error(error.message);
      }

      if (!data || !data.success) {
        return null;
      }

      return data.invitation as OrganizationInvitation;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all invitations for an organization
   */
  static async getOrganizationInvitations(
    organizationId: string
  ): Promise<OrganizationInvitation[]> {
    try {
      const { data, error } = await supabase
        .from('organization_invitations')
        .select(`
          *,
          organization:organizations!inner (
            id,
            name,
            slug
          ),
          invited_by_user:users!invited_by (
            id,
            email,
            full_name
          )
        `)
        .eq('organization_id', organizationId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data?.map(invitation => ({
        ...invitation,
        invited_by_user: {
          ...invitation.invited_by_user,
          name: invitation.invited_by_user?.full_name
        }
      })) || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Cancel an organization invitation
   */
  static async cancelInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!invitationId) {
        throw new Error('Invitation ID is required');
      }

      const { data, error } = await supabase
        .rpc('cancel_organization_invitation', {
          invitation_id: invitationId
        });

      if (error) {
        throw new Error(error.message);
      }

      return data || { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to cancel invitation'
      };
    }
  }

  /**
   * Resend an invitation (generates new token)
   */
  static async resendInvitation(
    invitationId: string
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      if (!invitationId) {
        throw new Error('Invitation ID is required');
      }

      // Get invitation details first
      const { data: invitation, error: getError } = await supabase
        .from('organization_invitations')
        .select('organization_id, email, role')
        .eq('id', invitationId)
        .single();

      if (getError || !invitation) {
        throw new Error('Invitation not found');
      }

      // Cancel existing invitation
      await this.cancelInvitation(invitationId);

      // Create new invitation
      const newInvitation = await this.createInvitation(
        invitation.organization_id,
        invitation.email,
        invitation.role
      );

      if (!newInvitation.success) {
        throw new Error(newInvitation.error || 'Failed to create new invitation');
      }

      return {
        success: true,
        token: newInvitation.token
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to resend invitation'
      };
    }
  }

  /**
   * Get invitation URL for sharing
   */
  static getInvitationUrl(token: string, baseUrl?: string): string {
    const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}/invitations?token=${token}`;
  }

  /**
   * Validate invitation token format
   */
  static validateTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    // Token should be a 64-character hex string
    return /^[a-f0-9]{64}$/.test(token);
  }

  /**
   * Check if invitation is expired
   */
  static isInvitationExpired(expiresAt: string): boolean {
    return new Date(expiresAt) <= new Date();
  }

  /**
   * Get time remaining for invitation
   */
  static getTimeRemaining(expiresAt: string): {
    days: number;
    hours: number;
    minutes: number;
    expired: boolean;
  } {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, expired: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes, expired: false };
  }

  /**
   * Cleanup expired invitations (admin function)
   */
  static async cleanupExpiredInvitations(): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_expired_invitations');

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        deletedCount: data || 0
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to cleanup expired invitations'
      };
    }
  }
}