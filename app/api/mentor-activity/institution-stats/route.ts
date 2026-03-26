import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserAccess } from '@/lib/middleware/access-control';
import { ok, err } from '@/lib/utils/api-response';

/**
 * GET /api/mentor-activity/institution-stats
 * Get mentor performance stats for an institution (for Mentor In-Charge)
 *
 * Query params:
 * - period: 'all' | 'week' | 'month' | 'last_month' | 'year' (default: 'all')
 * - institutionId: Filter by institution (optional, uses user's institution if not provided)
 */
export async function GET(request: NextRequest) {
  try {
    const userAccess = await getUserAccess();
    if (!userAccess) {
      return err('Unauthorized', 401);
    }

    // Admin, HOD, or mentor in-charge can access institution stats
    const isAuthorized =
      userAccess.role === 'super_admin' ||
      userAccess.role === 'institution_admin' ||
      userAccess.role === 'hod' ||
      userAccess.isSuperAdmin ||
      userAccess.isMentorIncharge;

    if (!isAuthorized) {
      return err('Forbidden: Only admins, HODs, and mentor in-charge can view institution stats', 403);
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'all';
    let institutionId = searchParams.get('institutionId');
    const departmentId = searchParams.get('departmentId');

    // For mentor in-charge, use their assigned institution
    if (!institutionId && userAccess.isMentorIncharge) {
      institutionId = userAccess.mentorInchargeInstitutionId || userAccess.institutionId;
    }

    // For institution admin, use their institution
    if (!institutionId && userAccess.role === 'institution_admin') {
      institutionId = userAccess.institutionId;
    }

    const supabase = createAdminClient();

    // Calculate date range based on period
    // Uses YYYY-MM-DD format for the DATE column in counseling_sessions
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date = now;

    switch (period) {
      case 'all':
        // No date filter — show all-time stats
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Format dates as YYYY-MM-DD for the DATE column
    const toDateStr = (d: Date) => d.toISOString().split('T')[0];
    const startDateStr = startDate ? toDateStr(startDate) : null;
    const endDateStr = toDateStr(endDate);

    // Get all mentors in the institution with their session counts
    let mentorsQuery = supabase
      .from('mentors')
      .select(`
        id,
        user_id,
        department_id,
        designation,
        is_active,
        users!mentors_user_id_fkey (
          full_name,
          email
        )
      `)
      .eq('is_active', true);

    if (institutionId) {
      mentorsQuery = mentorsQuery.eq('institution_id', institutionId);
    }

    if (departmentId) {
      mentorsQuery = mentorsQuery.eq('department_id', departmentId);
    }

    const { data: mentors, error: mentorsError } = await mentorsQuery;

    if (mentorsError) {
      console.error('[Institution Stats] Error fetching mentors:', mentorsError);
      return err('Failed to fetch mentors', 500);
    }

    // Batch queries: 3 queries total instead of 3 per mentor
    const mentorIds = (mentors || []).map((m) => m.id);

    // Query 1: Session counts per mentor (with date filter)
    let sessionCountQuery = supabase
      .from('counseling_sessions')
      .select('mentor_id, date')
      .in('mentor_id', mentorIds);
    if (startDateStr) {
      sessionCountQuery = sessionCountQuery.gte('date', startDateStr);
    }
    if (endDateStr) {
      sessionCountQuery = sessionCountQuery.lte('date', endDateStr);
    }
    const { data: allSessions } = await sessionCountQuery;

    // Build session count + last session date maps from the result
    const sessionCountMap = new Map<string, number>();
    const lastSessionMap = new Map<string, string>();
    for (const s of allSessions || []) {
      sessionCountMap.set(s.mentor_id, (sessionCountMap.get(s.mentor_id) || 0) + 1);
      const existing = lastSessionMap.get(s.mentor_id);
      if (!existing || s.date > existing) {
        lastSessionMap.set(s.mentor_id, s.date);
      }
    }

    // Query 2: Student counts per mentor + student IDs for session attendance check
    const { data: studentRows } = await supabase
      .from('mentor_students')
      .select('mentor_id, student_id')
      .in('mentor_id', mentorIds);

    const studentCountMap = new Map<string, number>();
    const allStudentIds = new Set<string>();
    for (const row of studentRows || []) {
      studentCountMap.set(row.mentor_id, (studentCountMap.get(row.mentor_id) || 0) + 1);
      allStudentIds.add(row.student_id);
    }

    // Query 2b: Find students who have attended at least one counseling session
    // Use batched .in() to avoid PostgREST URL length limits with large ID arrays
    const studentsWithSessions = new Set<string>();
    const allStudentIdArr = Array.from(allStudentIds);
    const BATCH_SIZE = 200;

    for (let i = 0; i < allStudentIdArr.length; i += BATCH_SIZE) {
      const batch = allStudentIdArr.slice(i, i + BATCH_SIZE);
      const { data: sessionStudents } = await supabase
        .from('counseling_sessions')
        .select('student_id')
        .in('student_id', batch);
      for (const row of sessionStudents || []) {
        studentsWithSessions.add(row.student_id);
      }
    }

    // Build list of students without sessions (with names + mentor info)
    const studentIdsWithNoSession = allStudentIdArr.filter(id => !studentsWithSessions.has(id));
    const studentsWithNoSession = studentIdsWithNoSession.length;

    // Build mentor name lookup
    const mentorNameMap = new Map<string, { name: string; email: string }>();
    for (const m of mentors || []) {
      const u = m.users as unknown as { full_name: string; email: string } | null;
      mentorNameMap.set(m.id, { name: u?.full_name || 'Unknown', email: u?.email || '' });
    }

    // Build student → mentor mapping
    const studentToMentor = new Map<string, string>();
    for (const row of studentRows || []) {
      studentToMentor.set(row.student_id, row.mentor_id);
    }

    // Fetch student details in batches
    let studentsWithNoSessionList: { studentId: string; studentName: string; studentEmail: string; rollNumber: string; mentorName: string; mentorEmail: string }[] = [];
    for (let i = 0; i < studentIdsWithNoSession.length; i += BATCH_SIZE) {
      const batch = studentIdsWithNoSession.slice(i, i + BATCH_SIZE);
      const { data: noSessionStudents } = await supabase
        .from('students')
        .select('id, name, email, roll_number')
        .in('id', batch);

      for (const s of noSessionStudents || []) {
        const mId = studentToMentor.get(s.id) || '';
        const mentorInfo = mentorNameMap.get(mId) || { name: 'Unknown', email: '' };
        studentsWithNoSessionList.push({
          studentId: s.id,
          studentName: s.name || 'Unknown',
          studentEmail: s.email || '',
          rollNumber: s.roll_number || '',
          mentorName: mentorInfo.name,
          mentorEmail: mentorInfo.email,
        });
      }
    }
    studentsWithNoSessionList.sort((a, b) => a.mentorName.localeCompare(b.mentorName));

    // Query 3: Last login per mentor (via user_id → mentor_login_history)
    const userIds = (mentors || []).map((m) => m.user_id).filter(Boolean);
    const lastLoginMap = new Map<string, string>();
    const loginCountMap = new Map<string, number>();
    if (userIds.length > 0) {
      const { data: loginRows } = await supabase
        .from('mentor_login_history')
        .select('user_id, login_at')
        .in('user_id', userIds)
        .order('login_at', { ascending: false });

      for (const row of loginRows || []) {
        // Count logins per user
        loginCountMap.set(row.user_id, (loginCountMap.get(row.user_id) || 0) + 1);
        // Track most recent login per user
        if (!lastLoginMap.has(row.user_id)) {
          lastLoginMap.set(row.user_id, row.login_at);
        }
      }
    }

    // Build a userId → mentorId lookup for mapping login data
    const userToMentor = new Map<string, string>();
    for (const m of mentors || []) {
      if (m.user_id) userToMentor.set(m.user_id, m.id);
    }

    // Assemble stats from maps (no extra queries)
    const mentorStats = (mentors || []).map((mentor) => {
      const user = mentor.users as unknown as { full_name: string; email: string } | null;
      const sessionCount = sessionCountMap.get(mentor.id) || 0;
      const studentCount = studentCountMap.get(mentor.id) || 0;
      const lastSessionDate = lastSessionMap.get(mentor.id) || null;

      return {
        mentorId: mentor.id,
        mentorName: user?.full_name || 'Unknown',
        email: user?.email || '',
        departmentId: mentor.department_id,
        designation: mentor.designation,
        sessionCount,
        studentCount,
        lastSessionDate,
        lastLoginDate: mentor.user_id ? (lastLoginMap.get(mentor.user_id) || null) : null,
        loginCount: mentor.user_id ? (loginCountMap.get(mentor.user_id) || 0) : 0,
        status: sessionCount === 0 ? 'inactive' : sessionCount <= 2 ? 'low' : 'active',
      };
    });

    // Sort by session count (inactive first for easy identification)
    mentorStats.sort((a, b) => a.sessionCount - b.sessionCount);

    // Calculate summary
    const totalStudents = mentorStats.reduce((sum, m) => sum + m.studentCount, 0);
    const summary = {
      totalMentors: mentorStats.length,
      activeMentors: mentorStats.filter((m) => m.status === 'active').length,
      lowActivityMentors: mentorStats.filter((m) => m.status === 'low').length,
      inactiveMentors: mentorStats.filter((m) => m.status === 'inactive').length,
      totalSessions: mentorStats.reduce((sum, m) => sum + m.sessionCount, 0),
      totalStudents,
      studentsWithNoSession,
      period,
      startDate: startDateStr || 'all',
      endDate: endDateStr,
    };

    return ok({ mentors: mentorStats, summary, studentsWithNoSessionList });
  } catch (error) {
    console.error('[Institution Stats] Error:', error);
    return err('Failed to fetch institution stats', 500);
  }
}
