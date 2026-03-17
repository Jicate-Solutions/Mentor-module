import { NextRequest } from 'next/server';
import { getUserAccess, canManageMentor } from '@/lib/middleware/access-control';
import { getLoginHistory } from '@/lib/services/mentor/activity';
import { resolveMentorByJkknId } from '@/lib/services/mentor/resolve';
import { createAdminClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api-response';

/**
 * GET /api/mentor/[id]/activity/login
 * Returns the login history for a specific mentor.
 *
 * Query params:
 *   limit — max entries to return (default 20)
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

    const limit = parseInt(
      request.nextUrl.searchParams.get('limit') || '20',
      10
    );

    // getLoginHistory takes userId, not mentorId
    const logins = await getLoginHistory(resolved.user.id, limit);
    const lastLogin = logins.length > 0 ? logins[0].loginAt : null;

    return ok({ logins, totalLogins: logins.length, lastLogin });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch login history';
    return err(message, 500);
  }
}
