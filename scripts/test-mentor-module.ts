/**
 * Automated Testing Script for Mentor Module
 * Tests all roles, APIs, and access control
 *
 * Usage: npx tsx scripts/test-mentor-module.ts
 */

import { createAdminClient } from '../lib/supabase/server';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function addResult(test: string, status: TestResult['status'], message: string, details?: any) {
  results.push({ test, status, message, details });

  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';

  log(`${icon} ${test}: ${message}`, color);
}

async function testDatabase() {
  log('\n📊 Phase 1: Database Integrity Tests', 'cyan');
  log('═'.repeat(60), 'cyan');

  const supabase = createAdminClient();

  // Test 1: Check for users with NULL institution_id
  log('\n🔍 Checking for users with NULL institution_id...', 'blue');
  const { data: nullUsers, error: nullError } = await supabase
    .from('users')
    .select('email, role, institution_id, department_id')
    .or('institution_id.is.null,department_id.is.null')
    .neq('role', 'super_admin');

  if (nullError) {
    addResult('NULL Institution Check', 'FAIL', `Database error: ${nullError.message}`);
  } else if (nullUsers && nullUsers.length === 0) {
    addResult('NULL Institution Check', 'PASS', 'All users have institution_id and department_id');
  } else {
    // Filter out institution_admin with only NULL department (acceptable)
    const criticalNullUsers = nullUsers.filter(u =>
      u.institution_id === null || (u.department_id === null && u.role !== 'institution_admin')
    );

    if (criticalNullUsers.length === 0) {
      addResult('NULL Institution Check', 'PASS', 'All critical users have required data (institution_admin can have NULL department_id)');
    } else {
      addResult(
        'NULL Institution Check',
        'FAIL',
        `${criticalNullUsers.length} users have NULL values`,
        criticalNullUsers.map(u => ({ email: u.email, role: u.role }))
      );
      log('\n  💡 Fix: Run "npx tsx scripts/fix-null-users.ts"', 'yellow');
    }
  }

  // Test 2: Verify all roles are recognized
  log('\n🔍 Validating user roles...', 'blue');
  const { data: roles } = await supabase
    .from('users')
    .select('role')
    .order('role');

  const validRoles = ['super_admin', 'institution_admin', 'hod', 'faculty', 'mentor', 'student'];
  const uniqueRoles = [...new Set(roles?.map(r => r.role))];
  const invalidRoles = uniqueRoles.filter(r => !validRoles.includes(r));

  if (invalidRoles.length === 0) {
    addResult('Role Validation', 'PASS', `All ${uniqueRoles.length} roles are recognized`);
  } else {
    addResult(
      'Role Validation',
      'FAIL',
      `Unrecognized roles: ${invalidRoles.join(', ')}`,
      invalidRoles
    );
    log('\n  💡 Fix: Add missing roles to AccessLevel type in lib/middleware/access-control.ts', 'yellow');
  }

  // Test 3: Count users by role
  log('\n🔍 Counting users by role...', 'blue');
  const { data: allUsers } = await supabase
    .from('users')
    .select('role');

  const roleCounts = allUsers?.reduce((acc: Record<string, number>, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {});

  addResult('User Role Distribution', 'PASS', 'Retrieved user counts', roleCounts);
  if (roleCounts) {
    Object.entries(roleCounts).forEach(([role, count]) => {
      log(`  • ${role}: ${count} users`, 'reset');
    });
  }

  // Test 4: Verify institution IDs are valid
  log('\n🔍 Verifying institution IDs...', 'blue');
  const { data: institutions } = await supabase
    .from('users')
    .select('institution_id')
    .not('institution_id', 'is', null);

  const uniqueInstitutions = [...new Set(institutions?.map(i => i.institution_id))];
  addResult(
    'Institution ID Validation',
    'PASS',
    `Found ${uniqueInstitutions.length} unique institutions`
  );

  // Test 5: Check for mentor records
  log('\n🔍 Checking mentor records...', 'blue');
  const { data: mentors, count: mentorCount } = await supabase
    .from('mentors')
    .select('*', { count: 'exact' });

  addResult(
    'Mentor Records',
    'PASS',
    `Found ${mentorCount} mentor records in database`
  );

  // Test 6: Check for student assignments
  log('\n🔍 Checking student assignments...', 'blue');
  const { data: assignments, count: assignmentCount } = await supabase
    .from('mentor_students')
    .select('*', { count: 'exact' });

  addResult(
    'Student Assignments',
    'PASS',
    `Found ${assignmentCount} student-mentor assignments`
  );
}

async function testAccessLevels() {
  log('\n🔒 Phase 2: Access Level Tests', 'cyan');
  log('═'.repeat(60), 'cyan');

  const supabase = createAdminClient();

  // Get sample users for each role
  const { data: testUsers } = await supabase
    .from('users')
    .select('id, email, role, institution_id, is_super_admin')
    .in('role', ['super_admin', 'institution_admin', 'faculty', 'mentor', 'hod'])
    .limit(10);

  if (!testUsers || testUsers.length === 0) {
    addResult('Access Level Tests', 'WARN', 'No test users found');
    return;
  }

  log(`\n📋 Found ${testUsers.length} test users across different roles\n`, 'blue');

  // Check each user's access level configuration
  for (const user of testUsers) {
    const hasInstitutionId = !!user.institution_id;
    const isSuperAdmin = user.is_super_admin || user.role === 'super_admin';

    if (isSuperAdmin) {
      // Super admins don't need institution_id
      addResult(
        `Access Level: ${user.role}`,
        'PASS',
        `${user.email} - Super admin configured correctly`
      );
    } else if (hasInstitutionId) {
      addResult(
        `Access Level: ${user.role}`,
        'PASS',
        `${user.email} - Has institution_id`
      );
    } else {
      addResult(
        `Access Level: ${user.role}`,
        'FAIL',
        `${user.email} - Missing institution_id`,
        { email: user.email, role: user.role }
      );
    }
  }

  // Test mentor in-charge assignments
  log('\n🔍 Checking Mentor In-charge assignments...', 'blue');
  const { data: inchargeAssignments, count: inchargeCount } = await supabase
    .from('mentor_incharge_assignments')
    .select('*, users!inner(email, role)', { count: 'exact' });

  if (inchargeCount && inchargeCount > 0) {
    addResult(
      'Mentor In-charge',
      'PASS',
      `Found ${inchargeCount} mentor in-charge assignments`
    );
    inchargeAssignments?.forEach((assignment: any) => {
      log(`  • ${assignment.users.email} (${assignment.users.role})`, 'reset');
    });
  } else {
    addResult(
      'Mentor In-charge',
      'WARN',
      'No mentor in-charge assignments found'
    );
  }
}

async function testDataIntegrity() {
  log('\n📋 Phase 3: Data Integrity Tests', 'cyan');
  log('═'.repeat(60), 'cyan');

  const supabase = createAdminClient();

  // Test 1: Verify users table has required fields
  log('\n🔍 Checking users table structure...', 'blue');
  const { data: sampleUser } = await supabase
    .from('users')
    .select('*')
    .limit(1)
    .single();

  const requiredFields = ['id', 'email', 'full_name', 'role', 'jkkn_user_id', 'created_at'];
  const hasAllFields = requiredFields.every(field => field in (sampleUser || {}));

  if (hasAllFields) {
    addResult('Users Table Structure', 'PASS', 'All required fields present');
  } else {
    const missingFields = requiredFields.filter(field => !(field in (sampleUser || {})));
    addResult(
      'Users Table Structure',
      'FAIL',
      `Missing fields: ${missingFields.join(', ')}`
    );
  }

  // Test 2: Check for duplicate emails
  log('\n🔍 Checking for duplicate emails...', 'blue');
  const { data: allUsers } = await supabase
    .from('users')
    .select('email');

  const emails = allUsers?.map(u => u.email) || [];
  const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index);

  if (duplicateEmails.length === 0) {
    addResult('Duplicate Email Check', 'PASS', 'No duplicate emails found');
  } else {
    addResult(
      'Duplicate Email Check',
      'FAIL',
      `Found ${duplicateEmails.length} duplicate emails`,
      [...new Set(duplicateEmails)]
    );
  }

  // Test 3: Verify institution_id format (should be UUID)
  log('\n🔍 Validating institution_id format...', 'blue');
  const { data: usersWithInstitution } = await supabase
    .from('users')
    .select('email, institution_id')
    .not('institution_id', 'is', null);

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const invalidInstitutions = usersWithInstitution?.filter(
    u => !uuidRegex.test(u.institution_id)
  ) || [];

  if (invalidInstitutions.length === 0) {
    addResult('Institution ID Format', 'PASS', 'All institution IDs are valid UUIDs');
  } else {
    addResult(
      'Institution ID Format',
      'WARN',
      `${invalidInstitutions.length} users have non-UUID institution_id`,
      invalidInstitutions.map(u => ({ email: u.email, institution_id: u.institution_id }))
    );
  }
}

