-- Fix Missing Institution and Department IDs for Users
-- This script identifies users with NULL institution_id or department_id
-- and provides a template to update them manually after fetching data from JKKN API

-- STEP 1: Identify problematic users
-- Run this to see which users need fixing
SELECT
  id,
  email,
  full_name,
  role,
  institution_id,
  department_id,
  jkkn_user_id,
  created_at
FROM users
WHERE
  (institution_id IS NULL OR department_id IS NULL)
  AND role NOT IN ('super_admin')  -- Super admins don't need institution/department
ORDER BY created_at DESC;

-- CURRENT PROBLEMATIC USERS (as of last check):
-- 1. thankamaniammal@jkkn.ac.in (faculty) - NULL institution_id, NULL department_id
-- 2. automation@jkkn.ac.in (mentor) - NULL institution_id, NULL department_id
-- 3. vijaythiyagarajan.j@jkkn.ac.in (hod) - NULL institution_id, NULL department_id
-- 4. deerdeepak@jkkn.ac.in (faculty) - NULL institution_id, NULL department_id
-- 5. faculty@jkkn.ac.in (mentor) - NULL institution_id, NULL department_id
-- 6. principal@jkkn.ac.in (institution_admin) - Has institution_id but NULL department_id (OK for admin)

-- STEP 2: Fetch user data from JKKN API
-- You need to:
-- 1. Call the JKKN API /api-management/staff endpoint with each user's jkkn_user_id
-- 2. Get their institution_id and department_id from the API response
-- 3. Update the SQL below with the correct values

-- STEP 3: Update users with correct institution and department
-- TEMPLATE - Replace <institution_id> and <department_id> with actual values from JKKN API

-- Example update for a single user:
-- UPDATE users
-- SET
--   institution_id = '<institution_id_from_jkkn_api>',
--   department_id = '<department_id_from_jkkn_api>',
--   updated_at = NOW()
-- WHERE email = 'thankamaniammal@jkkn.ac.in';

-- ALTERNATIVE APPROACH: Fetch from JKKN API and auto-populate
-- If the JKKN API returns institution_id and department_id in the user/staff response,
-- you can create a migration that:
-- 1. Fetches all users with NULL institution_id
-- 2. For each user, calls JKKN API with their jkkn_user_id
-- 3. Updates the local database with the fetched values

-- VERIFICATION QUERY
-- Run this after updates to verify all users now have institution_id
SELECT
  role,
  COUNT(*) as total_users,
  COUNT(institution_id) as users_with_institution,
  COUNT(*) - COUNT(institution_id) as users_missing_institution
FROM users
WHERE role NOT IN ('super_admin')
GROUP BY role;

-- NOTES:
-- 1. Super admins don't need institution_id or department_id (they have global access)
-- 2. Institution admins need institution_id but department_id can be NULL
-- 3. All other roles (mentor, faculty, hod, student) MUST have both institution_id and department_id
-- 4. Without proper institution_id, access control filters will exclude these users' data
-- 5. This is causing the "missing data" issue reported by the user
