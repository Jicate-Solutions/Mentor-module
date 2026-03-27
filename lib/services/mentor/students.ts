import { createAdminClient } from '@/lib/supabase/server';
import { Student } from '@/lib/types/mentor';
import { resolveMentorByJkknId } from './resolve';
import { getDepartmentMap } from '@/lib/services/jkkn-sync';
import { sendMentorAssignmentEmail } from '@/lib/email/send-assignment-notification';

export interface StudentAssignmentInput {
  studentId?: string;
  jkknStudentId?: string;
  name: string;
  email: string;
  rollNumber?: string;
  department?: string;
  year?: number;
}

export interface AssignmentResult {
  assigned: number;
  skipped: number;
  errors: string[];
}

// ── getStudentsForMentor ──────────────────────────────────────────────────────

/**
 * Returns all students assigned to the mentor identified by their JKKN staff ID.
 * Resolves department UUIDs to human-readable names via the JKKN departments API.
 */
export async function getStudentsForMentor(
  mentorJkknId: string,
  preResolvedMentorId?: string
): Promise<Student[]> {
  const supabaseAdmin = createAdminClient();

  let mentorDbId = preResolvedMentorId;

  if (!mentorDbId) {
    // Resolve JKKN ID → user → mentor (skipped if caller already resolved)
    const resolved = await resolveMentorByJkknId(mentorJkknId, supabaseAdmin);
    if (!resolved) {
      console.log(`[getStudentsForMentor] No user/mentor found for JKKN ID ${mentorJkknId}`);
      return [];
    }
    mentorDbId = resolved.mentor.id;
  }

  console.log(`[getStudentsForMentor] Found mentor ${mentorDbId} for JKKN ID ${mentorJkknId}`);

  // Fetch assignments with student details
  const { data: assignments, error } = await supabaseAdmin
    .from('mentor_students')
    .select(`
      *,
      student:students!student_id (
        id,
        name,
        email,
        roll_number,
        year,
        department_id
      )
    `)
    .eq('mentor_id', mentorDbId)
    .order('assigned_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch students: ${error.message}`);
  }

  // Build department name map (cache-first via getDepartmentMap)
  const departmentMap = await getDepartmentMap();

  // Defensive dedup by student id (DB has UNIQUE constraint, but guard against edge cases)
  const seen = new Set<string>();
  const unique = (assignments || []).filter((a: any) => {
    const sid = a.student?.id || a.student_id;
    if (seen.has(sid)) return false;
    seen.add(sid);
    return true;
  });

  return unique.map((assignment: any) => {
    const deptId = assignment.student?.department_id;
    const departmentName = deptId
      ? (departmentMap.get(deptId) || 'Unknown Department')
      : 'Unknown Department';

    return {
      id: assignment.student?.id || assignment.student_id,
      name: assignment.student?.name || 'Unknown Student',
      email: assignment.student?.email || '',
      rollNumber: assignment.student?.roll_number || '',
      department: departmentName,
      year: assignment.student?.year || '',
      assignedAt: assignment.assigned_at,
      notes: assignment.notes || undefined,
    } as Student & { assignedAt: string; notes?: string };
  });
}

// ── assignStudentsToMentor ────────────────────────────────────────────────────

/**
 * Assign a single student payload to a mentor (identified by their Supabase mentor.id).
 *
 * This function handles:
 *  - Upsert of the student row into `students`
 *  - Stale-row conflict resolution for duplicate roll_number
 *  - Duplicate assignment detection (per student, any mentor)
 *  - Insertion into `mentor_students`
 *
 * The `mentorId` parameter here is the **Supabase mentors.id** (not JKKN ID).
 * Callers are responsible for resolving the JKKN staff ID first.
 *
 * Returns an AssignmentResult summarising how many succeeded / were skipped / errored.
 */