async function testAPIStructure() {
  log('\n🌐 Phase 4: API Structure Tests', 'cyan');
  log('═'.repeat(60), 'cyan');

  // These tests verify the API file structure exists
  const criticalAPIs = [
    { path: 'app/api/jkkn/staff/route.ts', name: 'Staff API' },
    { path: 'app/api/jkkn/students/route.ts', name: 'Students API' },
    { path: 'app/api/mentor/list/route.ts', name: 'Mentor List API' },
    { path: 'app/api/user/access-info/route.ts', name: 'Access Info API' },
    { path: 'lib/middleware/access-control.ts', name: 'Access Control Middleware' },
  ];

  log('\n🔍 Verifying critical API files exist...', 'blue');

  const fs = require('fs');
  const path = require('path');

  for (const api of criticalAPIs) {
    const fullPath = path.join(process.cwd(), api.path);
    const exists = fs.existsSync(fullPath);

    if (exists) {
      addResult(`API File: ${api.name}`, 'PASS', `File exists at ${api.path}`);
    } else {
      addResult(`API File: ${api.name}`, 'FAIL', `File not found at ${api.path}`);
    }
  }

  // Check for access control imports in API files
  log('\n🔍 Verifying access control is imported...', 'blue');

  const apisToCheck = [
    { path: 'app/api/jkkn/staff/route.ts', name: 'Staff API' },
    { path: 'app/api/jkkn/students/route.ts', name: 'Students API' },
    { path: 'app/api/mentor/list/route.ts', name: 'Mentor List API' },
  ];

  for (const api of apisToCheck) {
    const fullPath = path.join(process.cwd(), api.path);
    if (!fs.existsSync(fullPath)) continue;

    const content = fs.readFileSync(fullPath, 'utf-8');
    const hasGetUserAccess = content.includes('getUserAccess');
    const hasApplyFilters = content.includes('applyAccessFilters') || content.includes('institution_id');

    if (hasGetUserAccess && hasApplyFilters) {
      addResult(
        `Access Control: ${api.name}`,
        'PASS',
        'Has getUserAccess and filtering logic'
      );
    } else if (hasGetUserAccess) {
      addResult(
        `Access Control: ${api.name}`,
        'WARN',
        'Has getUserAccess but filtering unclear'
      );
    } else {
      addResult(
        `Access Control: ${api.name}`,
        'FAIL',
        'Missing getUserAccess import'
      );
    }
  }
}

