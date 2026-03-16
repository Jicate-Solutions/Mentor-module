import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { ok, err } from '@/lib/utils/api-response';
import {
  syncAll,
  syncInstitutions,
  syncDepartments,
  syncDegrees,
  syncPrograms,
  syncStudents,
  SyncEntityType,
} from '@/lib/services/jkkn-sync';

// Allow up to 120s for full sync (Vercel function timeout override)
export const maxDuration = 120;

/**
 * POST /api/admin/sync
 * Body: { entity: SyncEntityType | 'all' }
 * Auth: super_admin only
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'super_admin') {
    return err('Unauthorized', 403);
  }

  let body: { entity?: string } = {};
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON body', 400);
  }

  const entity = body.entity || 'all';

  try {
    if (entity === 'all') {
      const results = await syncAll();
      const failed = results.filter(r => r.error);
      return ok({
        results,
        summary: {
          total: results.reduce((s, r) => s + r.totalRecords, 0),
          failed: failed.length,
          entities: results.length,
        },
      });
    }

    const validEntities: SyncEntityType[] = ['institutions', 'departments', 'degrees', 'programs', 'students'];
    if (!validEntities.includes(entity as SyncEntityType)) {
      return err(`Invalid entity "${entity}". Must be one of: ${validEntities.join(', ')}, all`, 400);
    }

    const syncFn = {
      institutions: syncInstitutions,
      departments: syncDepartments,
      degrees: syncDegrees,
      programs: syncPrograms,
      students: syncStudents,
    }[entity as SyncEntityType];

    const result = await syncFn();
    if (result.error) {
      return err(`Sync failed: ${result.error}`, 500);
    }
    return ok(result);
  } catch (e: any) {
    return err(e.message || 'Sync failed', 500);
  }
}

/**
 * GET /api/admin/sync
 * Returns last sync log row per entity_type
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'super_admin') {
    return err('Unauthorized', 403);
  }

  const { createAdminClient } = await import('@/lib/supabase/server');
  const supabase = createAdminClient();

  const entities: SyncEntityType[] = ['institutions', 'departments', 'degrees', 'programs', 'students'];

  const statusMap: Record<string, any> = {};

  await Promise.all(
    entities.map(async (entity) => {
      const { data } = await supabase
        .from('jkkn_sync_log')
        .select('completed_at, total_records, status, error_message')
        .eq('entity_type', entity)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      statusMap[entity] = data
        ? {
            lastSyncedAt: data.completed_at,
            totalRecords: data.total_records,
            status: data.status,
          }
        : null;
    })
  );

  return ok(statusMap);
}
