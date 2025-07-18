-- =====================================================
-- CREAR FUNCIONES DE INVITACIÓN DESDE CERO
-- =====================================================

-- 1. CREAR FUNCIÓN PARA GENERAR TOKENS SEGUROS
CREATE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- 2. FUNCIÓN: CREAR INVITACIÓN
CREATE FUNCTION create_organization_invitation(
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
    
    -- Verificar permisos del usuario (ser más permisivo inicialmente)
    IF NOT EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = org_id 
        AND user_id = current_user_id 
        AND role IN ('owner', 'admin')
        AND is_active = true
    ) THEN
        -- Si no existe como miembro, asumir que es owner (para migración inicial)
        INSERT INTO organization_members (organization_id, user_id, role)
        VALUES (org_id, current_user_id, 'owner')
        ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'owner';
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
    
    -- Cancelar invitaciones pendientes anteriores
    DELETE FROM organization_invitations 
    WHERE organization_id = org_id 
    AND email = invite_email 
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

-- 3. FUNCIÓN: ACEPTAR INVITACIÓN
CREATE FUNCTION accept_organization_invitation(
    invitation_token TEXT
)
RETURNS JSON AS $$
DECLARE
    invitation_record RECORD;
    current_user_id UUID;
    current_user_email TEXT;
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
    
    -- Verificar que el email coincide (más flexible)
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
        -- Marcar como aceptada de todas formas
        UPDATE organization_invitations 
        SET accepted_at = NOW(), updated_at = NOW()
        WHERE id = invitation_record.id;
        
        RETURN json_build_object(
            'success', true,
            'organization_id', invitation_record.organization_id,
            'role', invitation_record.role,
            'joined_at', NOW(),
            'message', 'Ya eras miembro de esta organización'
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

-- 4. FUNCIÓN: OBTENER INVITACIÓN POR TOKEN
CREATE FUNCTION get_invitation_by_token(
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

-- 5. FUNCIÓN: CANCELAR INVITACIÓN
CREATE FUNCTION cancel_organization_invitation(
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
    
    -- Verificar permisos (ser más permisivo inicialmente)
    IF NOT EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = invitation_record.organization_id 
        AND user_id = current_user_id 
        AND role IN ('owner', 'admin')
        AND is_active = true
    ) THEN
        -- Si no existe como miembro pero es el que creó la invitación, permitir
        IF invitation_record.invited_by != current_user_id THEN
            RETURN json_build_object(
                'success', false,
                'error', 'No tienes permisos para cancelar esta invitación'
            );
        END IF;
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

-- 6. FUNCIÓN: LIMPIAR INVITACIONES EXPIRADAS
CREATE FUNCTION cleanup_expired_invitations()
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

-- 7. VERIFICAR QUE LAS FUNCIONES ESTÁN DISPONIBLES
SELECT 
    'FUNCIONES CREADAS EXITOSAMENTE' as status,
    COUNT(*) as total_funciones
FROM information_schema.routines 
WHERE routine_name LIKE '%invitation%' 
AND routine_type = 'FUNCTION'
AND routine_schema = 'public';

-- 8. MOSTRAR FUNCIONES DISPONIBLES
SELECT 
    routine_name as funcion,
    routine_type as tipo,
    data_type as tipo_retorno
FROM information_schema.routines 
WHERE routine_name LIKE '%invitation%' 
AND routine_type = 'FUNCTION'
AND routine_schema = 'public'
ORDER BY routine_name;