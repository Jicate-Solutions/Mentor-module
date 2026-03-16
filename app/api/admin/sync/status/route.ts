import { getCurrentUser } from '@/lib/auth/get-current-user';
import { ok, err } from '@/lib/utils/api-response';
import { createAdminClient } from '@/lib/supabase/server';
import type { SyncEntityType } from '@/lib/services/jkkn-sync';

/**
 * GET /api/admin/sync/status
 * Returns the last completed sync per entity, plus current record counts from cache tables.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'super_admin') {
    return err('Unauthorized', 403);
  }

  const supabase = createAdminClient();
  const entities: SyncEntityType[] = ['institutions', 'departments', 'degrees', 'programs', 'students'];

  const tableMap: Record<SyncEntityType, string> = {
    institutions: 'jkkn_institutions',
    departments: 'jkkn_departments',
    degrees: 'jkkn_degrees',
    programs: 'jkkn_programs',
    students: 'jkkn_students',
  };

  const statusMap: Record<string, any> = {};

  await Promise.all(
    entities.map(async (entity) => {
      const [logResult, countResult] = await Promise.all([
        supabase
          .from('jkkn_sync_log')
          .select('completed_at, total_records, status, error_message')
          .eq('entity_type', entity)
          .in('status', ['completed', 'failed'])
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from(tableMap[entity])
          .select('*', { count: 'exact', head: true }),
      ]);

      statusMap[entity] = {
        lastSyncedAt: logResult.data?.completed_at || null,
        totalRecords: countResult.count || 0,
        status: logResult.data?.status || null,
        errorMessage: logResult.data?.error_message || null,
      };
    })
  );

  return ok(statusMap);
}
