/**
 * Path D — Rebuild the mentors row for hodcommerce@jkkn.ac.in.
 *
 * Use this when the diagnostic shows:
 *   - users row is populated correctly (dept_id + institution_id present)
 *   - but mentors row is missing, OR has empty department/institution_id, OR is_active = false
 *
 * Safe-guards:
 *   - Only runs if users row has BOTH department_id and institution_id.
 *   - Only deletes existing mentors row if it has ZERO mentor_students assignments.
 *     If assignments exist, updates the row in place to preserve relationships.
 *
 * Run: npx tsx scripts/rebuild-mentor-row-hodcommerce.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TARGET_EMAIL = 'hodcommerce@jkkn.ac.in';

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log(`\nRebuilding mentors row for ${TARGET_EMAIL}...\n`);

  const { data: user } = await supabase
    .from('users')
    .select('id, email, department_id, institution_id, designation')
    .ilike('email', TARGET_EMAIL)
    .maybeSingle();

  if (!user) {
    console.error('User not found.');
    process.exit(1);
  }

  if (!user.department_id || !user.institution_id) {
    console.error(
      '\nusers row is missing department_id or institution_id — cannot build mentor row.\n' +
      'Run scripts/resync-hodcommerce.ts or scripts/fix-hodcommerce.ts first.\n'
    );
    process.exit(1);
  }

  const { data: existingMentor } = await supabase
    .from('mentors')
    .select('id, department_id, institution_id, is_active, total_students')
    .eq('user_id', user.id)
    .maybeSingle();

  console.log('Current mentors row:', existingMentor ?? '(none)');

  if (existingMentor) {
    // Check assignments before deciding delete vs update-in-place.
    const { count: assignmentCount } = await supabase
      .from('mentor_students')
      .select('id', { count: 'exact', head: true })
      .eq('mentor_id', existingMentor.id);

    console.log('Existing mentor_students assignments:', assignmentCount);

    // Update in place — preserves the mentor.id so any existing assignments stay linked.
    const { error: updateErr } = await supabase
      .from('mentors')
      .update({
        department_id: user.department_id,
        institution_id: user.institution_id,
        designation: user.designation ?? 'HOD',
        is_active: true,
      })
      .eq('id', existingMentor.id);

    if (updateErr) {
      console.error('Failed to update mentors row:', updateErr);
      process.exit(1);
    }
    console.log('Updated existing mentors row in place.');
  } else {
    // No row — insert a fresh one.
    const { error: insertErr } = await supabase
      .from('mentors')
      .insert({
        user_id: user.id,
        department_id: user.department_id,
        institution_id: user.institution_id,
        designation: user.designation ?? 'HOD',
        total_students: 0,
        is_active: true,
      });

    if (insertErr) {
      console.error('Failed to insert mentors row:', insertErr);
      process.exit(1);
    }
    console.log('Inserted new mentors row.');
  }

  const { data: after } = await supabase
    .from('mentors')
    .select('id, department_id, institution_id, designation, is_active, total_students')
    .eq('user_id', user.id)
    .single();

  console.log('\nAfter:', after);
  console.log('\nDone. Ask MRS. PUNITHAMALAR to log out and log back in.\n');
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
