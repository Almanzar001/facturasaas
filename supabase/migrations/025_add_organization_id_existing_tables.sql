-- Migration: Add organization_id to existing tables only
-- Description: Add organization_id column only to tables that exist in the database
-- Date: 2025-07-16

-- Add organization_id to clients table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'clients' AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE clients ADD COLUMN organization_id UUID REFERENCES organizations(id);
            RAISE NOTICE 'Added organization_id column to clients table';
        END IF;
    END IF;
END $$;

-- Add organization_id to products table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'products' AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE products ADD COLUMN organization_id UUID REFERENCES organizations(id);
            RAISE NOTICE 'Added organization_id column to products table';
        END IF;
    END IF;
END $$;

-- Add organization_id to invoices table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE invoices ADD COLUMN organization_id UUID REFERENCES organizations(id);
            RAISE NOTICE 'Added organization_id column to invoices table';
        END IF;
    END IF;
END $$;

-- Add organization_id to quotes table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'quotes' AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE quotes ADD COLUMN organization_id UUID REFERENCES organizations(id);
            RAISE NOTICE 'Added organization_id column to quotes table';
        END IF;
    END IF;
END $$;

-- Add organization_id to expenses table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'expenses' AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE expenses ADD COLUMN organization_id UUID REFERENCES organizations(id);
            RAISE NOTICE 'Added organization_id column to expenses table';
        END IF;
    END IF;
END $$;

-- Add organization_id to payments table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE payments ADD COLUMN organization_id UUID REFERENCES organizations(id);
            RAISE NOTICE 'Added organization_id column to payments table';
        END IF;
    END IF;
END $$;

-- Add organization_id to payment_accounts table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_accounts') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payment_accounts' AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE payment_accounts ADD COLUMN organization_id UUID REFERENCES organizations(id);
            RAISE NOTICE 'Added organization_id column to payment_accounts table';
        END IF;
    END IF;
END $$;

-- Add organization_id to fiscal_sequences table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fiscal_sequences') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'fiscal_sequences' AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE fiscal_sequences ADD COLUMN organization_id UUID REFERENCES organizations(id);
            RAISE NOTICE 'Added organization_id column to fiscal_sequences table';
        END IF;
    END IF;
END $$;

-- Add organization_id to settings table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'settings' AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE settings ADD COLUMN organization_id UUID REFERENCES organizations(id);
            RAISE NOTICE 'Added organization_id column to settings table';
        END IF;
    END IF;
END $$;

-- Create indexes for performance (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON clients(organization_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        CREATE INDEX IF NOT EXISTS idx_products_organization_id ON products(organization_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes') THEN
        CREATE INDEX IF NOT EXISTS idx_quotes_organization_id ON quotes(organization_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
        CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON expenses(organization_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON payments(organization_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_accounts') THEN
        CREATE INDEX IF NOT EXISTS idx_payment_accounts_organization_id ON payment_accounts(organization_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fiscal_sequences') THEN
        CREATE INDEX IF NOT EXISTS idx_fiscal_sequences_organization_id ON fiscal_sequences(organization_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
        CREATE INDEX IF NOT EXISTS idx_settings_organization_id ON settings(organization_id);
    END IF;
END $$;

-- Update existing data with current organization (for users with existing data)
DO $$
DECLARE
    org_record RECORD;
    current_table TEXT;
    tables_to_update TEXT[] := ARRAY['clients', 'products', 'invoices', 'quotes', 'expenses', 'payments', 'payment_accounts', 'fiscal_sequences', 'settings'];
    update_query TEXT;
BEGIN
    -- Get the first organization
    SELECT id, name INTO org_record 
    FROM organizations 
    ORDER BY created_at 
    LIMIT 1;
    
    IF org_record.id IS NOT NULL THEN
        -- Update each table that exists
        FOREACH current_table IN ARRAY tables_to_update LOOP
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = current_table) THEN
                update_query := format('UPDATE %I SET organization_id = $1 WHERE organization_id IS NULL', current_table);
                EXECUTE update_query USING org_record.id;
                RAISE NOTICE 'Updated % records for organization: %', current_table, org_record.name;
            END IF;
        END LOOP;
    END IF;
END $$;

SELECT 'Organization ID columns added to existing tables' as status;