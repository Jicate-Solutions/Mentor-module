import { getCurrentUser } from '@/lib/auth/get-current-user';
import { getCurrentMentorId } from '@/lib/services/mentor/mentors';
import { ok, err } from '@/lib/utils/api-response';

/**
 * GET /api/mentor/current
 * Get the mentor ID for the currently authenticated user.
 *
 * Returns:
 *  - mentorId: string — the Supabase mentors.id for this user
 *  - userId:   string — the Supabase users.id for this user
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return err('Unauthorized - No user session found', 401);
  }

  try {
    const mentorId = await getCurrentMentorId(user.id);

    if (!mentorId) {
      return err('Mentor record not found', 404);
    }

    return ok({ mentorId, userId: user.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return err(message, 500);
  }
}
