-- Migration: Fix RLS policies infinite recursion
-- Description: Fix infinite recursion in organization_members policies
-- Date: 2025-07-16

-- Drop existing policies to fix recursion
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Users can insert organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_members;

DROP POLICY IF EXISTS "Users can view organizations they are members of" ON organizations;
DROP POLICY IF EXISTS "Users can update organizations they are admins of" ON organizations;
DROP POLICY IF EXISTS "Users can insert organizations" ON organizations;

-- Create fixed RLS policies for organizations (simpler approach)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organizations' 
        AND policyname = 'Users can view all organizations they are members of'
    ) THEN
        CREATE POLICY "Users can view all organizations they are members of" ON organizations
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM organization_members om 
                    WHERE om.organization_id = organizations.id 
                    AND om.user_id = auth.uid() 
                    AND om.is_active = true
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organizations' 
        AND policyname = 'Users can update organizations they are admins of'
    ) THEN
        CREATE POLICY "Users can update organizations they are admins of" ON organizations
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM organization_members om 
                    WHERE om.organization_id = organizations.id 
                    AND om.user_id = auth.uid() 
                    AND om.role IN ('admin', 'owner') 
                    AND om.is_active = true
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organizations' 
        AND policyname = 'Users can insert organizations'
    ) THEN
        CREATE POLICY "Users can insert organizations" ON organizations
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Create fixed RLS policies for organization_members (avoid recursion)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organization_members' 
        AND policyname = 'Users can view organization members'
    ) THEN
        CREATE POLICY "Users can view organization members" ON organization_members
            FOR SELECT USING (
                user_id = auth.uid() 
                OR 
                EXISTS (
                    SELECT 1 FROM organization_members om2 
                    WHERE om2.organization_id = organization_members.organization_id 
                    AND om2.user_id = auth.uid() 
                    AND om2.is_active = true
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organization_members' 
        AND policyname = 'Users can insert organization members'
    ) THEN
        CREATE POLICY "Users can insert organization members" ON organization_members
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organization_members' 
        AND policyname = 'Admins can update organization members'
    ) THEN
        CREATE POLICY "Admins can update organization members" ON organization_members
            FOR UPDATE USING (
                user_id = auth.uid() 
                OR 
                EXISTS (
                    SELECT 1 FROM organization_members om2 
                    WHERE om2.organization_id = organization_members.organization_id 
                    AND om2.user_id = auth.uid() 
                    AND om2.role IN ('admin', 'owner') 
                    AND om2.is_active = true
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organization_members' 
        AND policyname = 'Admins can delete organization members'
    ) THEN
        CREATE POLICY "Admins can delete organization members" ON organization_members
            FOR DELETE USING (
                user_id = auth.uid() 
                OR 
                EXISTS (
                    SELECT 1 FROM organization_members om2 
                    WHERE om2.organization_id = organization_members.organization_id 
                    AND om2.user_id = auth.uid() 
                    AND om2.role IN ('admin', 'owner') 
                    AND om2.is_active = true
                )
            );
    END IF;
END $$;

-- Create simple RLS policies for organization_invitations
DROP POLICY IF EXISTS "Admins can manage invitations" ON organization_invitations;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organization_invitations' 
        AND policyname = 'Admins can view invitations'
    ) THEN
        CREATE POLICY "Admins can view invitations" ON organization_invitations
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM organization_members om 
                    WHERE om.organization_id = organization_invitations.organization_id 
                    AND om.user_id = auth.uid() 
                    AND om.role IN ('admin', 'owner') 
                    AND om.is_active = true
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organization_invitations' 
        AND policyname = 'Admins can insert invitations'
    ) THEN
        CREATE POLICY "Admins can insert invitations" ON organization_invitations
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM organization_members om 
                    WHERE om.organization_id = organization_invitations.organization_id 
                    AND om.user_id = auth.uid() 
                    AND om.role IN ('admin', 'owner') 
                    AND om.is_active = true
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organization_invitations' 
        AND policyname = 'Admins can update invitations'
    ) THEN
        CREATE POLICY "Admins can update invitations" ON organization_invitations
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM organization_members om 
                    WHERE om.organization_id = organization_invitations.organization_id 
                    AND om.user_id = auth.uid() 
                    AND om.role IN ('admin', 'owner') 
                    AND om.is_active = true
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organization_invitations' 
        AND policyname = 'Admins can delete invitations'
    ) THEN
        CREATE POLICY "Admins can delete invitations" ON organization_invitations
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM organization_members om 
                    WHERE om.organization_id = organization_invitations.organization_id 
                    AND om.user_id = auth.uid() 
                    AND om.role IN ('admin', 'owner') 
                    AND om.is_active = true
                )
            );
    END IF;
END $$;

SELECT 'RLS policies fixed successfully' as status;