/**
 * Diagnostic: Check all dental college mentors for resolution issues
 *
 * Run: npx tsx scripts/diagnose-dental-mentors.ts
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_MYJKKN_API_KEY
 *   NEXT_PUBLIC_MYJKKN_BASE_URL (optional)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_KEY = process.env.NEXT_PUBLIC_MYJKKN_API_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Helpers ────────────────────────────────────────────────────────────────

async function jkknStaffLookup(staffId: string): Promise<'ok' | 'not_found' | 'error'> {
  const endpoints = [
    `${BASE_URL}/api-management/staff/${staffId}`,
    `${BASE_URL}/api-management/organizations/employees/${staffId}`,
  ];
  for (const url of endpoints) {
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` } });
      if (r.ok) return 'ok';
    } catch { /* continue */ }
  }
  return 'not_found';
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase env vars');
  }

  // ── Step 1: Find dental institution(s) ────────────────────────────────
  console.log('='.repeat(70));
  console.log('DENTAL COLLEGE MENTOR DIAGNOSTIC REPORT');
  console.log('='.repeat(70));

  const { data: allInstitutions } = await supabase
    .from('institutions')
    .select('id, institution_name')
    .ilike('institution_name', '%dental%');

  if (!allInstitutions || allInstitutions.length === 0) {
    // Try via users table if no institutions table
    console.log('No "institutions" table match — checking via users...');
    const { data: dentalUsers } = await supabase
      .from('users')
      .select('institution_id')
      .ilike('email', '%dental%')
      .limit(5);
    console.log('Sample institution_ids from dental email users:', dentalUsers?.map(u => u.institution_id));
    return;
  }

  console.log(`\nDental institution(s) found:`);
  allInstitutions.forEach(i => console.log(`  ${i.id} — ${i.institution_name}`));

  for (const institution of allInstitutions) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`Institution: ${institution.institution_name} (${institution.id})`);
    console.log('─'.repeat(70));

    // ── Step 2: Fetch all active mentors for this institution ────────────
    const { data: mentorRows, error: mentorError } = await supabase
      .from('mentors')
      .select(`
        id,
        user_id,
        designation,
        department_id,
        institution_id,
        is_active,
        total_students,
        users!inner (
          id,
          email,
          full_name,
          jkkn_user_id,
          role
        )
      `)
      .eq('institution_id', institution.id)
      .eq('is_active', true)
      .order('users(full_name)');

    if (mentorError) {
      console.error('Error fetching mentors:', mentorError.message);
      continue;
    }

    if (!mentorRows || mentorRows.length === 0) {
      console.log('No active mentors found for this institution.');
      continue;
    }

    console.log(`\nTotal active mentors: ${mentorRows.length}`);
    console.log('');

    // ── Step 3: For each mentor, determine resolution status ─────────────
    const report: Array<{
      name: string;
      email: string;
      mentorsId: string;
      usersId: string;
      jkknUserId: string | null;
      urlUUID: string;
      urlResolvesBy: string;
      jkknApiStatus: string;
      assignedStudents: number;
      issues: string[];
    }> = [];

    for (const row of mentorRows) {
      const user = row.users as any;
      const issues: string[] = [];

      const mentorsId = row.id;
      const usersId = user.id;
      const jkknUserId = user.jkkn_user_id;

      // Determine which UUID ends up in the URL:
      // getMentorList (for faculty role viewing own profile via Tier 4) → userAccess.userId = users.id
      // getMentorList (for admin/HOD browsing) → JKKN staff API id, or users.id via dedup
      // The most common URL UUID for self-view is users.id via Tier 4.
      // For admin view, it's JKKN staff id or users.id from dedup.
      // We flag when mentors.id != users.id (potential mismatch risk).

      // Check how getMentorById resolves each UUID
      const userIdResolvable = usersId !== undefined; // user_id fallback would find mentors WHERE user_id = usersId
      const mentorIdResolvable = true; // our new fix: mentors WHERE id = mentorsId always works

      // Check if jkkn_user_id is set (needed for JKKN API lookup)
      if (!jkknUserId) {
        issues.push('jkkn_user_id is NULL — JKKN API lookup impossible');
      }

      // Check student count discrepancy
      const { count: actualCount } = await supabase
        .from('mentor_students')
        .select('*', { count: 'exact', head: true })
        .eq('mentor_id', mentorsId);

      const storedCount = row.total_students || 0;
      if (actualCount !== null && actualCount !== storedCount) {
        issues.push(`total_students mismatch: stored=${storedCount}, actual=${actualCount}`);
      }

      // Check department_id
      if (!row.department_id) {
        issues.push('department_id is NULL/empty');
      }

      // Determine likely URL UUID and resolution path
      // For Tier 4 (faculty self-view): URL = users.id, resolves via user_id fallback ✅
      // For admin/HOD view via JKKN API: URL = JKKN staff id = jkkn_user_id (possibly)
      //   getMentorById(jkknUserId) → JKKN API ✅ or user_id fallback ✅
      // Edge case: URL = mentors.id → fixed by our new fallback ✅

      let urlResolvesBy = '';
      let urlUUID = '';

      if (jkknUserId) {
        // The JKKN API would return this mentor's entry with their JKKN staff UUID
        // (which may or may not match jkkn_user_id depending on which UUID the HR API uses)
        urlUUID = jkknUserId;
        urlResolvesBy = 'JKKN API (if staff in HR system) or user_id fallback';
      } else {
        // No JKKN link → Tier 4 uses users.id
        urlUUID = usersId;
        urlResolvesBy = 'Tier 4 users.id → user_id Supabase fallback';
      }

      report.push({
        name: user.full_name || '(unknown)',
        email: user.email || '(no email)',
        mentorsId,
        usersId,
        jkknUserId: jkknUserId || null,
        urlUUID,
        urlResolvesBy,
        jkknApiStatus: jkknUserId ? 'to-check' : 'no-jkkn-id',
        assignedStudents: actualCount ?? 0,
        issues,
      });
    }

    // ── Step 4: Check JKKN API reachability for mentors with jkkn_user_id ─
    console.log('Checking JKKN API for each mentor (this may take a moment)...\n');
    for (const r of report) {
      if (r.jkknUserId && r.jkknApiStatus === 'to-check') {
        r.jkknApiStatus = await jkknStaffLookup(r.jkknUserId);
        if (r.jkknApiStatus === 'not_found') {
          r.issues.push(`JKKN API: staff not found for jkkn_user_id=${r.jkknUserId}`);
        }
      }
    }

    // ── Step 5: Print table ───────────────────────────────────────────────
    const pad = (s: string, n: number) => s.padEnd(n).slice(0, n);

    console.log(
      pad('#', 3) +
      pad('Name', 30) +
      pad('Email', 32) +
      pad('Students', 10) +
      pad('JKKN API', 12) +
      'Issues'
    );
    console.log('─'.repeat(110));

    let issueCount = 0;
    report.forEach((r, i) => {
      const hasIssue = r.issues.length > 0;
      if (hasIssue) issueCount++;
      const flag = hasIssue ? '⚠' : '✓';
      console.log(
        pad(`${flag}${i + 1}`, 3) +
        pad(r.name, 30) +
        pad(r.email, 32) +
        pad(String(r.assignedStudents), 10) +
        pad(r.jkknApiStatus, 12) +
        (r.issues.length ? r.issues.join(' | ') : 'OK')
      );
    });

    console.log('─'.repeat(110));
    console.log(`\nSummary: ${report.length} mentors, ${issueCount} with issues`);

    // ── Step 6: Detailed breakdown of mentors with issues ────────────────
    const withIssues = report.filter(r => r.issues.length > 0);
    if (withIssues.length > 0) {
      console.log('\n' + '='.repeat(70));
      console.log('DETAILED ISSUE BREAKDOWN');
      console.log('='.repeat(70));
      withIssues.forEach((r, i) => {
        console.log(`\n[${i + 1}] ${r.name} <${r.email}>`);
        console.log(`    mentors.id : ${r.mentorsId}`);
        console.log(`    users.id   : ${r.usersId}`);
        console.log(`    jkkn_user_id: ${r.jkknUserId ?? 'NULL'}`);
        console.log(`    Students   : ${r.assignedStudents}`);
        r.issues.forEach(issue => console.log(`    ⚠ ${issue}`));
      });
    }

    // ── Step 7: Counseling session creation blockers ─────────────────────
    // Session creation requires: mentor resolvable + has students
    console.log('\n' + '='.repeat(70));
    console.log('COUNSELING SESSION CREATION READINESS');
    console.log('='.repeat(70));
    console.log('A mentor can create sessions if: mentor loads + has ≥1 assigned student\n');

    report.forEach((r, i) => {
      const canLoad = r.jkknApiStatus === 'ok' || r.jkknUserId === null || r.issues.filter(x => !x.includes('total_students') && !x.includes('department_id')).length === 0;
      const hasSessions = r.assignedStudents > 0;
      const status =
        !canLoad ? '✗ MENTOR WONT LOAD' :
        !hasSessions ? '⚠ NO STUDENTS ASSIGNED' :
        '✓ READY';
      console.log(`  ${String(i + 1).padStart(2)}. ${r.name.padEnd(30)} ${status}`);
    });
  }

  console.log('\n' + '='.repeat(70));
  console.log('END OF REPORT');
  console.log('='.repeat(70));
}

main().catch(err => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
