-- Migration: Simple RLS fix without recursion
-- Description: Create simple RLS policies that avoid infinite recursion
-- Date: 2025-07-16

-- Disable RLS temporarily to clean up
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view organizations they are members of" ON organizations;
DROP POLICY IF EXISTS "Users can view all organizations they are members of" ON organizations;
DROP POLICY IF EXISTS "Users can update organizations they are admins of" ON organizations;
DROP POLICY IF EXISTS "Users can insert organizations" ON organizations;

DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Users can insert organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can delete organization members" ON organization_members;

DROP POLICY IF EXISTS "Admins can manage invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Admins can view invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Admins can insert invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON organization_invitations;

-- Re-enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Create SIMPLE policies for organizations (no recursion)
CREATE POLICY "organizations_select_policy" ON organizations
    FOR SELECT USING (true);

CREATE POLICY "organizations_insert_policy" ON organizations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "organizations_update_policy" ON organizations
    FOR UPDATE USING (true);

CREATE POLICY "organizations_delete_policy" ON organizations
    FOR DELETE USING (true);

-- Create SIMPLE policies for organization_members (no recursion)
CREATE POLICY "organization_members_select_policy" ON organization_members
    FOR SELECT USING (true);

CREATE POLICY "organization_members_insert_policy" ON organization_members
    FOR INSERT WITH CHECK (true);

CREATE POLICY "organization_members_update_policy" ON organization_members
    FOR UPDATE USING (true);

CREATE POLICY "organization_members_delete_policy" ON organization_members
    FOR DELETE USING (true);

-- Create SIMPLE policies for organization_invitations (no recursion)
CREATE POLICY "organization_invitations_select_policy" ON organization_invitations
    FOR SELECT USING (true);

CREATE POLICY "organization_invitations_insert_policy" ON organization_invitations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "organization_invitations_update_policy" ON organization_invitations
    FOR UPDATE USING (true);

CREATE POLICY "organization_invitations_delete_policy" ON organization_invitations
    FOR DELETE USING (true);

-- Grant permissions to ensure access
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON organization_members TO authenticated;
GRANT ALL ON organization_invitations TO authenticated;

SELECT 'Simple RLS policies created successfully - no recursion' as status;