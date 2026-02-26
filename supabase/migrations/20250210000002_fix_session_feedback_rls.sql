-- Fix session_feedback RLS: table has RLS enabled but zero policies = all access blocked
-- Adding policies to restore proper access

CREATE POLICY "Mentors manage own session feedback" ON public.session_feedback
  FOR ALL USING (
    session_id IN (
      SELECT id FROM public.counseling_sessions WHERE mentor_id IN (
        SELECT id FROM public.mentors WHERE user_id IN (
          SELECT id FROM public.users
          WHERE jkkn_user_id = current_setting('app.user_id', true)
        )
      )
    )
  ) WITH CHECK (
    session_id IN (
      SELECT id FROM public.counseling_sessions WHERE mentor_id IN (
        SELECT id FROM public.mentors WHERE user_id IN (
          SELECT id FROM public.users
          WHERE jkkn_user_id = current_setting('app.user_id', true)
        )
      )
    )
  );

CREATE POLICY "Admins view institution session feedback" ON public.session_feedback
  FOR SELECT USING (
    current_setting('app.user_role', true) IN
      ('super_admin','administrator','principal','digital_coordinator')
  );

CREATE POLICY "Service role manages session feedback" ON public.session_feedback
  FOR ALL TO service_role USING (true) WITH CHECK (true);
