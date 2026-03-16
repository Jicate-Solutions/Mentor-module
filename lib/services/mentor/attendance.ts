/**
 * Session Attendance Service
 * Manages student attendance records for counseling sessions.
 * All methods use createAdminClient() and throw on error (routes catch + convert to HTTP).
 */

import { createAdminClient } from '@/lib/supabase/server';

// ── Types ────────────────────────────────────────────────────────────────────

export type AttendanceStatus = 'invited' | 'present' | 'absent' | 'excused';

export interface SessionAttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentName?: string;
  status: AttendanceStatus;
  markedBy: string | null;
  markedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface AttendanceStats {
  totalInvited: number;
  attended: number;
  absent: number;
  excused: number;
  attendanceRate: number;
}

export interface NotYetAttendedStudent {
  studentId: string;
  studentName: string;
  sessionName: string;
  sessionDate: string;
}

// ── Get Session Attendance ───────────────────────────────────────────────────

/**
 * Returns all attendance records for a counseling session.
 */
export async function getSessionAttendance(
  sessionId: string
): Promise<SessionAttendanceRecord[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('session_attendance')
    .select(`
      *,
      student:students!student_id (id, name)
    `)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch session attendance: ${error.message}`);

  return (data || []).map((row: any) => ({
    id: row.id,
    sessionId: row.session_id,
    studentId: row.student_id,
    studentName: row.student?.name || undefined,
    status: row.status,
    markedBy: row.marked_by,
    markedAt: row.marked_at,
    notes: row.notes,
    createdAt: row.created_at,
  }));
}

// ── Mark Attendance ──────────────────────────────────────────────────────────

/**
 * Marks attendance for a single student in a session (upsert).
 */
export async function markAttendance(
  sessionId: string,
  studentId: string,
  status: AttendanceStatus,
  markedBy: string
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('session_attendance')
    .upsert(
      {
        session_id: sessionId,
        student_id: studentId,
        status,
        marked_by: markedBy,
        marked_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,student_id' }
    );

  if (error) throw new Error(`Failed to mark attendance: ${error.message}`);
}

/**
 * Marks attendance for multiple students in a session at once (upsert).
 */
export async function bulkMarkAttendance(
  sessionId: string,
  records: { studentId: string; status: AttendanceStatus }[],
  markedBy: string
): Promise<void> {
  const supabase = createAdminClient();

  const rows = records.map((r) => ({
    session_id: sessionId,
    student_id: r.studentId,
    status: r.status,
    marked_by: markedBy,
    marked_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('session_attendance')
    .upsert(rows, { onConflict: 'session_id,student_id' });

  if (error) throw new Error(`Failed to bulk mark attendance: ${error.message}`);
}

// ── Attendance Stats ─────────────────────────────────────────────────────────

/**
 * Returns aggregate attendance statistics across all sessions for a mentor.
 */
export async function getStudentAttendanceStats(
  mentorId: string
): Promise<AttendanceStats> {
  const supabase = createAdminClient();

  // Get all sessions for this mentor
  const { data: sessions, error: sessionsError } = await supabase
    .from('counseling_sessions')
    .select('id')
    .eq('mentor_id', mentorId);

  if (sessionsError) throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);

  const sessionIds = (sessions || []).map((s: any) => s.id);

  if (sessionIds.length === 0) {
    return { totalInvited: 0, attended: 0, absent: 0, excused: 0, attendanceRate: 0 };
  }

  const { data: attendance, error: attendanceError } = await supabase
    .from('session_attendance')
    .select('status')
    .in('session_id', sessionIds);

  if (attendanceError) throw new Error(`Failed to fetch attendance stats: ${attendanceError.message}`);

  const rows = attendance || [];
  let totalInvited = 0;
  let attended = 0;
  let absent = 0;
  let excused = 0;

  for (const row of rows) {
    totalInvited++;
    if (row.status === 'present') attended++;
    else if (row.status === 'absent') absent++;
    else if (row.status === 'excused') excused++;
  }

  const attendanceRate = totalInvited > 0 ? Math.round((attended / totalInvited) * 100) : 0;

  return { totalInvited, attended, absent, excused, attendanceRate };
}

// ── Not Yet Attended ─────────────────────────────────────────────────────────

/**
 * Returns students who were invited but have not yet been marked present
 * for upcoming/completed sessions belonging to a mentor.
 */
export async function getNotYetAttendedStudents(
  mentorId: string
): Promise<NotYetAttendedStudent[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('session_attendance')
    .select(`
      student_id,
      student:students!student_id (name),
      session:counseling_sessions!session_id (session_name, date, mentor_id)
    `)
    .eq('status', 'invited');

  if (error) throw new Error(`Failed to fetch not-yet-attended students: ${error.message}`);

  // Filter to only this mentor's sessions
  return (data || [])
    .filter((row: any) => row.session?.mentor_id === mentorId)
    .map((row: any) => ({
      studentId: row.student_id,
      studentName: row.student?.name || 'Unknown',
      sessionName: row.session?.session_name || 'Unknown Session',
      sessionDate: row.session?.date || '',
    }));
}
