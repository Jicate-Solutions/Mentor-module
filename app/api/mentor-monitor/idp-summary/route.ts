import { createAdminClient } from '@/lib/supabase/server';
import { resolveAnalyticsScope } from '@/lib/services/mentor/session-analytics-scope';
import { ok, err } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

export interface IdpSummaryRow {
  mentorId: string;
  mentorName: string;
  departmentId: string | null;
  activeIdps: number;
  completedIdps: number;
  overdueIdps: number;
  totalIdps: number;
  lastIdpDate: string | null;
}

export async function GET(request: Request) {
  try {
    const sp = new URL(request.url).searchParams;
    const resolution = await resolveAnalyticsScope(sp);
    if (!resolution.ok) return err(resolution.error, resolution.status);

    const { filters, tier } = resolution.scope;
    const supabase = createAdminClient();
    const now = new Date().toISOString();

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

    // Fetch all IDPs for these mentors
    const { data: idps, error: idpErr } = await supabase
      .from('individual_development_plans')
      .select('mentor_id, status, due_date, created_at')
      .in('mentor_id', mentorIds);

    if (idpErr) return err(idpErr.message, 500);

    // Build per-mentor aggregation
    const idpMap = new Map<
      string,
      { active: number; completed: number; overdue: number; lastDate: string | null }
    >();

    for (const idp of idps ?? []) {
      if (!idpMap.has(idp.mentor_id)) {
        idpMap.set(idp.mentor_id, { active: 0, completed: 0, overdue: 0, lastDate: null });
      }
      const entry = idpMap.get(idp.mentor_id)!;

      const status = (idp.status ?? '').toLowerCase();
      if (status === 'completed') {
        entry.completed += 1;
      } else if (idp.due_date && idp.due_date < now && status !== 'completed') {
        entry.overdue += 1;
      } else {
        entry.active += 1;
      }

      // Track most recent IDP date
      const date = idp.created_at ?? null;
      if (date && (!entry.lastDate || date > entry.lastDate)) {
        entry.lastDate = date;
      }
    }

    const rows: IdpSummaryRow[] = mentors.map((m) => {
      const counts = idpMap.get(m.id) ?? { active: 0, completed: 0, overdue: 0, lastDate: null };
      const user = Array.isArray(m.user) ? m.user[0] : m.user;
      return {
        mentorId: m.id,
        mentorName: (user as any)?.full_name ?? 'Unknown',
        departmentId: m.department_id ?? null,
        activeIdps: counts.active,
        completedIdps: counts.completed,
        overdueIdps: counts.overdue,
        totalIdps: counts.active + counts.completed + counts.overdue,
        lastIdpDate: counts.lastDate,
      };
    });

    // Sort: most overdue first, then most active
    rows.sort((a, b) => b.overdueIdps - a.overdueIdps || b.activeIdps - a.activeIdps);

    return ok(rows, { total: rows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return err(message, 500);
  }
}
