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

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate date range
    const today = new Date();
    const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Fetch sessions within date range
    let sessionsQuery = supabase
      .from('counseling_sessions')
      .select('id, date, status, created_at, mentor_id')
      .gte('date', startDateStr)
      .order('date', { ascending: true });

    if (mentorIds) {
      sessionsQuery = sessionsQuery.in('mentor_id', mentorIds);
    }

    const { data: sessions } = await sessionsQuery;

    // Group sessions by date
    const sessionsByDate: { [key: string]: { scheduled: number; completed: number; cancelled: number } } = {};

    // Initialize all dates with zero counts
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      sessionsByDate[dateStr] = { scheduled: 0, completed: 0, cancelled: 0 };
    }

    // Count sessions by date and status
    sessions?.forEach((session: any) => {
      const dateStr = session.date;
      if (sessionsByDate[dateStr]) {
        sessionsByDate[dateStr][session.status as 'scheduled' | 'completed' | 'cancelled']++;
      }
    });

    // Format for chart display
    const sessionTrends = Object.entries(sessionsByDate).map(([date, counts]) => ({
      date,
      scheduled: counts.scheduled,
      completed: counts.completed,
      cancelled: counts.cancelled,
      total: counts.scheduled + counts.completed + counts.cancelled,
    }));

    // Get top mentors by session count
    let topMentorsQuery = supabase
      .from('counseling_sessions')
      .select('mentor_id, mentors(id, users(full_name, avatar_url))')
      .gte('date', startDateStr);

    if (mentorIds) {
      topMentorsQuery = topMentorsQuery.in('mentor_id', mentorIds);
    }

    const { data: topMentorsData } = await topMentorsQuery;

    const mentorSessionCounts: { [key: string]: { name: string; avatar?: string; count: number } } = {};

    topMentorsData?.forEach((session: any) => {
      const mentorId = session.mentor_id;
      const mentorName = session.mentors?.users?.full_name || 'Unknown';
      const mentorAvatar = session.mentors?.users?.avatar_url;

      if (!mentorSessionCounts[mentorId]) {
        mentorSessionCounts[mentorId] = {
          name: mentorName,
          avatar: mentorAvatar,
          count: 0,
        };
      }
      mentorSessionCounts[mentorId].count++;
    });

    const topMentors = Object.entries(mentorSessionCounts)
      .map(([id, data]) => ({
        id,
        name: data.name,
        avatar: data.avatar,
        sessionCount: data.count,
      }))
      .sort((a, b) => b.sessionCount - a.sessionCount)
      .slice(0, 10);

    // Get completion rate trend
    const completionRateTrend = sessionTrends.map((day) => {
      const totalSessions = day.total;
      const completionRate = totalSessions > 0
        ? Math.round((day.completed / totalSessions) * 100)
        : 0;

      return {
        date: day.date,
        completionRate,
      };
    });

    // Get department-wise session distribution
    let deptSessionsQuery = supabase
      .from('counseling_sessions')
      .select(`
        id,
        status,
        mentors:mentor_id (
          department_id,
          departments(name)
        )
      `)
      .gte('date', startDateStr);

    if (mentorIds) {
      deptSessionsQuery = deptSessionsQuery.in('mentor_id', mentorIds);
    }

    const { data: departmentSessions } = await deptSessionsQuery;

    const departmentCounts: { [key: string]: { total: number; completed: number } } = {};

    departmentSessions?.forEach((session: any) => {
      const deptName = session.mentors?.departments?.name || 'Unknown';

      if (!departmentCounts[deptName]) {
        departmentCounts[deptName] = { total: 0, completed: 0 };
      }

      departmentCounts[deptName].total++;

      if (session.status === 'completed') {
        departmentCounts[deptName].completed++;
      }
    });

    const departmentDistribution = Object.entries(departmentCounts)
      .map(([name, counts]) => ({
        name,
        value: counts.total,
        completed: counts.completed,
        total: counts.total,
      }))
      .sort((a, b) => b.value - a.value);

    // Calculate overall statistics
    const totalSessions = sessions?.length || 0;
    const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;
    const overallCompletionRate = totalSessions > 0
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0;

    return NextResponse.json({
      sessionTrends,
      completionRateTrend,
      topMentors,
      departmentDistribution,
      summary: {
        totalSessions,
        completedSessions,
        completionRate: overallCompletionRate,
        dateRange: {
          from: startDateStr,
          to: today.toISOString().split('T')[0],
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trends data', details: error.message },
      { status: 500 }
    );
  }
}
