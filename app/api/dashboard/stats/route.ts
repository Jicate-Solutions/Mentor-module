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
    let sessionQuery = supabase.from('counseling_sessions').select('id, status', { count: 'exact' });

    // Apply filters
    if (departmentId) {
      mentorQuery = mentorQuery.eq('department_id', departmentId);
    }
    if (institutionId) {
      mentorQuery = mentorQuery.eq('institution_id', institutionId);
    }

    // Date filtering for sessions
    if (dateFrom) {
      sessionQuery = sessionQuery.gte('date', dateFrom);
    }
    if (dateTo) {
      sessionQuery = sessionQuery.lte('date', dateTo);
    }

    // Fetch total student count from JKKN API instead of local DB
    // This ensures we show ALL students, not just those assigned to mentors
    const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

    let totalStudents = 0;
    let activeStudents = 0;

    if (apiKey) {
      try {
        // Fetch first page to get metadata with total count
        const studentsUrl = `${baseUrl}/api-management/students?page=1&limit=1`;
        const studentsResponse = await fetch(studentsUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          next: { revalidate: 60 }, // Cache for 60 seconds
        });

        if (studentsResponse.ok) {
          const studentsData = await studentsResponse.json();
          totalStudents = studentsData.metadata?.total || 0;
          // Assume all students from JKKN API are active
          activeStudents = totalStudents;
          console.log(`[Dashboard Stats] Fetched student count from JKKN API: ${totalStudents} total students`);
        } else {
          console.warn('[Dashboard Stats] Failed to fetch students from JKKN API, falling back to local count');
          // Fallback to local DB count
          const localStudentResult = await supabase.from('students').select('id', { count: 'exact', head: true });
          totalStudents = localStudentResult.count || 0;
          const localActiveResult = await supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_active', true);
          activeStudents = localActiveResult.count || 0;
        }
      } catch (error) {
        console.error('[Dashboard Stats] Error fetching students from JKKN API:', error);
        // Fallback to local DB count
        const localStudentResult = await supabase.from('students').select('id', { count: 'exact', head: true });
        totalStudents = localStudentResult.count || 0;
        const localActiveResult = await supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_active', true);
        activeStudents = localActiveResult.count || 0;
      }
    } else {
      // No API key configured, use local count
      const localStudentResult = await supabase.from('students').select('id', { count: 'exact', head: true });
      totalStudents = localStudentResult.count || 0;
      const localActiveResult = await supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_active', true);
      activeStudents = localActiveResult.count || 0;
    }

    // Execute queries in parallel
    const [
      mentorResult,
      sessionResult,
      activeMentorResult,
      feedbackResult,
    ] = await Promise.all([
      mentorQuery,
      sessionQuery,
      supabase
        .from('mentors')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
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
      totalStudents: totalStudents,
      activeStudents: activeStudents,
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
