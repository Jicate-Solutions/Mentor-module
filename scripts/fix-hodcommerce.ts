/**
 * Path B — Manual UUID patch.
 *
 * Use ONLY if scripts/resync-hodcommerce.ts failed (JKKN staff API has no
 * record for her). You must look up the real UUIDs in the JKKN admin UI and
 * fill them in below before running.
 *
 * Updates both `users` and `mentors` rows so RLS and the permission gates
 * see consistent state. Idempotent: re-running is safe.
 *
 * Run: npx tsx scripts/fix-hodcommerce.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TARGET_EMAIL = 'hodcommerce@jkkn.ac.in';

// ⚠️ FILL THESE IN BEFORE RUNNING — look them up in the JKKN admin UI or
//    by querying jkkn_departments / jkkn_institutions for "commerce".
//    Example query:
//      SELECT d.id AS dept_id, d.name, d.institution_id, i.name AS inst_name
//      FROM jkkn_departments d
//      JOIN jkkn_institutions i ON i.id = d.institution_id
//      WHERE d.name ILIKE '%commerce%';
const DEPARTMENT_ID = ''; // e.g. '7b3e...-commerce-uuid'
const INSTITUTION_ID = ''; // e.g. '2a1f...-institution-uuid'

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
    process.exit(1);
  }
  if (!DEPARTMENT_ID || !INSTITUTION_ID) {
    console.error(
      '\nDEPARTMENT_ID and INSTITUTION_ID are empty.\n' +
      'Edit this file and set the real UUIDs before running.\n' +
      'See the comment block at the top of the file for a lookup query.\n'
    );
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Validate the UUIDs actually exist in the cache tables before touching user rows.
  const [{ data: dept }, { data: inst }] = await Promise.all([
    supabase.from('jkkn_departments').select('id, name, institution_id').eq('id', DEPARTMENT_ID).maybeSingle(),
    supabase.from('jkkn_institutions').select('id, name').eq('id', INSTITUTION_ID).maybeSingle(),
  ]);

  if (!dept) {
    console.error(`DEPARTMENT_ID ${DEPARTMENT_ID} not found in jkkn_departments.`);
    process.exit(1);
  }
  if (!inst) {
    console.error(`INSTITUTION_ID ${INSTITUTION_ID} not found in jkkn_institutions.`);
    process.exit(1);
  }
  if (dept.institution_id && dept.institution_id !== INSTITUTION_ID) {
    console.error(
      `Sanity check failed: department "${dept.name}" belongs to institution ${dept.institution_id}, ` +
      `not ${INSTITUTION_ID}. Double-check the UUIDs.`
    );
    process.exit(1);
  }

  console.log(`\nPatching ${TARGET_EMAIL}:`);
  console.log(`  department: ${dept.name} (${DEPARTMENT_ID})`);
  console.log(`  institution: ${inst.name} (${INSTITUTION_ID})\n`);

  const { data: user, error: userLookupErr } = await supabase
    .from('users')
    .select('id, department_id, institution_id')
    .ilike('email', TARGET_EMAIL)
    .maybeSingle();

  if (userLookupErr || !user) {
    console.error('User not found in users table:', userLookupErr);
    process.exit(1);
  }

  console.log('Before:');
  console.log('  users.department_id :', user.department_id ?? '(empty)');
  console.log('  users.institution_id:', user.institution_id ?? '(empty)');

  const { error: userUpdateErr } = await supabase
    .from('users')
    .update({ department_id: DEPARTMENT_ID, institution_id: INSTITUTION_ID })
    .eq('id', user.id);

  if (userUpdateErr) {
    console.error('Failed to update users row:', userUpdateErr);
    process.exit(1);
  }

  // Upsert the mentors row so the permission gate's second check
  // (`targetMentor.department_id === userAccess.departmentId`) lines up
  // when she acts on her own mentor record.
  const { error: mentorUpsertErr } = await supabase
    .from('mentors')
    .upsert(
      {
        user_id: user.id,
        department_id: DEPARTMENT_ID,
        institution_id: INSTITUTION_ID,
        is_active: true,
      },
      { onConflict: 'user_id' }
    );

  if (mentorUpsertErr) {
    console.error('Failed to upsert mentors row:', mentorUpsertErr);
    process.exit(1);
  }

  const { data: userAfter } = await supabase
    .from('users')
    .select('department_id, institution_id')
    .eq('id', user.id)
    .single();
  const { data: mentorAfter } = await supabase
    .from('mentors')
    .select('id, department_id, institution_id, is_active')
    .eq('user_id', user.id)
    .single();

  console.log('\nAfter:');
  console.log('  users.department_id :', userAfter?.department_id);
  console.log('  users.institution_id:', userAfter?.institution_id);
  console.log('  mentors row         :', mentorAfter);

  console.log('\nDone. Ask MRS. PUNITHAMALAR to log out and log back in for RLS to pick up the new context.\n');
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
