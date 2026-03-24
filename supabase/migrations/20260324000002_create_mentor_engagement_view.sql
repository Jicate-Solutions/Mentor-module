-- =====================================================
-- Mentor Engagement Stats View
-- Referenced by: lib/services/mentor/activity.ts (getMentorEngagement)
-- =====================================================

CREATE OR REPLACE VIEW public.mentor_engagement_stats AS
SELECT
  m.id AS mentor_id,
  m.user_id,
  u.full_name AS mentor_name,
  m.department_id,
  m.institution_id,

  -- Session counts
  COUNT(DISTINCT cs.id) AS total_sessions,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.status = 'completed') AS completed_sessions,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.status = 'scheduled' AND cs.date >= CURRENT_DATE) AS upcoming_sessions,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.status = 'cancelled') AS cancelled_sessions,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.status = 'scheduled' AND cs.date < CURRENT_DATE) AS overdue_sessions,

  -- Student counts
  COUNT(DISTINCT ms.student_id) AS assigned_students,

  -- Sessions this month
  COUNT(DISTINCT cs.id) FILTER (
    WHERE cs.created_at >= date_trunc('month', CURRENT_DATE)
  ) AS sessions_this_month,

  -- Last activity
  MAX(cs.created_at) AS last_session_created,
  MAX(mal.created_at) AS last_activity_at,

  -- Login stats
  COUNT(DISTINCT mlh.id) AS total_logins,
  COUNT(DISTINCT mlh.id) FILTER (
    WHERE mlh.login_at >= date_trunc('month', CURRENT_DATE)
  ) AS logins_this_month,
  MAX(mlh.login_at) AS last_login_at,

  -- Engagement level
  CASE
    WHEN COUNT(DISTINCT cs.id) = 0 THEN 'no_sessions'
    WHEN MAX(mal.created_at) < CURRENT_DATE - INTERVAL '30 days' THEN 'inactive'
    WHEN COUNT(DISTINCT cs.id) FILTER (
      WHERE cs.created_at >= date_trunc('month', CURRENT_DATE)
    ) < 3 THEN 'low'
    ELSE 'active'
  END AS engagement_level

FROM public.mentors m
LEFT JOIN public.users u ON m.user_id = u.id
LEFT JOIN public.counseling_sessions cs ON cs.mentor_id = m.id
LEFT JOIN public.mentor_students ms ON ms.mentor_id = m.id
LEFT JOIN public.mentor_activity_log mal ON mal.mentor_id = m.id
LEFT JOIN public.mentor_login_history mlh ON mlh.mentor_id = m.id
GROUP BY m.id, m.user_id, u.full_name, m.department_id, m.institution_id;
