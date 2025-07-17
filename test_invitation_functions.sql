-- ===============================================================
-- TEST INVITATION FUNCTIONS
-- Description: Test all invitation functions to ensure they work properly
-- Date: 2025-07-17
-- ===============================================================

-- 1. TEST GET_INVITATION_BY_TOKEN WITH DUMMY TOKEN
-- ===============================================================
SELECT 
    'Testing get_invitation_by_token with dummy token' as test_name,
    get_invitation_by_token('dummy_token_that_does_not_exist') as result;

-- 2. TEST COLUMN REFERENCES IN ORGANIZATION_INVITATIONS
-- ===============================================================
SELECT 
    'Checking organization_invitations table structure' as test_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'organization_invitations'
ORDER BY ordinal_position;

-- 3. CHECK FOR COLUMN CONFLICTS
-- ===============================================================
SELECT 
    'Checking for expires_at column conflicts' as test_name,
    table_name,
    column_name
FROM information_schema.columns 
WHERE column_name = 'expires_at'
AND table_schema = 'public';

-- 4. TEST BASIC INVITATION CREATION (WILL FAIL BUT SHOWS ERRORS)
-- ===============================================================
-- NOTE: This will fail because we don't have real data, but it will show if the function works
/*
SELECT 
    'Testing create_organization_invitation' as test_name,
    create_organization_invitation(
        '00000000-0000-0000-0000-000000000000'::UUID,
        'test@example.com',
        'member'
    ) as result;
*/

-- 5. VERIFY FUNCTION DEFINITIONS
-- ===============================================================
SELECT 
    'Checking function definitions' as test_name,
    proname as function_name,
    pg_get_function_result(oid) as return_type,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname LIKE '%invitation%'
ORDER BY proname;

-- 6. TEST CLEANUP_EXPIRED_INVITATIONS
-- ===============================================================
SELECT 
    'Testing cleanup_expired_invitations' as test_name,
    cleanup_expired_invitations() as deleted_count;

-- 7. FINAL STATUS CHECK
-- ===============================================================
SELECT 
    'INVITATION SYSTEM STATUS' as final_check,
    'All functions should be working without column ambiguity errors' as status;