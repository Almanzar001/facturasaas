-- =====================================================
-- CONFIGURACIÓN COMPLETA DEL SISTEMA DE INVITACIONES
-- EJECUTAR DESPUÉS DE fix_invitation_functions_clean.sql
-- =====================================================

-- 1. CREAR TABLA DE ORGANIZACIONES (SI NO EXISTE)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. CREAR TABLA DE MIEMBROS (SI NO EXISTE)
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(organization_id, user_id)
);

-- 3. CREAR TABLA DE INVITACIONES (SI NO EXISTE)
CREATE TABLE IF NOT EXISTS organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    token TEXT UNIQUE NOT NULL,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CREAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_org_id ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email ON organization_invitations(email);

-- 5. CREAR ORGANIZACIÓN POR DEFECTO
INSERT INTO organizations (name, slug, description)
VALUES ('Organización Principal', 'principal', 'Organización principal del sistema')
ON CONFLICT (slug) DO NOTHING;

-- 6. ASIGNAR USUARIOS EXISTENTES A LA ORGANIZACIÓN
DO $$
DECLARE
    org_id UUID;
    user_record RECORD;
BEGIN
    SELECT id INTO org_id FROM organizations WHERE slug = 'principal';
    
    FOR user_record IN SELECT id FROM users LOOP
        INSERT INTO organization_members (organization_id, user_id, role)
        VALUES (org_id, user_record.id, 'owner')
        ON CONFLICT (organization_id, user_id) DO NOTHING;
    END LOOP;
END $$;

-- 7. CONFIGURAR RLS PERMISIVO
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view members" ON organization_members;
DROP POLICY IF EXISTS "Users can view invitations" ON organization_invitations;

-- Crear políticas permisivas
CREATE POLICY "Users can view organizations" ON organizations FOR SELECT USING (true);
CREATE POLICY "Users can view members" ON organization_members FOR SELECT USING (true);
CREATE POLICY "Users can view invitations" ON organization_invitations FOR SELECT USING (true);

-- 8. CREAR TRIGGERS
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_organizations_updated_at ON organizations;
CREATE TRIGGER handle_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_organization_invitations_updated_at ON organization_invitations;
CREATE TRIGGER handle_organization_invitations_updated_at
    BEFORE UPDATE ON organization_invitations
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- 9. MOSTRAR RESUMEN
SELECT 
    'CONFIGURACIÓN COMPLETA EXITOSA' as status,
    (SELECT COUNT(*) FROM organizations) as organizaciones,
    (SELECT COUNT(*) FROM organization_members) as miembros,
    (SELECT COUNT(*) FROM organization_invitations) as invitaciones_activas;