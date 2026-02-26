import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/utils/api-response';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserAccess, canManageMentor } from '@/lib/middleware/access-control';
import { resolveMentorByJkknId } from '@/lib/services/mentor/resolve';
import { removeStudentFromMentor } from '@/lib/services/mentor/students';

/**
 * DELETE /api/mentor/[id]/students/[studentId]
 * Remove a student assignment from a mentor.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const userAccess = await getUserAccess();
    if (!userAccess) {
      return err('Unauthorized', 401);
    }

    const { id: mentorId, studentId } = await params;

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

    await removeStudentFromMentor(mentorId, studentId);

    return ok({ message: 'Student removed successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove student';
    console.error('[DELETE Student]', message);
    return err(message, 500);
  }
}
