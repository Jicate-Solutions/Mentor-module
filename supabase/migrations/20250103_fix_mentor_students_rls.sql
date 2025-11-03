-- Migration: Fix RLS policies for mentor-student assignment operations
-- Created: 2025-01-03
-- Purpose: Add INSERT, UPDATE, DELETE policies to enable student assignment functionality

-- ============================================================================
-- STUDENTS TABLE POLICIES
-- ============================================================================

-- Allow authenticated users to insert students (for assignment operations)
CREATE POLICY "Allow authenticated insert students" ON public.students
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update student records
CREATE POLICY "Allow authenticated update students" ON public.students
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- MENTOR_STUDENTS TABLE POLICIES
-- ============================================================================

-- Allow authenticated users to insert mentor-student assignments
CREATE POLICY "Allow authenticated insert assignments" ON public.mentor_students
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update assignments (for notes, status updates)
CREATE POLICY "Allow authenticated update assignments" ON public.mentor_students
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete assignments (unassign students)
CREATE POLICY "Allow authenticated delete assignments" ON public.mentor_students
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Allow authenticated users to insert user records
CREATE POLICY "Allow authenticated insert users" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update user records
CREATE POLICY "Allow authenticated update users" ON public.users
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- MENTORS TABLE POLICIES
-- ============================================================================

-- Allow authenticated users to insert mentor records
CREATE POLICY "Allow authenticated insert mentors" ON public.mentors
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update mentor records
CREATE POLICY "Allow authenticated update mentors" ON public.mentors
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- COUNSELING_SESSIONS TABLE POLICIES
-- ============================================================================

-- Allow authenticated users to insert counseling sessions
CREATE POLICY "Allow authenticated insert sessions" ON public.counseling_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update counseling sessions
CREATE POLICY "Allow authenticated update sessions" ON public.counseling_sessions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete counseling sessions
CREATE POLICY "Allow authenticated delete sessions" ON public.counseling_sessions
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- NOTES
-- ============================================================================
-- These policies allow all authenticated users to perform operations.
-- In production, you may want to add more specific role-based checks:
-- Example: WITH CHECK (auth.jwt() ->> 'role' = 'admin')
-- Or: USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'mentor'))
-- ============================================================================
