/**
 * Sync specific pharmacy college students from JKKN API and assign to mentors.
 *
 * Run: npx tsx scripts/sync-pharmacy-students.ts
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_MYJKKN_API_KEY
 *   NEXT_PUBLIC_MYJKKN_BASE_URL
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JKKN_API_KEY = process.env.NEXT_PUBLIC_MYJKKN_API_KEY!;
const JKKN_BASE_URL = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

const INSTITUTION_ID = '5736d86f-5dab-4b7f-9aa1-b3bb1a2dd334'; // Pharmacy college

// Students to sync and their target mentors
const TARGETS = [
  {
    email: 'gokulraj25pb@jkkn.ac.in',
    mentorId: '524c7f2e-5a29-4670-a113-ddf20378e6da', // MOHANA PRIYA N
    mentorUserIdForAssignedBy: 'f6c9037e-6069-4e99-9332-49cac1d68420',
    mentorName: 'MISS. MOHANA PRIYA N',
  },
  {
    email: 'hanshikas25pb@jkkn.ac.in',
    mentorId: 'b89e4e3b-8cee-44ca-b022-22dc5a294899', // KRISHNAN R
    mentorUserIdForAssignedBy: 'f7e04ada-b551-43d8-b4cb-dc6f33306693',
    mentorName: 'MR. KRISHNAN R',
  },
  {
    email: 'malinis.bp@jkkn.ac.in',
    mentorId: 'dfda8051-9f93-47a6-ad07-2c8da3a23343', // POOVARASU V
    mentorUserIdForAssignedBy: 'caf6aa2e-ea15-489b-b064-653cc46a78fc',
    mentorName: 'POOVARASU V',
  },
];

type JkknStudent = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  roll_number?: string;
  rollNumber?: string;
  roll_no?: string;
  institution?: { id?: string } | string;
  institution_id?: string;
  department?: { id?: string; name?: string } | string;
  department_id?: string;
  year?: string;
  section?: string;
  academic_year?: string;
  lifecycle_status?: string;
};

async function fetchAllLearners(): Promise<JkknStudent[]> {
  const PAGE_SIZE = 200;
  let allStudents: JkknStudent[] = [];
  let page = 1;
  let hasMore = true;

  console.log('[JKKN API] Fetching all learners (paginated)...');

  while (hasMore) {
    const url = `${JKKN_BASE_URL}/api-management/learners/profiles?lifecycle_status=active,alumni,exited,graduated,inactive&page=${page}&limit=${PAGE_SIZE}`;
    console.log(`  Fetching page ${page}...`);

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${JKKN_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`JKKN API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const students: JkknStudent[] = data.data || [];
    console.log(`  Page ${page}: ${students.length} learners`);
    allStudents = allStudents.concat(students);

    // Check pagination
    const pagination = data.pagination || data.metadata;
    const totalPages = pagination?.totalPages || pagination?.total_pages;
    if (totalPages && page >= totalPages) {
      hasMore = false;
    } else if (students.length < PAGE_SIZE) {
      hasMore = false;
    }

    page++;

    // Safety limit: 100 pages × 200 = 20,000 students
    if (page > 100) {
      console.warn('[JKKN API] Safety limit reached (100 pages). Stopping.');
      hasMore = false;
    }
  }

  console.log(`[JKKN API] Total learners fetched: ${allStudents.length} across ${page - 1} pages`);
  return allStudents;
}

function extractInstitutionId(student: JkknStudent): string {
  if (typeof student.institution === 'object' && student.institution?.id) {
    return student.institution.id;
  }
  if (typeof student.institution === 'string') return student.institution;
  return student.institution_id || '';
}

function extractDepartmentId(student: JkknStudent): string {
  if (typeof student.department === 'object' && student.department?.id) {
    return student.department.id;
  }
  if (typeof student.department === 'string') return student.department;
  return student.department_id || '';
}

function extractDepartmentName(student: JkknStudent): string {
  if (typeof student.department === 'object') {
    return (student.department as any)?.name || '';
  }
  return '';
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  }
  if (!JKKN_API_KEY) {
    throw new Error('Missing NEXT_PUBLIC_MYJKKN_API_KEY env var');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Step 1: Fetch all learners from JKKN API ──────────────────────────────
  const allLearners = await fetchAllLearners();

  // Build email → student map (case-insensitive)
  const emailMap = new Map<string, JkknStudent>();
  for (const s of allLearners) {
    if (s.email) {
      emailMap.set(s.email.toLowerCase().trim(), s);
    }
  }

  console.log(`\n[Index] Indexed ${emailMap.size} unique emails from JKKN API\n`);

  // ── Step 2: Process each target ───────────────────────────────────────────
  for (const target of TARGETS) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Processing: ${target.email} → ${target.mentorName}`);

    const jkknStudent = emailMap.get(target.email.toLowerCase());

    if (!jkknStudent) {
      console.error(`  ✗ NOT FOUND in JKKN API: ${target.email}`);
      // Try partial match (name portion of email)
      const localPart = target.email.split('@')[0].toLowerCase();
      const similar = allLearners.filter(s => s.email?.toLowerCase().includes(localPart));
      if (similar.length > 0) {
        console.log(`  Similar emails found in API:`);
        similar.forEach(s => console.log(`    - ${s.email} (ID: ${s.id})`));
      }
      continue;
    }

    const studentJkknId = jkknStudent.id;
    const studentName = `${jkknStudent.first_name || ''} ${jkknStudent.last_name || ''}`.trim();
    const rollNumber = jkknStudent.roll_number || jkknStudent.rollNumber || jkknStudent.roll_no || '';
    const institutionId = extractInstitutionId(jkknStudent) || INSTITUTION_ID;
    const departmentId = extractDepartmentId(jkknStudent) || '';
    const year = jkknStudent.year || '';

    console.log(`  Found: ${studentName} (ID: ${studentJkknId}, Roll: ${rollNumber})`);
    console.log(`  Institution: ${institutionId}, Dept: ${departmentId}`);

    // ── Step 3: Upsert into jkkn_students ──────────────────────────────────
    const { error: jkknUpsertErr } = await supabase
      .from('jkkn_students')
      .upsert({
        id: studentJkknId,
        roll_number: rollNumber,
        name: studentName,
        email: jkknStudent.email,
        institution_id: institutionId,
        department_id: departmentId,
        year: year,
        section: jkknStudent.section || null,
        academic_year: jkknStudent.academic_year || null,
        lifecycle_status: jkknStudent.lifecycle_status || 'active',
        is_active: true,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (jkknUpsertErr) {
      console.error(`  ✗ Failed to upsert into jkkn_students: ${jkknUpsertErr.message}`);
    } else {
      console.log(`  ✓ Upserted into jkkn_students`);
    }

    // ── Step 4: Check / upsert into students table ─────────────────────────
    // students.id is UUID — check if JKKN ID is valid UUID, else look up by email
    let studentUuid: string | null = null;

    // First check if already exists by email
    const { data: existingByEmail } = await supabase
      .from('students')
      .select('id')
      .eq('email', jkknStudent.email!)
      .maybeSingle();

    if (existingByEmail) {
      studentUuid = existingByEmail.id;
      console.log(`  Student already in students table (id: ${studentUuid})`);
    } else {
      // Check if JKKN ID looks like a UUID (it often is)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const useJkknIdAsUuid = uuidRegex.test(studentJkknId);

      const insertData: Record<string, any> = {
        name: studentName,
        email: jkknStudent.email,
        roll_number: rollNumber || studentJkknId,
        department_id: departmentId,
        institution_id: institutionId,
        year: year,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (useJkknIdAsUuid) {
        insertData.id = studentJkknId;
        const { data: upserted, error: upsertErr } = await supabase
          .from('students')
          .upsert(insertData, { onConflict: 'id' })
          .select('id')
          .single();

        if (upsertErr) {
          console.error(`  ✗ Failed to upsert student (with JKKN UUID): ${upsertErr.message}`);
          // Try insert without specifying ID (let PG generate)
          const { data: inserted, error: insertErr } = await supabase
            .from('students')
            .insert(insertData)
            .select('id')
            .single();
          if (insertErr) {
            console.error(`  ✗ Insert also failed: ${insertErr.message}`);
          } else {
            studentUuid = inserted?.id || null;
            console.log(`  ✓ Inserted into students (generated id: ${studentUuid})`);
          }
        } else {
          studentUuid = upserted?.id || null;
          console.log(`  ✓ Upserted into students (id: ${studentUuid})`);
        }
      } else {
        // JKKN ID is not a UUID — insert and let PG generate UUID
        const { data: inserted, error: insertErr } = await supabase
          .from('students')
          .insert(insertData)
          .select('id')
          .single();
        if (insertErr) {
          console.error(`  ✗ Failed to insert student: ${insertErr.message}`);
        } else {
          studentUuid = inserted?.id || null;
          console.log(`  ✓ Inserted into students (generated id: ${studentUuid})`);
        }
      }
    }

    if (!studentUuid) {
      console.error(`  ✗ Could not determine student UUID — skipping assignment`);
      continue;
    }

    // ── Step 5: Check for existing assignment ─────────────────────────────
    const { data: existingAssignment } = await supabase
      .from('mentor_students')
      .select('id, mentor_id')
      .eq('student_id', studentUuid)
      .maybeSingle();

    if (existingAssignment) {
      if (existingAssignment.mentor_id === target.mentorId) {
        console.log(`  Already assigned to this mentor — nothing to do.`);
      } else {
        console.warn(`  Student already assigned to a DIFFERENT mentor (${existingAssignment.mentor_id})`);
        console.warn(`  Skipping — manually reassign if needed.`);
      }
      continue;
    }

    // ── Step 6: Create mentor_students assignment ─────────────────────────
    const { error: assignErr } = await supabase
      .from('mentor_students')
      .insert({
        mentor_id: target.mentorId,
        student_id: studentUuid,
        assigned_by: target.mentorUserIdForAssignedBy,
        assigned_at: new Date().toISOString(),
      });

    if (assignErr) {
      console.error(`  ✗ Failed to create assignment: ${assignErr.message}`);
      continue;
    }
    console.log(`  ✓ Assigned to ${target.mentorName}`);

    // ── Step 7: Sync total_students count ────────────────────────────────
    const { count } = await supabase
      .from('mentor_students')
      .select('*', { count: 'exact', head: true })
      .eq('mentor_id', target.mentorId);

    await supabase
      .from('mentors')
      .update({ total_students: count || 0, updated_at: new Date().toISOString() })
      .eq('id', target.mentorId);

    console.log(`  ✓ ${target.mentorName} total_students updated to ${count}`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('Script completed.');
}

main().catch((err) => {
  console.error('\n✗ FATAL ERROR:', err.message);
  process.exit(1);
});
