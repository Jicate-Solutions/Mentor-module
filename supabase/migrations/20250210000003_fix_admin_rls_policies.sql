-- Fix mentor_students and counseling_sessions RLS: add missing admin access policies

-- mentor_students: add admin bypass + institution-level access
CREATE POLICY "Admins view institution assignments" ON public.mentor_students
  FOR SELECT USING (
    current_setting('app.user_role', true) IN
      ('super_admin','administrator','principal','digital_coordinator')
    OR (
      mentor_id IN (
        SELECT id FROM public.mentors
        WHERE institution_id = current_setting('app.user_institution', true)
      )
      AND current_setting('app.user_role', true) IN ('hod','faculty')
    )
  );

CREATE POLICY "Admins manage institution assignments" ON public.mentor_students
  FOR ALL USING (
    current_setting('app.user_role', true) IN
      ('super_admin','administrator','principal','digital_coordinator')
  ) WITH CHECK (
    current_setting('app.user_role', true) IN
      ('super_admin','administrator','principal','digital_coordinator')
  );

CREATE POLICY "Service role manages assignments" ON public.mentor_students
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- counseling_sessions: add admin bypass + institution-level access
CREATE POLICY "Admins view institution sessions" ON public.counseling_sessions
  FOR SELECT USING (
    current_setting('app.user_role', true) IN
      ('super_admin','administrator','principal','digital_coordinator')
    OR (
      mentor_id IN (
        SELECT id FROM public.mentors
        WHERE institution_id = current_setting('app.user_institution', true)
      )
      AND current_setting('app.user_role', true) IN ('hod','faculty')
    )
  );

CREATE POLICY "Admins manage institution sessions" ON public.counseling_sessions
  FOR ALL USING (
    current_setting('app.user_role', true) IN
      ('super_admin','administrator','principal','digital_coordinator')
  ) WITH CHECK (
    current_setting('app.user_role', true) IN
      ('super_admin','administrator','principal','digital_coordinator')
  );

CREATE POLICY "Service role manages sessions" ON public.counseling_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
