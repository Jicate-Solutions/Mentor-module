import { createAdminClient } from '@/lib/supabase/server';
import { resolveAnalyticsScope } from '@/lib/services/mentor/session-analytics-scope';
import { ok, err } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

export interface FeedbackSummaryRow {
  mentorId: string;
  mentorName: string;
  departmentId: string | null;
  sessionsWithFeedback: number;
  pendingFeedback: number;
  reportsGenerated: number;
  avgHelpfulnessRating: number | null;
  avgApproachabilityRating: number | null;
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

    // Build date filters
    const dateFilters: Record<string, string> = {};
    if (filters.dateFrom) dateFilters.gte = filters.dateFrom;
    if (filters.dateTo) dateFilters.lte = filters.dateTo;

    // Fetch session feedback (student-submitted ratings)
    let feedbackQuery = supabase
      .from('session_feedback')
      .select(
        'mentor_id, submitted_at, session_helpfulness_rating, mentor_approachability_rating'
      )
      .in('mentor_id', mentorIds);

    if (filters.dateFrom) feedbackQuery = feedbackQuery.gte('created_at', filters.dateFrom);
    if (filters.dateTo) feedbackQuery = feedbackQuery.lte('created_at', filters.dateTo);

    // Fetch reports generated from activity log
    let reportsQuery = supabase
      .from('mentor_activity_log')
      .select('mentor_id')
      .in('mentor_id', mentorIds)
      .eq('activity_type', 'report_generated');

    if (filters.dateFrom) reportsQuery = reportsQuery.gte('created_at', filters.dateFrom);
    if (filters.dateTo) reportsQuery = reportsQuery.lte('created_at', filters.dateTo);

    // Fetch sessions to determine pending feedback (completed sessions without feedback)
    let sessionsQuery = supabase
      .from('counseling_sessions')
      .select('id, mentor_id, status')
      .in('mentor_id', mentorIds)
      .eq('status', 'completed');

    if (filters.dateFrom) sessionsQuery = sessionsQuery.gte('date', filters.dateFrom);
    if (filters.dateTo) sessionsQuery = sessionsQuery.lte('date', filters.dateTo);

    const [feedbackRes, reportsRes, sessionsRes] = await Promise.all([
      feedbackQuery,
      reportsQuery,
      sessionsQuery,
    ]);

    if (feedbackRes.error) return err(feedbackRes.error.message, 500);
    if (reportsRes.error) return err(reportsRes.error.message, 500);
    if (sessionsRes.error) return err(sessionsRes.error.message, 500);

    const feedbackRows = feedbackRes.data ?? [];
    const reportRows = reportsRes.data ?? [];
    const sessionRows = sessionsRes.data ?? [];

    // Session IDs that have feedback submitted
    const feedbackSessionIds = new Set(
      feedbackRows.filter((f) => f.submitted_at).map((f) => (f as any).session_id)
    );

    // Build per-mentor maps
    type FeedbackEntry = {
      withFeedback: number;
      pending: number;
      reports: number;
      helpfulnessSum: number;
      helpfulnessCount: number;
      approachabilitySum: number;
      approachabilityCount: number;
    };

    const map = new Map<string, FeedbackEntry>();
    const emptyEntry = (): FeedbackEntry => ({
      withFeedback: 0,
      pending: 0,
      reports: 0,
      helpfulnessSum: 0,
      helpfulnessCount: 0,
      approachabilitySum: 0,
      approachabilityCount: 0,
    });

    // Count sessions with/without feedback
    for (const s of sessionRows) {
      if (!map.has(s.mentor_id)) map.set(s.mentor_id, emptyEntry());
      const e = map.get(s.mentor_id)!;
      if (feedbackSessionIds.has(s.id)) {
        e.withFeedback += 1;
      } else {
        e.pending += 1;
      }
    }

    // Aggregate ratings from submitted feedback
    for (const f of feedbackRows) {
      if (!f.submitted_at) continue;
      if (!map.has(f.mentor_id)) map.set(f.mentor_id, emptyEntry());
      const e = map.get(f.mentor_id)!;
      if (f.session_helpfulness_rating != null) {
        e.helpfulnessSum += f.session_helpfulness_rating;
        e.helpfulnessCount += 1;
      }
      if (f.mentor_approachability_rating != null) {
        e.approachabilitySum += f.mentor_approachability_rating;
        e.approachabilityCount += 1;
      }
    }

    // Count reports
    for (const r of reportRows) {
      if (!map.has(r.mentor_id)) map.set(r.mentor_id, emptyEntry());
      map.get(r.mentor_id)!.reports += 1;
    }

    const rows: FeedbackSummaryRow[] = mentors.map((m) => {
      const e = map.get(m.id) ?? emptyEntry();
      const user = Array.isArray(m.user) ? m.user[0] : m.user;
      return {
        mentorId: m.id,
        mentorName: (user as any)?.full_name ?? 'Unknown',
        departmentId: m.department_id ?? null,
        sessionsWithFeedback: e.withFeedback,
        pendingFeedback: e.pending,
        reportsGenerated: e.reports,
        avgHelpfulnessRating:
          e.helpfulnessCount > 0
            ? Math.round((e.helpfulnessSum / e.helpfulnessCount) * 10) / 10
            : null,
        avgApproachabilityRating:
          e.approachabilityCount > 0
            ? Math.round((e.approachabilitySum / e.approachabilityCount) * 10) / 10
            : null,
      };
    });

    // Sort: most pending feedback first
    rows.sort((a, b) => b.pendingFeedback - a.pendingFeedback);

    return ok(rows, { total: rows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return err(message, 500);
  }
}
