/**
 * Verify Access Control is Working Correctly
 *
 * This script checks if access control is properly configured for all users
 *
 * Run: npx tsx scripts/verify-access-control.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔐 VERIFYING ACCESS CONTROL FOR ALL USERS');
  console.log('='.repeat(80) + '\n');

  // Get all users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, role, institution_id, jkkn_user_id')
    .order('role', { ascending: true });

  if (usersError) {
    console.error('❌ Error fetching users:', usersError);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('⚠️  No users found in database');
    process.exit(0);
  }

  console.log(`📊 Total users: ${users.length}\n`);

  // Categorize users
  const issues: any[] = [];
  const superAdmins: any[] = [];
  const properlyConfigured: any[] = [];

  for (const user of users) {
    const isSuperAdmin = user.role === 'super_admin';

    if (isSuperAdmin) {
      superAdmins.push(user);
      continue;
    }

    // Check if non-super-admin has institution_id
    if (!user.institution_id) {
      issues.push({
        ...user,
        issue: 'Missing institution_id',
        severity: 'CRITICAL',
        impact: 'User will see ALL institutions\' data',
      });
    } else if (!user.jkkn_user_id) {
      issues.push({
        ...user,
        issue: 'Missing jkkn_user_id',
        severity: 'WARNING',
        impact: 'May not appear in some pages',
      });
    } else {
      properlyConfigured.push(user);
    }
  }

  // Display results
  console.log('📊 SUMMARY:');
  console.log('─'.repeat(80));
  console.log(`Super Admins:              ${superAdmins.length} (can access all institutions)`);
  console.log(`Properly Configured:       ${properlyConfigured.length} (have institution_id + jkkn_user_id)`);
  console.log(`⚠️  Issues Found:          ${issues.length}`);
  console.log();

  if (superAdmins.length > 0) {
    console.log('✅ SUPER ADMINS (Can access all institutions):');
    console.log('─'.repeat(80));
    superAdmins.forEach(user => {
      console.log(`  ${user.email} (${user.role})`);
    });
    console.log();
  }

  if (issues.length > 0) {
    console.log('🚨 ACCESS CONTROL ISSUES FOUND:');
    console.log('─'.repeat(80));
    console.log();

    const critical = issues.filter(i => i.severity === 'CRITICAL');
    const warnings = issues.filter(i => i.severity === 'WARNING');

    if (critical.length > 0) {
      console.log('🔴 CRITICAL (Will cause access control violations):');
      console.log();
      critical.forEach((issue, idx) => {
        console.log(`${idx + 1}. ${issue.email}`);
        console.log(`   Role: ${issue.role}`);
        console.log(`   Issue: ${issue.issue}`);
        console.log(`   Impact: ${issue.impact}`);
        console.log(`   JKKN User ID: ${issue.jkkn_user_id || 'NULL'}`);
        console.log(`   Institution ID: ${issue.institution_id || 'NULL'}`);
        console.log();
      });
    }

    if (warnings.length > 0) {
      console.log('⚠️  WARNINGS (May cause functionality issues):');
      console.log();
      warnings.forEach((issue, idx) => {
        console.log(`${idx + 1}. ${issue.email}`);
        console.log(`   Role: ${issue.role}`);
        console.log(`   Issue: ${issue.issue}`);
        console.log(`   Impact: ${issue.impact}`);
        console.log(`   JKKN User ID: ${issue.jkkn_user_id || 'NULL'}`);
        console.log(`   Institution ID: ${issue.institution_id || 'NULL'}`);
        console.log();
      });
    }

    console.log('='.repeat(80));
    console.log('💡 RECOMMENDED ACTIONS:');
    console.log('='.repeat(80));
    console.log();
    console.log('To fix these issues, run the comprehensive sync script:');
    console.log();
    console.log('  npm run sync:all');
    console.log();
    console.log('This will update all users with correct data from JKKN API.');
    console.log();
  } else {
    console.log('✅ NO ISSUES FOUND!');
    console.log('─'.repeat(80));
    console.log('All non-super-admin users have proper institution_id and jkkn_user_id.');
    console.log('Access control is working correctly.');
    console.log();
  }

  // Show sample of properly configured users
  if (properlyConfigured.length > 0) {
    console.log(`✅ PROPERLY CONFIGURED USERS (Sample of ${Math.min(5, properlyConfigured.length)}/${properlyConfigured.length}):`);
    console.log('─'.repeat(80));
    properlyConfigured.slice(0, 5).forEach(user => {
      console.log(`  ${user.email}`);
      console.log(`    Role: ${user.role}`);
      console.log(`    Institution ID: ${user.institution_id}`);
      console.log(`    JKKN User ID: ${user.jkkn_user_id}`);
      console.log();
    });
  }

  console.log('='.repeat(80));
  console.log(issues.length > 0 ? '⚠️  VERIFICATION COMPLETE - ISSUES FOUND' : '✅ VERIFICATION COMPLETE - ALL GOOD');
  console.log('='.repeat(80));
  console.log();

  // Exit with error code if critical issues found
  const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
  if (criticalIssues.length > 0) {
    console.log(`🚨 ${criticalIssues.length} CRITICAL access control issue(s) found!`);
    console.log('   Run: npm run sync:all');
    console.log();
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
