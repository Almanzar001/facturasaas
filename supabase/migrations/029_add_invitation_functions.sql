-- Migration: Add Organization Invitation Functions
-- Description: Add missing RPC functions for organization invitations
-- Date: 2025-07-17

-- Function to create organization invitation
CREATE OR REPLACE FUNCTION create_organization_invitation(
    org_id UUID,
    invite_email TEXT,
    invite_role TEXT DEFAULT 'member'
)
RETURNS UUID AS $$
DECLARE
    invitation_id UUID;
    invitation_token TEXT;
    current_user_id UUID;
    current_user_role TEXT;
    expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Check if user has permission to invite (admin or owner)
    SELECT role INTO current_user_role 
    FROM organization_members 
    WHERE organization_id = org_id 
    AND user_id = current_user_id 
    AND is_active = true;

    IF current_user_role NOT IN ('admin', 'owner') THEN
        RAISE EXCEPTION 'Insufficient permissions to invite users';
    END IF;

    -- Check if user is already a member
    IF EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = org_id 
        AND user_id = (SELECT id FROM auth.users WHERE email = invite_email)
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'User is already a member of this organization';
    END IF;

    -- Check if invitation already exists
    IF EXISTS (
        SELECT 1 FROM organization_invitations 
        WHERE organization_id = org_id 
        AND email = invite_email 
        AND accepted_at IS NULL 
        AND expires_at > NOW()
    ) THEN
        RAISE EXCEPTION 'Invitation already exists for this email';
    END IF;

    -- Generate invitation token
    invitation_token := encode(gen_random_bytes(32), 'hex');
    
    -- Set expiration (7 days from now)
    expires_at := NOW() + INTERVAL '7 days';

    -- Create invitation
    INSERT INTO organization_invitations (
        organization_id,
        email,
        role,
        invited_by,
        token,
        expires_at
    ) VALUES (
        org_id,
        invite_email,
        invite_role,
        current_user_id,
        invitation_token,
        expires_at
    ) RETURNING id INTO invitation_id;

    RETURN invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept organization invitation
CREATE OR REPLACE FUNCTION accept_organization_invitation(
    invitation_token TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    invitation_record RECORD;
    current_user_id UUID;
    current_user_email TEXT;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Get current user email
    SELECT email INTO current_user_email 
    FROM auth.users 
    WHERE id = current_user_id;

    -- Get invitation details
    SELECT * INTO invitation_record 
    FROM organization_invitations 
    WHERE token = invitation_token 
    AND accepted_at IS NULL 
    AND expires_at > NOW();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;

    -- Check if invitation email matches current user
    IF invitation_record.email != current_user_email THEN
        RAISE EXCEPTION 'Invitation email does not match current user';
    END IF;

    -- Check if user is already a member
    IF EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = invitation_record.organization_id 
        AND user_id = current_user_id 
        AND is_active = true
    ) THEN
        -- Update invitation as accepted
        UPDATE organization_invitations 
        SET accepted_at = NOW() 
        WHERE id = invitation_record.id;
        
        RETURN TRUE;
    END IF;

    -- Add user to organization
    INSERT INTO organization_members (
        organization_id,
        user_id,
        role,
        invited_by,
        joined_at,
        is_active
    ) VALUES (
        invitation_record.organization_id,
        current_user_id,
        invitation_record.role,
        invitation_record.invited_by,
        NOW(),
        true
    );

    -- Update user's current organization if they don't have one
    UPDATE users 
    SET current_organization_id = invitation_record.organization_id 
    WHERE id = current_user_id 
    AND current_organization_id IS NULL;

    -- Mark invitation as accepted
    UPDATE organization_invitations 
    SET accepted_at = NOW() 
    WHERE id = invitation_record.id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to resend invitation (generates new token)
CREATE OR REPLACE FUNCTION resend_organization_invitation(
    invitation_id UUID
)
RETURNS TEXT AS $$
DECLARE
    invitation_record RECORD;
    current_user_id UUID;
    current_user_role TEXT;
    new_token TEXT;
    new_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Get invitation details
    SELECT * INTO invitation_record 
    FROM organization_invitations 
    WHERE id = invitation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation not found';
    END IF;

    -- Check if user has permission
    SELECT role INTO current_user_role 
    FROM organization_members 
    WHERE organization_id = invitation_record.organization_id 
    AND user_id = current_user_id 
    AND is_active = true;

    IF current_user_role NOT IN ('admin', 'owner') THEN
        RAISE EXCEPTION 'Insufficient permissions to resend invitation';
    END IF;

    -- Generate new token and expiration
    new_token := encode(gen_random_bytes(32), 'hex');
    new_expires_at := NOW() + INTERVAL '7 days';

    -- Update invitation
    UPDATE organization_invitations 
    SET 
        token = new_token,
        expires_at = new_expires_at,
        accepted_at = NULL
    WHERE id = invitation_id;

    RETURN new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_organization_invitation(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_organization_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION resend_organization_invitation(UUID) TO authenticated;

SELECT 'Organization invitation functions created successfully' as status;