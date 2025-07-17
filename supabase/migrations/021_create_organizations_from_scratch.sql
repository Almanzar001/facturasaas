-- Migration: Create Organizations Schema from Scratch
-- Description: Create complete organizations schema with all required tables and functions
-- Date: 2025-07-16

-- Drop existing tables and functions to start fresh
DROP TABLE IF EXISTS organization_invitations CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP FUNCTION IF EXISTS get_user_organizations() CASCADE;
DROP FUNCTION IF EXISTS get_current_organization_id() CASCADE;
DROP FUNCTION IF EXISTS switch_organization(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_organization_simple(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_organization_for_user(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_default_organization_for_user(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Create update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create organizations table
CREATE TABLE organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    tax_id VARCHAR(50),
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    plan VARCHAR(50) DEFAULT 'free',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organization_members table
CREATE TABLE organization_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Create organization_invitations table
CREATE TABLE organization_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, email)
);

-- Add organization_id to users table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'current_organization_id'
    ) THEN
        ALTER TABLE users ADD COLUMN current_organization_id UUID REFERENCES organizations(id);
    END IF;
END $$;

-- Create indexes (with existence checks)
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_active ON organization_members(is_active);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_users_current_organization_id ON users(current_organization_id);

-- Create triggers (with existence checks)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_organizations_updated_at') THEN
        CREATE TRIGGER update_organizations_updated_at
            BEFORE UPDATE ON organizations
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_organization_members_updated_at') THEN
        CREATE TRIGGER update_organization_members_updated_at
            BEFORE UPDATE ON organization_members
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organizations
CREATE POLICY "Users can view organizations they are members of" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can update organizations they are admins of" ON organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner') AND is_active = true
        )
    );

CREATE POLICY "Users can insert organizations" ON organizations
    FOR INSERT WITH CHECK (true);

-- Create RLS policies for organization_members
CREATE POLICY "Users can view members of their organizations" ON organization_members
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can insert organization members" ON organization_members
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage organization members" ON organization_members
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner') AND is_active = true
        )
    );

-- Create RLS policies for organization_invitations
CREATE POLICY "Admins can manage invitations" ON organization_invitations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner') AND is_active = true
        )
    );

-- Create essential functions
CREATE OR REPLACE FUNCTION get_current_organization_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT current_organization_id 
        FROM users 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION switch_organization(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_member BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = org_id 
        AND user_id = auth.uid() 
        AND is_active = true
    ) INTO is_member;
    
    IF is_member THEN
        UPDATE users 
        SET current_organization_id = org_id 
        WHERE id = auth.uid();
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_organizations()
RETURNS TABLE (
    organization_id UUID,
    organization_name TEXT,
    organization_slug TEXT,
    user_role TEXT,
    is_current BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.slug,
        om.role,
        o.id = COALESCE(u.current_organization_id, '00000000-0000-0000-0000-000000000000'::UUID)
    FROM organizations o
    JOIN organization_members om ON o.id = om.organization_id
    LEFT JOIN users u ON u.id = auth.uid()
    WHERE om.user_id = auth.uid() 
    AND om.is_active = true
    AND o.is_active = true
    ORDER BY o.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_organization_simple(
    org_name TEXT,
    org_slug TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    org_id UUID;
    final_slug TEXT;
    counter INTEGER := 1;
    user_id UUID;
BEGIN
    -- Get current user
    user_id := auth.uid();
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Generate slug if not provided
    IF org_slug IS NULL THEN
        final_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]', '-', 'g'));
        final_slug := regexp_replace(final_slug, '-+', '-', 'g');
        final_slug := trim(final_slug, '-');
    ELSE
        final_slug := org_slug;
    END IF;

    -- Ensure slug is unique
    WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = final_slug) LOOP
        final_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || counter;
        counter := counter + 1;
    END LOOP;

    -- Create organization
    INSERT INTO organizations (name, slug, is_active)
    VALUES (org_name, final_slug, true)
    RETURNING id INTO org_id;

    -- Add user as owner
    INSERT INTO organization_members (organization_id, user_id, role, joined_at, is_active)
    VALUES (org_id, user_id, 'owner', NOW(), true);

    -- Set as current organization
    UPDATE users 
    SET current_organization_id = org_id 
    WHERE id = user_id;

    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON organization_members TO authenticated;
GRANT ALL ON organization_invitations TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION switch_organization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organizations() TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_simple(TEXT, TEXT) TO authenticated;

-- Create a default organization for existing users
DO $$
DECLARE
    user_record RECORD;
    org_id UUID;
    org_name TEXT;
    org_slug TEXT;
    counter INTEGER := 0;
BEGIN
    FOR user_record IN SELECT DISTINCT id FROM users WHERE id IS NOT NULL LOOP
        BEGIN
            -- Create organization name
            org_name := 'Mi Empresa';
            
            -- Create unique slug
            org_slug := 'mi-empresa';
            counter := 1;
            WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = org_slug) LOOP
                org_slug := 'mi-empresa-' || counter;
                counter := counter + 1;
            END LOOP;
            
            -- Create organization
            INSERT INTO organizations (name, slug, is_active)
            VALUES (org_name, org_slug, true)
            RETURNING id INTO org_id;
            
            -- Add user as owner
            INSERT INTO organization_members (organization_id, user_id, role, joined_at, is_active)
            VALUES (org_id, user_record.id, 'owner', NOW(), true);
            
            -- Set as current organization
            UPDATE users 
            SET current_organization_id = org_id 
            WHERE id = user_record.id;
            
            RAISE NOTICE 'Created organization for user: %', user_record.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error creating organization for user %: %', user_record.id, SQLERRM;
        END;
    END LOOP;
END $$;

SELECT 'Organizations schema created successfully' as status;