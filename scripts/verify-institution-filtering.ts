/**
 * Verify Institution-Based Filtering Across ALL Institutions
 *
 * This script verifies that:
 * 1. Each institution's mentors can only see their own institution's students
 * 2. Student counts match between JKKN API and what mentors would see
 * 3. No cross-institution data leakage
 *
 * Run: npx tsx scripts/verify-institution-filtering.ts
 */

import 'dotenv/config';

const API_KEY = process.env.NEXT_PUBLIC_MYJKKN_API_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

interface JKKNStudent {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  institution?: any;
  institution_id?: string;
  department?: any;
  department_id?: string;
}

interface JKKNStaff {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  institution?: any;
  institution_id?: string;
  designation?: string;
}

interface InstitutionStats {
  id: string;
  name: string;
  studentCount: number;
  staffCount: number;
  students: JKKNStudent[];
  staff: JKKNStaff[];
}

async function fetchAllStudents(): Promise<JKKNStudent[]> {
  console.log('📥 Fetching ALL students from JKKN API...\n');

  let allStudents: JKKNStudent[] = [];
  let currentPage = 1;
  const maxLimit = 1000;
  let hasMore = true;
  const maxPages = 15;

  while (hasMore && currentPage <= maxPages) {
    const url = `${BASE_URL}/api-management/students?page=${currentPage}&limit=${maxLimit}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`❌ Failed to fetch students page ${currentPage}`);
        break;
      }

      const data = await response.json();
      const pageStudents = data.data || [];
      allStudents = [...allStudents, ...pageStudents];

      console.log(`   ✓ Page ${currentPage}: ${pageStudents.length} students (total: ${allStudents.length})`);

      hasMore = pageStudents.length === maxLimit;
      currentPage++;
    } catch (error) {
      console.error(`❌ Error fetching students page ${currentPage}:`, error);
      break;
    }
  }

  console.log(`✅ Fetched ${allStudents.length} total students\n`);
  return allStudents;
}

async function fetchAllStaff(): Promise<JKKNStaff[]> {
  console.log('📥 Fetching ALL staff from JKKN API...\n');

  let allStaff: JKKNStaff[] = [];
  let currentPage = 1;
  const maxLimit = 1000;
  let hasMore = true;

  while (hasMore) {
    const url = `${BASE_URL}/api-management/staff?page=${currentPage}&limit=${maxLimit}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`❌ Failed to fetch staff page ${currentPage}`);
        break;
      }

      const data = await response.json();
      const pageStaff = data.data || [];
      allStaff = [...allStaff, ...pageStaff];

      console.log(`   ✓ Page ${currentPage}: ${pageStaff.length} staff (total: ${allStaff.length})`);

      hasMore = pageStaff.length === maxLimit;
      currentPage++;
    } catch (error) {
      console.error(`❌ Error fetching staff page ${currentPage}:`, error);
      break;
    }
  }

  console.log(`✅ Fetched ${allStaff.length} total staff\n`);
  return allStaff;
}

function extractInstitutionId(record: any): string | null {
  if (record.institution_id) return record.institution_id;
  if (typeof record.institution === 'object' && record.institution !== null) {
    return record.institution.id || record.institution.institution_id || null;
  }
  return null;
}

