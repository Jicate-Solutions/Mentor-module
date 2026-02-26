-- Create student_feedback table
-- Used by feedback route and StudentFeedback interface in lib/types/mentor.ts

CREATE TABLE IF NOT EXISTS public.student_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.counseling_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  mentor_id UUID REFERENCES public.mentors(id) ON DELETE SET NULL,
  feedback_token TEXT UNIQUE NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  email_sent_at TIMESTAMPTZ,
  email_opened_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  is_anonymous BOOLEAN DEFAULT false,
  session_helpfulness_rating INTEGER CHECK (session_helpfulness_rating BETWEEN 1 AND 5),
  mentor_approachability_rating INTEGER CHECK (mentor_approachability_rating BETWEEN 1 AND 5),
  concerns_addressed BOOLEAN,
  what_helped TEXT,
  what_could_improve TEXT,
  additional_comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_student_feedback_session ON public.student_feedback(session_id);
CREATE INDEX idx_student_feedback_token ON public.student_feedback(feedback_token);
CREATE INDEX idx_student_feedback_mentor ON public.student_feedback(mentor_id);

ALTER TABLE public.student_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages student feedback" ON public.student_feedback
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Mentors view feedback for their sessions
CREATE POLICY "Mentors view own feedback" ON public.student_feedback
  FOR SELECT USING (
    mentor_id IN (
      SELECT id FROM public.mentors WHERE user_id IN (
        SELECT id FROM public.users
        WHERE jkkn_user_id = current_setting('app.user_id', true)
      )
    )
  );

-- Admins view institution feedback
CREATE POLICY "Admins view institution feedback" ON public.student_feedback
  FOR SELECT USING (
    current_setting('app.user_role', true) IN
      ('super_admin','administrator','principal','digital_coordinator')
  );
