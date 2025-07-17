-- ===============================================================
-- FIX INVITATION FUNCTIONS - Drop and Recreate
-- Description: Fix function return types by dropping and recreating
-- Date: 2025-07-17
-- ===============================================================

-- 1. DROP EXISTING FUNCTIONS
-- ===============================================================
DROP FUNCTION IF EXISTS create_organization_invitation(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS accept_organization_invitation(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_invitation_by_token(TEXT) CASCADE;
DROP FUNCTION IF EXISTS cancel_organization_invitation(UUID) CASCADE;
DROP FUNCTION IF EXISTS resend_organization_invitation(UUID) CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_invitations() CASCADE;

-- 2. ENSURE ORGANIZATION_INVITATIONS TABLE EXISTS
-- ===============================================================
CREATE TABLE IF NOT EXISTS organization_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique invitation per organization-email combination
    UNIQUE(organization_id, email)
);

-- 3. CREATE INDEXES FOR PERFORMANCE
-- ===============================================================
CREATE INDEX IF NOT EXISTS idx_organization_invitations_org_id ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_expires_at ON organization_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_accepted_at ON organization_invitations(accepted_at);

-- 4. COMPREHENSIVE INVITATION CREATION FUNCTION
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
    SELECT name INTO org_name 
    FROM organizations 
    WHERE id = org_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Organization not found or inactive';
    END IF;

    -- Check if user has permission to invite (admin or owner)
    SELECT role INTO current_user_role 
    FROM organization_members 
    WHERE organization_id = org_id 
    AND user_id = current_user_id 
    AND is_active = true;

    IF current_user_role NOT IN ('admin', 'owner') THEN
        RAISE EXCEPTION 'Insufficient permissions to invite users. Required: admin or owner';
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

    -- Check if invitation already exists and is still valid
    IF EXISTS (
        SELECT 1 FROM organization_invitations 
        WHERE organization_id = org_id 
        AND email = invite_email 
        AND accepted_at IS NULL 
        AND expires_at > NOW()
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

-- 5. INVITATION ACCEPTANCE FUNCTION
-- ===============================================================
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

    -- Get invitation details
    SELECT * INTO invitation_record 
    FROM organization_invitations 
    WHERE token = invitation_token 
    AND accepted_at IS NULL;

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

-- 6. GET INVITATION BY TOKEN FUNCTION
-- ===============================================================
CREATE OR REPLACE FUNCTION get_invitation_by_token(
    invitation_token TEXT
)
RETURNS JSONB AS $$
DECLARE
    invitation_record RECORD;
BEGIN
    -- Get invitation details with related data
    SELECT 
        i.*,
        o.name as organization_name,
        o.slug as organization_slug,
        u.email as inviter_email,
        u.full_name as inviter_name
    INTO invitation_record
    FROM organization_invitations i
    JOIN organizations o ON i.organization_id = o.id
    JOIN auth.users au ON i.invited_by = au.id
    LEFT JOIN users u ON i.invited_by = u.id
    WHERE i.token = invitation_token 
    AND i.accepted_at IS NULL
    AND i.expires_at > NOW();

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

-- 7. CANCEL INVITATION FUNCTION
-- ===============================================================
CREATE OR REPLACE FUNCTION cancel_organization_invitation(
    invitation_id UUID
)
RETURNS JSONB AS $$
DECLARE
    invitation_record RECORD;
    current_user_id UUID;
    current_user_role TEXT;
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

-- 8. CLEANUP EXPIRED INVITATIONS FUNCTION
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

-- 9. GRANT PERMISSIONS TO FUNCTIONS
-- ===============================================================
GRANT EXECUTE ON FUNCTION create_organization_invitation(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_organization_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invitation_by_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_organization_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_invitations() TO authenticated;

-- 10. ROW LEVEL SECURITY POLICIES
-- ===============================================================
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view org invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Users can view own invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Admins can manage invitations" ON organization_invitations;

-- Policy: Users can view invitations for organizations they're members of
CREATE POLICY "Users can view org invitations" ON organization_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE organization_id = organization_invitations.organization_id 
            AND user_id = auth.uid() 
            AND is_active = true
            AND role IN ('admin', 'owner')
        )
    );

-- Policy: Users can view their own invitations by email
CREATE POLICY "Users can view own invitations" ON organization_invitations
    FOR SELECT USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Policy: Admin/Owner can manage invitations
CREATE POLICY "Admins can manage invitations" ON organization_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE organization_id = organization_invitations.organization_id 
            AND user_id = auth.uid() 
            AND is_active = true
            AND role IN ('admin', 'owner')
        )
    );

-- 11. VERIFICATION AND COMPLETION
-- ===============================================================
SELECT 
    'Invitation system functions recreated successfully' as status,
    COUNT(*) as total_functions
FROM pg_proc 
WHERE proname LIKE '%invitation%';