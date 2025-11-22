/**
 * Check why users can't find their names in mentor/director lists
 *
 * Usage: npx tsx scripts/check-missing-users.ts
 */

import { createAdminClient } from '../lib/supabase/server';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkMissingUsers() {
  log('\n🔍 Investigating why users can\'t find their names...', 'cyan');
  log('═'.repeat(60), 'cyan');

  const supabase = createAdminClient();

  // Step 1: Check total users in database
  log('\n📊 Step 1: Database Users Count', 'blue');

  const { data: allUsers, error } = await supabase
    .from('users')
    .select('id, email, role, institution_id, department_id')
    .order('email');

  if (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return;
  }

  log(`Total users in database: ${allUsers?.length || 0}`, 'green');

  // Group by role
  const byRole: Record<string, number> = {};
  allUsers?.forEach(u => {
    byRole[u.role] = (byRole[u.role] || 0) + 1;
  });

  log('\n📋 Users by role:', 'blue');
  Object.entries(byRole).forEach(([role, count]) => {
    log(`  ${role}: ${count}`, 'reset');
  });

  // Step 2: Check users with NULL institution_id
  log('\n⚠️  Step 2: Users with NULL institution_id', 'yellow');

  const nullInst = allUsers?.filter(u => !u.institution_id);
  log(`Found: ${nullInst?.length || 0} users`, nullInst?.length ? 'red' : 'green');

  if (nullInst && nullInst.length > 0) {
    log('\n❌ These users will NOT appear in any filtered lists:', 'red');
    log('   (They\'re being filtered out due to missing institution_id)\n', 'yellow');
    nullInst.forEach(u => {
      log(`  - ${u.email} (${u.role})`, 'red');
    });
    log('\n💡 Fix: Run "npm run fix:users" to assign them to an institution', 'yellow');
  }

  // Step 3: Check users who should be mentors/directors
  log('\n📋 Step 3: Who should appear in Mentor/Director lists?', 'blue');

  const mentorRoles = ['mentor', 'faculty', 'hod'];
  const directorRoles = ['institution_admin'];

  const potentialMentors = allUsers?.filter(u => mentorRoles.includes(u.role));
  const potentialDirectors = allUsers?.filter(u => directorRoles.includes(u.role));

  log(`\nPotential Mentors (role: mentor, faculty, hod): ${potentialMentors?.length || 0}`, 'cyan');
  log(`Potential Directors (role: institution_admin): ${potentialDirectors?.length || 0}`, 'cyan');

  // Step 4: Check which mentors have institution_id (will appear in lists)
  const visibleMentors = potentialMentors?.filter(u => u.institution_id);
  const invisibleMentors = potentialMentors?.filter(u => !u.institution_id);

  log(`\n✅ Visible mentors (have institution_id): ${visibleMentors?.length || 0}`, 'green');
  log(`❌ Invisible mentors (missing institution_id): ${invisibleMentors?.length || 0}`, 'red');

  if (invisibleMentors && invisibleMentors.length > 0) {
    log('\n❌ These mentors WON\'T appear in the list:', 'red');
    invisibleMentors.forEach(u => {
      log(`  - ${u.email} (${u.role})`, 'red');
    });
  }

  // Step 5: Check which directors have institution_id
  const visibleDirectors = potentialDirectors?.filter(u => u.institution_id);
  const invisibleDirectors = potentialDirectors?.filter(u => !u.institution_id);

  log(`\n✅ Visible directors (have institution_id): ${visibleDirectors?.length || 0}`, 'green');
  log(`❌ Invisible directors (missing institution_id): ${invisibleDirectors?.length || 0}`, 'red');

  if (invisibleDirectors && invisibleDirectors.length > 0) {
    log('\n❌ These directors WON\'T appear in the list:', 'red');
    invisibleDirectors.forEach(u => {
      log(`  - ${u.email} (${u.role})`, 'red');
    });
  }

  // Step 6: Fetch actual JKKN API staff data
  log('\n📡 Step 4: Checking JKKN API Staff Data', 'blue');

  const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

  if (!apiKey) {
    log('⚠️  JKKN API key not configured, skipping API check', 'yellow');
  } else {
    try {
      const response = await fetch(`${baseUrl}/api-management/staff?page=1&limit=1000`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const staffCount = data.data?.length || 0;

        log(`✅ JKKN API has ${staffCount} staff members`, 'green');

        // Check if database users exist in JKKN API
        const apiEmails = new Set(data.data?.map((s: any) => s.email?.toLowerCase()) || []);

        log('\n🔍 Checking which database users exist in JKKN API:', 'blue');

        const inAPI: string[] = [];
        const notInAPI: string[] = [];

        allUsers?.forEach(u => {
          if (u.role === 'super_admin') return; // Skip super admins

          if (apiEmails.has(u.email.toLowerCase())) {
            inAPI.push(u.email);
          } else {
            notInAPI.push(u.email);
          }
        });

        log(`\n✅ Users found in JKKN API: ${inAPI.length}`, 'green');
        log(`❌ Users NOT found in JKKN API: ${notInAPI.length}`, 'red');

        if (notInAPI.length > 0 && notInAPI.length <= 20) {
          log('\n❌ These users don\'t exist in JKKN API:', 'red');
          log('   (They were manually added or are test accounts)\n', 'yellow');
          notInAPI.slice(0, 20).forEach(email => {
            log(`  - ${email}`, 'red');
          });
          if (notInAPI.length > 20) {
            log(`  ... and ${notInAPI.length - 20} more`, 'yellow');
          }
        }

      } else {
        log(`❌ Failed to fetch from JKKN API: ${response.status}`, 'red');
      }
    } catch (error: any) {
      log(`❌ Error fetching from JKKN API: ${error.message}`, 'red');
    }
  }

  // Step 7: Summary and recommendations
  log('\n═'.repeat(60), 'cyan');
  log('📊 SUMMARY & RECOMMENDATIONS', 'cyan');
  log('═'.repeat(60), 'cyan');

  const totalInvisible = (invisibleMentors?.length || 0) + (invisibleDirectors?.length || 0);

  if (totalInvisible > 0) {
    log(`\n❌ Problem: ${totalInvisible} users can't find their names`, 'red');
    log('\n🔧 Root Cause:', 'yellow');
    log('   - These users have NULL institution_id in the database', 'reset');
    log('   - Access control filters them out (no institution = invisible)', 'reset');

    log('\n✅ Solution:', 'green');
    log('   1. Run: npm run fix:users', 'cyan');
    log('      This will assign them to a default institution', 'reset');
    log('\n   2. Or manually update their institution_id in Supabase', 'cyan');
    log('      (If you know which institution they belong to)', 'reset');

    log('\n   3. After fixing, they will appear in the lists!', 'green');
  } else {
    log('\n✅ All users with mentor/director roles have institution_id', 'green');
    log('   Everyone should be visible in the lists!', 'green');

    log('\n💡 If users still can\'t find their names:', 'yellow');
    log('   1. Check if they\'re searching in the correct institution', 'reset');
    log('   2. Check if their role is correct (should be mentor/faculty/hod/institution_admin)', 'reset');
    log('   3. Check if they exist in the JKKN API', 'reset');
  }

  log('\n');
}

// Run the check
checkMissingUsers()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });
