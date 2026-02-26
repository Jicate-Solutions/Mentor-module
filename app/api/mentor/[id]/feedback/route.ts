import { NextRequest } from 'next/server';
import { getUserAccess } from '@/lib/middleware/access-control';
import { getStudentFeedbackForMentor } from '@/lib/services/mentor/feedback';
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
    const result = await getStudentFeedbackForMentor(mentorId);
    return ok({ feedback: result.feedback, stats: result.stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch feedback';
    return err(message, 500);
  }
}
