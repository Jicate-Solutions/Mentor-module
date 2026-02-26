import { NextRequest } from 'next/server';
import { getUserAccess, canManageMentor } from '@/lib/middleware/access-control';
import { updateSession, deleteSession } from '@/lib/services/mentor/counseling';
import { resolveMentorByJkknId } from '@/lib/services/mentor/resolve';
import { createAdminClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api-response';

/**
 * PUT /api/mentor/[id]/counseling/[sessionId]
 * Update a counseling session.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const userAccess = await getUserAccess();
  if (!userAccess) {
    return err('Unauthorized', 401);
  }

  const { id: mentorId, sessionId } = await params;
  const body = await request.json();
  const { sessionName, date, time, notes, attachment, status } = body;

  if (!sessionName && !date && !time && notes === undefined && attachment === undefined && !status) {
    return err('At least one field must be provided for update', 400);
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

    const session = await updateSession(sessionId, mentorId, {
      session_name: sessionName,
      date,
      time,
      notes,
      attachment_url: attachment,
      status,
    });

    return ok(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update session';
    const httpStatus = message.includes('not found') || message.includes('access denied') ? 404 : 500;
    return err(message, httpStatus);
  }
}

/**
 * DELETE /api/mentor/[id]/counseling/[sessionId]
 * Delete a counseling session.
 */
export async function DELETE(
  request: NextRequest,
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
    if (!resolved) return err('Mentor not found', 404);

    const canManage = await canManageMentor(
      userAccess,
      resolved.mentor.id,
      resolved.mentor.institution_id || ''
    );
    if (!canManage) return err('Permission denied', 403);

    await deleteSession(sessionId, mentorId);
    return ok({ message: 'Session deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete session';
    const httpStatus = message.includes('not found') || message.includes('access denied') ? 404 : 500;
    return err(message, httpStatus);
  }
}
