import { createAdminClient } from '@/lib/supabase/server';
import { resolveAnalyticsScope } from '@/lib/services/mentor/session-analytics-scope';
import { ok, err } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

export interface CounselingSummaryRow {
  mentorId: string;
  mentorName: string;
  departmentId: string | null;
  totalSessions: number;
  completedSessions: number;
  scheduledSessions: number;
  cancelledSessions: number;
  queriesRaised: number;
  actionsTaken: number;
  resolved: number;
  pending: number;
}

export async function GET(request: Request) {
  try {
    const sp = new URL(request.url).searchParams;
    const resolution = await resolveAnalyticsScope(sp);
    if (!resolution.ok) return err(resolution.error, resolution.status);

    const { filters } = resolution.scope;
    const supabase = createAdminClient();

    // Fetch mentors in scope
    let mentorQuery = supabase
      .from('mentors')
      .select('id, department_id, institution_id, user:users!inner(full_name)')
      .eq('is_active', true)
      .order('id');

    if (filters.scopedMentorId) {
      mentorQuery = mentorQuery.eq('id', filters.scopedMentorId);
    } else if (filters.institutionId) {
      mentorQuery = mentorQuery.eq('institution_id', filters.institutionId);
    }
    if (filters.departmentId) {
      mentorQuery = mentorQuery.eq('department_id', filters.departmentId);
    }

    const { data: mentors, error: mentorErr } = await mentorQuery;
    if (mentorErr) return err(mentorErr.message, 500);
    if (!mentors || mentors.length === 0) return ok([], { total: 0 });

    const mentorIds = mentors.map((m) => m.id);

    // Fetch counseling sessions with feedback (queries/actions)
    let sessionsQuery = supabase
      .from('counseling_sessions')
      .select('id, mentor_id, status, date')
      .in('mentor_id', mentorIds);

    if (filters.dateFrom) sessionsQuery = sessionsQuery.gte('date', filters.dateFrom);
    if (filters.dateTo) sessionsQuery = sessionsQuery.lte('date', filters.dateTo);

    // Fetch mentor-submitted counseling feedback (queries raised + actions taken)
    let feedbackQuery = supabase
      .from('counseling_feedback')
      .select('session_id, mentor_id, counseling_queries, action_taken')
      .in('mentor_id', mentorIds);

    const [sessionsRes, feedbackRes] = await Promise.all([sessionsQuery, feedbackQuery]);

    if (sessionsRes.error) return err(sessionsRes.error.message, 500);

    const sessionRows = sessionsRes.data ?? [];

    // Build feedback map: session_id → feedback row
    const feedbackMap = new Map<string, { queriesRaised: boolean; actionTaken: boolean }>();
    if (!feedbackRes.error && feedbackRes.data) {
      for (const f of feedbackRes.data) {
        const sessionId = (f as any).session_id ?? (f as any).counseling_session_id;
        if (!sessionId) continue;
        feedbackMap.set(sessionId, {
          queriesRaised: !!(f.counseling_queries && f.counseling_queries.trim()),
          actionTaken: !!(f.action_taken && f.action_taken.trim()),
        });
      }
    }

    type Entry = {
      total: number;
      completed: number;
      scheduled: number;
      cancelled: number;
      queriesRaised: number;
      actionsTaken: number;
      resolved: number;
      pending: number;
    };

    const map = new Map<string, Entry>();

    for (const s of sessionRows) {
      if (!map.has(s.mentor_id)) {
        map.set(s.mentor_id, {
          total: 0,
          completed: 0,
          scheduled: 0,
          cancelled: 0,
          queriesRaised: 0,
          actionsTaken: 0,
          resolved: 0,
          pending: 0,
        });
      }
      const e = map.get(s.mentor_id)!;
      e.total += 1;

      const status = (s.status ?? '').toLowerCase();
      if (status === 'completed') e.completed += 1;
      else if (status === 'scheduled') e.scheduled += 1;
      else if (status === 'cancelled') e.cancelled += 1;

      const fb = feedbackMap.get(s.id);
      if (fb) {
        if (fb.queriesRaised) e.queriesRaised += 1;
        if (fb.actionTaken) {
          e.actionsTaken += 1;
          e.resolved += 1;
        } else if (fb.queriesRaised) {
          e.pending += 1;
        }
      }
    }

    const rows: CounselingSummaryRow[] = mentors.map((m) => {
      const e = map.get(m.id) ?? {
        total: 0, completed: 0, scheduled: 0, cancelled: 0,
        queriesRaised: 0, actionsTaken: 0, resolved: 0, pending: 0,
      };
      const user = Array.isArray(m.user) ? m.user[0] : m.user;
      return {
        mentorId: m.id,
        mentorName: (user as any)?.full_name ?? 'Unknown',
        departmentId: m.department_id ?? null,
        totalSessions: e.total,
        completedSessions: e.completed,
        scheduledSessions: e.scheduled,
        cancelledSessions: e.cancelled,
        queriesRaised: e.queriesRaised,
        actionsTaken: e.actionsTaken,
        resolved: e.resolved,
        pending: e.pending,
      };
    });

    // Sort: most total sessions first
    rows.sort((a, b) => b.totalSessions - a.totalSessions);

    return ok(rows, { total: rows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return err(message, 500);
  }
}
