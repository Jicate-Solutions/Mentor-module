import { NextRequest } from 'next/server';
import { getUserAccess, canManageMentor } from '@/lib/middleware/access-control';
import { resolveMentorByJkknId } from '@/lib/services/mentor/resolve';
import { getActivityLog } from '@/lib/services/mentor/activity';
import { createAdminClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api-response';
import type { ActivityType } from '@/lib/types/activity';

/**
 * GET /api/mentor/[id]/activity
 * Returns the activity log for a mentor with optional filters.
 * Query params: type, dateFrom, dateTo, limit, offset
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
    const filters = {
      type: (searchParams.get('type') as ActivityType) || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined,
    };

    const activities = await getActivityLog(resolved.mentor.id, filters);
    return ok(activities);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch activity log';
    return err(message, 500);
  }
}
