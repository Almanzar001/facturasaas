-- Update fiscal_sequences table to match new schema requirements
-- This migration safely updates the existing table structure

-- First, check if columns exist and add them if they don't
DO $$ 
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_sequences' AND column_name = 'start_number') THEN
        ALTER TABLE public.fiscal_sequences ADD COLUMN start_number INTEGER NOT NULL DEFAULT 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_sequences' AND column_name = 'max_number') THEN
        ALTER TABLE public.fiscal_sequences ADD COLUMN max_number INTEGER NOT NULL DEFAULT 10000;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_sequences' AND column_name = 'padding_length') THEN
        ALTER TABLE public.fiscal_sequences ADD COLUMN padding_length INTEGER NOT NULL DEFAULT 8;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_sequences' AND column_name = 'prefix') THEN
        ALTER TABLE public.fiscal_sequences ADD COLUMN prefix TEXT DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_sequences' AND column_name = 'suffix') THEN
        ALTER TABLE public.fiscal_sequences ADD COLUMN suffix TEXT DEFAULT '';
    END IF;
    
    -- Update existing columns to ensure they have correct defaults
    -- Update current_number to default to 0 instead of 1
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_sequences' AND column_name = 'current_number') THEN
        ALTER TABLE public.fiscal_sequences ALTER COLUMN current_number SET DEFAULT 0;
    END IF;
    
    -- Remove old columns that might conflict (if they exist)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_sequences' AND column_name = 'sequence_number') THEN
        ALTER TABLE public.fiscal_sequences DROP COLUMN sequence_number;
    END IF;
    
    -- Handle dependent views before dropping series column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_sequences' AND column_name = 'series') THEN
        -- Drop any dependent views first
        DROP VIEW IF EXISTS fiscal_sequences_status CASCADE;
        
        -- If 'series' column exists, migrate its data to 'prefix' and then drop it
        UPDATE public.fiscal_sequences SET prefix = COALESCE(series, '') WHERE prefix IS NULL OR prefix = '';
        ALTER TABLE public.fiscal_sequences DROP COLUMN series;
        
        -- Recreate the status view with new schema
        CREATE OR REPLACE VIEW fiscal_sequences_status AS
        SELECT 
            fs.id,
            fs.user_id,
            fs.fiscal_document_type_id,
            fs.prefix,
            fs.suffix,
            fs.current_number,
            fs.start_number,
            fs.max_number,
            fs.padding_length,
            fs.is_active,
            fdt.code as document_type_code,
            fdt.name as document_type_name,
            (fs.max_number - fs.current_number) as available_numbers,
            CASE 
                WHEN fs.current_number >= fs.max_number THEN 'agotada'
                WHEN (fs.max_number - fs.current_number) <= 100 THEN 'por_agotar'
                ELSE 'disponible'
            END as status,
            CONCAT(fs.prefix, LPAD((fs.current_number + 1)::text, fs.padding_length, '0'), fs.suffix) as next_number
        FROM fiscal_sequences fs
        LEFT JOIN fiscal_document_types fdt ON fs.fiscal_document_type_id = fdt.id;
        
        -- Grant permissions on the recreated view
        GRANT SELECT ON fiscal_sequences_status TO authenticated;
    END IF;
    
    -- Handle column rename: document_type_id -> fiscal_document_type_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_sequences' AND column_name = 'document_type_id') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_sequences' AND column_name = 'fiscal_document_type_id') THEN
        -- Rename the column
        ALTER TABLE public.fiscal_sequences RENAME COLUMN document_type_id TO fiscal_document_type_id;
    END IF;
    
    -- If neither column exists, add the correct one
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_sequences' AND column_name = 'fiscal_document_type_id') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_sequences' AND column_name = 'document_type_id') THEN
        ALTER TABLE public.fiscal_sequences ADD COLUMN fiscal_document_type_id UUID REFERENCES public.fiscal_document_types(id) ON DELETE CASCADE NOT NULL;
    END IF;
    
    -- Ensure the correct foreign key relationship exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'fiscal_sequences' AND constraint_name = 'fiscal_sequences_fiscal_document_type_id_fkey') THEN
        -- Add the correct foreign key if it doesn't exist
        ALTER TABLE public.fiscal_sequences ADD CONSTRAINT fiscal_sequences_fiscal_document_type_id_fkey 
        FOREIGN KEY (fiscal_document_type_id) REFERENCES public.fiscal_document_types(id) ON DELETE CASCADE;
    END IF;
    
    -- Ensure unique constraint exists with correct column names
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'fiscal_sequences' AND constraint_name = 'fiscal_sequences_user_fiscal_type_unique') THEN
        ALTER TABLE public.fiscal_sequences ADD CONSTRAINT fiscal_sequences_user_fiscal_type_unique 
        UNIQUE(user_id, fiscal_document_type_id);
    END IF;
    
END $$;

-- Update any existing sequences to have proper default values
UPDATE public.fiscal_sequences 
SET 
    start_number = COALESCE(start_number, 1),
    max_number = COALESCE(max_number, 10000),
    padding_length = COALESCE(padding_length, 8),
    prefix = COALESCE(prefix, ''),
    suffix = COALESCE(suffix, '')
WHERE 
    start_number IS NULL 
    OR max_number IS NULL 
    OR padding_length IS NULL 
    OR prefix IS NULL 
    OR suffix IS NULL;

-- Ensure all sequences have reasonable values
UPDATE public.fiscal_sequences 
SET current_number = 0 
WHERE current_number < 0;

UPDATE public.fiscal_sequences 
SET start_number = 1 
WHERE start_number < 1;

UPDATE public.fiscal_sequences 
SET max_number = 10000 
WHERE max_number < start_number;

-- Insert default fiscal document types if they don't exist for any user
-- This ensures that the fiscal document types exist before sequences try to reference them
INSERT INTO public.fiscal_document_types (user_id, code, name, description, is_active)
SELECT DISTINCT 
    u.id as user_id,
    dt.code,
    dt.name,
    dt.description,
    true as is_active
FROM public.users u
CROSS JOIN (
    VALUES 
        ('B01', 'Factura de Crédito Fiscal', 'Factura con valor fiscal para contribuyentes'),
        ('B02', 'Factura de Consumidor Final', 'Factura para consumidores finales'),
        ('B15', 'Factura Gubernamental', 'Factura para entidades gubernamentales')
) AS dt(code, name, description)
WHERE NOT EXISTS (
    SELECT 1 FROM public.fiscal_document_types fdt 
    WHERE fdt.user_id = u.id AND fdt.code = dt.code
)
ON CONFLICT (user_id, code) DO NOTHING;

-- Create basic sequences for users who don't have them
-- This will create default sequences for each fiscal document type
INSERT INTO public.fiscal_sequences (
    user_id, 
    fiscal_document_type_id, 
    prefix, 
    suffix, 
    current_number, 
    start_number, 
    max_number, 
    padding_length, 
    is_active
)
SELECT 
    fdt.user_id,
    fdt.id as fiscal_document_type_id,
    fdt.code as prefix,
    '' as suffix,
    0 as current_number,
    1 as start_number,
    10000 as max_number,
    8 as padding_length,
    true as is_active
FROM public.fiscal_document_types fdt
WHERE NOT EXISTS (
    SELECT 1 FROM public.fiscal_sequences fs 
    WHERE fs.user_id = fdt.user_id AND fs.fiscal_document_type_id = fdt.id
)
AND fdt.is_active = true
ON CONFLICT (user_id, fiscal_document_type_id) DO NOTHING;