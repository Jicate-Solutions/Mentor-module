-- Manual Fix for Users with NULL institution_id
-- These users don't exist in JKKN API, so we'll assign them manually
-- Run this in Supabase SQL Editor

-- Get the most common institution to use as default
-- You can change this to the appropriate institution ID

-- Option 1: Update all to the same institution (most common one)
UPDATE users
SET
  institution_id = (
    SELECT institution_id
    FROM users
    WHERE institution_id IS NOT NULL
    GROUP BY institution_id
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ),
  department_id = (
    -- Use a default department from that institution
    SELECT department_id
    FROM users
    WHERE institution_id = (
      SELECT institution_id
      FROM users
      WHERE institution_id IS NOT NULL
      GROUP BY institution_id
      ORDER BY COUNT(*) DESC
      LIMIT 1
    )
    AND department_id IS NOT NULL
    LIMIT 1
  ),
  updated_at = NOW()
WHERE (institution_id IS NULL OR department_id IS NULL)
AND role NOT IN ('super_admin')
AND email IN (
  'kalaranjeni.n@jkkn.ac.in',
  'faculty@jkkn.ac.in',
  'automation@jkkn.ac.in',
  'hodoralpathology@jkkn.ac.in',
  'vijaythiyagarajan.j@jkkn.ac.in',
  'drerdeepak@jkkn.ac.in',
  'thankamaniammal@jkkn.ac.in'
);

-- Option 2: Update principal separately (institution_admin can have NULL department)
UPDATE users
SET
  institution_id = COALESCE(
    institution_id,
    (SELECT institution_id FROM users WHERE institution_id IS NOT NULL GROUP BY institution_id ORDER BY COUNT(*) DESC LIMIT 1)
  ),
  updated_at = NOW()
WHERE email = 'principal@jkkn.ac.in'
AND role = 'institution_admin';

-- Verify the updates
SELECT
  email,
  role,
  institution_id,
  department_id,
  updated_at
FROM users
WHERE email IN (
  'kalaranjeni.n@jkkn.ac.in',
  'faculty@jkkn.ac.in',
  'principal@jkkn.ac.in',
  'automation@jkkn.ac.in',
  'hodoralpathology@jkkn.ac.in',
  'vijaythiyagarajan.j@jkkn.ac.in',
  'drerdeepak@jkkn.ac.in',
  'thankamaniammal@jkkn.ac.in'
)
ORDER BY role, email;
