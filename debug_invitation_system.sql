-- =====================================================
-- SCRIPT DE DEBUG PARA SISTEMA DE INVITACIONES
-- =====================================================

-- 1. VERIFICAR QUE EXISTEN LAS FUNCIONES RPC
SELECT 
    'FUNCIONES RPC DISPONIBLES' as seccion,
    routine_name as funcion,
    routine_type as tipo,
    data_type as tipo_retorno
FROM information_schema.routines 
WHERE routine_name LIKE '%invitation%' 
AND routine_type = 'FUNCTION'
AND routine_schema = 'public'
ORDER BY routine_name;

-- 2. VERIFICAR QUE EXISTEN LAS TABLAS
SELECT 
    'TABLAS DISPONIBLES' as seccion,
    table_name as tabla,
    table_type as tipo
FROM information_schema.tables 
WHERE table_name LIKE '%organization%' 
AND table_schema = 'public'
ORDER BY table_name;

-- 3. VERIFICAR DATOS EN ORGANIZACIONES
SELECT 
    'ORGANIZACIONES' as seccion,
    id,
    name,
    slug,
    created_at
FROM organizations
ORDER BY created_at;

-- 4. VERIFICAR DATOS EN MIEMBROS
SELECT 
    'MIEMBROS' as seccion,
    om.id,
    om.organization_id,
    om.user_id,
    om.role,
    u.email as user_email,
    o.name as organization_name
FROM organization_members om
JOIN users u ON om.user_id = u.id
JOIN organizations o ON om.organization_id = o.id
ORDER BY om.created_at;

-- 5. VERIFICAR INVITACIONES EXISTENTES
SELECT 
    'INVITACIONES' as seccion,
    id,
    organization_id,
    email,
    role,
    token,
    expires_at,
    accepted_at,
    created_at
FROM organization_invitations
ORDER BY created_at DESC;

-- 6. PROBAR FUNCIÓN DE GENERACIÓN DE TOKEN
SELECT 
    'TEST GENERAR TOKEN' as seccion,
    generate_invitation_token() as token_generado;

-- 7. PROBAR FUNCIÓN DE CREACIÓN DE INVITACIÓN
-- Necesita un organization_id válido
DO $$
DECLARE
    org_id UUID;
    test_result JSON;
BEGIN
    -- Obtener una organización existente
    SELECT id INTO org_id FROM organizations LIMIT 1;
    
    IF org_id IS NOT NULL THEN
        -- Probar crear invitación
        SELECT create_organization_invitation(
            org_id,
            'test@example.com',
            'member'
        ) INTO test_result;
        
        RAISE NOTICE 'Resultado de crear invitación: %', test_result;
    ELSE
        RAISE NOTICE 'No hay organizaciones disponibles para el test';
    END IF;
END $$;

-- 8. VERIFICAR ÚLTIMAS INVITACIONES CREADAS
SELECT 
    'INVITACIONES RECIENTES' as seccion,
    id,
    email,
    token,
    expires_at,
    created_at
FROM organization_invitations
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 9. PROBAR FUNCIÓN GET_INVITATION_BY_TOKEN CON TOKEN REAL
-- Esto se debe ejecutar después de crear una invitación
DO $$
DECLARE
    test_token TEXT;
    test_result JSON;
BEGIN
    -- Obtener un token de invitación existente
    SELECT token INTO test_token 
    FROM organization_invitations 
    WHERE accepted_at IS NULL 
    AND expires_at > NOW()
    LIMIT 1;
    
    IF test_token IS NOT NULL THEN
        -- Probar obtener invitación
        SELECT get_invitation_by_token(test_token) INTO test_result;
        
        RAISE NOTICE 'Resultado de obtener invitación: %', test_result;
    ELSE
        RAISE NOTICE 'No hay invitaciones válidas para el test';
    END IF;
END $$;