-- Seed mentor record for manually-created test account teststaff@jkkn.ac.in.
-- This account is not in the JKKN HR API so /api/admin/mentors/sync never created
-- the mentors row.  This migration is idempotent: it only inserts when no row exists.

INSERT INTO mentors (user_id, institution_id, department_id, designation, is_active)
SELECT
  u.id,
  COALESCE(u.institution_id, ''),
  COALESCE(u.department_id, ''),
  'Faculty',
  true
FROM users u
WHERE u.email = 'teststaff@jkkn.ac.in'
  AND NOT EXISTS (
    SELECT 1 FROM mentors m WHERE m.user_id = u.id
  );
