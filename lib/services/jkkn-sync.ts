import { createAdminClient } from '@/lib/supabase/server';

export type SyncEntityType = 'institutions' | 'departments' | 'degrees' | 'programs' | 'students';

export interface SyncResult {
  entity: SyncEntityType;
  totalRecords: number;
  durationMs: number;
  error?: string;
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function getApiCredentials() {
  const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';
  return { apiKey, baseUrl };
}

/**
 * Generic JKKN API paginator.
 * Fetches pages 1..maxPages with the given endpoint (which should include query params except page).
 * Stops early when a page returns fewer results than the limit.
 */
async function paginateAll<T>(
  endpoint: string,
  limit: number,
  maxPages: number
): Promise<T[]> {
  const { apiKey, baseUrl } = getApiCredentials();
  if (!apiKey) throw new Error('NEXT_PUBLIC_MYJKKN_API_KEY not configured');

  const results: T[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const url = `${baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${page}&limit=${limit}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      if (res.status === 404) break;
      throw new Error(`JKKN API error ${res.status} for ${endpoint}`);
    }

    const json = await res.json();
    const pageData: T[] = json.data || [];
    results.push(...pageData);

    // Stop if we got fewer records than the limit (last page)
    if (pageData.length < limit) break;

    // Also check pagination metadata
    const meta = json.pagination || json.metadata;
    if (meta) {
      const totalPages = meta.totalPages || meta.total_pages;
      if (totalPages && page >= totalPages) break;
    }
  }

  return results;
}

async function logSyncStart(entity: SyncEntityType): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('jkkn_sync_log')
    .insert({ entity_type: entity, status: 'running' })
    .select('id')
    .single();
  if (error) throw new Error(`Failed to create sync log: ${error.message}`);
  return data.id;
}

async function logSyncEnd(logId: string, total: number, error?: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from('jkkn_sync_log')
    .update({
      completed_at: new Date().toISOString(),
      total_records: total,
      status: error ? 'failed' : 'completed',
      error_message: error || null,
    })
    .eq('id', logId);
}

// ── Public sync functions ──────────────────────────────────────────────────────

export async function syncInstitutions(): Promise<SyncResult> {
  const start = Date.now();
  const logId = await logSyncStart('institutions');
  try {
    const records = await paginateAll<any>('/api-management/organizations/institutions', 200, 10);

    const rows = records.map((r: any) => ({
      id: r.id || r.institution_id,
      name: r.name || r.institution_name || 'Unnamed',
      counselling_code: r.counselling_code || r.counsellingCode || null,
      category: r.category || null,
      institution_type: r.institution_type || r.institutionType || null,
      is_active: r.is_active ?? r.isActive ?? true,
      synced_at: new Date().toISOString(),
    })).filter((r: any) => r.id);

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('jkkn_institutions')
      .upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(error.message);

    await logSyncEnd(logId, rows.length);
    return { entity: 'institutions', totalRecords: rows.length, durationMs: Date.now() - start };
  } catch (e: any) {
    await logSyncEnd(logId, 0, e.message);
    return { entity: 'institutions', totalRecords: 0, durationMs: Date.now() - start, error: e.message };
  }
}

export async function syncDepartments(): Promise<SyncResult> {
  const start = Date.now();
  const logId = await logSyncStart('departments');
  try {
    const records = await paginateAll<any>('/api-management/organizations/departments', 500, 10);

    const rows = records.map((r: any) => ({
      id: r.id || r.department_id,
      name: r.name || r.department_name || 'Unnamed',
      code: r.code || r.department_code || r.short_name || null,
      institution_id: r.institution_id || r.institutionId || null,
      is_active: r.is_active ?? r.isActive ?? true,
      synced_at: new Date().toISOString(),
    })).filter((r: any) => r.id);

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('jkkn_departments')
      .upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(error.message);

    await logSyncEnd(logId, rows.length);
    return { entity: 'departments', totalRecords: rows.length, durationMs: Date.now() - start };
  } catch (e: any) {
    await logSyncEnd(logId, 0, e.message);
    return { entity: 'departments', totalRecords: 0, durationMs: Date.now() - start, error: e.message };
  }
}

export async function syncDegrees(): Promise<SyncResult> {
  const start = Date.now();
  const logId = await logSyncStart('degrees');
  try {
    // JKKN has no dedicated degrees endpoint — extract unique degrees from programs
    const programs = await paginateAll<any>('/api-management/organizations/programs', 500, 10);

    const degreesMap = new Map<string, any>();
    programs.forEach((p: any) => {
      const degreeId = p.degree_id;
      if (degreeId && !degreesMap.has(degreeId)) {
        degreesMap.set(degreeId, {
          id: degreeId,
          name: p.degree_name || degreeId,
          degree_type: p.degree_type || null,
          synced_at: new Date().toISOString(),
        });
      }
    });

    const rows = Array.from(degreesMap.values());

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('jkkn_degrees')
      .upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(error.message);

    await logSyncEnd(logId, rows.length);
    return { entity: 'degrees', totalRecords: rows.length, durationMs: Date.now() - start };
  } catch (e: any) {
    await logSyncEnd(logId, 0, e.message);
    return { entity: 'degrees', totalRecords: 0, durationMs: Date.now() - start, error: e.message };
  }
}

export async function syncPrograms(): Promise<SyncResult> {
  const start = Date.now();
  const logId = await logSyncStart('programs');
  try {
    const records = await paginateAll<any>('/api-management/organizations/programs', 500, 10);

    const rows = records.map((r: any) => {
      let code = r.code || r.program_code || r.short_name || r.abbreviation || '';
      if (!code && r.id && typeof r.id === 'string') {
        const m = r.id.match(/^([A-Z]{2,5}-?\d+)/);
        if (m) code = m[1];
      }
      if (!code) code = r.program_id ? String(r.program_id).substring(0, 8).toUpperCase() : 'N/A';

      return {
        id: r.id || r.program_id,
        name: r.name || r.program_name || 'Unnamed',
        code,
        department_id: r.department_id || r.departmentId || r.department?.id || null,
        degree_id: r.degree_id || r.degreeId || null,
        institution_id: r.institution_id || r.institutionId || r.institution?.id || null,
        is_active: r.is_active ?? r.isActive ?? true,
        synced_at: new Date().toISOString(),
      };
    }).filter((r: any) => r.id);

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('jkkn_programs')
      .upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(error.message);

    await logSyncEnd(logId, rows.length);
    return { entity: 'programs', totalRecords: rows.length, durationMs: Date.now() - start };
  } catch (e: any) {
    await logSyncEnd(logId, 0, e.message);
    return { entity: 'programs', totalRecords: 0, durationMs: Date.now() - start, error: e.message };
  }
}

export async function syncStudents(): Promise<SyncResult> {
  const start = Date.now();
  const logId = await logSyncStart('students');
  try {
    const records = await paginateAll<any>(
      '/api-management/learners/profiles?lifecycle_status=active,alumni,exited,graduated,inactive',
      200,
      75
    );

    const rows = records.map((r: any) => {
      const firstName = r.first_name || r.firstName || '';
      const lastName = r.last_name || r.lastName || '';
      const name = `${firstName} ${lastName}`.trim() || r.name || r.email || 'Unknown';

      const institutionId =
        typeof r.institution === 'object' ? (r.institution?.id || null) : (r.institution_id || r.institution || null);
      const departmentId =
        typeof r.department === 'object' ? (r.department?.id || null) : (r.department_id || r.department || null);

      const rollNumber = String(r.roll_number || r.rollNumber || r.roll_no || r.register_number || r.id || '');

      return {
        id: r.id || r.student_id,
        roll_number: rollNumber,
        name,
        email: r.email || r.college_email || r.student_email || null,
        department_id: departmentId,
        institution_id: institutionId,
        year: r.year || r.current_year || r.admission_year ? String(r.year || r.current_year || r.admission_year || '') : null,
        section: r.section || null,
        academic_year: r.academic_year || null,
        lifecycle_status: r.lifecycle_status || r.lifecycleStatus || null,
        is_active: r.is_active ?? r.isActive ?? true,
        synced_at: new Date().toISOString(),
      };
    }).filter((r: any) => r.id && r.roll_number);

    // Upsert in chunks of 500 to avoid payload limits
    const supabase = createAdminClient();
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase
        .from('jkkn_students')
        .upsert(chunk, { onConflict: 'roll_number' });
      if (error) throw new Error(`Chunk ${i / chunkSize + 1} failed: ${error.message}`);
    }

    await logSyncEnd(logId, rows.length);
    return { entity: 'students', totalRecords: rows.length, durationMs: Date.now() - start };
  } catch (e: any) {
    await logSyncEnd(logId, 0, e.message);
    return { entity: 'students', totalRecords: 0, durationMs: Date.now() - start, error: e.message };
  }
}

export async function syncAll(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  // Sequential to avoid JKKN rate limiting
  results.push(await syncInstitutions());
  results.push(await syncDepartments());
  results.push(await syncDegrees());
  results.push(await syncPrograms());
  results.push(await syncStudents());
  return results;
}

// ── Shared department map helper ───────────────────────────────────────────────

/**
 * Returns a Map<departmentId, departmentName>.
 * Uses local jkkn_departments cache if populated; falls back to JKKN API.
 * Replaces the private buildDepartmentMap() in students.ts and counseling.ts.
 */
export async function getDepartmentMap(): Promise<Map<string, string>> {
  const supabase = createAdminClient();
  const map = new Map<string, string>();

  // Check if cache is populated
  const { count } = await supabase
    .from('jkkn_departments')
    .select('*', { count: 'exact', head: true });

  if (count && count > 0) {
    const { data } = await supabase.from('jkkn_departments').select('id, name');
    (data || []).forEach(d => map.set(d.id, d.name));
    return map;
  }

  // Fallback: fetch from JKKN API directly
  const { apiKey, baseUrl } = getApiCredentials();
  if (!apiKey) return map;

  try {
    const res = await fetch(
      `${baseUrl}/api-management/organizations/departments?page=1&limit=500`,
      { headers: { 'Authorization': `Bearer ${apiKey}` }, next: { revalidate: 60 } }
    );
    if (res.ok) {
      const data = await res.json();
      (data.data || []).forEach((dept: any) => {
        const id = dept.id || dept.department_id;
        const name = dept.name || dept.department_name || 'Unknown Department';
        if (id) map.set(id, name);
      });
    }
  } catch (e) {
    console.warn('[getDepartmentMap] Fallback JKKN fetch failed:', e);
  }

  return map;
}
