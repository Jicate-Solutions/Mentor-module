import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/utils/api-response';
import { syncAll } from '@/lib/services/jkkn-sync';

// Full sync (institutions → students) takes ~80s; leave generous headroom.
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/sync-jkkn
 * Scheduled by Vercel Cron (see vercel.json) to keep the jkkn_* cache tables
 * fresh. Student search reads ONLY from jkkn_students, so without this newly
 * admitted learners (e.g. a new first-year batch) never appear in search until
 * someone manually clicks Refresh.
 *
 * Auth: Vercel sends `Authorization: Bearer ${CRON_SECRET}` automatically when
 * the CRON_SECRET env var is set on the project.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return err('CRON_SECRET not configured', 500);
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return err('Unauthorized', 401);
  }

  const results = await syncAll();
  const failed = results.filter(r => r.error);
  console.log('[cron/sync-jkkn]', JSON.stringify(results));

  if (failed.length > 0) {
    // Non-2xx so the failure shows up in Vercel's cron logs
    return err(`Sync failed for: ${failed.map(f => `${f.entity} (${f.error})`).join(', ')}`, 500);
  }
  return ok({ results });
}
