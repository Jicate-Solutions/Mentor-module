/**
 * Diagnose hodcommerce@jkkn.ac.in — READ-ONLY.
 *
 * MRS. PUNITHAMALAR M.S (HOD Commerce) reports she cannot take any action on
 * mentees. This script prints every field the HOD permission gates read so we
 * can pinpoint which one is empty or wrong, without mutating anything.
 *
 * Read-only: every query is a SELECT. Safe to run anytime.
 *
 * Run: npx tsx scripts/diagnose-hodcommerce.ts
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.env.local' });
dotenvConfig();
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JKKN_API_KEY = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
const JKKN_BASE_URL = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

const TARGET_EMAIL = 'hodcommerce@jkkn.ac.in';

function section(title: string) {
  console.log('\n' + '─'.repeat(72));
  console.log(title);
  console.log('─'.repeat(72));
}

function field(label: string, value: unknown) {
  const pretty =
    value === null || value === undefined
      ? '\x1b[31m(empty)\x1b[0m'
      : String(value);
  console.log(`  ${label.padEnd(22)} ${pretty}`);
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log(`\nDiagnosing ${TARGET_EMAIL}`);

  // ── users row ──────────────────────────────────────────────────────────
  section('1. users row');
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, jkkn_user_id, email, full_name, role, department_id, institution_id, is_super_admin, last_login, created_at')
    .ilike('email', TARGET_EMAIL)
    .maybeSingle();

  if (userErr) {
    console.error('Error querying users:', userErr);
    process.exit(1);
  }
  if (!user) {
    console.log('  NO ROW. She has never logged in, or email is stored differently.');
    console.log('  Nothing more to diagnose until first login.');
    return;
  }

  field('id', user.id);
  field('jkkn_user_id', user.jkkn_user_id);
  field('email', user.email);
  field('full_name', user.full_name);
  field('role', user.role);
  field('department_id', user.department_id);
  field('institution_id', user.institution_id);
  field('is_super_admin', user.is_super_admin);
  field('last_login', user.last_login);
  field('created_at', user.created_at);

  const roleIsHod = user.role === 'hod';
  const hasDept = !!user.department_id;
  const hasInst = !!user.institution_id;

  // ── mentors row ────────────────────────────────────────────────────────
  section('2. mentors row (by user_id)');
  const { data: mentor } = await supabase
    .from('mentors')
    .select('id, department_id, institution_id, designation, is_active, total_students')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!mentor) {
    console.log('  NO ROW. ensureMentorRecord has never run successfully for her.');
  } else {
    field('id', mentor.id);
    field('department_id', mentor.department_id || null);
    field('institution_id', mentor.institution_id || null);
    field('designation', mentor.designation);
    field('is_active', mentor.is_active);
    field('total_students', mentor.total_students);
  }
  const mentorRowOk =
    !!mentor && !!mentor.department_id && !!mentor.institution_id && mentor.is_active;

  // ── mentor_incharge_assignments ────────────────────────────────────────
  section('3. mentor_incharge_assignments (by user_id)');
  const { data: incharge } = await supabase
    .from('mentor_incharge_assignments')
    .select('institution_id, scope, created_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!incharge) {
    console.log('  No mentor-in-charge assignment (fine — HODs usually don\'t need one).');
  } else {
    field('institution_id', incharge.institution_id);
    field('scope', incharge.scope);
    field('created_at', incharge.created_at);
  }

  // ── department / institution name lookup ───────────────────────────────
  section('4. Department + institution name lookup');
  if (hasDept) {
    const { data: dept } = await supabase
      .from('jkkn_departments')
      .select('id, name, code, institution_id')
      .eq('id', user.department_id!)
      .maybeSingle();
    if (dept) {
      field('department name', dept.name);
      field('department code', dept.code);
      if (dept.institution_id !== user.institution_id) {
        console.log(
          `  \x1b[33mWARNING:\x1b[0m department's institution_id (${dept.institution_id}) ` +
          `does not match users.institution_id (${user.institution_id})`
        );
      }
    } else {
      console.log(`  \x1b[31mdepartment_id ${user.department_id} not found in jkkn_departments cache.\x1b[0m`);
    }
  } else {
    console.log('  Skipped — users.department_id is empty.');
  }

  if (hasInst) {
    const { data: inst } = await supabase
      .from('jkkn_institutions')
      .select('id, name')
      .eq('id', user.institution_id!)
      .maybeSingle();
    if (inst) {
      field('institution name', inst.name);
    } else {
      console.log(`  \x1b[31minstitution_id ${user.institution_id} not found in jkkn_institutions cache.\x1b[0m`);
    }
  } else {
    console.log('  Skipped — users.institution_id is empty.');
  }

  // ── dependent counts (what she should see post-gate) ───────────────────
  section('5. Dependent counts (what HOD should see)');
  if (hasDept && hasInst) {
    const { count: mentorCount } = await supabase
      .from('mentors')
      .select('id', { count: 'exact', head: true })
      .eq('department_id', user.department_id!)
      .eq('institution_id', user.institution_id!);
    field('mentors in dept+inst', mentorCount);

    const { count: studentCount } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('department_id', user.department_id!);
    field('students in dept', studentCount);

    const { data: deptMentors } = await supabase
      .from('mentors')
      .select('id')
      .eq('department_id', user.department_id!)
      .eq('institution_id', user.institution_id!);
    const mentorIds = (deptMentors ?? []).map((m) => m.id);
    if (mentorIds.length > 0) {
      const { count: assignedCount } = await supabase
        .from('mentor_students')
        .select('id', { count: 'exact', head: true })
        .in('mentor_id', mentorIds);
      field('assigned mentees', assignedCount);
    } else {
      field('assigned mentees', 0);
    }
  } else {
    console.log('  Skipped — dept or institution missing on users row.');
  }

  // ── JKKN staff API probe ───────────────────────────────────────────────
  section('6. JKKN staff API probe (does backfill have a source?)');
  if (!JKKN_API_KEY) {
    console.log('  Skipped — NEXT_PUBLIC_MYJKKN_API_KEY not set in env.');
  } else if (!user.jkkn_user_id) {
    console.log('  Skipped — users.jkkn_user_id is empty.');
  } else {
    try {
      const res = await fetch(`${JKKN_BASE_URL}/api-management/staff/${user.jkkn_user_id}`, {
        headers: { Authorization: `Bearer ${JKKN_API_KEY}` },
      });
      if (!res.ok) {
        console.log(`  Tier 1 (staff-by-id) HTTP ${res.status} — JKKN doesn't know this ID.`);
      } else {
        const json = await res.json();
        const staff = json.data || json;
        const apiInst =
          staff?.institution?.id ?? staff?.institution ?? staff?.institution_id ?? null;
        const apiDept =
          staff?.department?.id ?? staff?.department ?? staff?.department_id ?? null;
        field('JKKN institution_id', apiInst);
        field('JKKN department_id', apiDept);
        field('JKKN role', staff?.role ?? staff?.designation ?? null);
        if (apiInst || apiDept) {
          console.log('  \x1b[32mSelf-heal would succeed if re-run.\x1b[0m');
        } else {
          console.log('  \x1b[33mJKKN returned staff but no inst/dept — manual UUID patch needed.\x1b[0m');
        }
      }
    } catch (err) {
      console.log('  Fetch failed:', err instanceof Error ? err.message : err);
    }
  }

  // ── Verdict ────────────────────────────────────────────────────────────
  section('Verdict — which remediation path?');
  if (!roleIsHod) {
    console.log(`  PATH C: users.role = "${user.role}" (expected "hod"). Add role alias in lib/supabase/auth.ts.`);
  } else if (!hasDept || !hasInst) {
    console.log('  PATH A or B: department_id/institution_id missing on users row.');
    console.log('  → If JKKN probe (section 6) returned data, run scripts/resync-hodcommerce.ts (Path A).');
    console.log('  → If JKKN has nothing, run scripts/fix-hodcommerce.ts with manual UUIDs (Path B).');
  } else if (!mentorRowOk) {
    console.log('  PATH D: users row OK but mentors row missing or hollow. Run scripts/rebuild-mentor-row-hodcommerce.ts.');
  } else {
    console.log('  PATH E: everything looks populated. Problem is likely UI/feature-flag. Investigate frontend.');
    console.log('          Re-check section 5 counts — if mentors/students > 0 and she still sees nothing, check app/(dashboard) HOD pages.');
  }

  console.log('');
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
