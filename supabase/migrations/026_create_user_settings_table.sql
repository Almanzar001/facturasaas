-- Create user_settings table with organization support
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    company_name TEXT NOT NULL DEFAULT 'Mi Empresa',
    company_rnc TEXT,
    company_address TEXT,
    company_phone TEXT,
    company_email TEXT,
    company_logo TEXT, -- URL del logo
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00, -- Porcentaje de ITBIS
    currency TEXT NOT NULL DEFAULT 'RD$',
    invoice_prefix TEXT DEFAULT 'FACT',
    quote_prefix TEXT DEFAULT 'COT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, organization_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_organization_id ON public.user_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_org ON public.user_settings(user_id, organization_id);

-- Add RLS policies for user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own settings
CREATE POLICY "Users can access their own settings" ON public.user_settings
    FOR ALL 
    USING (auth.uid() = user_id);

-- Policy: Users can only modify their own settings
CREATE POLICY "Users can modify their own settings" ON public.user_settings
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();