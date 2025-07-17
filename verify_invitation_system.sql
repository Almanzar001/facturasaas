-- ===============================================================
-- VERIFICATION SCRIPT FOR INVITATION SYSTEM
-- Run this after executing the migration to verify everything works
-- ===============================================================

-- 1. Check if organization_invitations table exists
SELECT 
    'organization_invitations table' as component,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'organization_invitations'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- 2. Check if all required functions exist
SELECT 
    proname as function_name,
    '✅ EXISTS' as status
FROM pg_proc 
WHERE proname IN (
    'create_organization_invitation',
    'accept_organization_invitation', 
    'get_invitation_by_token',
    'cancel_organization_invitation',
    'cleanup_expired_invitations'
)
ORDER BY proname;

-- 3. Check function return types
SELECT 
    proname as function_name,
    pg_type.typname as return_type
FROM pg_proc 
JOIN pg_type ON pg_proc.prorettype = pg_type.oid
WHERE proname LIKE '%invitation%'
ORDER BY proname;

-- 4. Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'organization_invitations'
ORDER BY ordinal_position;

-- 5. Check indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename = 'organization_invitations'
ORDER BY indexname;

-- 6. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'organization_invitations'
ORDER BY policyname;

-- 7. Test function calls (optional - only if you have test data)
/*
-- Example test calls (uncomment if you want to test):

-- Test create invitation (replace with actual org_id)
SELECT create_organization_invitation(
    'YOUR_ORG_ID_HERE'::UUID,
    'test@example.com',
    'member'
);

-- Test get invitation by token (replace with actual token)
SELECT get_invitation_by_token('your_token_here');

-- Test cleanup expired invitations
SELECT cleanup_expired_invitations();
*/

-- 8. Summary report
SELECT 
    'INVITATION SYSTEM VERIFICATION' as title,
    'Run all queries above to verify system is working' as instruction,
    'If all functions show ✅ EXISTS, the system is ready' as success_condition;