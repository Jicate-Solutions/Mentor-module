import { NextRequest } from 'next/server';
import { getUserAccess, canManageMentor } from '@/lib/middleware/access-control';
import { getSessionStats, getMentorEngagement } from '@/lib/services/mentor/activity';
import { resolveMentorByJkknId } from '@/lib/services/mentor/resolve';
import { createAdminClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api-response';

/**
 * GET /api/mentor/[id]/activity/stats
 * Returns session stats and engagement data for a specific mentor.
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

    const [stats, engagement] = await Promise.all([
      getSessionStats(resolved.mentor.id),
      getMentorEngagement(resolved.mentor.id).catch(() => null),
    ]);

    return ok({ stats, engagement });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch session stats';
    return err(message, 500);
  }
}
