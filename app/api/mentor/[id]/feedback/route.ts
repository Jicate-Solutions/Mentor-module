import { NextRequest } from 'next/server';
import { getUserAccess, canManageMentor } from '@/lib/middleware/access-control';
import { getStudentFeedbackForMentor } from '@/lib/services/mentor/feedback';
import { resolveMentorByJkknId } from '@/lib/services/mentor/resolve';
import { createAdminClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api-response';

/**
 * GET /api/mentor/[id]/feedback
 * Get all student feedback for a mentor with computed statistics.
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

    const result = await getStudentFeedbackForMentor(mentorId);
    return ok({ feedback: result.feedback, stats: result.stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch feedback';
    return err(message, 500);
  }
}
