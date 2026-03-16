/**
 * Standalone JKKN student sync script
 * Run with: node scripts/run-sync.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const API_KEY = env.NEXT_PUBLIC_MYJKKN_API_KEY;
const BASE_URL = env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function paginateAll(endpoint, limit, maxPages) {
  const results = [];
  for (let page = 1; page <= maxPages; page++) {
    const sep = endpoint.includes('?') ? '&' : '?';
    const url = `${BASE_URL}${endpoint}${sep}page=${page}&limit=${limit}`;
    console.log(`  Fetching page ${page}...`);

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
    });

    if (!res.ok) {
      if (res.status === 404) break;
      throw new Error(`API error ${res.status} for ${endpoint}`);
    }

    const json = await res.json();
    const pageData = json.data || [];
    results.push(...pageData);
    console.log(`  Page ${page}: ${pageData.length} records`);

    if (pageData.length < limit) break;
    const meta = json.pagination || json.metadata;
    if (meta) {
      const totalPages = meta.totalPages || meta.total_pages;
      if (totalPages && page >= totalPages) break;
    }
  }
  return results;
}

async function syncStudents() {
  console.log('\n=== Syncing Students ===');
  const records = await paginateAll(
    '/api-management/learners/profiles?lifecycle_status=active,alumni,exited,graduated,inactive',
    200, 75
  );
  console.log(`Fetched ${records.length} total learner records from JKKN API`);

  const rows = records.map(r => {
    const firstName = r.first_name || r.firstName || '';
    const lastName = r.last_name || r.lastName || '';
    const name = `${firstName} ${lastName}`.trim() || r.name || r.email || 'Unknown';
    const institutionId = typeof r.institution === 'object'
      ? (r.institution?.id || null)
      : (r.institution_id || r.institution || null);
    const departmentId = typeof r.department === 'object'
      ? (r.department?.id || null)
      : (r.department_id || r.department || null);
    const rollNumber = String(r.roll_number || r.rollNumber || r.roll_no || r.register_number || r.id || '');

    return {
      id: r.id || r.student_id,
      roll_number: rollNumber,
      name,
      email: r.email || r.college_email || r.student_email || null,
      department_id: departmentId,
      institution_id: institutionId,
      year: (r.year || r.current_year || r.admission_year)
        ? String(r.year || r.current_year || r.admission_year || '') : null,
      section: r.section || null,
      academic_year: r.academic_year || null,
      lifecycle_status: r.lifecycle_status || r.lifecycleStatus || null,
      is_active: r.is_active ?? r.isActive ?? true,
      synced_at: new Date().toISOString(),
    };
  }).filter(r => {
    if (!r.id || !r.roll_number) return false;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}/.test(String(r.roll_number))) return false;
    return true;
  });

  console.log(`After filtering: ${rows.length} valid rows`);

  // Deduplicate by roll_number (JKKN API can return same student twice)
  const rollMap = new Map();
  for (const r of rows) {
    const existing = rollMap.get(r.roll_number);
    if (!existing) {
      rollMap.set(r.roll_number, r);
    } else {
      // Prefer jkkn.ac.in email and active lifecycle
      const existingIsOfficial = (existing.email || '').includes('@jkkn.ac.in');
      const newIsOfficial = (r.email || '').includes('@jkkn.ac.in');
      if ((newIsOfficial && !existingIsOfficial) || (r.lifecycle_status === 'active' && existing.lifecycle_status !== 'active')) {
        rollMap.set(r.roll_number, r);
      }
    }
  }
  const dedupedRows = Array.from(rollMap.values());
  console.log(`After dedup by roll_number: ${dedupedRows.length} unique rows (removed ${rows.length - dedupedRows.length} duplicates)`);

  // Upsert to jkkn_students in chunks
  const rows_final = dedupedRows;
  const chunkSize = 500;
  for (let i = 0; i < rows_final.length; i += chunkSize) {
    const chunk = rows_final.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('jkkn_students')
      .upsert(chunk, { onConflict: 'roll_number' });
    if (error) throw new Error(`Chunk ${Math.floor(i / chunkSize) + 1} failed: ${error.message}`);
    console.log(`  Upserted chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(rows_final.length / chunkSize)}`);
  }

  // Reconcile: deactivate local students not in JKKN active set
  const activeRolls = new Set(
    dedupedRows.filter(r => r.lifecycle_status === 'active').map(r => r.roll_number)
  );
  console.log(`\nActive learners in JKKN API: ${activeRolls.size}`);

  const { data: localStudents } = await supabase
    .from('students')
    .select('id, roll_number, name, institution_id')
    .eq('is_active', true);

  const stale = (localStudents || []).filter(s => s.roll_number && !activeRolls.has(s.roll_number));
  console.log(`Local active students NOT in JKKN active set: ${stale.length}`);

  if (stale.length > 0) {
    // Check mentor assignments
    const staleIds = stale.map(s => s.id);
    const { data: assigned } = await supabase
      .from('mentor_students')
      .select('student_id')
      .in('student_id', staleIds);
    const assignedSet = new Set((assigned || []).map(a => a.student_id));

    const safeToDeactivate = staleIds.filter(id => !assignedSet.has(id));
    const skipped = staleIds.filter(id => assignedSet.has(id));

    console.log(`  Safe to deactivate: ${safeToDeactivate.length}`);
    console.log(`  Skipped (has mentor): ${skipped.length}`);

    if (safeToDeactivate.length > 0) {
      for (let i = 0; i < safeToDeactivate.length; i += chunkSize) {
        const chunk = safeToDeactivate.slice(i, i + chunkSize);
        await supabase
          .from('students')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .in('id', chunk);
      }
      console.log(`  Deactivated ${safeToDeactivate.length} stale students`);
    }

    // Show breakdown by institution
    const byInst = {};
    stale.forEach(s => {
      const inst = s.institution_id || 'NULL';
      byInst[inst] = (byInst[inst] || 0) + 1;
    });
    console.log('\n  Stale students by institution:');
    Object.entries(byInst).sort((a, b) => b[1] - a[1]).forEach(([inst, count]) => {
      console.log(`    ${inst}: ${count}`);
    });
  }

  // Final counts
  const { count: finalCount } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  const { count: pharmacyCount } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('institution_id', '5736d86f-5dab-4b7f-9aa1-b3bb1a2dd334');

  console.log(`\n=== Final Counts ===`);
  console.log(`Total active students: ${finalCount}`);
  console.log(`Pharmacy active students: ${pharmacyCount}`);
  console.log(`jkkn_students synced: ${dedupedRows.length}`);
}

syncStudents().catch(e => {
  console.error('Sync failed:', e.message);
  process.exit(1);
});
