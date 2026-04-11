/**
 * Path A — Force re-sync via existing self-heal.
 *
 * Invokes fetchAndBackfillInstitutionDepartment() from the existing self-heal
 * utility to retry the Tier 1 → 2 → 3 JKKN lookup. No new logic — just runs
 * what login-time self-heal would have run if it had fired.
 *
 * Only run this if diagnose-hodcommerce.ts section 6 showed JKKN has data for her.
 *
 * Run: npx tsx scripts/resync-hodcommerce.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { fetchAndBackfillInstitutionDepartment } from '@/lib/services/mentor/resolve';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TARGET_EMAIL = 'hodcommerce@jkkn.ac.in';

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log(`\nRe-running self-heal for ${TARGET_EMAIL}...\n`);

  const { data: user } = await supabase
    .from('users')
    .select('id, jkkn_user_id, email, department_id, institution_id')
    .ilike('email', TARGET_EMAIL)
    .maybeSingle();

  if (!user) {
    console.error('User not found. She must log in at least once before resync can run.');
    process.exit(1);
  }

  console.log('Before:');
  console.log('  department_id :', user.department_id ?? '(empty)');
  console.log('  institution_id:', user.institution_id ?? '(empty)');

  const enriched = await fetchAndBackfillInstitutionDepartment(
    user.id,
    user.jkkn_user_id ?? null,
    user.email ?? null
  );

  if (!enriched) {
    console.error('\nSelf-heal failed on all tiers. Use Path B (scripts/fix-hodcommerce.ts) instead.');
    process.exit(1);
  }

  const { data: userAfter } = await supabase
    .from('users')
    .select('department_id, institution_id')
    .eq('id', user.id)
    .single();

  console.log('\nAfter:');
  console.log('  department_id :', userAfter?.department_id ?? '(empty)');
  console.log('  institution_id:', userAfter?.institution_id ?? '(empty)');

  console.log('\nDone. Re-run scripts/diagnose-hodcommerce.ts to confirm, then ask MRS. PUNITHAMALAR to log out and log back in.\n');
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
