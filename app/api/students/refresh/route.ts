import { getCurrentUser } from '@/lib/auth/get-current-user';
import { ok, err } from '@/lib/utils/api-response';
import { syncStudents } from '@/lib/services/jkkn-sync';

// Allow up to 120s — student sync paginates up to 75 pages from JKKN API
export const maxDuration = 120;

/**
 * POST /api/students/refresh
 * Triggers a fresh student sync from JKKN API, refreshing the jkkn_students cache.
 *
 * Auth: super_admin, institution_admin, mentor_incharge
 * (Intentionally broader than /api/admin/sync — allows institution staff to
 *  self-serve when a newly-enrolled student doesn't appear in the Add Mentee dialog.)
 */
export async function POST() {
  const user = await getCurrentUser();

  const allowedRoles = ['super_admin', 'institution_admin', 'mentor_incharge'];
  if (!user || !allowedRoles.includes(user.role)) {
    return err('Forbidden', 403);
  }

  const result = await syncStudents();

  if (result.error) {
    return err(`Student sync failed: ${result.error}`, 500);
  }

  return ok(result);
}
