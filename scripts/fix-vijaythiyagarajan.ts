/**
 * Fix DR. VIJAYTHIYAGARAJAN J's JKKN User ID Mismatch
 *
 * This script updates the jkkn_user_id in the database to match the JKKN API
 *
 * Run: npx tsx scripts/fix-vijaythiyagarajan.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIXING DR. VIJAYTHIYAGARAJAN J JKKN USER ID');
  console.log('='.repeat(80) + '\n');

  const email = 'vijaythiyagarajan.j@jkkn.ac.in';
  const correctJkknUserId = '9dd48e61-f7cc-499a-a885-5151ca4ddc78';

  // Step 1: Check current state
  console.log('Step 1: Checking current state...\n');

  const { data: currentUser, error: fetchError } = await supabase
    .from('users')
    .select('id, email, jkkn_user_id, institution_id')
    .eq('email', email)
    .maybeSingle();

  if (fetchError) {
    console.error('❌ Error fetching user:', fetchError);
    process.exit(1);
  }

  if (!currentUser) {
    console.error(`❌ User not found with email: ${email}`);
    process.exit(1);
  }

  console.log('Current state:');
  console.log('  User ID:', currentUser.id);
  console.log('  Email:', currentUser.email);
  console.log('  JKKN User ID (current):', currentUser.jkkn_user_id);
  console.log('  JKKN User ID (correct):', correctJkknUserId);
  console.log('  Institution ID:', currentUser.institution_id);

  if (currentUser.jkkn_user_id === correctJkknUserId) {
    console.log('\n✅ jkkn_user_id is already correct! No update needed.\n');
    process.exit(0);
  }

  console.log('\n⚠️  jkkn_user_id MISMATCH detected!\n');

  // Step 2: Update
  console.log('Step 2: Updating jkkn_user_id...\n');

  const { error: updateError } = await supabase
    .from('users')
    .update({ jkkn_user_id: correctJkknUserId })
    .eq('email', email);

  if (updateError) {
    console.error('❌ Error updating user:', updateError);
    process.exit(1);
  }

  console.log('✅ Successfully updated jkkn_user_id!\n');

  // Step 3: Verify
  console.log('Step 3: Verifying update...\n');

  const { data: updatedUser, error: verifyError } = await supabase
    .from('users')
    .select('id, email, jkkn_user_id, institution_id')
    .eq('email', email)
    .maybeSingle();

  if (verifyError || !updatedUser) {
    console.error('❌ Error verifying update:', verifyError);
    process.exit(1);
  }

  console.log('Updated state:');
  console.log('  User ID:', updatedUser.id);
  console.log('  Email:', updatedUser.email);
  console.log('  JKKN User ID:', updatedUser.jkkn_user_id);
  console.log('  Institution ID:', updatedUser.institution_id);

  if (updatedUser.jkkn_user_id === correctJkknUserId) {
    console.log('\n✅ VERIFICATION PASSED! jkkn_user_id is now correct.\n');
  } else {
    console.log('\n❌ VERIFICATION FAILED! jkkn_user_id is still incorrect.\n');
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('✅ FIX COMPLETE');
  console.log('='.repeat(80) + '\n');

  console.log('📋 Next Steps:\n');
  console.log('1. Test in Mentor Directory page:');
  console.log('   - Log in as mentor in-charge for JKKN Dental College');
  console.log('   - Search for "VIJAYTHIYAGARAJAN"');
  console.log('   - DR. VIJAYTHIYAGARAJAN J should now appear ✅\n');
  console.log('2. Verify student count shows correctly\n');
  console.log('3. Check that designation shows as "Reader"\n');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
