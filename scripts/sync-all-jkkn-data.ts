/**
 * Sync ALL Users with JKKN API Data
 *
 * This script:
 * 1. Fetches ALL staff from JKKN API
 * 2. Fetches ALL students from JKKN API
 * 3. Updates database users with correct jkkn_user_id and institution_id
 *
 * Run: npx tsx scripts/sync-all-jkkn-data.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.NEXT_PUBLIC_MYJKKN_API_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface JKKNStaff {
  id: string;
  email?: string;
  institution_email?: string;
  institution_id?: string;
  institution?: { id?: string; institution_id?: string };
  department_id?: string;
  department?: { id?: string; department_id?: string };
}

interface JKKNStudent {
  id: string;
  email?: string;
  institution_email?: string;
  institution_id?: string;
  institution?: { id?: string; institution_id?: string };
  department_id?: string;
  department?: { id?: string; department_id?: string };
}

interface UpdateStats {
  totalUsers: number;
  usersFound: number;
  usersUpdated: number;
  jkknIdUpdated: number;
  institutionIdUpdated: number;
  errors: number;
  notFoundInJKKN: string[];
}

async function fetchAllStaff(): Promise<JKKNStaff[]> {
  console.log('\n📥 Fetching ALL staff from JKKN API...');

  let allStaff: JKKNStaff[] = [];
  let currentPage = 1;
  const maxLimit = 1000;
  let hasMore = true;

  while (hasMore) {
    const url = `${BASE_URL}/api-management/staff?page=${currentPage}&limit=${maxLimit}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`❌ Failed to fetch staff page ${currentPage}: ${response.status}`);
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

  console.log(`✅ Fetched ${allStaff.length} staff members from JKKN API\n`);
  return allStaff;
}

async function fetchAllStudents(): Promise<JKKNStudent[]> {
  console.log('📥 Fetching ALL students from JKKN API...');

  let allStudents: JKKNStudent[] = [];
  let currentPage = 1;
  const maxLimit = 1000;
  let hasMore = true;
  const maxPages = 15; // Safety limit

  while (hasMore && currentPage <= maxPages) {
    const url = `${BASE_URL}/api-management/students?page=${currentPage}&limit=${maxLimit}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`❌ Failed to fetch students page ${currentPage}: ${response.status}`);
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

  console.log(`✅ Fetched ${allStudents.length} students from JKKN API\n`);
  return allStudents;
}

function extractInstitutionId(record: any): string | null {
  if (record.institution_id) return record.institution_id;
  if (typeof record.institution === 'object' && record.institution !== null) {
    return record.institution.id || record.institution.institution_id || null;
  }
  return null;
}

function extractDepartmentId(record: any): string | null {
  if (record.department_id) return record.department_id;
  if (typeof record.department === 'object' && record.department !== null) {
    return record.department.id || record.department.department_id || null;
  }
  return null;
}

async function syncUsers(): Promise<UpdateStats> {
  const stats: UpdateStats = {
    totalUsers: 0,
    usersFound: 0,
    usersUpdated: 0,
    jkknIdUpdated: 0,
    institutionIdUpdated: 0,
    errors: 0,
    notFoundInJKKN: [],
  };

  console.log('\n📊 Step 1: Fetch ALL users from database...');

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, jkkn_user_id, institution_id, department_id, role');

  if (usersError) {
    console.error('❌ Error fetching users:', usersError);
    throw usersError;
  }

  stats.totalUsers = users?.length || 0;
  console.log(`✅ Found ${stats.totalUsers} users in database\n`);

  // Fetch JKKN data
  const jkknStaff = await fetchAllStaff();
  const jkknStudents = await fetchAllStudents();

  // Create lookup maps by email
  const jkknDataByEmail = new Map<string, any>();

  jkknStaff.forEach(staff => {
    const email = (staff.email || staff.institution_email || '').toLowerCase().trim();
    if (email) {
      jkknDataByEmail.set(email, {
        jkkn_user_id: staff.id,
        institution_id: extractInstitutionId(staff),
        department_id: extractDepartmentId(staff),
        type: 'staff',
      });
    }
  });

  jkknStudents.forEach(student => {
    const email = (student.email || student.institution_email || '').toLowerCase().trim();
    if (email) {
      jkknDataByEmail.set(email, {
        jkkn_user_id: student.id,
        institution_id: extractInstitutionId(student),
        department_id: extractDepartmentId(student),
        type: 'student',
      });
    }
  });

  console.log(`📋 Created lookup map with ${jkknDataByEmail.size} JKKN records\n`);
  console.log('🔄 Step 2: Sync users with JKKN data...\n');
  console.log('─'.repeat(80));

  // Process each user
  for (const user of users || []) {
    const userEmail = (user.email || '').toLowerCase().trim();

    if (!userEmail) {
      console.log(`⚠️  Skipping user ${user.id} - no email`);
      continue;
    }

    const jkknData = jkknDataByEmail.get(userEmail);

    if (!jkknData) {
      stats.notFoundInJKKN.push(userEmail);
      continue;
    }

    stats.usersFound++;

    // Check what needs updating
    const needsJkknIdUpdate = user.jkkn_user_id !== jkknData.jkkn_user_id;
    const needsInstitutionUpdate = user.institution_id !== jkknData.institution_id;
    const needsDepartmentUpdate = user.department_id !== jkknData.department_id;

    if (!needsJkknIdUpdate && !needsInstitutionUpdate && !needsDepartmentUpdate) {
      continue; // Already in sync
    }

    // Prepare update
    const updates: any = {};
    if (needsJkknIdUpdate) {
      updates.jkkn_user_id = jkknData.jkkn_user_id;
      stats.jkknIdUpdated++;
    }
    if (needsInstitutionUpdate && jkknData.institution_id) {
      updates.institution_id = jkknData.institution_id;
      stats.institutionIdUpdated++;
    }
    if (needsDepartmentUpdate && jkknData.department_id) {
      updates.department_id = jkknData.department_id;
    }

    // Apply update
    const { error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id);

    if (updateError) {
      console.error(`❌ Error updating user ${userEmail}:`, updateError);
      stats.errors++;
      continue;
    }

    stats.usersUpdated++;

    const changeDetails = [];
    if (needsJkknIdUpdate) changeDetails.push('JKKN ID');
    if (needsInstitutionUpdate) changeDetails.push('Institution');
    if (needsDepartmentUpdate) changeDetails.push('Department');

    console.log(`✅ Updated ${userEmail} (${jkknData.type}) - Changed: ${changeDetails.join(', ')}`);
  }

  console.log('─'.repeat(80));
  return stats;
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 SYNC ALL USERS WITH JKKN API DATA');
  console.log('='.repeat(80));

  if (!API_KEY) {
    console.error('\n❌ Error: NEXT_PUBLIC_MYJKKN_API_KEY not found in .env.local');
    process.exit(1);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('\n❌ Error: Supabase credentials not found in .env.local');
    process.exit(1);
  }

  try {
    const stats = await syncUsers();

    console.log('\n' + '='.repeat(80));
    console.log('📊 SYNC COMPLETE - SUMMARY');
    console.log('='.repeat(80));
    console.log();
    console.log(`Total users in database:          ${stats.totalUsers}`);
    console.log(`Users found in JKKN API:          ${stats.usersFound}`);
    console.log(`Users NOT in JKKN API:            ${stats.notFoundInJKKN.length}`);
    console.log();
    console.log(`Users updated:                    ${stats.usersUpdated}`);
    console.log(`  - JKKN ID updated:              ${stats.jkknIdUpdated}`);
    console.log(`  - Institution ID updated:       ${stats.institutionIdUpdated}`);
    console.log(`Errors:                           ${stats.errors}`);
    console.log();

    if (stats.notFoundInJKKN.length > 0) {
      console.log('⚠️  Users NOT found in JKKN API (first 20):');
      console.log('─'.repeat(80));
      stats.notFoundInJKKN.slice(0, 20).forEach(email => {
        console.log(`   - ${email}`);
      });
      if (stats.notFoundInJKKN.length > 20) {
        console.log(`   ... and ${stats.notFoundInJKKN.length - 20} more`);
      }
      console.log();
      console.log('💡 These users exist in database but not in JKKN API.');
      console.log('   They can log in but won\'t appear in staff/student lists.');
      console.log();
    }

    console.log('='.repeat(80));
    console.log('✅ SYNC SUCCESSFUL!');
    console.log('='.repeat(80));
    console.log();
    console.log('📋 Next Steps:');
    console.log('1. Restart your development server');
    console.log('2. Test Mentor Directory page - all mentors should appear correctly');
    console.log('3. Test Student Search - all students should appear correctly');
    console.log('4. Verify institution filtering works for all users');
    console.log();

  } catch (error) {
    console.error('\n❌ Fatal error during sync:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Unhandled error:', error);
  process.exit(1);
});
