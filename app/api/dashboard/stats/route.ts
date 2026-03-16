import { NextRequest, NextResponse } from 'next/server';
import { getUserAccess, getInstitutionFilter, getMentorIdsForInstitution } from '@/lib/middleware/access-control';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // --- Auth guard ---
    const userAccess = await getUserAccess();
    if (!userAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const institutionFilter = getInstitutionFilter(userAccess);
    const mentorIds = await getMentorIdsForInstitution(institutionFilter);

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('department_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    // --- Mentor counts ---
    let mentorQuery = supabase.from('mentors').select('id', { count: 'exact', head: true });
    let activeMentorQuery = supabase.from('mentors').select('id', { count: 'exact', head: true }).eq('is_active', true);

    if (institutionFilter) {
      mentorQuery = mentorQuery.eq('institution_id', institutionFilter);
      activeMentorQuery = activeMentorQuery.eq('institution_id', institutionFilter);
    }
    if (departmentId) {
      mentorQuery = mentorQuery.eq('department_id', departmentId);
      activeMentorQuery = activeMentorQuery.eq('department_id', departmentId);
    }

    // --- Student counts (from local Supabase — fast count query) ---
    let totalStudentQuery = supabase.from('students').select('id', { count: 'exact', head: true });
    let activeStudentQuery = supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_active', true);
    if (institutionFilter) {
      totalStudentQuery = totalStudentQuery.eq('institution_id', institutionFilter);
      activeStudentQuery = activeStudentQuery.eq('institution_id', institutionFilter);
    }
    const [totalStudentResult, activeStudentResult] = await Promise.all([totalStudentQuery, activeStudentQuery]);
    const totalStudents = totalStudentResult.count || 0;
    const activeStudents = activeStudentResult.count || 0;

    // --- Session queries (filtered by mentor IDs when non-super-admin) ---
    let sessionQuery = supabase.from('counseling_sessions').select('id, status', { count: 'exact' });
    let completedSessionsQuery = supabase
      .from('counseling_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed');
    let sessionsWithFeedbackQuery = supabase
      .from('counseling_sessions')
      .select('id, session_feedback!inner(id)', { count: 'exact', head: true })
      .eq('status', 'completed');

    if (mentorIds) {
      sessionQuery = sessionQuery.in('mentor_id', mentorIds);
      completedSessionsQuery = completedSessionsQuery.in('mentor_id', mentorIds);
      sessionsWithFeedbackQuery = sessionsWithFeedbackQuery.in('mentor_id', mentorIds);
    }

    if (dateFrom) {
      sessionQuery = sessionQuery.gte('date', dateFrom);
    }
    if (dateTo) {
      sessionQuery = sessionQuery.lte('date', dateTo);
    }

    // Execute queries in parallel
    const [
      mentorResult,
      activeMentorResult,
      sessionResult,
      completedSessionsResult,
      sessionsWithFeedbackResult,
    ] = await Promise.all([
      mentorQuery,
      activeMentorQuery,
      sessionQuery,
      completedSessionsQuery,
      sessionsWithFeedbackQuery,
    ]);

    // Pending feedback = completed sessions minus those with feedback
    const pendingFeedbackCount = (completedSessionsResult.count || 0) - (sessionsWithFeedbackResult.count || 0);

    // Get session status breakdown
    const { data: sessions } = await sessionQuery;
    const sessionsByStatus = {
      scheduled: sessions?.filter(s => s.status === 'scheduled').length || 0,
      completed: sessions?.filter(s => s.status === 'completed').length || 0,
      cancelled: sessions?.filter(s => s.status === 'cancelled').length || 0,
    };

    // --- Department breakdown (filtered by institution) ---
    let deptQuery = supabase
      .from('mentors')
      .select('department_id, departments(id, name)')
      .eq('is_active', true);

    if (institutionFilter) {
      deptQuery = deptQuery.eq('institution_id', institutionFilter);
    }

    const { data: departmentStats } = await deptQuery;

    const departmentCounts = departmentStats?.reduce((acc: any, mentor: any) => {
      const deptName = mentor.departments?.name || 'Unknown';
      acc[deptName] = (acc[deptName] || 0) + 1;
      return acc;
    }, {});

    // Calculate completion rate
    const totalSessions = sessionResult.count || 0;
    const completedSessions = sessionsByStatus.completed;
    const completionRate = totalSessions > 0
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0;

    // --- Weekly trend (filtered by mentor IDs) ---
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    let thisWeekQuery = supabase
      .from('counseling_sessions')
      .select('id', { count: 'exact', head: true })
      .gte('date', lastWeek.toISOString().split('T')[0]);

    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    let lastWeekQuery = supabase
      .from('counseling_sessions')
      .select('id', { count: 'exact', head: true })
      .gte('date', twoWeeksAgo.toISOString().split('T')[0])
      .lt('date', lastWeek.toISOString().split('T')[0]);

    if (mentorIds) {
      thisWeekQuery = thisWeekQuery.in('mentor_id', mentorIds);
      lastWeekQuery = lastWeekQuery.in('mentor_id', mentorIds);
    }

    const [{ count: thisWeekSessions }, { count: lastWeekSessions }] = await Promise.all([
      thisWeekQuery,
      lastWeekQuery,
    ]);

    const sessionTrend = lastWeekSessions
      ? Math.round(((thisWeekSessions! - lastWeekSessions) / lastWeekSessions) * 100)
      : 0;

    const stats = {
      totalMentors: mentorResult.count || 0,
      activeMentors: activeMentorResult.count || 0,
      totalStudents,
      activeStudents,
      totalSessions,
      sessionsByStatus,
      pendingFeedback: Math.max(0, pendingFeedbackCount),
      completionRate,
      departmentBreakdown: departmentCounts || {},
      trends: {
        sessions: sessionTrend,
      },
      thisWeekSessions: thisWeekSessions || 0,
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics', details: error.message },
      { status: 500 }
    );
  }
}