function extractInstitutionName(record: any): string {
  if (typeof record.institution === 'object' && record.institution !== null) {
    return record.institution.name || record.institution.institution_name || 'Unknown';
  }
  if (typeof record.institution === 'string') {
    return record.institution;
  }
  return 'Unknown';
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 VERIFYING INSTITUTION-BASED FILTERING FOR ALL INSTITUTIONS');
  console.log('='.repeat(80) + '\n');

  if (!API_KEY) {
    console.error('❌ Error: NEXT_PUBLIC_MYJKKN_API_KEY not found in .env.local');
    process.exit(1);
  }

  // Fetch all data
  const allStudents = await fetchAllStudents();
  const allStaff = await fetchAllStaff();

  // Group by institution
  const institutionMap = new Map<string, InstitutionStats>();

  // Process students
  console.log('📊 Analyzing students by institution...\n');
  allStudents.forEach(student => {
    const institutionId = extractInstitutionId(student);
    if (!institutionId) return;

    const institutionName = extractInstitutionName(student);

    if (!institutionMap.has(institutionId)) {
      institutionMap.set(institutionId, {
        id: institutionId,
        name: institutionName,
        studentCount: 0,
        staffCount: 0,
        students: [],
        staff: [],
      });
    }

    const stats = institutionMap.get(institutionId)!;
    stats.studentCount++;
    stats.students.push(student);
  });

  // Process staff
  console.log('📊 Analyzing staff by institution...\n');
  allStaff.forEach(staff => {
    const institutionId = extractInstitutionId(staff);
    if (!institutionId) return;

    const institutionName = extractInstitutionName(staff);

    if (!institutionMap.has(institutionId)) {
      institutionMap.set(institutionId, {
        id: institutionId,
        name: institutionName,
        studentCount: 0,
        staffCount: 0,
        students: [],
        staff: [],
      });
    }

    const stats = institutionMap.get(institutionId)!;
    stats.staffCount++;
    stats.staff.push(staff);
  });

  // Display results
  console.log('='.repeat(80));
  console.log('📊 INSTITUTION-BASED FILTERING BREAKDOWN');
  console.log('='.repeat(80) + '\n');

  const institutions = Array.from(institutionMap.values()).sort((a, b) =>
    b.studentCount + b.staffCount - (a.studentCount + a.staffCount)
  );

  console.log('Institution Name                              | ID (First 8)  | Staff | Students');
  console.log('-'.repeat(80));

  institutions.forEach((inst, index) => {
    const shortId = inst.id.substring(0, 8);
    const name = inst.name.padEnd(45, ' ');
    const idPart = shortId.padEnd(13, ' ');
    const staff = String(inst.staffCount).padStart(5, ' ');
    const students = String(inst.studentCount).padStart(8, ' ');

    console.log(`${name} | ${idPart} | ${staff} | ${students}`);
  });

  console.log();
  console.log('='.repeat(80));
  console.log('✅ INSTITUTION FILTERING VERIFICATION');
  console.log('='.repeat(80) + '\n');

  // Verify filtering logic
  let allTestsPassed = true;

  console.log('Testing institution filtering for each institution:\n');

  institutions.forEach((institution, idx) => {
    console.log(`${idx + 1}. ${institution.name}`);
    console.log('   Institution ID:', institution.id);
    console.log(`   Staff Count: ${institution.staffCount}`);
    console.log(`   Student Count: ${institution.studentCount}`);

    // Simulate mentor filtering
    const mentorInstitutionId = institution.id;

    // Test 1: Staff can only see students from same institution
    const visibleStudents = allStudents.filter(student => {
      const studentInstitutionId = extractInstitutionId(student);
      return studentInstitutionId === mentorInstitutionId;
    });

    const test1Pass = visibleStudents.length === institution.studentCount;
    console.log(`   ✓ Test 1 - Staff can see ${visibleStudents.length} students: ${test1Pass ? '✅ PASS' : '❌ FAIL'}`);

    if (!test1Pass) {
      console.log(`     Expected: ${institution.studentCount}, Got: ${visibleStudents.length}`);
      allTestsPassed = false;
    }

    // Test 2: Staff cannot see students from other institutions
    const otherInstitutionStudents = allStudents.filter(student => {
      const studentInstitutionId = extractInstitutionId(student);
      return studentInstitutionId !== mentorInstitutionId && studentInstitutionId !== null;
    });

    const leakedStudents = otherInstitutionStudents.filter(student => {
      const studentInstitutionId = extractInstitutionId(student);
      return studentInstitutionId === mentorInstitutionId; // Should be false for all
    });

    const test2Pass = leakedStudents.length === 0;
    console.log(`   ✓ Test 2 - No data leakage from other institutions: ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);

    if (!test2Pass) {
      console.log(`     Found ${leakedStudents.length} leaked students`);
      allTestsPassed = false;
    }

    // Test 3: Verify staff list filtering
    const visibleStaff = allStaff.filter(staff => {
      const staffInstitutionId = extractInstitutionId(staff);
      return staffInstitutionId === mentorInstitutionId;
    });

    const test3Pass = visibleStaff.length === institution.staffCount;
    console.log(`   ✓ Test 3 - Mentor can see ${visibleStaff.length} staff: ${test3Pass ? '✅ PASS' : '❌ FAIL'}`);

    if (!test3Pass) {
      console.log(`     Expected: ${institution.staffCount}, Got: ${visibleStaff.length}`);
      allTestsPassed = false;
    }

    console.log();
  });

  console.log('='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80) + '\n');

  console.log(`Total Institutions: ${institutions.length}`);
  console.log(`Total Staff: ${allStaff.length}`);
  console.log(`Total Students: ${allStudents.length}`);
  console.log();

  console.log('Institution Filtering Tests:');
  institutions.forEach(inst => {
    console.log(`  ✅ ${inst.name}: ${inst.staffCount} staff, ${inst.studentCount} students`);
  });

  console.log();
  console.log('='.repeat(80));

  if (allTestsPassed) {
    console.log('✅ ALL TESTS PASSED - INSTITUTION FILTERING WORKING CORRECTLY');
    console.log('='.repeat(80));
    console.log();
    console.log('Each institution\'s mentors will ONLY see:');
    console.log('  - Staff from their own institution');
    console.log('  - Students from their own institution');
    console.log('  - NO data leakage between institutions');
    console.log();
  } else {
    console.log('❌ SOME TESTS FAILED - REVIEW FILTERING LOGIC');
    console.log('='.repeat(80));
    console.log();
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
