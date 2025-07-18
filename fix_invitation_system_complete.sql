-- =====================================================
-- SISTEMA COMPLETO DE INVITACIONES PARA FACTURA SAAS
-- =====================================================

-- 1. CREAR TABLA DE ORGANIZACIONES
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. CREAR TABLA DE MIEMBROS DE ORGANIZACIÓN
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(organization_id, user_id)
);

-- 3. CREAR TABLA DE INVITACIONES
CREATE TABLE IF NOT EXISTS organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'member')),
    token VARCHAR(64) UNIQUE NOT NULL,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CREAR ÍNDICES PARA OPTIMIZAR CONSULTAS
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_org_id ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_expires_at ON organization_invitations(expires_at);

-- 5. CREAR FUNCIÓN PARA GENERAR TOKENS SEGUROS
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- 6. FUNCIÓN: CREAR INVITACIÓN
CREATE OR REPLACE FUNCTION create_organization_invitation(
    org_id UUID,
    invite_email VARCHAR(255),
    invite_role VARCHAR(20) DEFAULT 'member'
)
RETURNS JSON AS $$
DECLARE
    invitation_id UUID;
    invitation_token VARCHAR(64);
    invitation_expires_at TIMESTAMP WITH TIME ZONE;
    current_user_id UUID;
    org_name VARCHAR(255);
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
    
    -- Verificar permisos del usuario
    IF NOT EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = org_id 
        AND user_id = current_user_id 
        AND role IN ('owner', 'admin')
        AND is_active = true
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No tienes permisos para invitar usuarios'
        );
    END IF;
    
    -- Verificar que el usuario no sea ya miembro
    IF EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = org_id 
        AND user_id = (SELECT id FROM users WHERE email = invite_email)
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'El usuario ya es miembro de esta organización'
        );
    END IF;
    
    -- Verificar que no haya invitación pendiente
    IF EXISTS (
        SELECT 1 FROM organization_invitations 
        WHERE organization_id = org_id 
        AND email = invite_email 
        AND accepted_at IS NULL 
        AND expires_at > NOW()
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Ya existe una invitación pendiente para este email'
        );
    END IF;
    
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
        'email', invite_email,
        'role', invite_role
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FUNCIÓN: ACEPTAR INVITACIÓN
CREATE OR REPLACE FUNCTION accept_organization_invitation(
    invitation_token VARCHAR(64)
)
RETURNS JSON AS $$
DECLARE
    invitation_record RECORD;
    current_user_id UUID;
    current_user_email VARCHAR(255);
BEGIN
    -- Obtener ID y email del usuario actual
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no autenticado'
        );
    END IF;
    
    -- Obtener email del usuario actual
    SELECT email INTO current_user_email FROM users WHERE id = current_user_id;
    
    -- Buscar la invitación
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
    
    -- Verificar que el email coincide
    IF LOWER(TRIM(current_user_email)) != LOWER(TRIM(invitation_record.email)) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Esta invitación no es para tu email'
        );
    END IF;
    
    -- Verificar que no sea ya miembro
    IF EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = invitation_record.organization_id 
        AND user_id = current_user_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Ya eres miembro de esta organización'
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
    );
    
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

-- 8. FUNCIÓN: OBTENER INVITACIÓN POR TOKEN
CREATE OR REPLACE FUNCTION get_invitation_by_token(
    invitation_token VARCHAR(64)
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
        u.full_name as invited_by_name
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

-- 9. FUNCIÓN: CANCELAR INVITACIÓN
CREATE OR REPLACE FUNCTION cancel_organization_invitation(
    invitation_id UUID
)
RETURNS JSON AS $$
DECLARE
    invitation_record RECORD;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no autenticado'
        );
    END IF;
    
    -- Buscar la invitación
    SELECT * INTO invitation_record 
    FROM organization_invitations 
    WHERE id = invitation_id 
    AND accepted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invitación no encontrada o ya aceptada'
        );
    END IF;
    
    -- Verificar permisos
    IF NOT EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = invitation_record.organization_id 
        AND user_id = current_user_id 
        AND role IN ('owner', 'admin')
        AND is_active = true
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No tienes permisos para cancelar esta invitación'
        );
    END IF;
    
    -- Eliminar la invitación
    DELETE FROM organization_invitations WHERE id = invitation_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Invitación cancelada exitosamente'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. FUNCIÓN: LIMPIAR INVITACIONES EXPIRADAS
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

-- 11. CREAR TRIGGERS PARA ACTUALIZAR timestamps
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para organizations
DROP TRIGGER IF EXISTS handle_organizations_updated_at ON organizations;
CREATE TRIGGER handle_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Trigger para organization_invitations
DROP TRIGGER IF EXISTS handle_organization_invitations_updated_at ON organization_invitations;
CREATE TRIGGER handle_organization_invitations_updated_at
    BEFORE UPDATE ON organization_invitations
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- 12. CONFIGURAR ROW LEVEL SECURITY (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Políticas para organizations
CREATE POLICY "Users can view organizations they belong to" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Políticas para organization_members
CREATE POLICY "Users can view members of their organizations" ON organization_members
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Políticas para organization_invitations
CREATE POLICY "Users can view invitations for their organizations" ON organization_invitations
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- 13. CREAR ORGANIZACIÓN POR DEFECTO Y ASIGNAR USUARIOS EXISTENTES
-- Insertar una organización por defecto
INSERT INTO organizations (name, slug, description)
VALUES ('Organización Principal', 'principal', 'Organización principal del sistema')
ON CONFLICT DO NOTHING;

-- Obtener el ID de la organización principal
DO $$
DECLARE
    org_id UUID;
    user_record RECORD;
BEGIN
    SELECT id INTO org_id FROM organizations WHERE slug = 'principal';
    
    -- Asignar todos los usuarios existentes a la organización principal como owners
    FOR user_record IN SELECT id FROM users LOOP
        INSERT INTO organization_members (organization_id, user_id, role)
        VALUES (org_id, user_record.id, 'owner')
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- 14. AGREGAR COLUMNA organization_id A TABLAS EXISTENTES
ALTER TABLE clients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- 15. ACTUALIZAR REGISTROS EXISTENTES CON organization_id
DO $$
DECLARE
    org_id UUID;
BEGIN
    SELECT id INTO org_id FROM organizations WHERE slug = 'principal';
    
    -- Actualizar todas las tablas existentes
    UPDATE clients SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE products SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE invoices SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE quotes SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE expenses SET organization_id = org_id WHERE organization_id IS NULL;
END $$;

-- 16. CREAR FUNCIÓN PARA OBTENER ORGANIZACIÓN ACTUAL DEL USUARIO
CREATE OR REPLACE FUNCTION get_user_current_organization()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id
    FROM organization_members
    WHERE user_id = auth.uid()
    AND is_active = true
    ORDER BY 
        CASE 
            WHEN role = 'owner' THEN 1
            WHEN role = 'admin' THEN 2
            ELSE 3
        END,
        joined_at
    LIMIT 1;
    
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mostrar resumen de la instalación
SELECT 
    'INSTALACIÓN COMPLETA' as status,
    (SELECT COUNT(*) FROM organizations) as total_organizations,
    (SELECT COUNT(*) FROM organization_members) as total_members,
    (SELECT COUNT(*) FROM organization_invitations) as total_invitations;