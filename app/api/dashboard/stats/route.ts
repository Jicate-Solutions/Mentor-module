import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('department_id');
    const institutionId = searchParams.get('institution_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    // Build filter conditions
    let mentorQuery = supabase.from('mentors').select('id', { count: 'exact', head: true });
    let studentQuery = supabase.from('students').select('id', { count: 'exact', head: true });
    let sessionQuery = supabase.from('counseling_sessions').select('id, status', { count: 'exact' });

    // Apply filters
    if (departmentId) {
      mentorQuery = mentorQuery.eq('department_id', departmentId);
      studentQuery = studentQuery.eq('department_id', departmentId);
    }
    if (institutionId) {
      mentorQuery = mentorQuery.eq('institution_id', institutionId);
      studentQuery = studentQuery.eq('institution_id', institutionId);
    }

    // Date filtering for sessions
    if (dateFrom) {
      sessionQuery = sessionQuery.gte('date', dateFrom);
    }
    if (dateTo) {
      sessionQuery = sessionQuery.lte('date', dateTo);
    }

    // Execute queries in parallel
    const [
      mentorResult,
      studentResult,
      sessionResult,
      activeMentorResult,
      activeStudentResult,
      feedbackResult,
    ] = await Promise.all([
      mentorQuery,
      studentQuery,
      sessionQuery,
      supabase
        .from('mentors')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      studentQuery.eq('is_active', true),
      supabase
        .from('counseling_sessions')
        .select('id, session_feedback(id)', { count: 'exact' })
        .eq('status', 'completed')
        .is('session_feedback.id', null),
    ]);

    // Get session status breakdown
    const { data: sessions } = await sessionQuery;
    const sessionsByStatus = {
      scheduled: sessions?.filter(s => s.status === 'scheduled').length || 0,
      completed: sessions?.filter(s => s.status === 'completed').length || 0,
      cancelled: sessions?.filter(s => s.status === 'cancelled').length || 0,
    };

    // Get department breakdown
    const { data: departmentStats } = await supabase
      .from('mentors')
      .select('department_id, departments(id, name)')
      .eq('is_active', true);

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

    // Get this week's sessions for trend
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const { count: thisWeekSessions } = await supabase
      .from('counseling_sessions')
      .select('id', { count: 'exact', head: true })
      .gte('date', lastWeek.toISOString().split('T')[0]);

    // Get previous week's sessions for comparison
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const { count: lastWeekSessions } = await supabase
      .from('counseling_sessions')
      .select('id', { count: 'exact', head: true })
      .gte('date', twoWeeksAgo.toISOString().split('T')[0])
      .lt('date', lastWeek.toISOString().split('T')[0]);

    // Calculate trend percentages
    const sessionTrend = lastWeekSessions
      ? Math.round(((thisWeekSessions! - lastWeekSessions) / lastWeekSessions) * 100)
      : 0;

    const stats = {
      totalMentors: mentorResult.count || 0,
      activeMentors: activeMentorResult.count || 0,
      totalStudents: studentResult.count || 0,
      activeStudents: activeStudentResult.count || 0,
      totalSessions: totalSessions,
      sessionsByStatus,
      pendingFeedback: feedbackResult.count || 0,
      completionRate,
      departmentBreakdown: departmentCounts || {},
      trends: {
        sessions: sessionTrend,
        // Add more trends as needed
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
