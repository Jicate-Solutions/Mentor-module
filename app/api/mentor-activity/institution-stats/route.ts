import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { getUserAccess } from '@/lib/middleware/access-control';

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
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userAccess = await getUserAccess();
    if (!userAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin or mentor in-charge can access this
    const isAuthorized =
      userAccess.role === 'super_admin' ||
      userAccess.role === 'institution_admin' ||
      userAccess.isSuperAdmin ||
      userAccess.isMentorIncharge;

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins and mentor in-charge can view institution stats' },
        { status: 403 }
      );
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
      return NextResponse.json(
        { error: 'Failed to fetch mentors' },
        { status: 500 }
      );
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

    // Query 2: Student counts per mentor
    const { data: studentRows } = await supabase
      .from('mentor_students')
      .select('mentor_id')
      .in('mentor_id', mentorIds);

    const studentCountMap = new Map<string, number>();
    for (const row of studentRows || []) {
      studentCountMap.set(row.mentor_id, (studentCountMap.get(row.mentor_id) || 0) + 1);
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
        status: sessionCount === 0 ? 'inactive' : sessionCount <= 2 ? 'low' : 'active',
      };
    });

    // Sort by session count (inactive first for easy identification)
    mentorStats.sort((a, b) => a.sessionCount - b.sessionCount);

    // Calculate summary
    const summary = {
      totalMentors: mentorStats.length,
      activeMentors: mentorStats.filter((m) => m.status === 'active').length,
      lowActivityMentors: mentorStats.filter((m) => m.status === 'low').length,
      inactiveMentors: mentorStats.filter((m) => m.status === 'inactive').length,
      totalSessions: mentorStats.reduce((sum, m) => sum + m.sessionCount, 0),
      period,
      startDate: startDateStr || 'all',
      endDate: endDateStr,
    };

    return NextResponse.json({
      success: true,
      mentors: mentorStats,
      summary,
    });
  } catch (error) {
    console.error('[Institution Stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch institution stats' },
      { status: 500 }
    );
  }
}
