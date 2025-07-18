-- =====================================================
-- SOLUCIÓN DEFINITIVA PARA SISTEMA DE INVITACIONES
-- =====================================================

-- 1. ELIMINAR TODO LO RELACIONADO CON INVITACIONES
DROP TABLE IF EXISTS organization_invitations CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Eliminar funciones
DROP FUNCTION IF EXISTS create_organization_invitation CASCADE;
DROP FUNCTION IF EXISTS accept_organization_invitation CASCADE;
DROP FUNCTION IF EXISTS get_invitation_by_token CASCADE;
DROP FUNCTION IF EXISTS cancel_organization_invitation CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_invitations CASCADE;
DROP FUNCTION IF EXISTS generate_invitation_token CASCADE;

-- 2. CREAR TABLA DE ORGANIZACIONES
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. CREAR TABLA DE MIEMBROS
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(organization_id, user_id)
);

-- 4. CREAR TABLA DE INVITACIONES
CREATE TABLE organization_invitations (
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

-- 5. CREAR ÍNDICES
CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX idx_organization_invitations_org_id ON organization_invitations(organization_id);
CREATE INDEX idx_organization_invitations_token ON organization_invitations(token);
CREATE INDEX idx_organization_invitations_email ON organization_invitations(email);

-- 6. CREAR FUNCIÓN DE GENERACIÓN DE TOKEN
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FUNCIÓN: CREAR INVITACIÓN
CREATE OR REPLACE FUNCTION create_organization_invitation(
    org_id UUID,
    invite_email TEXT,
    invite_role TEXT DEFAULT 'member'
)
RETURNS JSON AS $$
DECLARE
    invitation_id UUID;
    invitation_token TEXT;
    invitation_expires_at TIMESTAMP WITH TIME ZONE;
    current_user_id UUID;
    org_name TEXT;
BEGIN
    -- Obtener ID del usuario actual
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no autenticado'
        );
    END IF;
    
    -- Verificar que la organización existe
    SELECT name INTO org_name FROM organizations WHERE id = org_id;
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Organización no encontrada'
        );
    END IF;
    
    -- Asegurar que el usuario actual es miembro de la organización
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (org_id, current_user_id, 'owner')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
    
    -- Cancelar invitaciones pendientes anteriores
    DELETE FROM organization_invitations 
    WHERE organization_id = org_id 
    AND email = LOWER(TRIM(invite_email))
    AND accepted_at IS NULL;
    
    -- Generar token y fecha de expiración
    invitation_token := generate_invitation_token();
    invitation_expires_at := NOW() + INTERVAL '7 days';
    
    -- Crear la invitación
    INSERT INTO organization_invitations (
        organization_id,
        email,
        role,
        token,
        invited_by,
        expires_at
    ) VALUES (
        org_id,
        LOWER(TRIM(invite_email)),
        invite_role,
        invitation_token,
        current_user_id,
        invitation_expires_at
    ) RETURNING id INTO invitation_id;
    
    RETURN json_build_object(
        'success', true,
        'invitation_id', invitation_id,
        'token', invitation_token,
        'expires_at', invitation_expires_at,
        'organization_name', org_name,
        'email', LOWER(TRIM(invite_email)),
        'role', invite_role
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. FUNCIÓN: OBTENER INVITACIÓN POR TOKEN
CREATE OR REPLACE FUNCTION get_invitation_by_token(
    invitation_token TEXT
)
RETURNS JSON AS $$
DECLARE
    invitation_record RECORD;
BEGIN
    -- Buscar la invitación con datos relacionados
    SELECT 
        i.*,
        o.name as org_name,
        o.slug as org_slug,
        u.email as invited_by_email,
        COALESCE(u.full_name, u.email) as invited_by_name
    INTO invitation_record
    FROM organization_invitations i
    JOIN organizations o ON i.organization_id = o.id
    JOIN users u ON i.invited_by = u.id
    WHERE i.token = invitation_token;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invitación no encontrada'
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'invitation', json_build_object(
            'id', invitation_record.id,
            'email', invitation_record.email,
            'role', invitation_record.role,
            'token', invitation_record.token,
            'expires_at', invitation_record.expires_at,
            'accepted_at', invitation_record.accepted_at,
            'created_at', invitation_record.created_at,
            'organization', json_build_object(
                'id', invitation_record.organization_id,
                'name', invitation_record.org_name,
                'slug', invitation_record.org_slug
            ),
            'invited_by_user', json_build_object(
                'id', invitation_record.invited_by,
                'email', invitation_record.invited_by_email,
                'name', invitation_record.invited_by_name
            )
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. FUNCIÓN: ACEPTAR INVITACIÓN
CREATE OR REPLACE FUNCTION accept_organization_invitation(
    invitation_token TEXT
)
RETURNS JSON AS $$
DECLARE
    invitation_record RECORD;
    current_user_id UUID;
    current_user_email TEXT;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no autenticado'
        );
    END IF;
    
    SELECT email INTO current_user_email FROM users WHERE id = current_user_id;
    
    SELECT * INTO invitation_record 
    FROM organization_invitations 
    WHERE token = invitation_token 
    AND accepted_at IS NULL 
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invitación no encontrada, expirada o ya aceptada'
        );
    END IF;
    
    -- Agregar como miembro
    INSERT INTO organization_members (
        organization_id,
        user_id,
        role
    ) VALUES (
        invitation_record.organization_id,
        current_user_id,
        invitation_record.role
    ) ON CONFLICT (organization_id, user_id) DO NOTHING;
    
    -- Marcar invitación como aceptada
    UPDATE organization_invitations 
    SET accepted_at = NOW(), updated_at = NOW()
    WHERE id = invitation_record.id;
    
    RETURN json_build_object(
        'success', true,
        'organization_id', invitation_record.organization_id,
        'role', invitation_record.role,
        'joined_at', NOW()
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. FUNCIÓN: CANCELAR INVITACIÓN
CREATE OR REPLACE FUNCTION cancel_organization_invitation(
    invitation_id UUID
)
RETURNS JSON AS $$
BEGIN
    DELETE FROM organization_invitations WHERE id = invitation_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Invitación cancelada'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. FUNCIÓN: LIMPIAR INVITACIONES EXPIRADAS
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM organization_invitations 
    WHERE expires_at < NOW() 
    AND accepted_at IS NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. CONFIGURAR RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para desarrollo
CREATE POLICY "Allow all for organizations" ON organizations FOR ALL USING (true);
CREATE POLICY "Allow all for members" ON organization_members FOR ALL USING (true);
CREATE POLICY "Allow all for invitations" ON organization_invitations FOR ALL USING (true);

-- 13. CREAR ORGANIZACIÓN POR DEFECTO
INSERT INTO organizations (name, slug, description)
VALUES ('Organización Principal', 'principal', 'Organización principal del sistema');

-- 14. ASIGNAR USUARIOS EXISTENTES
INSERT INTO organization_members (organization_id, user_id, role)
SELECT 
    (SELECT id FROM organizations WHERE slug = 'principal'),
    u.id,
    'owner'
FROM users u
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- 15. MOSTRAR RESUMEN
SELECT 
    'SISTEMA DE INVITACIONES INSTALADO' as status,
    (SELECT COUNT(*) FROM organizations) as organizaciones,
    (SELECT COUNT(*) FROM organization_members) as miembros,
    (SELECT COUNT(*) FROM organization_invitations) as invitaciones;

-- 16. PROBAR FUNCIONES
SELECT 
    'FUNCIONES DISPONIBLES' as seccion,
    routine_name as funcion
FROM information_schema.routines 
WHERE routine_name LIKE '%invitation%' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;