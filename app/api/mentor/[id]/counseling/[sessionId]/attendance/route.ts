import { NextRequest } from 'next/server';
import { getUserAccess, canManageMentor } from '@/lib/middleware/access-control';
import {
  getSessionAttendance,
  markAttendance,
  getStudentAttendanceStats,
} from '@/lib/services/mentor/attendance';
import { resolveMentorByJkknId } from '@/lib/services/mentor/resolve';
import { createAdminClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api-response';
import type { AttendanceStatus } from '@/lib/services/mentor/attendance';

/**
 * GET /api/mentor/[id]/counseling/[sessionId]/attendance
 * Returns attendance records and stats for a counseling session.
 */
export async function GET(
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

    const canAccess = await canManageMentor(
      userAccess,
      resolved.mentor.id,
      resolved.mentor.institution_id || ''
    );
    if (!canAccess) {
      return err('Forbidden', 403);
    }

    const [attendance, stats] = await Promise.all([
      getSessionAttendance(sessionId),
      getStudentAttendanceStats(resolved.mentor.id),
    ]);

    return ok({ attendance, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch attendance';
    return err(message, 500);
  }
}

/**
 * POST /api/mentor/[id]/counseling/[sessionId]/attendance
 * Marks attendance for a student in a counseling session.
 *
 * Body: { studentId: string, status: AttendanceStatus }
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

    const body = await request.json();
    const { studentId, status } = body as {
      studentId: string;
      status: AttendanceStatus;
    };

    if (!studentId || !status) {
      return err('studentId and status are required', 400);
    }

    const validStatuses: AttendanceStatus[] = ['invited', 'present', 'absent', 'excused'];
    if (!validStatuses.includes(status)) {
      return err(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    await markAttendance(sessionId, studentId, status, resolved.user.id);

    return ok({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark attendance';
    return err(message, 500);
  }
}
