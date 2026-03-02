import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/utils/api-response';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserAccess, canAssignStudents } from '@/lib/middleware/access-control';
import { resolveMentorByJkknId } from '@/lib/services/mentor/resolve';
import { bulkAssignStudents } from '@/lib/services/mentor/students';

interface BulkStudent {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  department: string;
  year: string;
  institution?: string;
}

interface BulkAssignmentRequest {
  students: BulkStudent[];
}

/**
 * POST /api/mentor/[id]/students/bulk
 * Bulk assign multiple students to a mentor.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userAccess = await getUserAccess();
    if (!userAccess) {
      return err('Unauthorized', 401);
    }

    const { id: mentorJkknId } = await params;
    const { students }: BulkAssignmentRequest = await request.json();

    if (!Array.isArray(students) || students.length === 0) {
      return err('Students array required', 400);
    }

    const MAX_BULK_SIZE = 100;
    if (students.length > MAX_BULK_SIZE) {
      return err(`Maximum ${MAX_BULK_SIZE} students allowed per bulk assignment`, 400);
    }

    console.log('[Bulk Assignment] Starting bulk assignment for', students.length, 'students to mentor:', mentorJkknId);

    const supabase = createAdminClient();
    const resolved = await resolveMentorByJkknId(mentorJkknId, supabase);
    if (!resolved) {
      return err('Mentor not found', 404);
    }

    const canAssign = await canAssignStudents(
      userAccess,
      resolved.mentor.id,
      resolved.mentor.institution_id || ''
    );
    if (!canAssign) {
      return err('Permission denied', 403);
    }

    const results = await bulkAssignStudents(
      resolved.mentor.id,
      students,
      userAccess.userId
    );

    console.log('[Bulk Assignment] Completed:', {
      success: results.success.length,
      alreadyAssigned: results.alreadyAssigned.length,
      failed: results.failed.length,
    });

    return ok({
      results,
      summary: {
        total: students.length,
        assigned: results.success.length,
        alreadyAssigned: results.alreadyAssigned.length,
        failed: results.failed.length,
      },
    });
  } catch (error) {
    console.error('[Bulk Assignment] Error:', error);
    return err(
      'Bulk assignment failed',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
