-- Migration: Fix get_user_organizations function
-- Description: Fix the function to properly return user organizations
-- Date: 2025-07-16

-- Drop and recreate the function with proper error handling
DROP FUNCTION IF EXISTS get_user_organizations();

CREATE OR REPLACE FUNCTION get_user_organizations()
RETURNS TABLE (
    organization_id UUID,
    organization_name TEXT,
    organization_slug TEXT,
    user_role TEXT,
    is_current BOOLEAN
) AS $$
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    RETURN QUERY
    SELECT 
        o.id as organization_id,
        o.name as organization_name,
        o.slug as organization_slug,
        om.role as user_role,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM users u 
                WHERE u.id = auth.uid() 
                AND u.current_organization_id = o.id
            ) THEN true
            ELSE false
        END as is_current
    FROM organizations o
    JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = auth.uid() 
    AND om.is_active = true
    AND o.is_active = true
    ORDER BY o.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_organizations() TO authenticated;

-- Also fix the get_current_organization_id function
DROP FUNCTION IF EXISTS get_current_organization_id();

CREATE OR REPLACE FUNCTION get_current_organization_id()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get current organization ID
    SELECT current_organization_id INTO org_id
    FROM users 
    WHERE id = auth.uid();
    
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_current_organization_id() TO authenticated;

-- Test the function
SELECT 'Functions fixed successfully' as status;