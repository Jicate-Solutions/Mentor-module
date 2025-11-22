/**
 * Debug Specific Mentor Institution Filtering
 *
 * This script checks:
 * 1. What institution ID a mentor has in the database
 * 2. What institution ID they have in JKKN API
 * 3. If they match
 *
 * Run: npx tsx scripts/debug-specific-mentor.ts <email>
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.NEXT_PUBLIC_MYJKKN_API_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchStaffFromJKKN(email: string) {
  console.log(`\n🔍 Searching JKKN API for staff with email: ${email}...\n`);

  let allStaff: any[] = [];
  let currentPage = 1;
  const maxLimit = 1000;
  let hasMore = true;

  while (hasMore) {
    const url = `${BASE_URL}/api-management/staff?page=${currentPage}&limit=${maxLimit}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ Failed to fetch page ${currentPage}`);
      break;
    }

    const data = await response.json();
    const pageStaff = data.data || [];
    allStaff = [...allStaff, ...pageStaff];

    hasMore = pageStaff.length === maxLimit;
    currentPage++;
  }

  // Search for the staff member
  const found = allStaff.find(staff =>
    (staff.email && staff.email.toLowerCase() === email.toLowerCase()) ||
    (staff.institution_email && staff.institution_email.toLowerCase() === email.toLowerCase())
  );

  if (!found) {
    console.log(`❌ Staff member NOT FOUND in JKKN API with email: ${email}\n`);
    return null;
  }

  console.log(`✓ Found in JKKN API!\n`);
  console.log('📋 JKKN API Data:');
  console.log('  ID:', found.id);
  console.log('  Name:', `${found.first_name || ''} ${found.last_name || ''}`.trim());
  console.log('  Email:', found.email);
  console.log('  Institution Email:', found.institution_email);
  console.log('  Designation:', found.designation);
  console.log('  institution_id (top-level):', found.institution_id || '❌ MISSING');
  console.log('  institution.id:', found.institution?.id || '❌ MISSING');
  console.log('  institution.name:', found.institution?.name || '❌ MISSING');

  return found;
}

async function fetchUserFromDatabase(email: string) {
  console.log(`\n🔍 Searching database for user with email: ${email}...\n`);

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, jkkn_user_id, institution_id, department_id, role')
    .eq('email', email)
    .maybeSingle();

  if (error || !user) {
    console.log(`❌ User NOT FOUND in database with email: ${email}\n`);
    return null;
  }

  console.log(`✓ Found in database!\n`);
  console.log('📋 Database Data:');
  console.log('  User ID:', user.id);
  console.log('  Email:', user.email);
  console.log('  JKKN User ID:', user.jkkn_user_id || '❌ MISSING');
  console.log('  institution_id:', user.institution_id || '❌ MISSING');
  console.log('  department_id:', user.department_id || '❌ MISSING');
  console.log('  Role:', user.role);

  return user;
}

async function fetchInstitutionName(institutionId: string): Promise<string> {
  const { data: inst } = await supabase
    .from('institutions')
    .select('institution_name')
    .eq('id', institutionId)
    .maybeSingle();

  return inst?.institution_name || 'Unknown';
}

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('\n❌ Error: Please provide an email address');
    console.log('\nUsage: npx tsx scripts/debug-specific-mentor.ts <email>\n');
    console.log('Example: npx tsx scripts/debug-specific-mentor.ts mentor@jkkn.ac.in\n');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🔧 MENTOR INSTITUTION DEBUGGING');
  console.log('='.repeat(80));

  // Fetch from both sources
  const jkknStaff = await fetchStaffFromJKKN(email);
  const dbUser = await fetchUserFromDatabase(email);

  // Comparison
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPARISON & DIAGNOSIS');
  console.log('='.repeat(80) + '\n');

  if (!jkknStaff && !dbUser) {
    console.log('❌ Staff member not found in EITHER source.');
    console.log('   → This user does not exist.\n');
    process.exit(0);
  }

  if (!jkknStaff) {
    console.log('❌ Staff member found in DATABASE but NOT in JKKN API');
    console.log('   → This is why they won\'t appear in staff lists!');
    console.log('   → The app fetches staff from JKKN API, not the database.');
    console.log(`   → User email: ${dbUser!.email}`);
    console.log(`   → JKKN User ID in DB: ${dbUser!.jkkn_user_id || 'MISSING'}`);
    console.log('\n💡 SOLUTION:');
    console.log('   1. Add this staff member to JKKN API, OR');
    console.log('   2. Update their jkkn_user_id in the database to match their JKKN ID\n');
    process.exit(0);
  }

  if (!dbUser) {
    console.log('⚠️  Staff member found in JKKN API but NOT in database');
    console.log('   → They can\'t log in yet (no user account)');
    console.log('   → They will appear in staff lists for super admins\n');
    console.log('💡 SOLUTION:');
    console.log('   Create a user account for this staff member in the database\n');
    process.exit(0);
  }

  // Both found - check institution IDs
  const jkknInstitutionId = jkknStaff.institution_id || jkknStaff.institution?.id || '';
  const dbInstitutionId = dbUser.institution_id || '';

  console.log('✓ Staff member found in BOTH sources\n');

  console.log('Institution ID Comparison:');
  console.log(`  JKKN API:  ${jkknInstitutionId || '❌ MISSING'}`);
  console.log(`  Database:  ${dbInstitutionId || '❌ MISSING'}`);

  if (jkknInstitutionId && dbInstitutionId) {
    if (jkknInstitutionId === dbInstitutionId) {
      const instName = await fetchInstitutionName(dbInstitutionId);
      console.log(`  Status:    ✅ MATCH`);
      console.log(`  Institution: ${instName}`);
      console.log('\n✅ Institution IDs match! Filtering should work correctly.\n');
      console.log('💡 If this mentor still doesn\'t appear:');
      console.log('   1. Check that you\'re logged in with the correct institution');
      console.log('   2. Check browser console for filtering logs');
      console.log('   3. Verify your user\'s institution_id matches this institution\n');
    } else {
      console.log(`  Status:    ❌ MISMATCH`);
      console.log('\n❌ Institution IDs DO NOT match!');
      console.log('   → This is why institution filtering fails!');
      console.log('\n💡 SOLUTION:');
      console.log(`   Update database to match JKKN API:`);
      console.log(`   UPDATE users SET institution_id = '${jkknInstitutionId}' WHERE email = '${email}';\n`);
    }
  } else if (!jkknInstitutionId) {
    console.log(`  Status:    ❌ Missing in JKKN API`);
    console.log('\n❌ JKKN API has no institution_id for this staff member!');
    console.log('   → This is a data quality issue in JKKN API');
    console.log('\n💡 SOLUTION:');
    console.log('   Fix the institution_id in JKKN API for this staff member\n');
  } else if (!dbInstitutionId) {
    console.log(`  Status:    ❌ Missing in Database`);
    console.log('\n❌ Database has no institution_id for this user!');
    console.log('   → This user won\'t see institution-filtered data correctly');
    console.log('\n💡 SOLUTION:');
    console.log(`   UPDATE users SET institution_id = '${jkknInstitutionId}' WHERE email = '${email}';\n`);
  }

  // JKKN ID check
  console.log('\nJKKN User ID Comparison:');
  console.log(`  JKKN API:  ${jkknStaff.id}`);
  console.log(`  Database:  ${dbUser.jkkn_user_id || '❌ MISSING'}`);

  if (dbUser.jkkn_user_id) {
    if (jkknStaff.id === dbUser.jkkn_user_id) {
      console.log(`  Status:    ✅ MATCH\n`);
    } else {
      console.log(`  Status:    ❌ MISMATCH`);
      console.log('\n❌ JKKN User IDs DO NOT match!');
      console.log('   → Database has outdated JKKN ID');
      console.log('\n💡 SOLUTION:');
      console.log(`   UPDATE users SET jkkn_user_id = '${jkknStaff.id}' WHERE email = '${email}';\n`);
    }
  } else {
    console.log(`  Status:    ❌ Missing in Database`);
    console.log('\n⚠️  Database missing jkkn_user_id!');
    console.log('\n💡 SOLUTION:');
    console.log(`   UPDATE users SET jkkn_user_id = '${jkknStaff.id}' WHERE email = '${email}';\n`);
  }

  console.log('='.repeat(80) + '\n');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
