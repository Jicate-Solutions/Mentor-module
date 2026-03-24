-- =====================================================
-- Mentor Login History Table
-- Referenced by: lib/services/mentor/activity.ts, app/api/auth/callback/route.ts
-- =====================================================

CREATE TABLE IF NOT EXISTS public.mentor_login_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES public.mentors(id) ON DELETE SET NULL,
  login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  session_duration_minutes INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_login_history_user ON public.mentor_login_history(user_id);
CREATE INDEX idx_login_history_mentor ON public.mentor_login_history(mentor_id);
CREATE INDEX idx_login_history_login_at ON public.mentor_login_history(login_at DESC);

ALTER TABLE public.mentor_login_history ENABLE ROW LEVEL SECURITY;

-- Service role full access (inserts happen via createAdminClient in auth callback)
CREATE POLICY "Service role full access on login_history"
  ON public.mentor_login_history
  FOR ALL USING (true) WITH CHECK (true);
