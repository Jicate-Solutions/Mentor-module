import { createAdminClient } from '@/lib/supabase/server';
import type { CounselingSession } from '@/lib/types/mentor';
import { resolveMentorByJkknId } from './resolve';
import { getDepartmentMap } from '@/lib/services/jkkn-sync';
import { ActivityLogger } from '@/lib/services/activity-logger';
import { sendSessionCreatedEmail, sendSessionUpdatedEmail, sendSessionCancelledEmail } from '@/lib/email/send-session-notification';
import { sendFeedbackRequestEmail } from '@/lib/email/send-feedback-request';
import { randomBytes } from 'crypto';

export interface CreateSessionInput {
  session_name: string;
  date: string;
  time: string;
  notes?: string;
  attachment?: string;
  student_ids?: string[];
}

export interface UpdateSessionInput {
  session_name?: string;
  date?: string;
  time?: string;
  notes?: string;
  status?: 'scheduled' | 'completed' | 'cancelled';
  attachment_url?: string;
}

export interface FeedbackInput {
  counselingQueries: string;
  actionTaken: string;
  attachmentUrl?: string;
}

// ── helpers ───────────────────────────────────────────────────────────────────

const PLACEHOLDER_EMAIL_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}@student\.jkkn\.ac\.in$/i;

function isPlaceholderEmail(email: string): boolean {
  return PLACEHOLDER_EMAIL_RE.test(email);
}

function isValidStudentEmail(email: string): boolean {
  return (
    !!email &&
    email.trim() !== '' &&
    email.includes('@') &&
    !isPlaceholderEmail(email)
  );
}

/**
 * Transform a raw Supabase counseling_sessions row (with student + feedback joins)
 * to the CounselingSession frontend interface.
 */
function transformSession(
  session: any,
  departmentMap: Map<string, string>,
  realEmailMap: Map<string, { email: string; year: string }>
): CounselingSession {
  const deptId = session.student?.department_id;
  const departmentName = deptId ? (departmentMap.get(deptId) || deptId) : '';

  let studentEmail = session.student?.email || '';
  let studentYear = session.student?.year || '';

  if (session.student?.id && realEmailMap.has(session.student.id)) {
    const resolved = realEmailMap.get(session.student.id)!;
    if (resolved.email) studentEmail = resolved.email;
    if (resolved.year && !studentYear) studentYear = resolved.year;
  }
  if (isPlaceholderEmail(studentEmail)) studentEmail = '';

  return {
    id: session.id,
    mentorId: session.mentor_id,
    studentId: session.student_id,
    studentName: session.student?.name || 'Unknown Student',
    student: session.student
      ? {
          id: session.student.id,
          name: session.student.name,
          email: studentEmail,
          rollNumber: session.student.roll_number || '',
          department: departmentName,
          year: studentYear,
          avatar: session.student.avatar_url || undefined,
          isActive: session.student.is_active ?? true,
        }
      : undefined,
    sessionName: session.session_name,
    date: session.date,
    time: session.time,
    notes: session.notes || undefined,
    attachment: session.attachment_url || undefined,
    status: session.status,
    feedback: (() => {
      // Supabase can return the related row as an object OR an array depending on
      // join multiplicity. Normalise to a single object to guard against both shapes.
      const fb = Array.isArray(session.feedback)
        ? session.feedback[0]
        : session.feedback;
      if (!fb) return undefined;
      return {
        counselingQueries: fb.counseling_queries,
        actionTaken: fb.action_taken,
        attachmentUrl: fb.attachment_url || undefined,
        submittedAt: fb.submitted_at,
        submittedBy: fb.submitted_by || '',
      };
    })(),
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  };
}

// ── getSessionsForMentor ──────────────────────────────────────────────────────

/**
 * Fetch all counseling sessions for a mentor (identified by JKKN staff ID).
 * Resolves department UUIDs and placeholder emails from the JKKN Learners API.
 */
