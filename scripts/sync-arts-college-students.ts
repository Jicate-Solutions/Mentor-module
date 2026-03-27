/**
 * Diagnose & Sync Arts College Students from JKKN API
 *
 * 1. Lists all institutions to find arts college ID
 * 2. Counts arts students in JKKN API vs jkkn_students cache
 * 3. Syncs missing students into cache + local students table
 * 4. Reports email coverage for assigned students
 *
 * Run: npx tsx scripts/sync-arts-college-students.ts
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_MYJKKN_API_KEY
 *   NEXT_PUBLIC_MYJKKN_BASE_URL
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JKKN_API_KEY = process.env.NEXT_PUBLIC_MYJKKN_API_KEY!;
const JKKN_BASE_URL = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchPaginated(endpoint: string, maxPages = 100): Promise<any[]> {
  const PAGE_SIZE = 200;
  let all: any[] = [];
  let page = 1;

  while (page <= maxPages) {
    const sep = endpoint.includes('?') ? '&' : '?';
    const url = `${JKKN_BASE_URL}${endpoint}${sep}page=${page}&limit=${PAGE_SIZE}`;
    console.log(`  Fetching page ${page}...`);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${JKKN_API_KEY}` },
    });

    if (!res.ok) {
      console.error(`  Page ${page} failed: ${res.status}`);
      break;
    }

    const data = await res.json();
    const items = data.data || [];
    all = all.concat(items);

    if (items.length < PAGE_SIZE) break;
    const meta = data.pagination || data.metadata;
    if (meta?.totalPages && page >= meta.totalPages) break;
    page++;
  }

  return all;
}

function extractInstitutionId(s: any): string {
  if (typeof s.institution === 'object' && s.institution?.id) return s.institution.id;
  if (typeof s.institution === 'string') return s.institution;
  return s.institution_id || '';
}

function extractDepartmentId(s: any): string {
  if (typeof s.department === 'object' && s.department?.id) return s.department.id;
  if (typeof s.department === 'string') return s.department;
  return s.department_id || '';
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !JKKN_API_KEY) {
    throw new Error('Missing env vars. Check .env.local');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 1: Find ALL institutions
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('STEP 1: Fetching all institutions from JKKN API');
  console.log('═'.repeat(70));

  const institutions = await fetchPaginated('/api-management/organizations/institutions', 5);
  console.log(`\nFound ${institutions.length} institutions:\n`);

  const institutionMap = new Map<string, string>();
  for (const inst of institutions) {
    const id = inst.id || inst.institution_id;
    const name = inst.name || inst.institution_name || 'Unknown';
    if (id) {
      institutionMap.set(id, name);
      const isArts = name.toLowerCase().includes('art');
      console.log(`  ${isArts ? '→' : ' '} ${name}`);
      console.log(`    ID: ${id}`);
    }
  }

  // Find arts college(s)
  const artsInstitutions: { id: string; name: string }[] = [];
  for (const [id, name] of institutionMap.entries()) {
    if (name.toLowerCase().includes('art') || name.toLowerCase().includes('science')) {
      artsInstitutions.push({ id, name });
    }
  }

  if (artsInstitutions.length === 0) {
    console.log('\n⚠ No institution with "art" or "science" found in name.');
    console.log('Listing all institution names for manual identification:');
    for (const [id, name] of institutionMap.entries()) {
      console.log(`  - "${name}" → ${id}`);
    }
    // Continue anyway — sync ALL students
  } else {
    console.log(`\n✓ Found arts/science institution(s):`);
    artsInstitutions.forEach(a => console.log(`  ${a.name} → ${a.id}`));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 2: Fetch ALL learners from JKKN API
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('STEP 2: Fetching ALL learners from JKKN API');
  console.log('═'.repeat(70));

  const allLearners = await fetchPaginated(
    '/api-management/learners/profiles?lifecycle_status=active,alumni,exited,graduated,inactive'
  );
  console.log(`\nTotal learners from JKKN API: ${allLearners.length}`);

  // Group by institution
  const byInstitution = new Map<string, any[]>();
  for (const s of allLearners) {
    const instId = extractInstitutionId(s);
    if (!byInstitution.has(instId)) byInstitution.set(instId, []);
    byInstitution.get(instId)!.push(s);
  }

  console.log('\nLearners by institution:');
  for (const [instId, students] of byInstitution.entries()) {
    const instName = institutionMap.get(instId) || 'Unknown';
    const isArts = artsInstitutions.some(a => a.id === instId);
    console.log(`  ${isArts ? '→' : ' '} ${instName}: ${students.length} learners`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 3: Check current cache state
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('STEP 3: Checking current jkkn_students cache');
  console.log('═'.repeat(70));

  const { count: totalCached } = await supabase
    .from('jkkn_students')
    .select('*', { count: 'exact', head: true });

  console.log(`Total cached students: ${totalCached}`);

  // Check per institution in cache
  for (const [instId, instName] of institutionMap.entries()) {
    const { count } = await supabase
      .from('jkkn_students')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', instId);

    const apiCount = byInstitution.get(instId)?.length || 0;
    const isArts = artsInstitutions.some(a => a.id === instId);
    const diff = apiCount - (count || 0);
    const status = diff > 0 ? `⚠ MISSING ${diff}` : '✓';

    console.log(`  ${isArts ? '→' : ' '} ${instName}: cache=${count || 0}, API=${apiCount} ${status}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 4: Full sync — upsert ALL learners into jkkn_students cache
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('STEP 4: Syncing ALL learners to jkkn_students cache');
  console.log('═'.repeat(70));

  const rows = allLearners.map((r: any) => {
    const firstName = r.first_name || r.firstName || '';
    const lastName = r.last_name || r.lastName || '';
    const name = `${firstName} ${lastName}`.trim() || r.name || r.email || 'Unknown';

    const instId = extractInstitutionId(r);
    const deptId = extractDepartmentId(r);

    const rawRoll = r.roll_number || r.rollNumber || r.roll_no || r.register_number || '';
    const isUuidRoll = !rawRoll || /^[0-9a-f]{8}-[0-9a-f]{4}/.test(String(rawRoll));
    const rollNumber = isUuidRoll
      ? `JKKN-${(r.id || '').substring(0, 8).toUpperCase()}`
      : String(rawRoll);

    return {
      id: r.id,
      roll_number: rollNumber,
      name,
      email: r.college_email || r.student_email || r.email || null,
      department_id: deptId,
      institution_id: instId,
      year: r.year || r.current_year || r.admission_year
        ? String(r.year || r.current_year || r.admission_year || '')
        : null,
      section: r.section || null,
      academic_year: r.academic_year || null,
      lifecycle_status: r.lifecycle_status || null,
      is_active: r.is_active ?? r.isActive ?? true,
      synced_at: new Date().toISOString(),
    };
  }).filter((r: any) => r.id && r.roll_number);

  // Deduplicate by id, then by roll_number (prefer active)
  const idMap = new Map<string, typeof rows[0]>();
  for (const r of rows) {
    const existing = idMap.get(r.id);
    if (!existing || (r.lifecycle_status === 'active' && existing.lifecycle_status !== 'active')) {
      idMap.set(r.id, r);
    }
  }
  const rollMap = new Map<string, typeof rows[0]>();
  for (const r of idMap.values()) {
    const existing = rollMap.get(r.roll_number);
    if (!existing || (r.lifecycle_status === 'active' && existing.lifecycle_status !== 'active')) {
      rollMap.set(r.roll_number, r);
    }
  }
  const deduped = Array.from(rollMap.values());

  console.log(`Deduped records: ${deduped.length} (from ${rows.length} raw)`);

  // Upsert in chunks (no clear — safer, handles partial failures)
  const CHUNK = 250;
  let upserted = 0;
  let retries = 0;
  for (let i = 0; i < deduped.length; i += CHUNK) {
    const chunk = deduped.slice(i, i + CHUNK);
    let success = false;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error } = await supabase
        .from('jkkn_students')
        .upsert(chunk, { onConflict: 'id', ignoreDuplicates: true });

      if (!error) {
        upserted += chunk.length;
        success = true;
        break;
      }

      if (attempt < 3) {
        retries++;
        console.warn(`  Chunk ${Math.floor(i / CHUNK) + 1} failed (attempt ${attempt}), retrying...`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
      } else {
        console.error(`  ✗ Chunk ${Math.floor(i / CHUNK) + 1} failed after 3 attempts: ${error.message}`);
      }
    }
  }
  if (retries > 0) console.log(`  (${retries} retries needed)`)

  console.log(`✓ Upserted ${upserted} records into jkkn_students`);

  // Verify per institution after sync
  console.log('\nPost-sync verification:');
  for (const [instId, instName] of institutionMap.entries()) {
    const { count } = await supabase
      .from('jkkn_students')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', instId);

    const apiCount = byInstitution.get(instId)?.length || 0;
    const isArts = artsInstitutions.some(a => a.id === instId);
    console.log(`  ${isArts ? '→' : ' '} ${instName}: cache=${count || 0}, API=${apiCount} ${count === apiCount ? '✓' : '⚠'}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 5: Check email coverage for assigned students
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('STEP 5: Checking email coverage for assigned students');
  console.log('═'.repeat(70));

  // Get all assigned students
  const { data: assignedStudents } = await supabase
    .from('students')
    .select('id, name, email, institution_id, roll_number')
    .eq('is_active', true);

  if (!assignedStudents || assignedStudents.length === 0) {
    console.log('No active students in local table.');
  } else {
    let noEmail = 0;
    let placeholderEmail = 0;
    let realEmail = 0;
    const noEmailStudents: { name: string; id: string; institution: string }[] = [];

    for (const s of assignedStudents) {
      if (!s.email || s.email.trim() === '') {
        noEmail++;
        noEmailStudents.push({ name: s.name, id: s.id, institution: institutionMap.get(s.institution_id) || s.institution_id || 'Unknown' });
      } else if (s.email.includes('@student.jkkn.ac.in')) {
        placeholderEmail++;
        noEmailStudents.push({ name: s.name, id: s.id, institution: institutionMap.get(s.institution_id) || s.institution_id || 'Unknown' });
      } else {
        realEmail++;
      }
    }

    console.log(`\nAssigned students email breakdown:`);
    console.log(`  ✓ Real email (@jkkn.ac.in etc): ${realEmail}`);
    console.log(`  ⚠ Placeholder (@student.jkkn.ac.in): ${placeholderEmail}`);
    console.log(`  ✗ No email: ${noEmail}`);
    console.log(`  Total assigned students: ${assignedStudents.length}`);

    if (noEmailStudents.length > 0) {
      console.log(`\n  Students missing real email (will NOT receive notifications):`);
      // Group by institution
      const byInst = new Map<string, typeof noEmailStudents>();
      for (const s of noEmailStudents) {
        if (!byInst.has(s.institution)) byInst.set(s.institution, []);
        byInst.get(s.institution)!.push(s);
      }
      for (const [inst, students] of byInst.entries()) {
        console.log(`\n    ${inst}: ${students.length} students without real email`);
        students.slice(0, 5).forEach(s => console.log(`      - ${s.name} (${s.id})`));
        if (students.length > 5) console.log(`      ... and ${students.length - 5} more`);
      }
    }

    // ── Fix: Update placeholder emails from JKKN API ──────────────────────
    if (placeholderEmail > 0) {
      console.log(`\n  Attempting to resolve ${placeholderEmail} placeholder emails from JKKN API...`);

      const placeholders = assignedStudents.filter(
        s => s.email?.includes('@student.jkkn.ac.in')
      );

      // Build lookup from JKKN cache (which we just synced)
      let resolved = 0;
      for (const s of placeholders) {
        // Try to find in jkkn_students cache by id or roll_number
        const { data: cached } = await supabase
          .from('jkkn_students')
          .select('email')
          .or(`id.eq.${s.id},roll_number.eq.${s.roll_number}`)
          .not('email', 'is', null)
          .limit(1)
          .maybeSingle();

        if (cached?.email && !cached.email.includes('@student.jkkn.ac.in')) {
          const { error } = await supabase
            .from('students')
            .update({ email: cached.email, updated_at: new Date().toISOString() })
            .eq('id', s.id);

          if (!error) {
            resolved++;
            console.log(`    ✓ ${s.name}: ${s.email} → ${cached.email}`);
          }
        }
      }

      console.log(`  Resolved ${resolved}/${placeholderEmail} placeholder emails`);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 6: Log sync to jkkn_sync_log
  // ══════════════════════════════════════════════════════════════════════════
  await supabase.from('jkkn_sync_log').insert({
    entity_type: 'students',
    status: 'completed',
    total_records: deduped.length,
    completed_at: new Date().toISOString(),
  });

  console.log('\n' + '═'.repeat(70));
  console.log('SYNC COMPLETE');
  console.log('═'.repeat(70));
  console.log(`Total students synced to cache: ${upserted}`);
  console.log(`Arts college students should now be visible in mentor search.`);
  console.log(`\nNext steps:`);
  console.log(`  1. Refresh the mentor platform and try assigning arts college students`);
  console.log(`  2. Check email notification logs for delivery status`);
}

main().catch(err => {
  console.error('\n✗ FATAL:', err.message);
  process.exit(1);
});
