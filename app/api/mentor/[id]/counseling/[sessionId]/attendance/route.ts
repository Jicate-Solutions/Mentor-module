import { NextRequest } from 'next/server';
import { getUserAccess, canManageMentor } from '@/lib/middleware/access-control';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { resolveMentorByJkknId } from '@/lib/services/mentor/resolve';
import {
  getSessionAttendance,
  markAttendance,
  bulkMarkAttendance,
} from '@/lib/services/mentor/attendance';
import type { AttendanceStatus } from '@/lib/services/mentor/attendance';
import { createAdminClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api-response';

/**
 * GET /api/mentor/[id]/counseling/[sessionId]/attendance
 * Returns attendance records for a counseling session.
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

    const attendance = await getSessionAttendance(sessionId);
    return ok(attendance);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch attendance';
    return err(message, 500);
  }
}

/**
 * POST /api/mentor/[id]/counseling/[sessionId]/attendance
 * Mark attendance for one or more students.
 * Body: { studentId, status } for single, or { records: [{ studentId, status }] } for bulk.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return err('Unauthorized', 401);
  }

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

    const body = await request.json();

    // Bulk mode
    if (Array.isArray(body.records)) {
      const records = body.records as { studentId: string; status: AttendanceStatus }[];
      if (records.length === 0) {
        return err('records array must not be empty', 400);
      }
      await bulkMarkAttendance(sessionId, records, currentUser.id);
      return ok({ marked: records.length });
    }

    // Single mode
    const { studentId, status } = body;
    if (!studentId || !status) {
      return err('Missing required fields: studentId, status', 400);
    }

    await markAttendance(sessionId, studentId, status as AttendanceStatus, currentUser.id);
    return ok({ marked: 1 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark attendance';
    return err(message, 500);
  }
}
