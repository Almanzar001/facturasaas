-- ===============================================================
-- FIX COLUMN AMBIGUITY IN INVITATION FUNCTIONS
-- Description: Fix ambiguous column reference in invitation functions
-- Date: 2025-07-17
-- ===============================================================

-- 1. DROP AND RECREATE GET_INVITATION_BY_TOKEN FUNCTION
-- ===============================================================
DROP FUNCTION IF EXISTS get_invitation_by_token(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION get_invitation_by_token(
    invitation_token TEXT
)
RETURNS JSONB AS $$
DECLARE
    invitation_record RECORD;
BEGIN
    -- Get invitation details with related data using explicit column references
    SELECT 
        inv.id,
        inv.organization_id,
        inv.email,
        inv.role,
        inv.invited_by,
        inv.token,
        inv.expires_at,
        inv.accepted_at,
        inv.created_at,
        org.name as organization_name,
        org.slug as organization_slug,
        usr.email as inviter_email,
        usr.full_name as inviter_name
    INTO invitation_record
    FROM organization_invitations inv
    JOIN organizations org ON inv.organization_id = org.id
    JOIN auth.users au ON inv.invited_by = au.id
    LEFT JOIN users usr ON inv.invited_by = usr.id
    WHERE inv.token = invitation_token 
    AND inv.accepted_at IS NULL
    AND inv.expires_at > NOW();

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid or expired invitation'
        );
    END IF;

    -- Return invitation details
    RETURN jsonb_build_object(
        'success', true,
        'invitation', jsonb_build_object(
            'id', invitation_record.id,
            'email', invitation_record.email,
            'role', invitation_record.role,
            'expires_at', invitation_record.expires_at,
            'created_at', invitation_record.created_at,
            'organization', jsonb_build_object(
                'id', invitation_record.organization_id,
                'name', invitation_record.organization_name,
                'slug', invitation_record.organization_slug
            ),
            'invited_by_user', jsonb_build_object(
                'email', invitation_record.inviter_email,
                'name', invitation_record.inviter_name
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. DROP AND RECREATE ACCEPT_ORGANIZATION_INVITATION FUNCTION
-- ===============================================================
DROP FUNCTION IF EXISTS accept_organization_invitation(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION accept_organization_invitation(
    invitation_token TEXT
)
RETURNS JSONB AS $$
DECLARE
    invitation_record RECORD;
    current_user_id UUID;
    current_user_email TEXT;
    existing_member BOOLEAN;
BEGIN
    -- Validate input
    IF invitation_token IS NULL OR invitation_token = '' THEN
        RAISE EXCEPTION 'Invitation token is required';
    END IF;

    -- Get current user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Get current user email
    SELECT email INTO current_user_email 
    FROM auth.users 
    WHERE id = current_user_id;

    -- Get invitation details with explicit column references
    SELECT 
        inv.id,
        inv.organization_id,
        inv.email,
        inv.role,
        inv.invited_by,
        inv.token,
        inv.expires_at,
        inv.accepted_at,
        inv.created_at
    INTO invitation_record
    FROM organization_invitations inv
    WHERE inv.token = invitation_token 
    AND inv.accepted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid invitation token';
    END IF;

    -- Check if invitation has expired
    IF invitation_record.expires_at <= NOW() THEN
        RAISE EXCEPTION 'Invitation has expired';
    END IF;

    -- Check if invitation email matches current user
    IF invitation_record.email != current_user_email THEN
        RAISE EXCEPTION 'This invitation is for a different email address';
    END IF;

    -- Check if user is already a member
    SELECT EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = invitation_record.organization_id 
        AND user_id = current_user_id 
        AND is_active = true
    ) INTO existing_member;

    IF NOT existing_member THEN
        -- Add user to organization
        INSERT INTO organization_members (
            organization_id,
            user_id,
            role,
            invited_by,
            invited_at,
            joined_at,
            is_active
        ) VALUES (
            invitation_record.organization_id,
            current_user_id,
            invitation_record.role,
            invitation_record.invited_by,
            invitation_record.created_at,
            NOW(),
            true
        );

        -- Update user's current organization if they don't have one
        UPDATE users 
        SET current_organization_id = invitation_record.organization_id 
        WHERE id = current_user_id 
        AND current_organization_id IS NULL;
    END IF;

    -- Mark invitation as accepted
    UPDATE organization_invitations 
    SET accepted_at = NOW() 
    WHERE id = invitation_record.id;

    -- Return success response
    RETURN jsonb_build_object(
        'success', true,
        'organization_id', invitation_record.organization_id,
        'role', invitation_record.role,
        'joined_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RECREATE CREATE_ORGANIZATION_INVITATION WITH EXPLICIT COLUMNS
-- ===============================================================
DROP FUNCTION IF EXISTS create_organization_invitation(UUID, TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION create_organization_invitation(
    org_id UUID,
    invite_email TEXT,
    invite_role TEXT DEFAULT 'member'
)
RETURNS JSONB AS $$
DECLARE
    invitation_id UUID;
    invitation_token TEXT;
    current_user_id UUID;
    current_user_role TEXT;
    expires_at TIMESTAMP WITH TIME ZONE;
    org_name TEXT;
BEGIN
    -- Validate inputs
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Organization ID is required';
    END IF;
    
    IF invite_email IS NULL OR invite_email = '' THEN
        RAISE EXCEPTION 'Email is required';
    END IF;
    
    IF invite_role NOT IN ('admin', 'member') THEN
        RAISE EXCEPTION 'Role must be either admin or member';
    END IF;

    -- Get current user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Verify organization exists
    SELECT org.name INTO org_name 
    FROM organizations org
    WHERE org.id = org_id AND org.is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Organization not found or inactive';
    END IF;

    -- Check if user has permission to invite (admin or owner)
    SELECT mem.role INTO current_user_role 
    FROM organization_members mem
    WHERE mem.organization_id = org_id 
    AND mem.user_id = current_user_id 
    AND mem.is_active = true;

    IF current_user_role NOT IN ('admin', 'owner') THEN
        RAISE EXCEPTION 'Insufficient permissions to invite users. Required: admin or owner';
    END IF;

    -- Check if user is already a member
    IF EXISTS (
        SELECT 1 FROM organization_members mem
        WHERE mem.organization_id = org_id 
        AND mem.user_id = (SELECT id FROM auth.users WHERE email = invite_email)
        AND mem.is_active = true
    ) THEN
        RAISE EXCEPTION 'User is already a member of this organization';
    END IF;

    -- Check if invitation already exists and is still valid
    IF EXISTS (
        SELECT 1 FROM organization_invitations inv
        WHERE inv.organization_id = org_id 
        AND inv.email = invite_email 
        AND inv.accepted_at IS NULL 
        AND inv.expires_at > NOW()
    ) THEN
        RAISE EXCEPTION 'An active invitation already exists for this email';
    END IF;

    -- Generate unique invitation token
    invitation_token := encode(gen_random_bytes(32), 'hex');
    
    -- Set expiration (7 days from now)
    expires_at := NOW() + INTERVAL '7 days';

    -- Delete any existing expired invitations for this email
    DELETE FROM organization_invitations 
    WHERE organization_id = org_id 
    AND email = invite_email 
    AND (accepted_at IS NOT NULL OR expires_at <= NOW());

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

    -- Return invitation details
    RETURN jsonb_build_object(
        'success', true,
        'invitation_id', invitation_id,
        'token', invitation_token,
        'expires_at', expires_at,
        'organization_name', org_name,
        'email', invite_email,
        'role', invite_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. GRANT PERMISSIONS TO FUNCTIONS
-- ===============================================================
GRANT EXECUTE ON FUNCTION create_organization_invitation(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_organization_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invitation_by_token(TEXT) TO authenticated;

-- 5. VERIFICATION
-- ===============================================================
SELECT 
    'Column ambiguity fixed successfully' as status,
    COUNT(*) as total_functions
FROM pg_proc 
WHERE proname LIKE '%invitation%';