-- ===============================================================
-- FORCE FIX COLUMN AMBIGUITY - COMPLETE SOLUTION
-- Description: Complete fix for column ambiguity with explicit drops
-- Date: 2025-07-17
-- ===============================================================

-- 1. FORCE DROP ALL INVITATION FUNCTIONS
-- ===============================================================
DO $$
BEGIN
    -- Drop all possible variations of the functions
    DROP FUNCTION IF EXISTS create_organization_invitation(UUID, TEXT, TEXT) CASCADE;
    DROP FUNCTION IF EXISTS create_organization_invitation(UUID, TEXT) CASCADE;
    DROP FUNCTION IF EXISTS accept_organization_invitation(TEXT) CASCADE;
    DROP FUNCTION IF EXISTS get_invitation_by_token(TEXT) CASCADE;
    DROP FUNCTION IF EXISTS cancel_organization_invitation(UUID) CASCADE;
    DROP FUNCTION IF EXISTS resend_organization_invitation(UUID) CASCADE;
    DROP FUNCTION IF EXISTS cleanup_expired_invitations() CASCADE;
    
    RAISE NOTICE 'All invitation functions dropped successfully';
END $$;

-- 2. VERIFY FUNCTIONS ARE DROPPED
-- ===============================================================
SELECT 
    'Functions after drop' as status,
    COUNT(*) as remaining_functions
FROM pg_proc 
WHERE proname LIKE '%invitation%';

