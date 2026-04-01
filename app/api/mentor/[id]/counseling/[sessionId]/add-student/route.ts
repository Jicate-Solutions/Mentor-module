import { NextRequest } from 'next/server';
import { getUserAccess, canManageMentor } from '@/lib/middleware/access-control';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { addStudentToExistingSession } from '@/lib/services/mentor/counseling';
import { resolveMentorByJkknId } from '@/lib/services/mentor/resolve';
import { createAdminClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api-response';

/**
 * POST /api/mentor/[id]/counseling/[sessionId]/add-student
 *
 * Add a student to an existing session day without touching other students
 * already enrolled on that day.
 *
 * [id]        — mentor JKKN staff ID
 * [sessionId] — referenceSessionId: any existing counseling_sessions row on the
 *               target day (used to copy session_name, date, time)
 *
 * Body:
 *   studentJkknId  string   JKKN learner UUID of the student to add
 *   notes?         string   optional notes (e.g. reason for addition)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return err('Unauthorized', 401);
  }

  const userAccess = await getUserAccess();
  if (!userAccess) {
    return err('Unauthorized', 401);
  }

  // ── Params & body ─────────────────────────────────────────────────────────
  const { id: mentorId, sessionId: referenceSessionId } = await params;
  const body = await request.json();
  const { studentJkknId, notes } = body as { studentJkknId?: string; notes?: string };

  if (!studentJkknId || typeof studentJkknId !== 'string' || !studentJkknId.trim()) {
    return err('Missing required field: studentJkknId', 400);
  }

  // ── Access control ────────────────────────────────────────────────────────
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
      return err('Permission denied', 403);
    }

    // ── Service call ────────────────────────────────────────────────────────
    const session = await addStudentToExistingSession(
      mentorId,
      referenceSessionId,
      studentJkknId.trim(),
      notes,
      currentUser.id
    );

    return ok(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add student to session';
    const httpStatus =
      message.includes('not found') || message.includes('access denied') ? 404 : 500;
    return err(message, httpStatus);
  }
}
