import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate date range
    const today = new Date();
    const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

    // Fetch sessions within date range
    const { data: sessions } = await supabase
      .from('counseling_sessions')
      .select('id, date, status, created_at, mentor_id')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

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
    const { data: topMentorsData } = await supabase
      .from('counseling_sessions')
      .select('mentor_id, mentors(id, users(full_name, avatar_url))')
      .gte('date', startDate.toISOString().split('T')[0]);

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
    const { data: departmentSessions } = await supabase
      .from('counseling_sessions')
      .select(`
        id,
        mentors:mentor_id (
          department_id,
          departments(name)
        )
      `)
      .gte('date', startDate.toISOString().split('T')[0]);

    const departmentCounts: { [key: string]: number } = {};

    departmentSessions?.forEach((session: any) => {
      const deptName = session.mentors?.departments?.name || 'Unknown';
      departmentCounts[deptName] = (departmentCounts[deptName] || 0) + 1;
    });

    const departmentDistribution = Object.entries(departmentCounts)
      .map(([name, count]) => ({
        name,
        value: count,
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
          from: startDate.toISOString().split('T')[0],
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
