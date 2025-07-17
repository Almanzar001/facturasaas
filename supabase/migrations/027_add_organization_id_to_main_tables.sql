-- Add organization_id to main tables for multi-tenant support
-- This migration adds organization_id to all main tables

-- Add organization_id to clients table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.clients ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    END IF;
END $$;

-- Add organization_id to products table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.products ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    END IF;
END $$;

-- Add organization_id to invoices table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    END IF;
END $$;

-- Add organization_id to quotes table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.quotes ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    END IF;
END $$;

-- Add organization_id to expenses table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.expenses ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON public.products(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotes_organization_id ON public.quotes(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON public.expenses(organization_id);

-- Update existing records to set organization_id based on user's current organization
-- This is a one-time migration to populate existing data

-- Update clients
UPDATE public.clients 
SET organization_id = (
    SELECT current_organization_id 
    FROM public.users 
    WHERE users.id = clients.user_id
)
WHERE organization_id IS NULL;

-- Update products
UPDATE public.products 
SET organization_id = (
    SELECT current_organization_id 
    FROM public.users 
    WHERE users.id = products.user_id
)
WHERE organization_id IS NULL;

-- Update invoices
UPDATE public.invoices 
SET organization_id = (
    SELECT current_organization_id 
    FROM public.users 
    WHERE users.id = invoices.user_id
)
WHERE organization_id IS NULL;

-- Update quotes
UPDATE public.quotes 
SET organization_id = (
    SELECT current_organization_id 
    FROM public.users 
    WHERE users.id = quotes.user_id
)
WHERE organization_id IS NULL;

-- Update expenses
UPDATE public.expenses 
SET organization_id = (
    SELECT current_organization_id 
    FROM public.users 
    WHERE users.id = expenses.user_id
)
WHERE organization_id IS NULL;

-- Make organization_id NOT NULL after populating data
ALTER TABLE public.clients ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.quotes ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.expenses ALTER COLUMN organization_id SET NOT NULL;

SELECT 'organization_id columns added successfully to all main tables' as status;