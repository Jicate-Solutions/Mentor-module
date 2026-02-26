import { NextRequest } from 'next/server';
import { getUserAccess } from '@/lib/middleware/access-control';
import { getMentorList, MentorListFilters, UserAccess as ServiceUserAccess } from '@/lib/services/mentor/mentors';
import { ok, err } from '@/lib/utils/api-response';

/**
 * GET /api/mentor/list
 * Fetch mentors from JKKN API filtered by designation and role-based access.
 *
 * Query params:
 *  - search: string (optional) — search query for filtering
 */
export async function GET(request: NextRequest) {
  const userAccess = await getUserAccess();

  if (!userAccess) {
    return err('Unauthorized', 401);
  }

  const searchParams = request.nextUrl.searchParams;
  const searchQuery = searchParams.get('search') || '';

  const filters: MentorListFilters = {
    search: searchQuery,
  };

  // Map the access-control UserAccess shape to the service's UserAccess shape.
  const serviceAccess: ServiceUserAccess = {
    role: userAccess.role,
    userId: userAccess.userId,
    jkknUserId: userAccess.jkknUserId,
    email: userAccess.email ?? undefined,
    institutionId: userAccess.institutionId ?? undefined,
    departmentId: userAccess.departmentId ?? undefined,
    isSuperAdmin: userAccess.isSuperAdmin,
    isMentorIncharge: userAccess.isMentorIncharge,
    mentorInchargeInstitutionId: userAccess.mentorInchargeInstitutionId ?? undefined,
  };

  try {
    const mentors = await getMentorList(filters, serviceAccess);
    return ok(mentors, { total: mentors.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch mentors';
    return err(message, 500);
  }
}
