import { NextRequest } from 'next/server';
import { getUserAccess, canManageMentor } from '@/lib/middleware/access-control';
import { getActivityLog } from '@/lib/services/mentor/activity';
import { resolveMentorByJkknId } from '@/lib/services/mentor/resolve';
import { createAdminClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api-response';
import type { ActivityType } from '@/lib/types/activity';

/**
 * GET /api/mentor/[id]/activity
 * Returns the activity log for a specific mentor.
 *
 * Query params:
 *   type      — filter by activity type (comma-separated)
 *   dateFrom  — ISO date string lower bound
 *   dateTo    — ISO date string upper bound
 *   limit     — page size (default 50)
 *   offset    — pagination offset (default 0)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userAccess = await getUserAccess();
  if (!userAccess) {
    return err('Unauthorized', 401);
  }

  const { id: mentorId } = await params;

  try {
    const supabase = createAdminClient();
    const resolved = await resolveMentorByJkknId(mentorId, supabase);
    if (!resolved) {
      return err('Mentor not found', 404);
    }

    const canAccess = await canManageMentor(
      userAccess,
      resolved.mentor.id,
      resolved.mentor.institution_id || ''
    );
    if (!canAccess) {
      return err('Forbidden', 403);
    }

    const searchParams = request.nextUrl.searchParams;
    const typeParam = searchParams.get('type');
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const activities = await getActivityLog(resolved.mentor.id, {
      type: typeParam as ActivityType | undefined,
      dateFrom,
      dateTo,
      limit,
      offset,
    });

    return ok({ activities, total: activities.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch activity log';
    return err(message, 500);
  }
}
