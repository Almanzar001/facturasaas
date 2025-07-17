-- ACTUALIZAR ESQUEMA EXISTENTE
-- Para cuando ya tienes algunas tablas creadas

-- =====================================================
-- 1. VERIFICAR Y CREAR TABLAS FALTANTES
-- =====================================================

-- Crear tabla users si no existe
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  company_name VARCHAR(255),
  role_id UUID,
  current_organization_id UUID,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla organizations si no existe
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  tax_id VARCHAR(50),
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla organization_members si no existe
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(organization_id, user_id)
);

-- Agregar foreign key a users si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_role_id_fkey'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_role_id_fkey 
        FOREIGN KEY (role_id) REFERENCES roles(id);
    END IF;
END $$;

-- =====================================================
-- 2. ACTUALIZAR TABLA ROLES
-- =====================================================

-- Agregar columnas faltantes a roles
DO $$
BEGIN
    -- permissions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'permissions'
    ) THEN
        ALTER TABLE roles ADD COLUMN permissions JSONB DEFAULT '[]';
    END IF;
    
    -- description
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'description'
    ) THEN
        ALTER TABLE roles ADD COLUMN description TEXT;
    END IF;
    
    -- is_active
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE roles ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- created_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE roles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- updated_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE roles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- =====================================================
-- 3. INSERTAR ROLES BÁSICOS
-- =====================================================

INSERT INTO roles (name, description, permissions, is_active, created_at, updated_at) VALUES 
  ('super_admin', 'Super Administrador', '[]', true, NOW(), NOW()),
  ('admin', 'Administrador', '[]', true, NOW(), NOW()),
  ('viewer', 'Visualizador', '[]', true, NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- =====================================================
-- 4. CREAR FUNCIÓN RPC
-- =====================================================

CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT,
  user_company_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  default_role_id UUID;
BEGIN
  -- Obtener rol viewer por defecto
  SELECT id INTO default_role_id FROM roles WHERE name = 'viewer' LIMIT 1;
  
  -- Insertar o actualizar perfil
  INSERT INTO users (
    id, email, full_name, company_name, role_id, is_active, created_at, updated_at
  )
  VALUES (
    user_id, user_email, user_full_name, user_company_name, default_role_id, true, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    company_name = EXCLUDED.company_name,
    updated_at = NOW();
END;
$$;

-- =====================================================
-- 5. DESHABILITAR RLS PARA DESARROLLO
-- =====================================================

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. VERIFICACIÓN
-- =====================================================

SELECT 'Esquema actualizado correctamente' as status;
SELECT 'Roles disponibles:' as info;
SELECT name, description FROM roles;