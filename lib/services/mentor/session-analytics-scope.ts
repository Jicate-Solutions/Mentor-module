/**
 * Session Analytics access scope resolver.
 *
 * Maps the caller's role → the AnalyticsFilters values we will actually hand
 * to the service layer. Users cannot widen the scope by passing stray query
 * params: we OVERRIDE institution/department/scopedMentorId based on role so
 * each tier sees exactly what they're entitled to.
 *
 * Tiers (checked in order, first match wins):
 *   1. super_admin / is_super_admin          → no forced filter (can pass any)
 *   2. institution_admin                     → forced institutionId = their own
 *   3. mentor_incharge                       → forced institutionId = assigned one
 *                                              (+ departmentId if dept-scoped)
 *   4. hod                                   → forced institutionId + departmentId
 *   5. faculty / mentor (default)            → scopedMentorId = own mentor record
 */

import { getUserAccess, getMentorInchargeScope } from '@/lib/middleware/access-control';
import { getCurrentMentorId } from '@/lib/services/mentor/mentors';
import type { AnalyticsFilters } from '@/lib/types/session-analytics';

export interface AnalyticsScope {
  filters: AnalyticsFilters; // ready to pass to the service
  tier: 'super_admin' | 'institution_admin' | 'mentor_incharge' | 'hod' | 'mentor';
  // For debugging/telemetry — which fields were overridden vs. caller-supplied.
  forced: {
    institutionId?: string;
    departmentId?: string;
    scopedMentorId?: string;
  };
}

export type ScopeResolution =
  | { ok: true; scope: AnalyticsScope }
  | { ok: false; status: number; error: string };

export async function resolveAnalyticsScope(
  rawQuery: URLSearchParams
): Promise<ScopeResolution> {
  const access = await getUserAccess();
  if (!access) return { ok: false, status: 401, error: 'Unauthorized' };

  // Caller-supplied filters (kept only when caller has authority to use them).
  const suppliedInstitutionId = rawQuery.get('institutionId') || undefined;
  const suppliedDepartmentId = rawQuery.get('departmentId') || undefined;
  const dateFrom = rawQuery.get('dateFrom') || undefined;
  const dateTo = rawQuery.get('dateTo') || undefined;

  // Tier 1 — Super admin: no scope restriction.
  if (access.isSuperAdmin || access.role === 'super_admin') {
    return {
      ok: true,
      scope: {
        tier: 'super_admin',
        forced: {},
        filters: {
          institutionId: suppliedInstitutionId,
          departmentId: suppliedDepartmentId,
          dateFrom,
          dateTo,
        },
      },
    };
  }

  // Tier 2 — Institution admin: locked to their own institution.
  if (access.role === 'institution_admin') {
    if (!access.institutionId) {
      return { ok: false, status: 403, error: 'Institution admin has no institution assigned' };
    }
    return {
      ok: true,
      scope: {
        tier: 'institution_admin',
        forced: { institutionId: access.institutionId },
        filters: {
          institutionId: access.institutionId,
          // Admin may narrow to a department within their institution
          departmentId: suppliedDepartmentId,
          dateFrom,
          dateTo,
        },
      },
    };
  }

  // Tier 3 — Mentor Incharge: locked to their assigned institution (and dept if
  // the assignment is department-scoped). Takes precedence over the role-based
  // mentor fallback so principals-as-mentor or faculty-as-incharge get elevated.
  if (access.isMentorIncharge && access.mentorInchargeInstitutionId) {
    const inchargeScope = await getMentorInchargeScope(access.userId);
    const forcedInstitutionId = access.mentorInchargeInstitutionId;
    const forcedDepartmentId =
      inchargeScope?.scopeType === 'department' && inchargeScope.departmentIds.length > 0
        ? inchargeScope.departmentIds[0]
        : undefined;

    return {
      ok: true,
      scope: {
        tier: 'mentor_incharge',
        forced: {
          institutionId: forcedInstitutionId,
          ...(forcedDepartmentId ? { departmentId: forcedDepartmentId } : {}),
        },
        filters: {
          institutionId: forcedInstitutionId,
          // If incharge is department-scoped, force that; otherwise let them narrow.
          departmentId: forcedDepartmentId ?? suppliedDepartmentId,
          dateFrom,
          dateTo,
        },
      },
    };
  }

  // Tier 4 — HOD: scoped to their institution + their department.
  if (access.role === 'hod') {
    if (!access.institutionId || !access.departmentId) {
      return { ok: false, status: 403, error: 'HOD has no institution/department assigned' };
    }
    return {
      ok: true,
      scope: {
        tier: 'hod',
        forced: {
          institutionId: access.institutionId,
          departmentId: access.departmentId,
        },
        filters: {
          institutionId: access.institutionId,
          departmentId: access.departmentId,
          dateFrom,
          dateTo,
        },
      },
    };
  }

  // Tier 5 — Faculty / plain mentor: locked to their own mentor record.
  const mentorId = await getCurrentMentorId(access.userId);
  if (!mentorId) return { ok: false, status: 404, error: 'Mentor record not found' };

  return {
    ok: true,
    scope: {
      tier: 'mentor',
      forced: { scopedMentorId: mentorId },
      filters: {
        scopedMentorId: mentorId,
        dateFrom,
        dateTo,
      },
    },
  };
}
