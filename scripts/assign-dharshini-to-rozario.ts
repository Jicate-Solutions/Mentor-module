/**
 * One-time fix: Assign Dharshini M (DB24A021) to mentor rozario.c@jkkn.ac.in
 *
 * Run: npx tsx scripts/assign-dharshini-to-rozario.ts
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const MENTOR_EMAIL = 'rozario.c@jkkn.ac.in';
const STUDENT_ROLL = 'DB24A021';
const STUDENT_NAME = 'Dharshini M';

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Step 1: Resolve mentor by email ──────────────────────────────────────
  console.log(`Looking up mentor: ${MENTOR_EMAIL}`);
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('email', MENTOR_EMAIL)
    .single();

  if (userError || !user) {
    throw new Error(`User not found for email: ${MENTOR_EMAIL} — ${userError?.message}`);
  }
  console.log(`  Found user: ${user.full_name} (${user.id})`);

  const { data: mentor, error: mentorError } = await supabase
    .from('mentors')
    .select('id, institution_id, department_id, total_students')
    .eq('user_id', user.id)
    .single();

  if (mentorError || !mentor) {
    throw new Error(`Mentor record not found for user: ${user.id} — ${mentorError?.message}`);
  }
  console.log(`  Found mentor record: ${mentor.id} (current total_students: ${mentor.total_students})`);

  // ── Step 2: Resolve student by roll number ────────────────────────────────
  console.log(`\nLooking up student: ${STUDENT_ROLL}`);
  let studentId: string | null = null;

  // Check local students table first
  const { data: localStudent } = await supabase
    .from('students')
    .select('id, name, email')
    .eq('roll_number', STUDENT_ROLL)
    .maybeSingle();

  if (localStudent) {
    studentId = localStudent.id;
    console.log(`  Found in local students: ${localStudent.name} (${localStudent.id})`);
  } else {
    // Fallback: check jkkn_students cache
    console.log(`  Not in local students — checking jkkn_students cache...`);
    const { data: cachedStudent } = await supabase
      .from('jkkn_students')
      .select('id, name, email, department_id, institution_id, year')
      .eq('roll_number', STUDENT_ROLL)
      .maybeSingle();

    if (cachedStudent) {
      console.log(`  Found in jkkn_students cache: ${cachedStudent.name} (${cachedStudent.id})`);
      console.log(`  Upserting into local students table...`);

      const { data: upserted, error: upsertError } = await supabase
        .from('students')
        .upsert({
          id: cachedStudent.id,
          roll_number: STUDENT_ROLL,
          name: cachedStudent.name || STUDENT_NAME,
          email: cachedStudent.email || `${STUDENT_ROLL.toLowerCase()}@student.jkkn.ac.in`,
          department_id: cachedStudent.department_id || mentor.department_id,
          institution_id: cachedStudent.institution_id || mentor.institution_id,
          year: cachedStudent.year || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
        .select('id')
        .single();

      if (upsertError) {
        throw new Error(`Failed to upsert student into students table: ${upsertError.message}`);
      }
      studentId = upserted.id;
      console.log(`  Upserted student with id: ${studentId}`);
    }
  }

  if (!studentId) {
    throw new Error(
      `Student with roll number ${STUDENT_ROLL} not found in 'students' or 'jkkn_students'. ` +
      `Run a JKKN sync first or verify the roll number is correct.`
    );
  }

  // ── Step 3: Guard — check if already assigned ─────────────────────────────
  console.log(`\nChecking for existing assignment...`);
  const { data: existing } = await supabase
    .from('mentor_students')
    .select('id')
    .eq('mentor_id', mentor.id)
    .eq('student_id', studentId)
    .maybeSingle();

  if (existing) {
    console.log(`  Student is ALREADY assigned to this mentor. Nothing to do.`);
    return;
  }
  console.log(`  No existing assignment found — proceeding.`);

  // ── Step 4: Insert mentor_students record ─────────────────────────────────
  console.log(`\nCreating mentor_students assignment...`);
  const { error: insertError } = await supabase
    .from('mentor_students')
    .insert({
      mentor_id: mentor.id,
      student_id: studentId,
      assigned_by: user.id,
      assigned_at: new Date().toISOString(),
    });

  if (insertError) {
    throw new Error(`Failed to insert mentor_students: ${insertError.message}`);
  }
  console.log(`  Assignment created successfully.`);

  // ── Step 5: Sync total_students count ────────────────────────────────────
  console.log(`\nSyncing mentor total_students count...`);
  const { count } = await supabase
    .from('mentor_students')
    .select('*', { count: 'exact', head: true })
    .eq('mentor_id', mentor.id);

  await supabase
    .from('mentors')
    .update({ total_students: count || 0, updated_at: new Date().toISOString() })
    .eq('id', mentor.id);

  console.log(`\n✓ SUCCESS — ${STUDENT_NAME} (${STUDENT_ROLL}) assigned to ${MENTOR_EMAIL}`);
  console.log(`  Mentor total_students updated to: ${count}`);
}

main().catch((err) => {
  console.error('\n✗ FAILED:', err.message);
  process.exit(1);
});