export async function assignStudentsToMentor(
  mentorId: string,
  studentsPayload: StudentAssignmentInput[],
  assignedBy: string
): Promise<AssignmentResult> {
  const supabaseAdmin = createAdminClient();

  const result: AssignmentResult = { assigned: 0, skipped: 0, errors: [] };

  // Fetch the mentor's department/institution for student upsert
  const { data: mentorRecord } = await supabaseAdmin
    .from('mentors')
    .select('id, department_id, institution_id, user_id')
    .eq('id', mentorId)
    .single();

  if (!mentorRecord) {
    throw new Error(`Mentor record not found for id ${mentorId}`);
  }

  const departmentId = mentorRecord.department_id || '00000000-0000-0000-0000-000000000001';
  const institutionId = mentorRecord.institution_id || '00000000-0000-0000-0000-000000000001';

  // Fetch mentor display name (once, before the loop)
  let mentorDisplayName = 'Your Mentor';
  if (mentorRecord?.user_id) {
    const { data: mentorUser } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', mentorRecord.user_id)
      .single();
    mentorDisplayName = mentorUser?.full_name || 'Your Mentor';
  }

  // JKKN API constants (used for email resolution inside the loop)
  const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

  for (const studentInput of studentsPayload) {
    // Derive the canonical student id
    const studentId =
      studentInput.studentId ||
      studentInput.jkknStudentId ||
      studentInput.email;

    if (!studentId) {
      result.errors.push(`Skipped student "${studentInput.name}": could not determine ID`);
      result.skipped++;
      continue;
    }

    try {
      // ── Check for existing assignment (any mentor) ────────────────────────
      const { data: existingAssignment } = await supabaseAdmin
        .from('mentor_students')
        .select(`
          id,
          mentor_id,
          mentors:mentor_id (
            id,
            users:user_id (
              full_name
            )
          )
        `)
        .eq('student_id', studentId)
        .maybeSingle();

      if (existingAssignment) {
        const assignedMentorName =
          (existingAssignment as any).mentors?.users?.full_name || 'another mentor';
        const isSameMentor = existingAssignment.mentor_id === mentorId;

        if (isSameMentor) {
          result.errors.push(`${studentInput.name} is already assigned to this mentor`);
        } else {
          result.errors.push(`${studentInput.name} is already assigned to ${assignedMentorName}`);
        }
        result.skipped++;
        continue;
      }

      // ── Resolve real email from JKKN Learners API ───────────────────────
      let resolvedEmail = studentInput.email || '';
      let resolvedName = studentInput.name;

      if (apiKey && (!resolvedEmail || resolvedEmail.includes('@student.jkkn.ac.in'))) {
        try {
          const res = await fetch(
            `${baseUrl}/api-management/learners/profiles/${studentId}`,
            { headers: { 'Authorization': `Bearer ${apiKey}` }, signal: AbortSignal.timeout(5000) }
          );
          if (res.ok) {
            const json = await res.json();
            const profile = json.data || json;
            const realEmail = profile?.college_email || profile?.student_email || '';
            if (realEmail) resolvedEmail = realEmail;
            const apiName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
            if (apiName) resolvedName = apiName;
          }
        } catch (e) {
          console.warn(`[assignStudentsToMentor] JKKN API email lookup failed for ${studentId}:`, e instanceof Error ? e.message : e);
        }
      }

      // Fallback: check jkkn_students cache if still no real email
      if (!resolvedEmail || resolvedEmail.includes('@student.jkkn.ac.in')) {
        try {
          const { data: cached } = await supabaseAdmin
            .from('jkkn_students')
            .select('email, name')
            .eq('id', studentId)
            .not('email', 'is', null)
            .maybeSingle();

          if (cached?.email && !cached.email.includes('@student.jkkn.ac.in')) {
            resolvedEmail = cached.email;
            console.log(`[assignStudentsToMentor] Resolved email from cache: ${resolvedEmail}`);
          }
          if (cached?.name && !resolvedName) resolvedName = cached.name;
        } catch {
          // Non-critical
        }
      }

      // ── Upsert student row ────────────────────────────────────────────────
      const studentData = {
        id: studentId,
        name: resolvedName,
        email: resolvedEmail || `${studentId}@student.jkkn.ac.in`,
        roll_number:
          studentInput.rollNumber && studentInput.rollNumber !== 'N/A'
            ? studentInput.rollNumber
            : studentId,
        department_id: departmentId,
        institution_id: institutionId,
        year: studentInput.year || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      let studentIdForAssignment = studentId;
      let { error: studentUpsertError } = await supabaseAdmin
        .from('students')
        .upsert(studentData, { onConflict: 'id' });

      // Handle duplicate roll_number (stale row conflict)
      if (studentUpsertError?.code === '23505') {
        console.warn('[assignStudentsToMentor] Duplicate key conflict, checking for stale row...');
        const rollNum = studentData.roll_number;

        const { data: conflicting } = await supabaseAdmin
          .from('students')
          .select('id, name, roll_number, email')
          .eq('roll_number', rollNum)
          .maybeSingle();

        if (conflicting && conflicting.id !== studentId) {
          // Safe approach: update existing student record instead of deleting it.
          // Deleting risks FK violations from tables like individual_development_plans
          // that reference students(id) without ON DELETE CASCADE.
          console.log(`[assignStudentsToMentor] Stale row found (id=${conflicting.id}), updating in-place`);

          const { error: updateError } = await supabaseAdmin
            .from('students')
            .update({
              name: studentData.name,
              email: studentData.email,
              year: studentData.year,
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', conflicting.id);

          if (updateError) {
            result.errors.push(
              `${studentInput.name}: Failed to update student record — ${updateError.message}`
            );
            result.skipped++;
            continue;
          }

          // Check if already assigned to any mentor under the existing UUID
          const { data: existingUnderOldId } = await supabaseAdmin
            .from('mentor_students')
            .select(`
              id,
              mentor_id,
              mentors:mentor_id (
                id,
                users:user_id (
                  full_name
                )
              )
            `)
            .eq('student_id', conflicting.id)
            .maybeSingle();

          if (existingUnderOldId) {
            const isSameMentor = existingUnderOldId.mentor_id === mentorId;
            if (isSameMentor) {
              result.errors.push(`${studentInput.name} is already assigned to this mentor`);
            } else {
              const assignedTo = (existingUnderOldId as any).mentors?.users?.full_name || 'another mentor';
              result.errors.push(`${studentInput.name} is already assigned to ${assignedTo}`);
            }
            result.skipped++;
            continue;
          }

          // Use the existing UUID for the assignment (not the JKKN UUID)
          studentIdForAssignment = conflicting.id;
          studentUpsertError = null;
        } else if (conflicting) {
          // Same roll number but different scenario (already legitimately exists)
          const { data: assignment } = await supabaseAdmin
            .from('mentor_students')
            .select(`mentors:mentor_id (users:user_id (full_name))`)
            .eq('student_id', conflicting.id)
            .maybeSingle();
          const assignedTo = (assignment as any)?.mentors?.users?.full_name;
          const errorMsg = assignedTo
            ? `${studentInput.name} (${rollNum}) is already assigned to ${assignedTo}`
            : `${studentInput.name}: roll number ${rollNum} already belongs to ${conflicting.name}`;
          result.errors.push(errorMsg);
          result.skipped++;
          continue;
        }
      }

      if (studentUpsertError) {
        result.errors.push(
          `${studentInput.name}: Failed to save student data — ${studentUpsertError.message}`
        );
        result.skipped++;
        continue;
      }

      // ── Create mentor-student relationship ────────────────────────────────
      const { error: insertError } = await supabaseAdmin
        .from('mentor_students')
        .insert({
          mentor_id: mentorId,
          student_id: studentIdForAssignment,
          assigned_by: assignedBy,
          notes: null,
        });

      if (insertError) {
        result.errors.push(
          `${studentInput.name}: Failed to assign — ${insertError.message}`
        );
        result.skipped++;
        continue;
      }

      result.assigned++;
      console.log(`[assignStudentsToMentor] Assigned student ${studentIdForAssignment} to mentor ${mentorId}`);

      // ── Send assignment notification email (non-blocking) ────────────
      const finalEmail = resolvedEmail || studentInput.email || '';
      if (finalEmail && !finalEmail.includes('@student.jkkn.ac.in') && finalEmail.includes('@')) {
        console.log(`[assignStudentsToMentor] Sending notification to ${finalEmail} for ${resolvedName || studentInput.name}`);
        sendMentorAssignmentEmail({
          studentEmail: finalEmail,
          studentName: resolvedName || studentInput.name,
          studentId: studentIdForAssignment,
          mentorName: mentorDisplayName,
          mentorId,
        }).catch(e => console.error('[assignStudentsToMentor] Assignment email failed:', e));
      } else {
        console.warn(`[assignStudentsToMentor] ⚠ No valid email for ${studentInput.name} (email: "${finalEmail}") — notification skipped`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`${studentInput.name}: Unexpected error — ${msg}`);
      result.skipped++;
    }
  }

  return result;
}

// ── removeStudentFromMentor ───────────────────────────────────────────────────

/**
 * Remove the mentor-student assignment row for the given student.
 * The `mentorJkknId` is the JKKN staff ID; it is resolved to the Supabase mentor.id
 * before deleting.
 */
export async function removeStudentFromMentor(
  mentorJkknId: string,
  studentId: string
): Promise<void> {
  const supabaseAdmin = createAdminClient();

  const resolved = await resolveMentorByJkknId(mentorJkknId, supabaseAdmin);
  if (!resolved) {
    throw new Error(`Mentor not found for JKKN ID ${mentorJkknId}`);
  }

  const { error: deleteError } = await supabaseAdmin
    .from('mentor_students')
    .delete()
    .eq('mentor_id', resolved.mentor.id)
    .eq('student_id', studentId);

  if (deleteError) {
    throw new Error(`Failed to remove student: ${deleteError.message}`);
  }

  console.log(`[removeStudentFromMentor] Removed student ${studentId} from mentor ${resolved.mentor.id}`);
}

// ── bulkAssignStudents ────────────────────────────────────────────────────────

export interface BulkStudentInput {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  year?: string;
}

export interface BulkAssignResult {
  success: string[];
  alreadyAssigned: string[];
  failed: { rollNumber: string; error: string }[];
}

/**
 * Bulk-assign multiple students to a mentor identified by their Supabase mentor.id.
 * Handles student upsert, duplicate-assignment detection, and total_students sync.
 *
 * @param mentorId      Supabase mentors.id (NOT JKKN ID — caller must resolve first)
 * @param students      Array of student payloads to assign
 * @param assignedBy    Supabase users.id of the person performing the assignment
 */
export async function bulkAssignStudents(
  mentorId: string,
  students: BulkStudentInput[],
  assignedBy: string | null
): Promise<BulkAssignResult> {
  const supabaseAdmin = createAdminClient();

  const { data: mentorRecord } = await supabaseAdmin
    .from('mentors')
    .select('id, department_id, institution_id')
    .eq('id', mentorId)
    .single();

  if (!mentorRecord) {
    throw new Error(`Mentor record not found for id ${mentorId}`);
  }

  const institutionId = mentorRecord.institution_id || '00000000-0000-0000-0000-000000000001';
  const departmentId = mentorRecord.department_id || '00000000-0000-0000-0000-000000000001';

  const result: BulkAssignResult = { success: [], alreadyAssigned: [], failed: [] };

  // Process all students in parallel — upsert+insert are independent across students
  const assignments = await Promise.all(students.map(async (student) => {
    try {
      let studentId: string = student.id;

      const { data: studentRecord, error: upsertError } = await supabaseAdmin
        .from('students')
        .upsert({
          id: student.id,
          roll_number: student.rollNumber,
          name: student.name,
          email: student.email || `${student.rollNumber}@student.jkkn.ac.in`,
          department_id: departmentId,
          institution_id: institutionId,
          year: student.year || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
        .select('id')
        .single();

      if (upsertError) {
        // Handle duplicate roll_number (jkkn_students.id ≠ students.id for same student)
        if (upsertError.code === '23505') {
          const { data: existing } = await supabaseAdmin
            .from('students')
            .select('id')
            .eq('roll_number', student.rollNumber)
            .maybeSingle();

          if (existing) {
            await supabaseAdmin
              .from('students')
              .update({
                name: student.name,
                email: student.email || `${student.rollNumber}@student.jkkn.ac.in`,
                year: student.year || null,
                is_active: true,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);

            studentId = existing.id;
          } else {
            console.error(`[bulkAssignStudents] 23505 conflict but no row found for ${student.rollNumber}`);
            return { type: 'failed' as const, rollNumber: student.rollNumber, error: 'Duplicate key but student not found' };
          }
        } else {
          console.error(`[bulkAssignStudents] Failed to upsert student ${student.rollNumber}:`, upsertError);
          return { type: 'failed' as const, rollNumber: student.rollNumber, error: 'Failed to create student record' };
        }
      } else if (studentRecord) {
        studentId = studentRecord.id;
      }

      const { error: mappingError } = await supabaseAdmin
        .from('mentor_students')
        .insert({
          mentor_id: mentorId,
          student_id: studentId,
          assigned_by: assignedBy,
          assigned_at: new Date().toISOString(),
        });

      if (mappingError) {
        if (mappingError.code === '23505') {
          return { type: 'alreadyAssigned' as const, rollNumber: student.rollNumber };
        }
        console.error(`[bulkAssignStudents] Failed to assign ${student.rollNumber}:`, mappingError);
        return { type: 'failed' as const, rollNumber: student.rollNumber, error: mappingError.message };
      }

      return { type: 'success' as const, rollNumber: student.rollNumber };
    } catch (e) {
      console.error(`[bulkAssignStudents] Unexpected error for ${student.rollNumber}:`, e);
      return { type: 'failed' as const, rollNumber: student.rollNumber, error: 'Unexpected error' };
    }
  }));

  for (const a of assignments) {
    if (a.type === 'success') result.success.push(a.rollNumber);
    else if (a.type === 'alreadyAssigned') result.alreadyAssigned.push(a.rollNumber);
    else result.failed.push({ rollNumber: a.rollNumber, error: (a as { type: 'failed'; rollNumber: string; error: string }).error });
  }

  // Sync mentor's total_students count if any new assignments were made
  if (result.success.length > 0) {
    const { count } = await supabaseAdmin
      .from('mentor_students')
      .select('*', { count: 'exact', head: true })
      .eq('mentor_id', mentorId);

    await supabaseAdmin
      .from('mentors')
      .update({ total_students: count || 0, updated_at: new Date().toISOString() })
      .eq('id', mentorId);

    // ── Send email notifications for successfully assigned students (non-blocking) ──
    // Fetch mentor display name
    let mentorDisplayName = 'Your Mentor';
    const { data: mentorUser } = await supabaseAdmin
      .from('mentors')
      .select('user_id')
      .eq('id', mentorId)
      .single();
    if (mentorUser?.user_id) {
      const { data: mu } = await supabaseAdmin
        .from('users')
        .select('full_name')
        .eq('id', mentorUser.user_id)
        .single();
      if (mu?.full_name) mentorDisplayName = mu.full_name;
    }

    // Send emails in parallel (non-blocking, fire-and-forget)
    const successStudents = students.filter(s => result.success.includes(s.rollNumber));
    for (const student of successStudents) {
      let email = student.email || '';

      // Resolve real email from jkkn_students cache if placeholder
      if (!email || email.includes('@student.jkkn.ac.in')) {
        const { data: cached } = await supabaseAdmin
          .from('jkkn_students')
          .select('email')
          .eq('id', student.id)
          .not('email', 'is', null)
          .maybeSingle();
        if (cached?.email && !cached.email.includes('@student.jkkn.ac.in')) {
          email = cached.email;
          // Also update the student record with resolved email
          await supabaseAdmin
            .from('students')
            .update({ email, updated_at: new Date().toISOString() })
            .eq('id', student.id);
        }
      }

      if (email && !email.includes('@student.jkkn.ac.in') && email.includes('@')) {
        sendMentorAssignmentEmail({
          studentEmail: email,
          studentName: student.name,
          studentId: student.id,
          mentorName: mentorDisplayName,
          mentorId,
        }).catch(e => console.error(`[bulkAssignStudents] Email failed for ${student.name}:`, e));
      } else {
        console.warn(`[bulkAssignStudents] ⚠ No valid email for ${student.name} (email: "${email}") — notification skipped`);
      }
    }
  }

  return result;
}