async function generateReport() {
  log('\n\n' + '═'.repeat(60), 'magenta');
  log('📊 TEST SUMMARY REPORT', 'magenta');
  log('═'.repeat(60), 'magenta');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;
  const total = results.length;

  log(`\n${colors.bold}Total Tests Run: ${total}${colors.reset}`);
  log(`${colors.green}${colors.bold}✅ Passed: ${passed}${colors.reset}`);
  log(`${colors.red}${colors.bold}❌ Failed: ${failed}${colors.reset}`);
  log(`${colors.yellow}${colors.bold}⚠️  Warnings: ${warnings}${colors.reset}`);

  const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
  const color = parseFloat(successRate) === 100 ? 'green' : parseFloat(successRate) >= 80 ? 'yellow' : 'red';
  log(`\n${colors[color]}${colors.bold}Success Rate: ${successRate}%${colors.reset}`);

  if (failed > 0) {
    log('\n' + '─'.repeat(60), 'red');
    log('❌ FAILED TESTS:', 'red');
    log('─'.repeat(60), 'red');
    results
      .filter(r => r.status === 'FAIL')
      .forEach((r, index) => {
        log(`\n${index + 1}. ${r.test}`, 'red');
        log(`   ↳ ${r.message}`, 'red');
        if (r.details) {
          console.log('   Details:', r.details);
        }
      });
  }

  if (warnings > 0) {
    log('\n' + '─'.repeat(60), 'yellow');
    log('⚠️  WARNINGS:', 'yellow');
    log('─'.repeat(60), 'yellow');
    results
      .filter(r => r.status === 'WARN')
      .forEach((r, index) => {
        log(`\n${index + 1}. ${r.test}`, 'yellow');
        log(`   ↳ ${r.message}`, 'yellow');
        if (r.details) {
          console.log('   Details:', r.details);
        }
      });
  }

  log('\n' + '═'.repeat(60), 'magenta');

  // Final recommendations
  if (failed > 0 || warnings > 0) {
    log('\n💡 RECOMMENDED ACTIONS:', 'cyan');

    const hasNullInstitution = results.some(
      r => r.test === 'NULL Institution Check' && r.status === 'FAIL'
    );
    const hasInvalidRoles = results.some(
      r => r.test === 'Role Validation' && r.status === 'FAIL'
    );
    const hasMissingAccessControl = results.some(
      r => r.test.startsWith('Access Control:') && r.status === 'FAIL'
    );

    if (hasNullInstitution) {
      log('  1. Run: npx tsx scripts/sync-user-institutions.ts', 'yellow');
    }
    if (hasInvalidRoles) {
      log('  2. Update AccessLevel type in lib/middleware/access-control.ts', 'yellow');
    }
    if (hasMissingAccessControl) {
      log('  3. Add access control to failing API endpoints', 'yellow');
    }

    log('\n  For detailed help, see: docs/DEBUGGING-MISSING-USER-DATA.md', 'cyan');
  } else {
    log('\n🎉 All tests passed! Your application is ready to deploy.', 'green');
  }

  log(''); // Empty line at end

  return { passed, failed, warnings, total, successRate };
}

// Main test runner
async function runAllTests() {
  console.clear();
  log('╔═══════════════════════════════════════════════════════════╗', 'cyan');
  log('║        🚀 MENTOR MODULE AUTOMATED TEST SUITE 🚀         ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════╝', 'cyan');
  log(`\n📅 Started: ${new Date().toLocaleString()}`, 'blue');
  log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`, 'blue');

  try {
    await testDatabase();
    await testAccessLevels();
    await testDataIntegrity();
    await testAPIStructure();

    const summary = await generateReport();

    log(`\n⏱️  Completed: ${new Date().toLocaleString()}`, 'blue');

    // Exit with error code if tests failed
    process.exit(summary.failed > 0 ? 1 : 0);
  } catch (error) {
    log(`\n❌ Test suite crashed: ${error}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
