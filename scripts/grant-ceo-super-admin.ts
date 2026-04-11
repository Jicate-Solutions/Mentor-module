/**
 * Grant super_admin access to ceo@jkkn.ac.in.
 *
 * Idempotent: if the row doesn't exist yet, the login-time override in
 * lib/supabase/auth.ts will promote them on first sign-in.
 *
 * Run: npx tsx scripts/grant-ceo-super-admin.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TARGET_EMAIL = 'ceo@jkkn.ac.in';

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log(`\nGranting super_admin to ${TARGET_EMAIL}...\n`);

  const { data: existing, error: fetchError } = await supabase
    .from('users')
    .select('id, email, role, is_super_admin, institution_id')
    .ilike('email', TARGET_EMAIL)
    .maybeSingle();

  if (fetchError) {
    console.error('Error looking up user:', fetchError);
    process.exit(1);
  }

  if (!existing) {
    console.log(`No existing row for ${TARGET_EMAIL}.`);
    console.log('The login-time override will promote them on first sign-in.');
    console.log('No further action needed.\n');
    return;
  }

  console.log('Current state:');
  console.log('  id:', existing.id);
  console.log('  email:', existing.email);
  console.log('  role:', existing.role);
  console.log('  is_super_admin:', existing.is_super_admin);
  console.log('  institution_id:', existing.institution_id);

  if (existing.role === 'super_admin' && existing.is_super_admin === true) {
    console.log('\nAlready super_admin. Nothing to update.\n');
    return;
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ role: 'super_admin', is_super_admin: true })
    .eq('id', existing.id);

  if (updateError) {
    console.error('Error updating user:', updateError);
    process.exit(1);
  }

  const { data: after } = await supabase
    .from('users')
    .select('role, is_super_admin')
    .eq('id', existing.id)
    .single();

  console.log('\nUpdated state:');
  console.log('  role:', after?.role);
  console.log('  is_super_admin:', after?.is_super_admin);
  console.log('\nDone.\n');
}

main().catch((error) => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
