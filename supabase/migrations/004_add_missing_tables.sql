-- Add missing tables for payments and payment accounts

-- Payment accounts table
CREATE TABLE IF NOT EXISTS public.payment_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('banco', 'efectivo', 'digital', 'otro')),
    account_number TEXT,
    bank_name TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT DEFAULT 'efectivo' CHECK (payment_method IN ('efectivo', 'transferencia', 'tarjeta', 'cheque', 'otro')),
    payment_account_id UUID REFERENCES public.payment_accounts(id),
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Fiscal document types table (for Dominican Republic fiscal documents)
CREATE TABLE IF NOT EXISTS public.fiscal_document_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    code TEXT NOT NULL, -- B01, B02, B15, etc.
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, code)
);

-- Fiscal sequences table
CREATE TABLE IF NOT EXISTS public.fiscal_sequences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    fiscal_document_type_id UUID REFERENCES public.fiscal_document_types(id) ON DELETE CASCADE NOT NULL,
    prefix TEXT DEFAULT '',
    suffix TEXT DEFAULT '',
    current_number INTEGER NOT NULL DEFAULT 0,
    start_number INTEGER NOT NULL DEFAULT 1,
    max_number INTEGER NOT NULL DEFAULT 10000,
    padding_length INTEGER NOT NULL DEFAULT 8,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, fiscal_document_type_id)
);

-- Add fiscal document reference to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS fiscal_document_type_id UUID REFERENCES public.fiscal_document_types(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS fiscal_number TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_tax_id TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS apply_tax BOOLEAN DEFAULT true;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_accounts_user_id ON public.payment_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_fiscal_document_types_user_id ON public.fiscal_document_types(user_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_sequences_user_id ON public.fiscal_sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_fiscal_type ON public.invoices(fiscal_document_type_id);

-- Add updated_at triggers
CREATE TRIGGER handle_updated_at_payment_accounts
    BEFORE UPDATE ON public.payment_accounts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_payments
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_fiscal_document_types
    BEFORE UPDATE ON public.fiscal_document_types
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_fiscal_sequences
    BEFORE UPDATE ON public.fiscal_sequences
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_sequences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payment_accounts
CREATE POLICY "Users can view own payment accounts" ON public.payment_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment accounts" ON public.payment_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment accounts" ON public.payment_accounts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment accounts" ON public.payment_accounts
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for payments
CREATE POLICY "Users can view own payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments" ON public.payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payments" ON public.payments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payments" ON public.payments
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for fiscal_document_types
CREATE POLICY "Users can view own fiscal document types" ON public.fiscal_document_types
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fiscal document types" ON public.fiscal_document_types
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fiscal document types" ON public.fiscal_document_types
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fiscal document types" ON public.fiscal_document_types
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for fiscal_sequences
CREATE POLICY "Users can view own fiscal sequences" ON public.fiscal_sequences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fiscal sequences" ON public.fiscal_sequences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fiscal sequences" ON public.fiscal_sequences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fiscal sequences" ON public.fiscal_sequences
    FOR DELETE USING (auth.uid() = user_id);

-- Insert default Dominican Republic fiscal document types
INSERT INTO public.fiscal_document_types (user_id, code, name, description) 
SELECT 
    auth.uid(),
    'B01',
    'Factura de Crédito Fiscal',
    'Factura con valor fiscal para contribuyentes'
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, code) DO NOTHING;

INSERT INTO public.fiscal_document_types (user_id, code, name, description) 
SELECT 
    auth.uid(),
    'B02',
    'Factura de Consumidor Final',
    'Factura para consumidores finales'
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, code) DO NOTHING;

INSERT INTO public.fiscal_document_types (user_id, code, name, description) 
SELECT 
    auth.uid(),
    'B15',
    'Factura Gubernamental',
    'Factura para entidades gubernamentales'
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, code) DO NOTHING;

-- Grant permissions
GRANT ALL ON public.payment_accounts TO authenticated;
GRANT ALL ON public.payments TO authenticated;
GRANT ALL ON public.fiscal_document_types TO authenticated;
GRANT ALL ON public.fiscal_sequences TO authenticated;