-- 3. RECREATE CREATE_ORGANIZATION_INVITATION FUNCTION
-- ===============================================================
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
    expires_at_value TIMESTAMP WITH TIME ZONE;
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
    SELECT o.name INTO org_name 
    FROM organizations o
    WHERE o.id = org_id AND o.is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Organization not found or inactive';
    END IF;

    -- Check if user has permission to invite (admin or owner)
    SELECT m.role INTO current_user_role 
    FROM organization_members m
    WHERE m.organization_id = org_id 
    AND m.user_id = current_user_id 
    AND m.is_active = true;

    IF current_user_role NOT IN ('admin', 'owner') THEN
        RAISE EXCEPTION 'Insufficient permissions to invite users. Required: admin or owner';
    END IF;

    -- Check if user is already a member
    IF EXISTS (
        SELECT 1 FROM organization_members m
        WHERE m.organization_id = org_id 
        AND m.user_id = (SELECT id FROM auth.users WHERE email = invite_email)
        AND m.is_active = true
    ) THEN
        RAISE EXCEPTION 'User is already a member of this organization';
    END IF;

    -- Check if invitation already exists and is still valid
    IF EXISTS (
        SELECT 1 FROM organization_invitations oi
        WHERE oi.organization_id = org_id 
        AND oi.email = invite_email 
        AND oi.accepted_at IS NULL 
        AND oi.expires_at > NOW()
    ) THEN
        RAISE EXCEPTION 'An active invitation already exists for this email';
    END IF;

    -- Generate unique invitation token
    invitation_token := encode(gen_random_bytes(32), 'hex');
    
    -- Set expiration (7 days from now)
    expires_at_value := NOW() + INTERVAL '7 days';

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
        expires_at_value
    ) RETURNING id INTO invitation_id;

    -- Return invitation details
    RETURN jsonb_build_object(
        'success', true,
        'invitation_id', invitation_id,
        'token', invitation_token,
        'expires_at', expires_at_value,
        'organization_name', org_name,
        'email', invite_email,
        'role', invite_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RECREATE GET_INVITATION_BY_TOKEN FUNCTION
-- ===============================================================
CREATE OR REPLACE FUNCTION get_invitation_by_token(
    invitation_token TEXT
)
RETURNS JSONB AS $$
DECLARE
    invitation_id UUID;
    invitation_org_id UUID;
    invitation_email TEXT;
    invitation_role TEXT;
    invitation_invited_by UUID;
    invitation_expires_at TIMESTAMP WITH TIME ZONE;
    invitation_created_at TIMESTAMP WITH TIME ZONE;
    org_name TEXT;
    org_slug TEXT;
    inviter_email TEXT;
    inviter_name TEXT;
BEGIN
    -- Get invitation details with individual column selection
    SELECT 
        oi.id,
        oi.organization_id,
        oi.email,
        oi.role,
        oi.invited_by,
        oi.expires_at,
        oi.created_at
    INTO 
        invitation_id,
        invitation_org_id,
        invitation_email,
        invitation_role,
        invitation_invited_by,
        invitation_expires_at,
        invitation_created_at
    FROM organization_invitations oi
    WHERE oi.token = invitation_token 
    AND oi.accepted_at IS NULL
    AND oi.expires_at > NOW();

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid or expired invitation'
        );
    END IF;

    -- Get organization details
    SELECT o.name, o.slug INTO org_name, org_slug
    FROM organizations o
    WHERE o.id = invitation_org_id;

    -- Get inviter details
    SELECT u.email, u.full_name INTO inviter_email, inviter_name
    FROM users u
    WHERE u.id = invitation_invited_by;

    -- Return invitation details
    RETURN jsonb_build_object(
        'success', true,
        'invitation', jsonb_build_object(
            'id', invitation_id,
            'email', invitation_email,
            'role', invitation_role,
            'expires_at', invitation_expires_at,
            'created_at', invitation_created_at,
            'organization', jsonb_build_object(
                'id', invitation_org_id,
                'name', org_name,
                'slug', org_slug
            ),
            'invited_by_user', jsonb_build_object(
                'email', inviter_email,
                'name', inviter_name
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RECREATE ACCEPT_ORGANIZATION_INVITATION FUNCTION
-- ===============================================================
CREATE OR REPLACE FUNCTION accept_organization_invitation(
    invitation_token TEXT
)
RETURNS JSONB AS $$
DECLARE
    invitation_id UUID;
    invitation_org_id UUID;
    invitation_email TEXT;
    invitation_role TEXT;
    invitation_invited_by UUID;
    invitation_expires_at TIMESTAMP WITH TIME ZONE;
    invitation_created_at TIMESTAMP WITH TIME ZONE;
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

    -- Get invitation details
    SELECT 
        oi.id,
        oi.organization_id,
        oi.email,
        oi.role,
        oi.invited_by,
        oi.expires_at,
        oi.created_at
    INTO 
        invitation_id,
        invitation_org_id,
        invitation_email,
        invitation_role,
        invitation_invited_by,
        invitation_expires_at,
        invitation_created_at
    FROM organization_invitations oi
    WHERE oi.token = invitation_token 
    AND oi.accepted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid invitation token';
    END IF;

    -- Check if invitation has expired
    IF invitation_expires_at <= NOW() THEN
        RAISE EXCEPTION 'Invitation has expired';
    END IF;

    -- Check if invitation email matches current user
    IF invitation_email != current_user_email THEN
        RAISE EXCEPTION 'This invitation is for a different email address';
    END IF;

    -- Check if user is already a member
    SELECT EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = invitation_org_id 
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
            invitation_org_id,
            current_user_id,
            invitation_role,
            invitation_invited_by,
            invitation_created_at,
            NOW(),
            true
        );

        -- Update user's current organization if they don't have one
        UPDATE users 
        SET current_organization_id = invitation_org_id 
        WHERE id = current_user_id 
        AND current_organization_id IS NULL;
    END IF;

    -- Mark invitation as accepted
    UPDATE organization_invitations 
    SET accepted_at = NOW() 
    WHERE id = invitation_id;

    -- Return success response
    RETURN jsonb_build_object(
        'success', true,
        'organization_id', invitation_org_id,
        'role', invitation_role,
        'joined_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RECREATE CANCEL_ORGANIZATION_INVITATION FUNCTION
-- ===============================================================
CREATE OR REPLACE FUNCTION cancel_organization_invitation(
    invitation_id UUID
)
RETURNS JSONB AS $$
DECLARE
    invitation_org_id UUID;
    current_user_id UUID;
    current_user_role TEXT;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Get invitation organization
    SELECT organization_id INTO invitation_org_id
    FROM organization_invitations 
    WHERE id = invitation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation not found';
    END IF;

    -- Check if user has permission
    SELECT role INTO current_user_role 
    FROM organization_members 
    WHERE organization_id = invitation_org_id 
    AND user_id = current_user_id 
    AND is_active = true;

    IF current_user_role NOT IN ('admin', 'owner') THEN
        RAISE EXCEPTION 'Insufficient permissions to cancel invitation';
    END IF;

    -- Delete invitation
    DELETE FROM organization_invitations 
    WHERE id = invitation_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Invitation cancelled successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RECREATE CLEANUP_EXPIRED_INVITATIONS FUNCTION
-- ===============================================================
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM organization_invitations 
    WHERE expires_at <= NOW() 
    AND accepted_at IS NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. GRANT PERMISSIONS TO FUNCTIONS
-- ===============================================================
GRANT EXECUTE ON FUNCTION create_organization_invitation(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_organization_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invitation_by_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_organization_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_invitations() TO authenticated;

-- 9. FINAL VERIFICATION
-- ===============================================================
SELECT 
    'FORCE FIX COMPLETED' as status,
    COUNT(*) as total_functions,
    array_agg(proname) as function_names
FROM pg_proc 
WHERE proname LIKE '%invitation%';

-- 10. TEST BASIC FUNCTIONALITY
-- ===============================================================
SELECT 
    'Testing cleanup function' as test,
    cleanup_expired_invitations() as result;

SELECT 
    'Testing get_invitation_by_token with dummy token' as test,
    (get_invitation_by_token('dummy_token')::jsonb)->>'success' as should_be_false;