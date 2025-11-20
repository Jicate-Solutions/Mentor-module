-- Create mentor_incharge_assignments table
-- This table tracks which users have been assigned mentor in-charge privileges
-- Mentor in-charges can manage all mentors and students within their assigned institution

CREATE TABLE IF NOT EXISTS public.mentor_incharge_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  institution_id TEXT NOT NULL,
  department_id TEXT, -- NULL means institution-wide access
  assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure a user can only be assigned once per institution/department combination
  UNIQUE(user_id, institution_id, department_id)
);

-- Create indexes for performance
CREATE INDEX idx_mentor_incharge_user_id ON public.mentor_incharge_assignments(user_id);
CREATE INDEX idx_mentor_incharge_institution_id ON public.mentor_incharge_assignments(institution_id);
CREATE INDEX idx_mentor_incharge_department_id ON public.mentor_incharge_assignments(department_id) WHERE department_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.mentor_incharge_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Super admins can view all assignments
CREATE POLICY "Super admins view all mentor incharge assignments"
ON public.mentor_incharge_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE jkkn_user_id = current_setting('app.user_id', true)
    AND is_super_admin = true
  )
);

-- Institution admins can view assignments in their institution
CREATE POLICY "Institution admins view institution mentor incharge assignments"
ON public.mentor_incharge_assignments
FOR SELECT
USING (
  institution_id = current_setting('app.user_institution', true)
  AND current_setting('app.user_role', true) IN ('institution_admin', 'administrator', 'principal')
);

-- Users can view their own mentor incharge assignments
CREATE POLICY "Users view own mentor incharge assignments"
ON public.mentor_incharge_assignments
FOR SELECT
USING (
  user_id IN (
    SELECT id FROM public.users
    WHERE jkkn_user_id = current_setting('app.user_id', true)
  )
);

-- Only super admins can insert mentor incharge assignments
CREATE POLICY "Super admins insert mentor incharge assignments"
ON public.mentor_incharge_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE jkkn_user_id = current_setting('app.user_id', true)
    AND is_super_admin = true
  )
);

-- Only super admins can update mentor incharge assignments
CREATE POLICY "Super admins update mentor incharge assignments"
ON public.mentor_incharge_assignments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE jkkn_user_id = current_setting('app.user_id', true)
    AND is_super_admin = true
  )
);

-- Only super admins can delete mentor incharge assignments
CREATE POLICY "Super admins delete mentor incharge assignments"
ON public.mentor_incharge_assignments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE jkkn_user_id = current_setting('app.user_id', true)
    AND is_super_admin = true
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_mentor_incharge_assignments_updated_at
  BEFORE UPDATE ON public.mentor_incharge_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.mentor_incharge_assignments IS
'Tracks mentor in-charge role assignments. Mentor in-charges have elevated permissions to manage mentors, students, and counseling sessions within their assigned institution.';
