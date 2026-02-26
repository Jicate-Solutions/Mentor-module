import { NextRequest } from 'next/server';
import { getUserAccess, canManageMentor } from '@/lib/middleware/access-control';
import { submitSessionFeedback } from '@/lib/services/mentor/counseling';
import { resolveMentorByJkknId } from '@/lib/services/mentor/resolve';
import { createAdminClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api-response';

/**
 * POST /api/mentor/[id]/counseling/[sessionId]/feedback
 * Submit mentor feedback for a counseling session.
 * Also marks the session as completed and sends a student feedback request email.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const userAccess = await getUserAccess();
  if (!userAccess) {
    return err('Unauthorized', 401);
  }

  const { id: mentorId, sessionId } = await params;
  const body = await request.json();
  const { counselingQueries, actionTaken, attachmentUrl } = body;

  if (!counselingQueries || !actionTaken) {
    return err('Missing required feedback fields: counselingQueries, actionTaken', 400);
  }

  try {
    const supabase = createAdminClient();
    const resolved = await resolveMentorByJkknId(mentorId, supabase);
    if (!resolved) return err('Mentor not found', 404);

    const canManage = await canManageMentor(
      userAccess,
      resolved.mentor.id,
      resolved.mentor.institution_id || ''
    );
    if (!canManage) return err('Permission denied', 403);

    await submitSessionFeedback(sessionId, mentorId, {
      counselingQueries,
      actionTaken,
      attachmentUrl,
    });

    return ok({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit feedback';

    if (message.includes('already submitted')) {
      return err(message, 409);
    }
    if (message.includes('not found') || message.includes('access denied')) {
      return err(message, 404);
    }

    return err(message, 500);
  }
}
