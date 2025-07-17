-- Configuración completa de la base de datos
-- Ejecutar en SQL Editor de Supabase

-- 1. Crear función RPC para crear perfil de usuario
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
BEGIN
  -- Insertar o actualizar el perfil del usuario
  INSERT INTO users (
    id,
    email,
    full_name,
    company_name,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    user_id,
    user_email,
    user_full_name,
    user_company_name,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    company_name = EXCLUDED.company_name,
    updated_at = NOW();
END;
$$;

-- 2. Configurar políticas RLS más permisivas para desarrollo

-- Deshabilitar RLS temporalmente para configuración
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;

-- O si prefieres mantener RLS, crear políticas permisivas:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS "Users can read own data" ON users;
-- CREATE POLICY "Users can read own data" ON users FOR ALL USING (true);

-- DROP POLICY IF EXISTS "Users can manage organizations" ON organizations;
-- CREATE POLICY "Users can manage organizations" ON organizations FOR ALL USING (true);

-- DROP POLICY IF EXISTS "Users can manage organization members" ON organization_members;
-- CREATE POLICY "Users can manage organization members" ON organization_members FOR ALL USING (true);

-- DROP POLICY IF EXISTS "Users can read roles" ON roles;
-- CREATE POLICY "Users can read roles" ON roles FOR SELECT USING (true);

-- 3. Insertar roles básicos si no existen
INSERT INTO roles (name, description, permissions, is_active, created_at, updated_at)
VALUES 
  ('super_admin', 'Super Administrador', '[]', true, NOW(), NOW()),
  ('admin', 'Administrador', '[]', true, NOW(), NOW()),
  ('viewer', 'Visualizador', '[]', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 4. Crear trigger para auto-crear perfil de usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  default_role_id UUID;
BEGIN
  -- Obtener el rol viewer por defecto
  SELECT id INTO default_role_id FROM roles WHERE name = 'viewer' LIMIT 1;
  
  -- Crear perfil de usuario
  INSERT INTO users (
    id,
    email,
    full_name,
    role_id,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    default_role_id,
    true,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5. Verificar que las tablas existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    RAISE EXCEPTION 'Tabla users no existe. Ejecuta primero las migraciones.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    RAISE EXCEPTION 'Tabla organizations no existe. Ejecuta primero las migraciones.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
    RAISE EXCEPTION 'Tabla roles no existe. Ejecuta primero las migraciones.';
  END IF;
END $$;

-- 6. Mostrar estado final
SELECT 'Configuración completada' as status;
SELECT 'Roles disponibles:' as info;
SELECT name, description FROM roles;