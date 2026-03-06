import { NextRequest } from 'next/server';
import { getUserAccess, canManageMentor } from '@/lib/middleware/access-control';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { getSessionsForMentor, createSession } from '@/lib/services/mentor/counseling';
import { resolveMentorByJkknId } from '@/lib/services/mentor/resolve';
import { createAdminClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api-response';

/**
 * GET /api/mentor/[id]/counseling
 * Get all counseling sessions for a mentor.
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
    const sessions = await getSessionsForMentor(mentorId);
    return ok(sessions);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch counseling sessions';
    return err(message, 500);
  }
}

/**
 * POST /api/mentor/[id]/counseling
 * Create a new counseling session.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return err('Unauthorized', 401);
  }

  const userAccess = await getUserAccess();
  if (!userAccess) {
    return err('Unauthorized', 401);
  }

  const { id: mentorId } = await params;
  const body = await request.json();
  const { student, sessionName, date, time, notes, attachment } = body;

  if (!student || !student.id || !sessionName || !date || !time) {
    return err('Missing required fields: student (with id), sessionName, date, time', 400);
  }

  try {
    // Authorization check — resolve the Supabase mentor record via the service layer.
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
      return err(
        'Forbidden: You do not have permission to create counseling sessions for this mentor',
        403
      );
    }

    const session = await createSession(
      mentorId,
      { student, session_name: sessionName, date, time, notes },
      currentUser.id
    );

    return ok(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create counseling session';
    return err(message, 500);
  }
}
