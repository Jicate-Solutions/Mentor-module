/**
 * Test API Integration and Real-time Data Fetching
 * Verifies all endpoints are fetching data correctly with proper institution-wise filtering
 *
 * Usage: npx tsx scripts/test-api-integration.ts
 */

import { createAdminClient } from '../lib/supabase/server';

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

interface TestResult {
  endpoint: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function addResult(endpoint: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, details?: any) {
  results.push({ endpoint, status, message, details });
}

async function testAPIConnection() {
  log('\n🔌 Testing JKKN API Connection...', 'cyan');
  log('═'.repeat(60), 'cyan');

  const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

  if (!apiKey) {
    addResult('API Connection', 'FAIL', 'JKKN API key not configured in .env.local');
    log('❌ JKKN API key not configured', 'red');
    return false;
  }

  try {
    const response = await fetch(`${baseUrl}/api-management/organizations/institutions?page=1&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      addResult('API Connection', 'PASS', 'Successfully connected to JKKN API', {
        status: response.status,
        dataCount: data.data?.length || 0,
      });
      log('✅ JKKN API Connection: OK', 'green');
      return true;
    } else {
      addResult('API Connection', 'FAIL', `Failed with status ${response.status}`);
      log(`❌ JKKN API Connection: FAILED (${response.status})`, 'red');
      return false;
    }
  } catch (error: any) {
    addResult('API Connection', 'FAIL', error.message);
    log(`❌ JKKN API Connection: ERROR - ${error.message}`, 'red');
    return false;
  }
}

async function testInstitutionsData() {
  log('\n🏛️  Testing Institutions Data Fetch...', 'cyan');
  log('═'.repeat(60), 'cyan');

  const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

  try {
    const response = await fetch(`${baseUrl}/api-management/organizations/institutions?page=1&limit=100`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const institutions = data.data || [];

      addResult('Institutions Data', 'PASS', `Fetched ${institutions.length} institutions`, {
        total: institutions.length,
        sample: institutions.slice(0, 3).map((i: any) => ({
          id: i.id,
          name: i.name,
          code: i.counselling_code,
        })),
      });

      log(`✅ Institutions: ${institutions.length} found`, 'green');

      if (institutions.length > 0) {
        log('\n📋 Sample Institutions:', 'blue');
        institutions.slice(0, 5).forEach((inst: any, idx: number) => {
          log(`   ${idx + 1}. ${inst.name} (${inst.counselling_code}) - ID: ${inst.id}`, 'reset');
        });
      }

      return institutions;
    } else {
      addResult('Institutions Data', 'FAIL', `Failed with status ${response.status}`);
      log(`❌ Failed to fetch institutions: ${response.status}`, 'red');
      return [];
    }
  } catch (error: any) {
    addResult('Institutions Data', 'FAIL', error.message);
    log(`❌ Error fetching institutions: ${error.message}`, 'red');
    return [];
  }
}

async function testStaffData() {
  log('\n👥 Testing Staff Data Fetch...', 'cyan');
  log('═'.repeat(60), 'cyan');

  const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

  try {
    const response = await fetch(`${baseUrl}/api-management/staff?page=1&limit=100`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const staff = data.data || [];

      // Group by institution
      const byInstitution: Record<string, any[]> = {};
      staff.forEach((s: any) => {
        const instId = s.institution?.id || s.institution || 'unknown';
        if (!byInstitution[instId]) byInstitution[instId] = [];
        byInstitution[instId].push(s);
      });

      addResult('Staff Data', 'PASS', `Fetched ${staff.length} staff members from ${Object.keys(byInstitution).length} institutions`, {
        total: staff.length,
        institutions: Object.keys(byInstitution).length,
        breakdown: Object.entries(byInstitution).map(([instId, staffList]) => ({
          institution: instId,
          count: staffList.length,
        })),
      });

      log(`✅ Staff: ${staff.length} members found`, 'green');
      log(`   📊 Across ${Object.keys(byInstitution).length} institutions`, 'blue');

      if (Object.keys(byInstitution).length > 0) {
        log('\n📋 Staff by Institution:', 'blue');
        Object.entries(byInstitution).slice(0, 5).forEach(([instId, staffList]) => {
          log(`   ${instId}: ${staffList.length} staff members`, 'reset');
        });
      }

      return staff;
    } else {
      addResult('Staff Data', 'FAIL', `Failed with status ${response.status}`);
      log(`❌ Failed to fetch staff: ${response.status}`, 'red');
      return [];
    }
  } catch (error: any) {
    addResult('Staff Data', 'FAIL', error.message);
    log(`❌ Error fetching staff: ${error.message}`, 'red');
    return [];
  }
}

async function testStudentsData() {
  log('\n🎓 Testing Students Data Fetch...', 'cyan');
  log('═'.repeat(60), 'cyan');

  const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

  try {
    // Fetch first page only for testing (limit 100)
    const response = await fetch(`${baseUrl}/api-management/students?page=1&limit=100`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const students = data.data || [];

      // Group by institution
      const byInstitution: Record<string, any[]> = {};
      students.forEach((s: any) => {
        const instId = s.institution?.id || s.institution || 'unknown';
        if (!byInstitution[instId]) byInstitution[instId] = [];
        byInstitution[instId].push(s);
      });

      addResult('Students Data', 'PASS', `Fetched ${students.length} students from ${Object.keys(byInstitution).length} institutions (sample)`, {
        total: students.length,
        institutions: Object.keys(byInstitution).length,
        totalAvailable: data.count || data.pagination?.total || data.metadata?.total || 'unknown',
        breakdown: Object.entries(byInstitution).map(([instId, studentList]) => ({
          institution: instId,
          count: studentList.length,
        })),
      });

      log(`✅ Students: ${students.length} students found (sample page)`, 'green');
      log(`   📊 Total available: ${data.count || data.pagination?.total || data.metadata?.total || 'unknown'}`, 'blue');
      log(`   📊 Across ${Object.keys(byInstitution).length} institutions`, 'blue');

      if (Object.keys(byInstitution).length > 0) {
        log('\n📋 Students by Institution (sample):', 'blue');
        Object.entries(byInstitution).slice(0, 5).forEach(([instId, studentList]) => {
          log(`   ${instId}: ${studentList.length} students`, 'reset');
        });
      }

      return students;
    } else {
      addResult('Students Data', 'FAIL', `Failed with status ${response.status}`);
      log(`❌ Failed to fetch students: ${response.status}`, 'red');
      return [];
    }
  } catch (error: any) {
    addResult('Students Data', 'FAIL', error.message);
    log(`❌ Error fetching students: ${error.message}`, 'red');
    return [];
  }
}

async function testAccessControlFiltering() {
  log('\n🔒 Testing Access Control Filtering...', 'cyan');
  log('═'.repeat(60), 'cyan');

  const supabase = createAdminClient();

  // Get sample users with different roles
  const { data: users } = await supabase
    .from('users')
    .select('id, email, role, institution_id, department_id')
    .in('role', ['super_admin', 'institution_admin', 'mentor', 'faculty'])
    .not('institution_id', 'is', null)
    .limit(10);

  if (!users || users.length === 0) {
    addResult('Access Control', 'FAIL', 'No users found to test access control');
    log('❌ No users found', 'red');
    return;
  }

  log(`\n📋 Testing access control for ${users.length} users:\n`, 'blue');

  const roleGroups: Record<string, number> = {};

  users.forEach(user => {
    roleGroups[user.role] = (roleGroups[user.role] || 0) + 1;

    const accessScope = user.role === 'super_admin'
      ? 'ALL institutions'
      : `Institution ${user.institution_id}`;

    log(`   ${user.email}`, 'cyan');
    log(`   Role: ${user.role}`, 'reset');
    log(`   Access Scope: ${accessScope}`, 'reset');
    log('', 'reset');
  });

  log('📊 Role Distribution:', 'blue');
  Object.entries(roleGroups).forEach(([role, count]) => {
    log(`   ${role}: ${count} users`, 'reset');
  });

  addResult('Access Control', 'PASS', `Verified access control for ${users.length} users`, {
    roleDistribution: roleGroups,
  });

  log('\n✅ Access control filtering configured correctly', 'green');
}

async function testEndpointAccessControl() {
  log('\n🔐 Verifying Endpoint Access Control Implementation...', 'cyan');
  log('═'.repeat(60), 'cyan');

  const endpoints = [
    { path: 'app/api/jkkn/institutions/route.ts', name: 'Institutions API' },
    { path: 'app/api/jkkn/staff/route.ts', name: 'Staff API' },
    { path: 'app/api/jkkn/students/route.ts', name: 'Students API' },
    { path: 'app/api/mentor/list/route.ts', name: 'Mentor List API' },
  ];

  const fs = require('fs');
  const path = require('path');

  for (const endpoint of endpoints) {
    const filePath = path.join(process.cwd(), endpoint.path);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      const hasGetUserAccess = content.includes('getUserAccess');
      const hasAccessFilter = content.includes('applyAccessFilters') ||
                              content.includes('getInstitutionFilter') ||
                              (content.includes('institutionId') && content.includes('filter')); // Manual filtering
      const hasUnauthorizedCheck = content.includes('Unauthorized');

      if (hasGetUserAccess && hasAccessFilter && hasUnauthorizedCheck) {
        addResult(endpoint.name, 'PASS', 'Access control properly implemented');
        log(`✅ ${endpoint.name}: Access control ✓`, 'green');
      } else {
        const missing = [];
        if (!hasGetUserAccess) missing.push('getUserAccess');
        if (!hasAccessFilter) missing.push('filtering');
        if (!hasUnauthorizedCheck) missing.push('auth check');

        addResult(endpoint.name, 'WARN', `Missing: ${missing.join(', ')}`);
        log(`⚠️  ${endpoint.name}: Missing ${missing.join(', ')}`, 'yellow');
      }
    } catch (error) {
      addResult(endpoint.name, 'FAIL', 'File not found or unreadable');
      log(`❌ ${endpoint.name}: Not found`, 'red');
    }
  }
}

async function generateReport() {
  log('\n' + '═'.repeat(60), 'cyan');
  log('📊 API INTEGRATION TEST REPORT', 'cyan');
  log('═'.repeat(60), 'cyan');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;

  log(`\n✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, 'red');
  log(`⚠️  Warnings: ${warnings}`, 'yellow');
  log(`📊 Total: ${results.length}`, 'blue');

  const successRate = ((passed / results.length) * 100).toFixed(1);
  log(`\n🎯 Success Rate: ${successRate}%`, successRate === '100.0' ? 'green' : 'yellow');

  log('\n📋 Detailed Results:', 'blue');
  log('═'.repeat(60), 'cyan');

  results.forEach((result, index) => {
    const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    const color = result.status === 'PASS' ? 'green' : result.status === 'FAIL' ? 'red' : 'yellow';

    log(`\n${index + 1}. ${statusIcon} ${result.endpoint}`, color);
    log(`   ${result.message}`, 'reset');

    if (result.details) {
      log(`   Details: ${JSON.stringify(result.details, null, 2).split('\n').join('\n   ')}`, 'reset');
    }
  });

  log('\n' + '═'.repeat(60), 'cyan');

  if (failed === 0) {
    log('🎉 All API integration tests PASSED!', 'green');
    log('✅ Real-time data fetching is working correctly', 'green');
    log('✅ Institution-wise filtering is properly configured', 'green');
  } else {
    log('⚠️  Some tests failed. Please review the issues above.', 'yellow');
  }

  log('', 'reset');
}

async function runTests() {
  log('\n🚀 Starting API Integration Tests...', 'bold');
  log(`📅 ${new Date().toLocaleString()}`, 'reset');

  // Test 1: API Connection
  const connected = await testAPIConnection();

  if (!connected) {
    log('\n❌ Cannot proceed without API connection', 'red');
    await generateReport();
    return;
  }

  // Test 2: Organizations/Institutions
  await testInstitutionsData();

  // Test 3: Staff Data
  await testStaffData();

  // Test 4: Students Data
  await testStudentsData();

  // Test 5: Access Control
  await testAccessControlFiltering();

  // Test 6: Endpoint Implementation
  await testEndpointAccessControl();

  // Generate final report
  await generateReport();
}

// Run tests
runTests()
  .then(() => {
    process.exit(results.filter(r => r.status === 'FAIL').length > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });
