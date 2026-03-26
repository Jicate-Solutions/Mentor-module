import { NextRequest } from 'next/server';
import { getUserAccess, canManageMentor } from '@/lib/middleware/access-control';
import { resendSessionNotification } from '@/lib/services/mentor/counseling';
import { resolveMentorByJkknId } from '@/lib/services/mentor/resolve';
import { createAdminClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api-response';

/**
 * POST /api/mentor/[id]/counseling/[sessionId]/notify
 * Resend the session notification email for an existing counseling session.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const userAccess = await getUserAccess();
  if (!userAccess) {
    return err('Unauthorized', 401);
  }

  const { id: mentorId, sessionId } = await params;

  try {
    const supabase = createAdminClient();
    const resolved = await resolveMentorByJkknId(mentorId, supabase);
    if (!resolved) {
      return err('Mentor not found', 404);
    }

    const canManage = await canManageMentor(
      userAccess,
      resolved.mentor.id,
      resolved.mentor.institution_id || ''
    );
    if (!canManage) {
      return err('Forbidden', 403);
    }

    const result = await resendSessionNotification(sessionId, mentorId);

    if (!result.sent) {
      return err(result.reason || 'Failed to send notification', 422);
    }

    return ok({ sent: true, email: result.email });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resend notification';
    return err(message, 500);
  }
}
