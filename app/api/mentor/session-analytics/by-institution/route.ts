import { getByInstitutionBreakdown } from '@/lib/services/mentor/session-analytics';
import { resolveAnalyticsScope } from '@/lib/services/mentor/session-analytics-scope';
import { ok, err } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mentor/session-analytics/by-institution
 *
 * Returns a cross-college summary — one row per institution — with mentor count,
 * completed sessions, mentee coverage, and first-cycle completion rate.
 *
 * Access: super_admin only (other roles get 403).
 *
 * Query params:
 *   - dateFrom?: string (ISO date)
 *   - dateTo?:   string (ISO date)
 */
export async function GET(request: Request) {
  try {
    const sp = new URL(request.url).searchParams;
    const resolution = await resolveAnalyticsScope(sp);
    if (!resolution.ok) return err(resolution.error, resolution.status);

    // Cross-college view is super_admin–only — institution admins and below
    // are scoped to a single institution and cannot see peer institutions.
    if (resolution.scope.tier !== 'super_admin') {
      return err('Cross-college report is only available to super admins', 403);
    }

    const filters = {
      dateFrom: sp.get('dateFrom') || undefined,
      dateTo: sp.get('dateTo') || undefined,
    };

    const data = await getByInstitutionBreakdown(filters);
    return ok(data, { total: data.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return err(message, 500);
  }
}
