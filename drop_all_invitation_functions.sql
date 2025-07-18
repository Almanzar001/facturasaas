-- =====================================================
-- ELIMINAR TODAS LAS FUNCIONES DE INVITACIÓN
-- =====================================================

-- 1. ELIMINAR FUNCIÓN DE GENERACIÓN DE TOKENS
DROP FUNCTION IF EXISTS generate_invitation_token();

-- 2. ELIMINAR TODAS LAS VERSIONES DE create_organization_invitation
DROP FUNCTION IF EXISTS create_organization_invitation(UUID, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS create_organization_invitation(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_organization_invitation(UUID, VARCHAR(255), VARCHAR(20));
DROP FUNCTION IF EXISTS create_organization_invitation(UUID, TEXT, VARCHAR);
DROP FUNCTION IF EXISTS create_organization_invitation(UUID, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS create_organization_invitation(UUID, CHARACTER VARYING, CHARACTER VARYING);

-- 3. ELIMINAR TODAS LAS VERSIONES DE accept_organization_invitation
DROP FUNCTION IF EXISTS accept_organization_invitation(VARCHAR);
DROP FUNCTION IF EXISTS accept_organization_invitation(TEXT);
DROP FUNCTION IF EXISTS accept_organization_invitation(VARCHAR(64));
DROP FUNCTION IF EXISTS accept_organization_invitation(CHARACTER VARYING);

-- 4. ELIMINAR TODAS LAS VERSIONES DE get_invitation_by_token
DROP FUNCTION IF EXISTS get_invitation_by_token(VARCHAR);
DROP FUNCTION IF EXISTS get_invitation_by_token(TEXT);
DROP FUNCTION IF EXISTS get_invitation_by_token(VARCHAR(64));
DROP FUNCTION IF EXISTS get_invitation_by_token(CHARACTER VARYING);

-- 5. ELIMINAR TODAS LAS VERSIONES DE cancel_organization_invitation
DROP FUNCTION IF EXISTS cancel_organization_invitation(UUID);

-- 6. ELIMINAR TODAS LAS VERSIONES DE cleanup_expired_invitations
DROP FUNCTION IF EXISTS cleanup_expired_invitations();

-- 7. BUSCAR Y ELIMINAR CUALQUIER FUNCIÓN RESTANTE CON NOMBRES SIMILARES
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Buscar todas las funciones que contengan 'invitation' en el nombre
    FOR func_record IN
        SELECT routine_name, specific_name
        FROM information_schema.routines
        WHERE routine_name LIKE '%invitation%'
        AND routine_type = 'FUNCTION'
        AND routine_schema = 'public'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.specific_name || '() CASCADE';
    END LOOP;
END $$;

-- 8. VERIFICAR QUE NO QUEDAN FUNCIONES
SELECT 
    'FUNCIONES ELIMINADAS' as status,
    COUNT(*) as funciones_restantes
FROM information_schema.routines 
WHERE routine_name LIKE '%invitation%' 
AND routine_type = 'FUNCTION'
AND routine_schema = 'public';

-- 9. MOSTRAR FUNCIONES RESTANTES (DEBERÍA ESTAR VACÍO)
SELECT 
    routine_name as funcion_restante,
    specific_name as version
FROM information_schema.routines 
WHERE routine_name LIKE '%invitation%' 
AND routine_type = 'FUNCTION'
AND routine_schema = 'public';