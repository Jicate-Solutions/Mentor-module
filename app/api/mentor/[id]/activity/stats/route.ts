import { NextRequest } from 'next/server';
import { getUserAccess, canManageMentor } from '@/lib/middleware/access-control';
import { resolveMentorByJkknId } from '@/lib/services/mentor/resolve';
import { getActivityStats, getSessionStats, getMentorEngagement } from '@/lib/services/mentor/activity';
import { createAdminClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api-response';

/**
 * GET /api/mentor/[id]/activity/stats
 * Returns combined activity stats, session stats, and engagement data for a mentor.
 */
export async function GET(
  _request: NextRequest,
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

    const dbMentorId = resolved.mentor.id;

    const [activityStats, sessionStats, engagement] = await Promise.all([
      getActivityStats(dbMentorId),
      getSessionStats(dbMentorId),
      getMentorEngagement(dbMentorId),
    ]);

    return ok({ activityStats, sessionStats, engagement });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch activity stats';
    return err(message, 500);
  }
}
