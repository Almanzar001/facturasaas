-- Fix organization_id NULL values in production
-- This migration safely populates organization_id for existing records

-- First, ensure all users have a current_organization_id
-- If a user doesn't have one, create or assign one
DO $$
DECLARE
    user_record RECORD;
    org_id UUID;
    org_name TEXT;
    org_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Process users without current_organization_id
    FOR user_record IN 
        SELECT id, full_name, company_name, email 
        FROM users 
        WHERE current_organization_id IS NULL 
    LOOP
        BEGIN
            -- Check if user is already a member of an organization
            SELECT organization_id INTO org_id
            FROM organization_members 
            WHERE user_id = user_record.id 
            AND is_active = true 
            LIMIT 1;
            
            IF org_id IS NOT NULL THEN
                -- User is already a member, just set as current
                UPDATE users 
                SET current_organization_id = org_id 
                WHERE id = user_record.id;
                
                RAISE NOTICE 'Set existing organization % for user %', org_id, user_record.id;
            ELSE
                -- Create new organization for user
                org_name := COALESCE(user_record.company_name, user_record.full_name, 'Mi Empresa');
                
                -- Create unique slug
                org_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]', '-', 'g'));
                org_slug := regexp_replace(org_slug, '-+', '-', 'g');
                org_slug := trim(org_slug, '-');
                
                counter := 1;
                WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = org_slug) LOOP
                    org_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || counter;
                    counter := counter + 1;
                END LOOP;
                
                -- Create organization
                INSERT INTO organizations (name, slug, is_active, email)
                VALUES (org_name, org_slug, true, user_record.email)
                RETURNING id INTO org_id;
                
                -- Add user as owner
                INSERT INTO organization_members (organization_id, user_id, role, joined_at, is_active)
                VALUES (org_id, user_record.id, 'owner', NOW(), true);
                
                -- Set as current organization
                UPDATE users 
                SET current_organization_id = org_id 
                WHERE id = user_record.id;
                
                RAISE NOTICE 'Created organization % for user %', org_id, user_record.id;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error processing user %: %', user_record.id, SQLERRM;
        END;
    END LOOP;
END $$;

-- Now update all tables with NULL organization_id values
-- Update clients table
UPDATE clients 
SET organization_id = (
    SELECT current_organization_id 
    FROM users 
    WHERE users.id = clients.user_id
)
WHERE organization_id IS NULL;

-- Update products table (if exists)
UPDATE products 
SET organization_id = (
    SELECT current_organization_id 
    FROM users 
    WHERE users.id = products.user_id
)
WHERE organization_id IS NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'organization_id'
);

-- Update invoices table (if exists)
UPDATE invoices 
SET organization_id = (
    SELECT current_organization_id 
    FROM users 
    WHERE users.id = invoices.user_id
)
WHERE organization_id IS NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'organization_id'
);

-- Update quotes table (if exists)
UPDATE quotes 
SET organization_id = (
    SELECT current_organization_id 
    FROM users 
    WHERE users.id = quotes.user_id
)
WHERE organization_id IS NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes' AND column_name = 'organization_id'
);

-- Update expenses table (if exists)
UPDATE expenses 
SET organization_id = (
    SELECT current_organization_id 
    FROM users 
    WHERE users.id = expenses.user_id
)
WHERE organization_id IS NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'organization_id'
);

-- Verify no NULL values remain
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count FROM clients WHERE organization_id IS NULL;
    IF null_count > 0 THEN
        RAISE NOTICE 'Warning: % clients still have NULL organization_id', null_count;
    ELSE
        RAISE NOTICE 'All clients have valid organization_id';
    END IF;
END $$;

SELECT 'organization_id NULL values fixed successfully' as status;