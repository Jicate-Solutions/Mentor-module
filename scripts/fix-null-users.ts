/**
 * Fix users with NULL institution_id
 * Since JKKN API doesn't have these users, we'll assign them to the most common institution
 *
 * Usage: npx tsx scripts/fix-null-users.ts
 */

import { createAdminClient } from '../lib/supabase/server';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function fixNullUsers() {
  log('\n🔧 Fixing users with NULL institution_id...', 'cyan');
  log('═'.repeat(60), 'cyan');

  const supabase = createAdminClient();

  // Step 1: Find the most common institution
  log('\n📊 Finding most common institution...', 'blue');

  const { data: institutionCounts } = await supabase
    .from('users')
    .select('institution_id')
    .not('institution_id', 'is', null);

  const counts = institutionCounts?.reduce((acc: Record<string, number>, user) => {
    acc[user.institution_id] = (acc[user.institution_id] || 0) + 1;
    return acc;
  }, {});

  const mostCommonInstitution = Object.entries(counts || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))[0];

  if (!mostCommonInstitution) {
    log('❌ No institutions found in database', 'red');
    return;
  }

  const [defaultInstitutionId, userCount] = mostCommonInstitution;
  log(`✅ Most common institution: ${defaultInstitutionId} (${userCount} users)`, 'green');

  // Step 2: Find a default department from that institution
  log('\n📊 Finding default department...', 'blue');

  const { data: departments } = await supabase
    .from('users')
    .select('department_id')
    .eq('institution_id', defaultInstitutionId)
    .not('department_id', 'is', null)
    .limit(1);

  const defaultDepartmentId = departments?.[0]?.department_id;

  if (defaultDepartmentId) {
    log(`✅ Default department: ${defaultDepartmentId}`, 'green');
  } else {
    log(`⚠️  No department found, will leave as NULL for institution admins`, 'yellow');
  }

  // Step 3: Get users with NULL values
  log('\n📋 Finding users with NULL institution_id...', 'blue');

  const { data: nullUsers } = await supabase
    .from('users')
    .select('id, email, role, institution_id, department_id')
    .or('institution_id.is.null,department_id.is.null')
    .neq('role', 'super_admin');

  if (!nullUsers || nullUsers.length === 0) {
    log('✅ No users need fixing!', 'green');
    return;
  }

  log(`\n📝 Found ${nullUsers.length} users to fix:\n`, 'blue');

  let successCount = 0;
  let failCount = 0;

  // Step 4: Update each user
  for (const user of nullUsers) {
    log(`\n👤 ${user.email} (${user.role})`, 'cyan');
    log(`   Current: institution=${user.institution_id || 'NULL'}, department=${user.department_id || 'NULL'}`, 'reset');

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    // Update institution_id if NULL
    if (!user.institution_id) {
      updates.institution_id = defaultInstitutionId;
    }

    // Update department_id if NULL (except for institution_admin)
    if (!user.department_id && user.role !== 'institution_admin' && defaultDepartmentId) {
      updates.department_id = defaultDepartmentId;
    }

    // Skip if no updates needed
    if (Object.keys(updates).length === 1) { // Only updated_at
      log(`   ⏭️  No updates needed`, 'yellow');
      continue;
    }

    // Perform update
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      log(`   ❌ Update failed: ${error.message}`, 'red');
      failCount++;
    } else {
      log(`   ✅ Updated: institution=${updates.institution_id || user.institution_id}, department=${updates.department_id || user.department_id || 'NULL'}`, 'green');
      successCount++;
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Step 5: Summary
  log('\n' + '═'.repeat(60), 'cyan');
  log('📊 FIX SUMMARY', 'cyan');
  log('═'.repeat(60), 'cyan');

  log(`\nTotal users processed: ${nullUsers.length}`);
  log(`${colors.green}✅ Successfully updated: ${successCount}${colors.reset}`);
  log(`${colors.red}❌ Failed: ${failCount}${colors.reset}`);

  // Step 6: Verify
  log('\n🔍 Verifying fix...', 'blue');

  const { data: remainingNullUsers } = await supabase
    .from('users')
    .select('email, role, institution_id, department_id')
    .or('institution_id.is.null,department_id.is.null')
    .neq('role', 'super_admin');

  if (remainingNullUsers && remainingNullUsers.length > 0) {
    log(`\n⚠️  Still ${remainingNullUsers.length} users with NULL values:`, 'yellow');
    remainingNullUsers.forEach(u => {
      const missing = [];
      if (!u.institution_id) missing.push('institution_id');
      if (!u.department_id) missing.push('department_id');
      log(`  - ${u.email} (${u.role}): missing ${missing.join(', ')}`, 'yellow');
    });
  } else {
    log('\n✅ All users now have institution_id and department_id!', 'green');
  }

  log('\n✅ Fix completed', 'green');
  log(''); // Empty line
}

// Run the fix
fixNullUsers()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error);
    process.exit(1);
  });
