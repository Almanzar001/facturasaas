-- Migration: Add organization_id to all main tables
-- Description: Add organization_id column to all tables that need multi-tenant isolation
-- Date: 2025-07-16

-- Add organization_id to clients table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE clients ADD COLUMN organization_id UUID REFERENCES organizations(id);
        RAISE NOTICE 'Added organization_id column to clients table';
    END IF;
END $$;

-- Add organization_id to products table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE products ADD COLUMN organization_id UUID REFERENCES organizations(id);
        RAISE NOTICE 'Added organization_id column to products table';
    END IF;
END $$;

-- Add organization_id to invoices table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE invoices ADD COLUMN organization_id UUID REFERENCES organizations(id);
        RAISE NOTICE 'Added organization_id column to invoices table';
    END IF;
END $$;

-- Add organization_id to quotes table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE quotes ADD COLUMN organization_id UUID REFERENCES organizations(id);
        RAISE NOTICE 'Added organization_id column to quotes table';
    END IF;
END $$;

-- Add organization_id to expenses table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE expenses ADD COLUMN organization_id UUID REFERENCES organizations(id);
        RAISE NOTICE 'Added organization_id column to expenses table';
    END IF;
END $$;

-- Add organization_id to payments table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE payments ADD COLUMN organization_id UUID REFERENCES organizations(id);
        RAISE NOTICE 'Added organization_id column to payments table';
    END IF;
END $$;

-- Add organization_id to payment_accounts table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_accounts' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE payment_accounts ADD COLUMN organization_id UUID REFERENCES organizations(id);
        RAISE NOTICE 'Added organization_id column to payment_accounts table';
    END IF;
END $$;

-- Add organization_id to fiscal_sequences table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fiscal_sequences' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE fiscal_sequences ADD COLUMN organization_id UUID REFERENCES organizations(id);
        RAISE NOTICE 'Added organization_id column to fiscal_sequences table';
    END IF;
END $$;

-- Add organization_id to fiscal_documents table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fiscal_documents' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE fiscal_documents ADD COLUMN organization_id UUID REFERENCES organizations(id);
        RAISE NOTICE 'Added organization_id column to fiscal_documents table';
    END IF;
END $$;

-- Add organization_id to settings table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'settings' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE settings ADD COLUMN organization_id UUID REFERENCES organizations(id);
        RAISE NOTICE 'Added organization_id column to settings table';
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotes_organization_id ON quotes(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_accounts_organization_id ON payment_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_sequences_organization_id ON fiscal_sequences(organization_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_organization_id ON fiscal_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_settings_organization_id ON settings(organization_id);

-- Update existing data with current organization (for users with existing data)
DO $$
DECLARE
    org_record RECORD;
BEGIN
    -- For each organization, update records to belong to that organization
    FOR org_record IN SELECT id, name FROM organizations ORDER BY created_at LOOP
        -- Update clients
        UPDATE clients 
        SET organization_id = org_record.id 
        WHERE organization_id IS NULL;
        
        -- Update products  
        UPDATE products 
        SET organization_id = org_record.id 
        WHERE organization_id IS NULL;
        
        -- Update invoices
        UPDATE invoices 
        SET organization_id = org_record.id 
        WHERE organization_id IS NULL;
        
        -- Update quotes
        UPDATE quotes 
        SET organization_id = org_record.id 
        WHERE organization_id IS NULL;
        
        -- Update expenses
        UPDATE expenses 
        SET organization_id = org_record.id 
        WHERE organization_id IS NULL;
        
        -- Update payments
        UPDATE payments 
        SET organization_id = org_record.id 
        WHERE organization_id IS NULL;
        
        -- Update payment_accounts
        UPDATE payment_accounts 
        SET organization_id = org_record.id 
        WHERE organization_id IS NULL;
        
        -- Update fiscal_sequences
        UPDATE fiscal_sequences 
        SET organization_id = org_record.id 
        WHERE organization_id IS NULL;
        
        -- Update fiscal_documents
        UPDATE fiscal_documents 
        SET organization_id = org_record.id 
        WHERE organization_id IS NULL;
        
        -- Update settings
        UPDATE settings 
        SET organization_id = org_record.id 
        WHERE organization_id IS NULL;
        
        RAISE NOTICE 'Updated records for organization: %', org_record.name;
        
        -- Only update the first organization to avoid duplicates
        EXIT;
    END LOOP;
END $$;

SELECT 'Organization ID columns added to all tables' as status;