export async function getSessionsForMentor(mentorJkknId: string): Promise<CounselingSession[]> {
  const supabaseAdmin = createAdminClient();
  const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

  const resolved = await resolveMentorByJkknId(mentorJkknId, supabaseAdmin);
  if (!resolved) {
    console.log(`[getSessionsForMentor] No mentor found for JKKN ID ${mentorJkknId}`);
    return [];
  }

  const { data: sessions, error } = await supabaseAdmin
    .from('counseling_sessions')
    .select(`
      *,
      student:students!student_id (
        id,
        name,
        roll_number,
        email,
        year,
        section,
        department_id,
        avatar_url,
        is_active
      ),
      feedback:session_feedback!session_id (
        id,
        counseling_queries,
        action_taken,
        submitted_by,
        submitted_at
      )
    `)
    .eq('mentor_id', resolved.mentor.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch counseling sessions: ${error.message}`);
  }

  // Build department map (cache-first via getDepartmentMap)
  const departmentMap = await getDepartmentMap();

  // Resolve placeholder student emails from JKKN Learners API
  const realEmailMap = new Map<string, { email: string; year: string }>();
  if (apiKey && sessions && sessions.length > 0) {
    const studentsNeedingEmail = [
      ...new Set(
        (sessions as any[])
          .filter((s: any) => s.student?.email && isPlaceholderEmail(s.student.email))
          .map((s: any) => s.student.id as string)
      ),
    ].slice(0, 20);

    if (studentsNeedingEmail.length > 0) {
      await Promise.allSettled(
        studentsNeedingEmail.map(async (studentId: string) => {
          try {
            const res = await fetch(
              `${baseUrl}/api-management/learners/profiles/${studentId}`,
              { headers: { 'Authorization': `Bearer ${apiKey}` }, cache: 'no-store', signal: AbortSignal.timeout(5000) }
            );
            if (res.ok) {
              const data = await res.json();
              const profile = data.data || data;
              const realEmail = profile?.college_email || profile?.student_email || '';
              const year = profile?.admission_year ? String(profile.admission_year) : '';
              if (realEmail || year) realEmailMap.set(studentId, { email: realEmail, year });
            }
          } catch {
            // silently skip
          }
        })
      );
      console.log(`[getSessionsForMentor] Resolved ${realEmailMap.size}/${studentsNeedingEmail.length} student emails`);
    }
  }

  return (sessions as any[]).map(s => transformSession(s, departmentMap, realEmailMap));
}

// ── createSession ─────────────────────────────────────────────────────────────

/**
 * Create a new counseling session.
 *
 * The `mentorJkknId` is the JKKN staff ID.
 * `sessionData.student_ids` is expected to have exactly one element (the student's JKKN ID).
 * `createdBy` is the Supabase user UUID of the authenticated user creating the session.
 *
 * This function:
 *  - Resolves the JKKN mentor ID to a Supabase mentor record
 *  - Fetches real student email from JKKN Learners API
 *  - Upserts the student row (creating it if it doesn't exist)
 *  - Inserts the counseling_sessions row
 *  - Logs the activity
 *  - Sends a session-created notification email (non-blocking)
 */
export async function createSession(
  mentorJkknId: string,
  data: CreateSessionInput & { student: any },
  createdBy: string
): Promise<CounselingSession> {
  const supabaseAdmin = createAdminClient();
  const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

  // Resolve JKKN ID → user + mentor
  const resolved = await resolveMentorByJkknId(mentorJkknId, supabaseAdmin);
  if (!resolved) {
    throw new Error(
      'Your mentor profile is not yet synced with JKKN. Try refreshing the page ' +
      'in a minute — self-heal runs on every request. If the problem persists, ' +
      'contact your digital coordinator to sync your staff record from JKKN.'
    );
  }

  const { student, session_name: sessionName, date, time: rawTime, notes } = data as any;

  // Validate & clamp time to prevent PostgreSQL "date/time field value out of range" errors
  // Accept HH:MM and HH:MM:SS formats (some browsers send seconds)
  let time = rawTime || '09:00';
  const timeParts = time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (timeParts) {
    const h = Math.min(Math.max(parseInt(timeParts[1], 10), 0), 23);
    const m = Math.min(Math.max(parseInt(timeParts[2], 10), 0), 59);
    time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  } else {
    time = '09:00'; // fallback for malformed time
  }

  const departmentId = resolved.mentor.department_id || '00000000-0000-0000-0000-000000000001';
  const institutionId = resolved.mentor.institution_id || '00000000-0000-0000-0000-000000000001';

  // ── Fetch real student email from JKKN Learners API ──────────────────────
  let realStudentEmail = '';
  let realStudentData: any = null;

  if (apiKey) {
    try {
      const learnerCtrl = new AbortController();
      const learnerTimeout = setTimeout(() => learnerCtrl.abort(), 5000);
      const jkknResponse = await fetch(
        `${baseUrl}/api-management/learners/profiles/${student.id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
          signal: learnerCtrl.signal,
        }
      );
      clearTimeout(learnerTimeout);
      if (jkknResponse.ok) {
        const jkknData = await jkknResponse.json();
        realStudentData = jkknData.data || jkknData;
        realStudentEmail =
          realStudentData?.college_email || realStudentData?.student_email || '';
        console.log('[createSession] Got real student email:', realStudentEmail);
      }
    } catch (jkknError) {
      console.error('[createSession] Error fetching student from JKKN Learners API:', jkknError);
    }
  }

  // Fallback to request email if it's real (not a placeholder)
  if (!realStudentEmail && student.email && !student.email.includes('@student.jkkn.ac.in')) {
    realStudentEmail = student.email;
  }

  // ── Verify/create student in Supabase ─────────────────────────────────────
  let { data: studentData, error: studentError } = await supabaseAdmin
    .from('students')
    .select('id, name, roll_number, email')
    .eq('id', student.id)
    .single();

  // Update placeholder email with real email if available
  if (studentData && realStudentEmail && studentData.email?.includes('@student.jkkn.ac.in')) {
    const jkknName = realStudentData
      ? `${realStudentData.first_name || ''} ${realStudentData.last_name || ''}`.trim()
      : '';
    const { data: updatedStudent } = await supabaseAdmin
      .from('students')
      .update({
        email: realStudentEmail,
        name: jkknName || studentData.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', student.id)
      .select('id, name, roll_number, email')
      .single();
    if (updatedStudent) studentData = updatedStudent;
  }

  // Create student record if not found
  if (studentError || !studentData) {
    const jkknStudentName = realStudentData
      ? `${realStudentData.first_name || ''} ${realStudentData.last_name || ''}`.trim()
      : '';

    const rollNum = String(
      realStudentData?.roll_number ||
      realStudentData?.register_number ||
      student.rollNumber ||
      `JKKN-${student.id.substring(0, 8)}`
    );

    // First check if student already exists by roll_number under a different UUID
    // (e.g. previously bulk-imported with a locally generated UUID).
    // Deleting the old record risks FK violations (individual_development_plans etc.),
    // so we update in-place and use the existing UUID instead.
    const { data: existingByRoll } = await supabaseAdmin
      .from('students')
      .select('id, name, roll_number, email')
      .eq('roll_number', rollNum)
      .maybeSingle();

    if (existingByRoll && existingByRoll.id !== student.id) {
      console.log(`[createSession] Student found by roll_number (id=${existingByRoll.id}), updating in-place`);
      await supabaseAdmin
        .from('students')
        .update({
          name: jkknStudentName || student.name,
          email: realStudentEmail || existingByRoll.email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingByRoll.id);
      studentData = existingByRoll;
    } else {
      const { error: createError } = await supabaseAdmin
        .from('students')
        .upsert(
          {
            id: student.id,
            name: jkknStudentName || student.name,
            email: realStudentEmail || `${student.id}@student.jkkn.ac.in`,
            roll_number: rollNum,
            department_id: departmentId,
            institution_id: institutionId,
            year: realStudentData?.admission_year
              ? String(realStudentData.admission_year)
              : student.year || null,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (createError) {
        throw new Error(`Failed to store student data: ${createError.message}`);
      }

      // Re-fetch for name
      const { data: refetched } = await supabaseAdmin
        .from('students')
        .select('id, name, roll_number, email')
        .eq('id', student.id)
        .single();
      studentData = refetched;
    }
  }

  // ── Insert counseling session ──────────────────────────────────────────────
  const { data: newSession, error: insertError } = await supabaseAdmin
    .from('counseling_sessions')
    .insert({
      mentor_id: resolved.mentor.id,
      student_id: studentData?.id || student.id,
      session_name: sessionName,
      date,
      time,
      notes: notes || null,
      attachment_url: data.attachment || null,
      status: 'scheduled',
      created_by: createdBy,
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to create counseling session: ${insertError.message}`);
  }

  console.log(`[createSession] Created session ${newSession.id}`);

  // ── Log activity (non-blocking) ───────────────────────────────────────────
  ActivityLogger.sessionCreated(
    resolved.mentor.id,
    newSession.id,
    sessionName,
    student.id,
    createdBy
  ).catch(e => console.error('[createSession] Activity log failed:', e));

  // ── Send email notification (non-blocking) ────────────────────────────────
  const { data: mentorUserData } = await supabaseAdmin
    .from('users')
    .select('full_name')
    .eq('id', resolved.user.id)
    .single();
  const mentorName = mentorUserData?.full_name || 'Your Mentor';

  const supabaseEmail = studentData?.email;
  const finalStudentEmail =
    realStudentEmail ||
    (supabaseEmail && !isPlaceholderEmail(supabaseEmail) ? supabaseEmail : '') ||
    (student.email && !isPlaceholderEmail(student.email) ? student.email : '') ||
    '';

  if (isValidStudentEmail(finalStudentEmail)) {
    sendSessionCreatedEmail({
      studentEmail: finalStudentEmail,
      studentName: studentData?.name || student.name || 'Student',
      studentId: student.id,
      mentorName,
      mentorId: resolved.mentor.id,
      sessionId: newSession.id,
      sessionName,
      sessionDate: date,
      sessionTime: time,
      sessionNotes: notes,
      sessionStatus: 'scheduled',
    }).catch(e => console.error('[createSession] Session email failed:', e));
  } else {
    console.warn(`[createSession] Skipping email — no valid address for student ${student.id}`);
  }

  // ── Transform and return ──────────────────────────────────────────────────
  return {
    id: newSession.id,
    mentorId: newSession.mentor_id,
    studentId: newSession.student_id,
    studentName: studentData?.name || student.name || 'Unknown Student',
    sessionName: newSession.session_name,
    date: newSession.date,
    time: newSession.time,
    notes: newSession.notes || undefined,
    attachment: newSession.attachment_url || undefined,
    status: newSession.status,
    createdAt: newSession.created_at,
    updatedAt: newSession.updated_at,
  };
}

// ── updateSession ─────────────────────────────────────────────────────────────

/**
 * Update a counseling session row identified by `sessionId`.
 *
 * Only fields present in `data` will be updated.
 * Sends an email notification when date or time changes (non-blocking).
 * The `mentorJkknId` is used to resolve the Supabase mentor record and verify
 * the session belongs to that mentor.
 */
export async function updateSession(
  sessionId: string,
  mentorJkknId: string,
  data: UpdateSessionInput
): Promise<CounselingSession> {
  const supabaseAdmin = createAdminClient();

  // Resolve JKKN ID → user + mentor
  const resolved = await resolveMentorByJkknId(mentorJkknId, supabaseAdmin);
  if (!resolved) {
    throw new Error('Mentor not found');
  }

  // Fetch existing session (for email diff and ownership check)
  const { data: existingSession } = await supabaseAdmin
    .from('counseling_sessions')
    .select(`
      *,
      student:students!student_id (
        id,
        name,
        email
      )
    `)
    .eq('id', sessionId)
    .eq('mentor_id', resolved.mentor.id)
    .single();

  if (!existingSession) {
    throw new Error('Session not found or access denied');
  }

  // Build sparse update payload
  const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
  if (data.session_name) updateData.session_name = data.session_name;
  if (data.date) updateData.date = data.date;
  if (data.time) updateData.time = data.time;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.attachment_url !== undefined) updateData.attachment_url = data.attachment_url;
  if (data.status) updateData.status = data.status;

  const { data: updatedSession, error: updateError } = await supabaseAdmin
    .from('counseling_sessions')
    .update(updateData)
    .eq('id', sessionId)
    .select(`
      *,
      student:students!student_id (
        id,
        name,
        roll_number,
        email,
        department_id,
        year,
        avatar_url,
        is_active
      ),
      feedback:session_feedback!session_id (
        id,
        counseling_queries,
        action_taken,
        submitted_at,
        submitted_by
      )
    `)
    .single();

  if (updateError) {
    throw new Error(`Failed to update session: ${updateError.message}`);
  }

  console.log(`[updateSession] Updated session ${sessionId}`);

  // ── Send email when date/time changes (non-blocking) ─────────────────────
  const dateChanged = data.date && data.date !== existingSession.date;
  const timeChanged = data.time && data.time !== existingSession.time;

  if ((dateChanged || timeChanged) && updatedSession.student?.email) {
    const studentEmail = updatedSession.student.email;
    if (isValidStudentEmail(studentEmail)) {
      const { data: mentorUserData } = await supabaseAdmin
        .from('users')
        .select('full_name')
        .eq('id', resolved.user.id)
        .single();
      const mentorName = mentorUserData?.full_name || 'Your Mentor';

      sendSessionUpdatedEmail({
        studentEmail,
        studentName: updatedSession.student.name,
        studentId: updatedSession.student_id,
        mentorName,
        mentorId: resolved.mentor.id,
        sessionId: updatedSession.id,
        sessionName: updatedSession.session_name,
        sessionDate: updatedSession.date,
        sessionTime: updatedSession.time,
        sessionNotes: updatedSession.notes || undefined,
        sessionStatus: 'updated',
        previousDate: dateChanged ? existingSession.date : undefined,
        previousTime: timeChanged ? existingSession.time : undefined,
      }).catch(e => console.error('[updateSession] Email notification failed:', e));
    }
  }

  // ── Transform and return ──────────────────────────────────────────────────
  return {
    id: updatedSession.id,
    mentorId: updatedSession.mentor_id,
    studentId: updatedSession.student_id,
    studentName: updatedSession.student?.name || 'Unknown Student',
    sessionName: updatedSession.session_name,
    date: updatedSession.date,
    time: updatedSession.time,
    notes: updatedSession.notes || undefined,
    attachment: updatedSession.attachment_url || undefined,
    status: updatedSession.status,
    feedback: updatedSession.feedback
      ? {
          counselingQueries: updatedSession.feedback.counseling_queries,
          actionTaken: updatedSession.feedback.action_taken,
          submittedAt: updatedSession.feedback.submitted_at,
          submittedBy: updatedSession.feedback.submitted_by || '',
        }
      : undefined,
    createdAt: updatedSession.created_at,
    updatedAt: updatedSession.updated_at,
  };
}

// ── deleteSession ─────────────────────────────────────────────────────────────

/**
 * Delete a counseling session (CASCADE removes session_feedback rows).
 * Sends a cancellation email to the student before deleting (non-blocking).
 */
export async function deleteSession(sessionId: string, mentorJkknId: string): Promise<void> {
  const supabaseAdmin = createAdminClient();

  const resolved = await resolveMentorByJkknId(mentorJkknId, supabaseAdmin);
  if (!resolved) {
    throw new Error('Mentor not found');
  }

  // Fetch session for email and ownership check
  const { data: existingSession } = await supabaseAdmin
    .from('counseling_sessions')
    .select(`
      *,
      student:students!student_id (
        id,
        name,
        email
      )
    `)
    .eq('id', sessionId)
    .eq('mentor_id', resolved.mentor.id)
    .single();

  if (!existingSession) {
    throw new Error('Session not found or access denied');
  }

  // Send cancellation email (non-blocking, before delete)
  const cancelStudentEmail = existingSession.student?.email || '';
  if (isValidStudentEmail(cancelStudentEmail)) {
    const { data: mentorUserData } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', resolved.user.id)
      .single();
    const mentorName = mentorUserData?.full_name || 'Your Mentor';

    sendSessionCancelledEmail({
      studentEmail: existingSession.student.email,
      studentName: existingSession.student.name,
      studentId: existingSession.student_id,
      mentorName,
      mentorId: resolved.mentor.id,
      sessionId: existingSession.id,
      sessionName: existingSession.session_name,
      sessionDate: existingSession.date,
      sessionTime: existingSession.time,
      sessionNotes: existingSession.notes || undefined,
      sessionStatus: 'cancelled',
    }).catch(e => console.error('[deleteSession] Cancellation email failed:', e));
  }

  // Delete the session (CASCADE handles child rows)
  const { error: deleteError } = await supabaseAdmin
    .from('counseling_sessions')
    .delete()
    .eq('id', sessionId);

  if (deleteError) {
    throw new Error(`Failed to delete session: ${deleteError.message}`);
  }

  console.log(`[deleteSession] Deleted session ${sessionId}`);
}

// ── submitSessionFeedback ─────────────────────────────────────────────────────

/**
 * Submit mentor feedback for a completed counseling session.
 *
 * This function:
 *  - Verifies the session belongs to the specified mentor (by JKKN ID)
 *  - Inserts into `session_feedback`
 *  - Updates session status to 'completed'
 *  - Creates a student_feedback token row and sends a feedback request email (non-blocking)
 */
export async function submitSessionFeedback(
  sessionId: string,
  mentorJkknId: string,
  data: FeedbackInput
): Promise<void> {
  const supabaseAdmin = createAdminClient();
  const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

  const resolved = await resolveMentorByJkknId(mentorJkknId, supabaseAdmin);
  if (!resolved) {
    throw new Error('Mentor not found');
  }

  // Verify session exists and belongs to this mentor
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('counseling_sessions')
    .select('id, mentor_id, student_id, session_name, date')
    .eq('id', sessionId)
    .eq('mentor_id', resolved.mentor.id)
    .single();

  if (sessionError || !session) {
    throw new Error('Session not found or access denied');
  }

  // Build feedback row
  const feedbackData: Record<string, any> = {
    session_id: sessionId,
    counseling_queries: data.counselingQueries,
    action_taken: data.actionTaken,
    submitted_by: resolved.user.id,
  };
  if (data.attachmentUrl) feedbackData.attachment_url = data.attachmentUrl;

  const { error: feedbackError } = await supabaseAdmin
    .from('session_feedback')
    .insert(feedbackData);

  if (feedbackError) {
    if (feedbackError.code === '23505') {
      throw new Error('Feedback already submitted for this session');
    }
    throw new Error(`Failed to submit feedback: ${feedbackError.message}`);
  }

  // Mark session as completed
  const { error: updateError } = await supabaseAdmin
    .from('counseling_sessions')
    .update({ status: 'completed' })
    .eq('id', sessionId);

  if (updateError) {
    console.error('[submitSessionFeedback] Error updating session status:', updateError);
    // Don't throw — feedback was saved; status update failure is non-fatal
  }

  // Log activity (non-blocking)
  ActivityLogger.feedbackSubmitted(
    resolved.mentor.id,
    sessionId,
    session.session_name,
    resolved.user.id
  ).catch(e => console.error('[submitSessionFeedback] Activity log failed:', e));

  // ── Send feedback request email to student (non-blocking) ─────────────────
  (async () => {
    try {
      const { data: mentorUser } = await supabaseAdmin
        .from('users')
        .select('full_name')
        .eq('id', resolved.user.id)
        .single();
      const mentorName = mentorUser?.full_name || 'Your Mentor';

      const { data: studentRecord } = await supabaseAdmin
        .from('students')
        .select('id, name, email')
        .eq('id', session.student_id)
        .single();

      let studentEmail = studentRecord?.email || '';
      const studentName = studentRecord?.name || 'Student';

      // If placeholder, try JKKN Learners API for real email
      if ((!studentEmail || isPlaceholderEmail(studentEmail)) && apiKey) {
        try {
          const jkknRes = await fetch(
            `${baseUrl}/api-management/learners/profiles/${session.student_id}`,
            { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(5000) }
          );
          if (jkknRes.ok) {
            const jkknData = await jkknRes.json();
            const profile = jkknData.data || jkknData;
            studentEmail = profile?.college_email || profile?.student_email || studentEmail;
          }
        } catch (e) {
          console.warn('[submitSessionFeedback] Could not fetch student email from JKKN API:', e);
        }
      }

      if (!isValidStudentEmail(studentEmail)) {
        console.warn(`[submitSessionFeedback] Skipping feedback email — no valid email for student ${session.student_id}`);
        return;
      }

      // Generate unique token (7-day expiry)
      const feedbackToken = randomBytes(32).toString('hex');
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7);

      const { data: studentFeedback, error: sfError } = await supabaseAdmin
        .from('student_feedback')
        .insert({
          session_id: sessionId,
          student_id: session.student_id,
          mentor_id: resolved.mentor.id,
          feedback_token: feedbackToken,
          token_expires_at: tokenExpiresAt.toISOString(),
          is_anonymous: false,
        })
        .select()
        .single();

      if (sfError) {
        if (sfError.code === '23505') {
          // Duplicate feedback token or session_id constraint — skip silently
          console.warn('[submitSessionFeedback] student_feedback row already exists for this session, skipping');
          return;
        }
        console.error('[submitSessionFeedback] Failed to create student_feedback record:', sfError);
      }

      const emailSent = await sendFeedbackRequestEmail({
        studentEmail,
        studentName,
        mentorName,
        sessionName: session.session_name,
        sessionDate: session.date,
        feedbackToken,
      });

      if (emailSent && studentFeedback?.id) {
        await supabaseAdmin
          .from('student_feedback')
          .update({ email_sent_at: new Date().toISOString() })
          .eq('id', studentFeedback.id);
        console.log(`[submitSessionFeedback] Feedback request email sent to ${studentEmail}`);
      } else if (!emailSent) {
        console.error(`[submitSessionFeedback] Failed to send feedback email to ${studentEmail}`);
      }
    } catch (error) {
      console.error('[submitSessionFeedback] Error sending feedback email:', error);
    }
  })();
}

// ── addStudentToExistingSession ───────────────────────────────────────────────

/**
 * Add a new student to a pre-scheduled counseling session day without affecting
 * other students already enrolled on that day.
 *
 * The `referenceSessionId` is any existing counseling_sessions row on the target
 * day — the function copies session_name, date, time, and mentor_id from it,
 * then creates a fresh row for the new student.
 *
 * Flow:
 *  1. Fetch the reference session to extract session metadata + ownership check
 *  2. Resolve studentJkknId → real email via JKKN Learners API
 *  3. Upsert the student row in `students` (same logic as createSession)
 *  4. Insert a new counseling_sessions row for this student
 *  5. Log activity (session_created)
 *  6. Send session-created notification email (non-blocking)
 *  7. Return the transformed CounselingSession
 */
export async function addStudentToExistingSession(
  mentorJkknId: string,
  referenceSessionId: string,
  studentJkknId: string,
  notes: string | undefined,
  createdBy: string
): Promise<CounselingSession> {
  const supabaseAdmin = createAdminClient();
  const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

  // ── Step 1: Resolve mentor and fetch reference session ────────────────────
  const resolved = await resolveMentorByJkknId(mentorJkknId, supabaseAdmin);
  if (!resolved) {
    throw new Error('Mentor not found. Please ensure the mentor has been set up correctly.');
  }

  const { data: refSession, error: refError } = await supabaseAdmin
    .from('counseling_sessions')
    .select('id, mentor_id, session_name, date, time')
    .eq('id', referenceSessionId)
    .eq('mentor_id', resolved.mentor.id)
    .single();

  if (refError || !refSession) {
    throw new Error('Reference session not found or does not belong to this mentor');
  }

  const { session_name: sessionName, date, time } = refSession;

  // ── Step 2: Fetch real student profile from JKKN Learners API ─────────────
  let realStudentEmail = '';
  let realStudentData: any = null;

  if (apiKey) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 5000);
      const jkknResponse = await fetch(
        `${baseUrl}/api-management/learners/profiles/${studentJkknId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
          signal: ctrl.signal,
        }
      );
      clearTimeout(timeout);
      if (jkknResponse.ok) {
        const jkknData = await jkknResponse.json();
        realStudentData = jkknData.data || jkknData;
        realStudentEmail =
          realStudentData?.college_email || realStudentData?.student_email || '';
        console.log('[addStudentToExistingSession] Got real student email:', realStudentEmail);
      }
    } catch (jkknError) {
      console.error('[addStudentToExistingSession] Error fetching student from JKKN Learners API:', jkknError);
    }
  }

  // ── Step 3: Upsert student in Supabase (mirrors createSession logic) ───────
  const departmentId = resolved.mentor.department_id || '00000000-0000-0000-0000-000000000001';
  const institutionId = resolved.mentor.institution_id || '00000000-0000-0000-0000-000000000001';

  let { data: studentData, error: studentError } = await supabaseAdmin
    .from('students')
    .select('id, name, roll_number, email')
    .eq('id', studentJkknId)
    .single();

  // Update placeholder email with real email if available
  if (studentData && realStudentEmail && studentData.email?.includes('@student.jkkn.ac.in')) {
    const jkknName = realStudentData
      ? `${realStudentData.first_name || ''} ${realStudentData.last_name || ''}`.trim()
      : '';
    const { data: updatedStudent } = await supabaseAdmin
      .from('students')
      .update({
        email: realStudentEmail,
        name: jkknName || studentData.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentJkknId)
      .select('id, name, roll_number, email')
      .single();
    if (updatedStudent) studentData = updatedStudent;
  }

  if (studentError || !studentData) {
    const jkknStudentName = realStudentData
      ? `${realStudentData.first_name || ''} ${realStudentData.last_name || ''}`.trim()
      : '';

    const rollNum = String(
      realStudentData?.roll_number ||
      realStudentData?.register_number ||
      `JKKN-${studentJkknId.substring(0, 8)}`
    );

    // Check if student already exists by roll_number under a different UUID
    const { data: existingByRoll } = await supabaseAdmin
      .from('students')
      .select('id, name, roll_number, email')
      .eq('roll_number', rollNum)
      .maybeSingle();

    if (existingByRoll && existingByRoll.id !== studentJkknId) {
      console.log(`[addStudentToExistingSession] Student found by roll_number (id=${existingByRoll.id}), updating in-place`);
      await supabaseAdmin
        .from('students')
        .update({
          name: jkknStudentName || existingByRoll.name,
          email: realStudentEmail || existingByRoll.email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingByRoll.id);
      studentData = existingByRoll;
    } else {
      const { error: createError } = await supabaseAdmin
        .from('students')
        .upsert(
          {
            id: studentJkknId,
            name: jkknStudentName || 'Unknown Student',
            email: realStudentEmail || `${studentJkknId}@student.jkkn.ac.in`,
            roll_number: rollNum,
            department_id: departmentId,
            institution_id: institutionId,
            year: realStudentData?.admission_year
              ? String(realStudentData.admission_year)
              : null,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (createError) {
        throw new Error(`Failed to store student data: ${createError.message}`);
      }

      const { data: refetched } = await supabaseAdmin
        .from('students')
        .select('id, name, roll_number, email')
        .eq('id', studentJkknId)
        .single();
      studentData = refetched;
    }
  }

  // ── Step 4: Insert new counseling_sessions row ────────────────────────────
  const { data: newSession, error: insertError } = await supabaseAdmin
    .from('counseling_sessions')
    .insert({
      mentor_id: resolved.mentor.id,
      student_id: studentData?.id || studentJkknId,
      session_name: sessionName,
      date,
      time,
      notes: notes || null,
      status: 'scheduled',
      created_by: createdBy,
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to add student to session: ${insertError.message}`);
  }

  console.log(`[addStudentToExistingSession] Created session ${newSession.id} for student ${studentJkknId}`);

  // ── Step 5: Log activity (non-blocking) ───────────────────────────────────
  ActivityLogger.sessionCreated(
    resolved.mentor.id,
    newSession.id,
    sessionName,
    studentData?.id || studentJkknId,
    createdBy
  ).catch(e => console.error('[addStudentToExistingSession] Activity log failed:', e));

  // ── Step 6: Send email notification (non-blocking) ────────────────────────
  const { data: mentorUserData } = await supabaseAdmin
    .from('users')
    .select('full_name')
    .eq('id', resolved.user.id)
    .single();
  const mentorName = mentorUserData?.full_name || 'Your Mentor';

  const supabaseEmail = studentData?.email;
  const finalStudentEmail =
    realStudentEmail ||
    (supabaseEmail && !isPlaceholderEmail(supabaseEmail) ? supabaseEmail : '') ||
    '';

  if (isValidStudentEmail(finalStudentEmail)) {
    sendSessionCreatedEmail({
      studentEmail: finalStudentEmail,
      studentName: studentData?.name || 'Student',
      studentId: studentData?.id || studentJkknId,
      mentorName,
      mentorId: resolved.mentor.id,
      sessionId: newSession.id,
      sessionName,
      sessionDate: date,
      sessionTime: time,
      sessionNotes: notes,
      sessionStatus: 'scheduled',
    }).catch(e => console.error('[addStudentToExistingSession] Session email failed:', e));
  } else {
    console.warn(`[addStudentToExistingSession] Skipping email — no valid address for student ${studentJkknId}`);
  }

  // ── Step 7: Transform and return ──────────────────────────────────────────
  return {
    id: newSession.id,
    mentorId: newSession.mentor_id,
    studentId: newSession.student_id,
    studentName: studentData?.name || 'Unknown Student',
    sessionName: newSession.session_name,
    date: newSession.date,
    time: newSession.time,
    notes: newSession.notes || undefined,
    attachment: newSession.attachment_url || undefined,
    status: newSession.status,
    createdAt: newSession.created_at,
    updatedAt: newSession.updated_at,
  };
}

// ── resendSessionNotification ─────────────────────────────────────────────────

/**
 * Resend email notification for an existing counseling session.
 *
 * Fetches session + student data from DB, resolves a valid email,
 * and fires a session_created notification. Useful when the original
 * notification was missed due to transient failures.
 */
export async function resendSessionNotification(
  sessionId: string,
  mentorJkknId: string
): Promise<{ sent: boolean; email: string; reason?: string }> {
  const supabaseAdmin = createAdminClient();
  const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

  // Resolve mentor
  const resolved = await resolveMentorByJkknId(mentorJkknId, supabaseAdmin);
  if (!resolved) {
    return { sent: false, email: '', reason: 'Mentor not found' };
  }

  // Fetch session with student join
  const { data: session, error: sessionErr } = await supabaseAdmin
    .from('counseling_sessions')
    .select('*, student:students!student_id(id, name, email)')
    .eq('id', sessionId)
    .eq('mentor_id', resolved.mentor.id)
    .single();

  if (sessionErr || !session) {
    return { sent: false, email: '', reason: 'Session not found or does not belong to this mentor' };
  }

  // Resolve student email
  let studentEmail = session.student?.email || '';

  // Try JKKN Learners API if email is missing or placeholder
  if ((!studentEmail || isPlaceholderEmail(studentEmail)) && apiKey) {
    try {
      const res = await fetch(
        `${baseUrl}/api-management/learners/profiles/${session.student_id}`,
        { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) {
        const profile = (await res.json()).data;
        const realEmail = profile?.college_email || profile?.student_email || '';
        if (realEmail) {
          studentEmail = realEmail;
          // Persist the real email
          await supabaseAdmin
            .from('students')
            .update({ email: realEmail, updated_at: new Date().toISOString() })
            .eq('id', session.student_id);
        }
      }
    } catch { /* non-critical */ }
  }

  if (!isValidStudentEmail(studentEmail)) {
    return { sent: false, email: studentEmail, reason: 'No valid student email available' };
  }

  // Fetch mentor display name
  const { data: mentorUser } = await supabaseAdmin
    .from('users')
    .select('full_name')
    .eq('id', resolved.user.id)
    .single();
  const mentorName = mentorUser?.full_name || 'Your Mentor';

  // Send notification
  const sent = await sendSessionCreatedEmail({
    studentEmail,
    studentName: session.student?.name || 'Student',
    studentId: session.student_id,
    mentorName,
    mentorId: resolved.mentor.id,
    sessionId: session.id,
    sessionName: session.session_name,
    sessionDate: session.date,
    sessionTime: session.time,
    sessionNotes: session.notes,
    sessionStatus: 'scheduled',
  });

  return { sent, email: studentEmail };
}
