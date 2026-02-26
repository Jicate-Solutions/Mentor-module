import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/utils/api-response';
import {
  getStudentsForMentor,
  assignStudentsToMentor,
  removeStudentFromMentor,
} from '@/lib/services/mentor/students';
import { resolveMentorByJkknId } from '@/lib/services/mentor/resolve';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserAccess, canAssignStudents, canManageMentor } from '@/lib/middleware/access-control';
import { getCurrentUser } from '@/lib/auth/get-current-user';

/**
 * GET /api/mentor/[id]/students
 * Returns all students assigned to the mentor identified by their JKKN staff ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userAccess = await getUserAccess();
  if (!userAccess) return err('Unauthorized', 401);

  try {
    const { id: mentorId } = await params;
    const students = await getStudentsForMentor(mentorId);
    return ok(students, { total: students.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch students';
    console.error('[Students API GET]', message);
    return err(message, 500);
  }
}

/**
 * POST /api/mentor/[id]/students
 * Assigns a student to the mentor identified by their JKKN staff ID.
 * Body: { student: { id, name, email, rollNumber?, year? }, notes? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return err('Unauthorized', 401);

  const userAccess = await getUserAccess();
  if (!userAccess) return err('Unauthorized', 401);

  try {
    const { id: mentorJkknId } = await params;
    const body = await request.json();
    const { student, notes } = body;

    if (!student || !student.id) {
      return err('Student data is required', 400);
    }

    // Resolve JKKN staff ID → Supabase mentor record
    const supabaseAdmin = createAdminClient();
    const resolved = await resolveMentorByJkknId(mentorJkknId, supabaseAdmin);

    if (!resolved) {
      return err(`Mentor not found for JKKN ID ${mentorJkknId}`, 404);
    }

    // Authorization: can the current user assign students to this mentor?
    const canAssign = await canAssignStudents(
      userAccess,
      resolved.mentor.id,
      resolved.mentor.institution_id ?? ''
    );
    if (!canAssign) {
      return err('Forbidden: You do not have permission to assign students to this mentor', 403);
    }

    // Institution boundary check for non-super-admins
    if (!userAccess.isSuperAdmin) {
      const institutionId = resolved.mentor.institution_id;
      if (
        userAccess.institutionId &&
        institutionId !== userAccess.institutionId &&
        !userAccess.isMentorIncharge
      ) {
        return err('Forbidden: Cannot assign students across institution boundaries', 403);
      }
      if (
        userAccess.isMentorIncharge &&
        institutionId !== userAccess.mentorInchargeInstitutionId
      ) {
        return err('Forbidden: Cannot assign students outside your assigned institution', 403);
      }
    }

    const result = await assignStudentsToMentor(
      resolved.mentor.id,
      [
        {
          studentId: student.id,
          name: student.name,
          email: student.email,
          rollNumber: student.rollNumber,
          year: student.year,
        },
      ],
      currentUser.id
    );

    // Surface any per-student errors as a conflict response
    if (result.assigned === 0 && result.errors.length > 0) {
      return err(result.errors[0], 409);
    }

    return ok({ message: 'Student assigned successfully', ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to assign student';
    console.error('[Students API POST]', message);
    return err(message, 500);
  }
}

/**
 * DELETE /api/mentor/[id]/students
 * Removes a student from the mentor. The student ID is read from the request URL path
 * (/api/mentor/[id]/students/[studentId]) or from the query string (?studentId=...).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userAccess = await getUserAccess();
  if (!userAccess) return err('Unauthorized', 401);

  try {
    const { id: mentorJkknId } = await params;

    // Support both URL path segment and query param for studentId
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const studentId = pathParts[5] || url.searchParams.get('studentId') || '';

    if (!mentorJkknId || !studentId) {
      return err('Missing mentor ID or student ID', 400);
    }

    const supabaseAdmin = createAdminClient();
    const resolved = await resolveMentorByJkknId(mentorJkknId, supabaseAdmin);
    if (!resolved) return err('Mentor not found', 404);

    const canManage = await canManageMentor(
      userAccess,
      resolved.mentor.id,
      resolved.mentor.institution_id || ''
    );
    if (!canManage) return err('Permission denied', 403);

    await removeStudentFromMentor(mentorJkknId, studentId);
    return ok({ removed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove student';
    console.error('[Students API DELETE]', message);
    return err(message, 500);
  }
}
