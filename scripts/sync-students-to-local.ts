/**
 * Sync ALL Students from JKKN API to Local Supabase Database
 *
 * This script:
 * 1. Fetches ALL students from JKKN API (paginated)
 * 2. Transforms data to match local students table schema
 * 3. Upserts into local Supabase students table
 *
 * Run: npx tsx scripts/sync-students-to-local.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.NEXT_PUBLIC_MYJKKN_API_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface JKKNStudent {
  id: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  email?: string;
  student_email?: string;
  college_email?: string;
  roll_number?: string;
  rollNumber?: string;
  roll_no?: string;
  register_number?: string;
  institution_id?: string;
  institution?: { id?: string; institution_id?: string; name?: string };
  department_id?: string;
  department?: { id?: string; department_id?: string; name?: string };
  year?: string;
  current_year?: string;
  academic_year?: string;
  admission_year?: string | number;
  section?: string;
  section_id?: string;
  is_active?: boolean;
}

interface LocalStudent {
  id: string;
  name: string;
  roll_number: string;
  email: string;
  department_id: string;
  institution_id: string;
  year: string;
  section: string;
  is_active: boolean;
}

interface SyncStats {
  totalFetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  byInstitution: Map<string, number>;
}

function extractInstitutionId(student: JKKNStudent): string {
  if (student.institution_id) return student.institution_id;
  if (typeof student.institution === 'object' && student.institution !== null) {
    return student.institution.id || student.institution.institution_id || '';
  }
  return '';
}

function extractDepartmentId(student: JKKNStudent): string {
  if (student.department_id) return student.department_id;
  if (typeof student.department === 'object' && student.department !== null) {
    return student.department.id || student.department.department_id || '';
  }
  return '';
}

function transformStudent(jkknStudent: JKKNStudent): LocalStudent {
  const firstName = jkknStudent.first_name || jkknStudent.firstName || '';
  const lastName = jkknStudent.last_name || jkknStudent.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Unknown';

  // Use roll number, fallback to register number, then ID
  let rollNumber = jkknStudent.roll_number || jkknStudent.rollNumber || jkknStudent.roll_no || jkknStudent.register_number || jkknStudent.id;
  // Clean up roll number if it's empty string
  if (!rollNumber || rollNumber.trim() === '') {
    rollNumber = jkknStudent.register_number || jkknStudent.id;
  }

  const year = jkknStudent.year || jkknStudent.current_year || jkknStudent.academic_year || String(jkknStudent.admission_year || '');

  // Prefer college email, then student email, then email, then fallback
  const email = jkknStudent.college_email || jkknStudent.student_email || jkknStudent.email || `${jkknStudent.id}@student.jkkn.ac.in`;

  return {
    id: jkknStudent.id,
    name: fullName,
    roll_number: rollNumber,
    email: email,
    department_id: extractDepartmentId(jkknStudent),
    institution_id: extractInstitutionId(jkknStudent),
    year: year,
    section: jkknStudent.section || jkknStudent.section_id || '', // Section ID is often mapped to section in simpler setups
    is_active: jkknStudent.is_active !== false, // Default to true
  };
}

async function fetchAllStudentsFromJKKN(): Promise<JKKNStudent[]> {
  console.log('\n📥 Fetching ALL students from JKKN API (Learners Profiles)...');
  console.log(`   Using endpoint: ${BASE_URL}/api-management/learners/profiles`);

  let allStudents: JKKNStudent[] = [];
  let currentPage = 1;
  const maxLimit = 1000;
  let hasMore = true;
  const maxPages = 50; // Increased safety limit as learners API might have more data

  while (hasMore && currentPage <= maxPages) {
    const url = `${BASE_URL}/api-management/learners/profiles?page=${currentPage}&limit=${maxLimit}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.error(`❌ JKKN API returned 404 - endpoint may not exist`);
          break;
        }
        console.error(`❌ Failed to fetch students page ${currentPage}: ${response.status} ${response.statusText}`);
        break;
      }

      const data = await response.json();
      const pageStudents = data.data || [];

      console.log(`   ✓ Page ${currentPage}: ${pageStudents.length} students (total: ${allStudents.length + pageStudents.length})`);

      allStudents = [...allStudents, ...pageStudents];

      // Check if there are more pages
      hasMore = pageStudents.length === maxLimit;

      // Also check metadata if available
      if (data.pagination) {
        const totalPages = data.pagination.totalPages;
        if (totalPages && currentPage >= totalPages) {
          hasMore = false;
        }
      } else if (data.metadata) {
        const totalPages = data.metadata.totalPages || data.metadata.total_pages;
        if (totalPages && currentPage >= totalPages) {
          hasMore = false;
        }
      }

      currentPage++;
    } catch (error) {
      console.error(`❌ Error fetching students page ${currentPage}:`, error);
      break;
    }
  }

  console.log(`✅ Fetched ${allStudents.length} students from JKKN API\n`);
  return allStudents;
}

async function syncStudentsToLocal(students: JKKNStudent[]): Promise<SyncStats> {
  const stats: SyncStats = {
    totalFetched: students.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    byInstitution: new Map(),
  };

  console.log('🔄 Syncing students to local Supabase database...');
  console.log('─'.repeat(80));

  // Process in batches of 100 for efficiency
  const batchSize = 100;
  const batches = Math.ceil(students.length / batchSize);

  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, students.length);
    const batch = students.slice(start, end);

    const localStudents = batch.map(transformStudent);

    // Filter out students with missing required fields
    const validStudents = localStudents.filter(s => {
      if (!s.id || !s.roll_number) {
        stats.skipped++;
        return false;
      }
      return true;
    });

    if (validStudents.length === 0) continue;

    // Upsert batch
    const { data, error } = await supabase
      .from('students')
      .upsert(validStudents, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })
      .select('id, institution_id');

    if (error) {
      console.error(`❌ Batch ${i + 1}/${batches} error:`, error.message);
      stats.errors += validStudents.length;

      // Try inserting individually to identify problem records
      for (const student of validStudents) {
        const { error: singleError } = await supabase
          .from('students')
          .upsert(student, { onConflict: 'id' });

        if (singleError) {
          // Try with roll_number conflict instead
          const { error: rollError } = await supabase
            .from('students')
            .upsert(student, { onConflict: 'roll_number' });

          if (rollError) {
            console.error(`   Failed: ${student.name} (${student.roll_number}): ${rollError.message}`);
          } else {
            stats.updated++;
            // Track by institution
            const count = stats.byInstitution.get(student.institution_id) || 0;
            stats.byInstitution.set(student.institution_id, count + 1);
          }
        } else {
          stats.inserted++;
          // Track by institution
          const count = stats.byInstitution.get(student.institution_id) || 0;
          stats.byInstitution.set(student.institution_id, count + 1);
        }
      }
    } else {
      stats.inserted += validStudents.length;

      // Track by institution
      for (const student of validStudents) {
        const count = stats.byInstitution.get(student.institution_id) || 0;
        stats.byInstitution.set(student.institution_id, count + 1);
      }
    }

    // Progress update every 10 batches
    if ((i + 1) % 10 === 0 || i === batches - 1) {
      console.log(`   Progress: ${end}/${students.length} students processed`);
    }
  }

  console.log('─'.repeat(80));
  return stats;
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 SYNC STUDENTS FROM JKKN API TO LOCAL DATABASE');
  console.log('='.repeat(80));

  if (!API_KEY) {
    console.error('\n❌ Error: NEXT_PUBLIC_MYJKKN_API_KEY not found in environment');
    process.exit(1);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('\n❌ Error: Supabase credentials not found in environment');
    process.exit(1);
  }

  try {
    // Step 1: Fetch all students from JKKN API
    const jkknStudents = await fetchAllStudentsFromJKKN();

    if (jkknStudents.length === 0) {
      console.log('\n⚠️  No students fetched from JKKN API. Exiting.');
      process.exit(0);
    }

    // Step 2: Sync to local database
    const stats = await syncStudentsToLocal(jkknStudents);

    // Step 3: Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SYNC COMPLETE - SUMMARY');
    console.log('='.repeat(80));
    console.log();
    console.log(`Total students fetched:           ${stats.totalFetched}`);
    console.log(`Students synced (insert/update):  ${stats.inserted + stats.updated}`);
    console.log(`Students skipped:                 ${stats.skipped}`);
    console.log(`Errors:                           ${stats.errors}`);
    console.log();

    if (stats.byInstitution.size > 0) {
      console.log('📋 Students by Institution:');
      console.log('─'.repeat(80));

      // Fetch institution names
      const { data: institutions } = await supabase
        .from('institutions')
        .select('id, name');

      const institutionNames = new Map(
        (institutions || []).map(i => [i.id, i.name])
      );

      const sortedInstitutions = Array.from(stats.byInstitution.entries())
        .sort((a, b) => b[1] - a[1]);

      for (const [instId, count] of sortedInstitutions) {
        const name = institutionNames.get(instId) || instId || 'Unknown';
        console.log(`   ${name}: ${count} students`);
      }
      console.log();
    }

    // Step 4: Verify final count
    const { count } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    console.log(`📊 Total active students in local DB: ${count}`);
    console.log();

    console.log('='.repeat(80));
    console.log('✅ SYNC SUCCESSFUL!');
    console.log('='.repeat(80));
    console.log();
    console.log('📋 Next Steps:');
    console.log('1. Restart your development server');
    console.log('2. Test student search - students should now appear');
    console.log('3. Search for "RAHAMANIYA.J" to verify the fix');
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
