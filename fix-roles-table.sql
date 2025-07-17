-- Arreglar tabla de roles existente
-- Ejecutar en SQL Editor de Supabase

-- 1. Verificar estructura actual de la tabla roles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'roles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Agregar columna permissions si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' 
        AND column_name = 'permissions' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE roles ADD COLUMN permissions JSONB DEFAULT '[]';
    END IF;
END $$;

-- 3. Agregar otras columnas que puedan faltar
DO $$
BEGIN
    -- Verificar y agregar description si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' 
        AND column_name = 'description' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE roles ADD COLUMN description TEXT;
    END IF;
    
    -- Verificar y agregar is_active si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' 
        AND column_name = 'is_active' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE roles ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Verificar y agregar created_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' 
        AND column_name = 'created_at' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE roles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Verificar y agregar updated_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' 
        AND column_name = 'updated_at' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE roles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 4. Insertar roles básicos (ahora con todas las columnas)
INSERT INTO roles (name, description, permissions, is_active, created_at, updated_at) VALUES 
  ('super_admin', 'Super Administrador', '[]', true, NOW(), NOW()),
  ('admin', 'Administrador', '[]', true, NOW(), NOW()),
  ('viewer', 'Visualizador', '[]', true, NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 5. Verificar resultado final
SELECT 'Tabla roles actualizada correctamente' as status;
SELECT * FROM roles;