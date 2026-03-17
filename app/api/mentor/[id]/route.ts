import { NextRequest } from 'next/server';
import { getUserAccess, canAccessFacultyProfile } from '@/lib/middleware/access-control';
import { getMentorById } from '@/lib/services/mentor/mentors';
import { resolveMentorByJkknId } from '@/lib/services/mentor/resolve';
import { ok, err } from '@/lib/utils/api-response';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/mentor/[id]
 * Fetch specific mentor details from JKKN API and sync to Supabase.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userAccess = await getUserAccess();
  if (!userAccess) {
    return err('Unauthorized - Please log in', 401);
  }

  const { id: mentorId } = await params;

  try {
    const mentor = await getMentorById(mentorId);

    if (!mentor) {
      return err('Mentor not found', 404);
    }

    // Authorization check — resolve the Supabase user/mentor record via the service layer.
    const supabase = createAdminClient();
    const resolved = await resolveMentorByJkknId(mentorId, supabase);

    if (!resolved) {
      return err('Mentor not found', 404);
    }

    const canAccess = await canAccessFacultyProfile(
      userAccess,
      resolved.user.id,
      resolved.mentor.department_id,
      resolved.mentor.institution_id
    );

    if (!canAccess) {
      return err('You do not have permission to view this profile', 403);
    }

    return ok(mentor);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch mentor details';
    return err(message, 500);
  }
}
