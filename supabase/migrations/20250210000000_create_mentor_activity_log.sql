-- Create mentor_activity_log table
-- Used by lib/services/activity-logger.ts for server-side activity tracking

CREATE TABLE IF NOT EXISTS public.mentor_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'student_assigned','student_removed','session_created','session_updated',
    'session_completed','session_cancelled','idp_created','idp_updated',
    'idp_completed','feedback_submitted','report_generated','email_sent'
  )),
  activity_description TEXT NOT NULL,
  activity_data JSONB,
  related_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  related_session_id UUID REFERENCES public.counseling_sessions(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_log_mentor ON public.mentor_activity_log(mentor_id);
CREATE INDEX idx_activity_log_created ON public.mentor_activity_log(created_at);
CREATE INDEX idx_activity_log_type ON public.mentor_activity_log(activity_type);

ALTER TABLE public.mentor_activity_log ENABLE ROW LEVEL SECURITY;

-- Service role writes (activity-logger.ts uses createAdminClient — this is intentional
-- for server-side logging; the policy documents the intent)
CREATE POLICY "Service role manages activity log" ON public.mentor_activity_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Mentors view own
CREATE POLICY "Mentors view own activity" ON public.mentor_activity_log
  FOR SELECT USING (
    mentor_id IN (
      SELECT id FROM public.mentors WHERE user_id IN (
        SELECT id FROM public.users
        WHERE jkkn_user_id = current_setting('app.user_id', true)
      )
    )
  );

-- Admins view institution activity
CREATE POLICY "Admins view institution activity" ON public.mentor_activity_log
  FOR SELECT USING (
    current_setting('app.user_role', true) IN
      ('super_admin','administrator','principal','digital_coordinator')
    OR (
      current_setting('app.user_role', true) IN ('hod','faculty')
      AND EXISTS (
        SELECT 1 FROM public.mentors m WHERE m.id = mentor_id
        AND m.institution_id = current_setting('app.user_institution', true)
      )
    )
  );
