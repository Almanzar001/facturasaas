-- Migration: Ensure organizations table has all required columns
-- Description: Add missing columns to organizations table if they don't exist
-- Date: 2025-07-16

-- Ensure organizations table has the plan column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'plan'
    ) THEN
        ALTER TABLE organizations ADD COLUMN plan VARCHAR(50) DEFAULT 'free';
        RAISE NOTICE 'Added plan column to organizations table';
    END IF;
END $$;

-- Ensure organizations table has all required columns
DO $$
BEGIN
    -- Add email column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'email'
    ) THEN
        ALTER TABLE organizations ADD COLUMN email VARCHAR(255);
        RAISE NOTICE 'Added email column to organizations table';
    END IF;

    -- Add phone column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'phone'
    ) THEN
        ALTER TABLE organizations ADD COLUMN phone VARCHAR(20);
        RAISE NOTICE 'Added phone column to organizations table';
    END IF;

    -- Add address column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'address'
    ) THEN
        ALTER TABLE organizations ADD COLUMN address TEXT;
        RAISE NOTICE 'Added address column to organizations table';
    END IF;

    -- Add tax_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'tax_id'
    ) THEN
        ALTER TABLE organizations ADD COLUMN tax_id VARCHAR(50);
        RAISE NOTICE 'Added tax_id column to organizations table';
    END IF;

    -- Add logo_url column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'logo_url'
    ) THEN
        ALTER TABLE organizations ADD COLUMN logo_url TEXT;
        RAISE NOTICE 'Added logo_url column to organizations table';
    END IF;

    -- Add settings column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'settings'
    ) THEN
        ALTER TABLE organizations ADD COLUMN settings JSONB DEFAULT '{}';
        RAISE NOTICE 'Added settings column to organizations table';
    END IF;

    -- Add is_active column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE organizations ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to organizations table';
    END IF;

    -- Add created_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE organizations ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to organizations table';
    END IF;

    -- Add updated_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE organizations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to organizations table';
    END IF;
END $$;

-- Create trigger for updated_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_organizations_updated_at'
    ) THEN
        CREATE TRIGGER update_organizations_updated_at
            BEFORE UPDATE ON organizations
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Created trigger for organizations updated_at';
    END IF;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON organization_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON organization_invitations TO authenticated;

-- Create function to create organization (improved version)
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_organization_simple(TEXT, TEXT) TO authenticated;

SELECT 'Organizations table structure ensured' as status;