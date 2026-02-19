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

    // --- Student counts (always from JKKN API, filtered client-side) ---
    let totalStudents = 0;
    let activeStudents = 0;

    const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

    if (apiKey) {
      // Fetch ALL students from JKKN API with pagination (same pattern as department-sessions)
      let allStudents: { id: string; institution_id: string }[] = [];
      let studentPage = 1;
      let hasMoreStudents = true;
      const studentPageLimit = 200;
      const maxStudentPages = 75; // Safety limit (75 × 200 = 15,000)
      let jkknApiFailed = false;

      while (hasMoreStudents && studentPage <= maxStudentPages) {
        const studentsUrl = `${baseUrl}/api-management/learners/profiles?lifecycle_status=active,alumni,exited,graduated,inactive&page=${studentPage}&limit=${studentPageLimit}`;

        try {
          const studentsResponse = await fetch(studentsUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            next: { revalidate: 60 },
          });

          if (!studentsResponse.ok) {
            console.warn(`[Dashboard Stats] JKKN API returned ${studentsResponse.status} on page ${studentPage}`);
            jkknApiFailed = true;
            break;
          }

          const studentsData = await studentsResponse.json();
          const pageStudents = studentsData.data || [];

          const mapped = pageStudents.map((s: any) => ({
            id: s.id,
            institution_id: s.institution?.id || s.institution_id || s.institution || '',
          }));

          allStudents = [...allStudents, ...mapped];

          // Check if more pages exist
          hasMoreStudents = pageStudents.length === studentPageLimit;
          const paginationInfo = studentsData.pagination || studentsData.metadata;
          if (paginationInfo?.totalPages && studentPage >= paginationInfo.totalPages) {
            hasMoreStudents = false;
          }

          studentPage++;
        } catch (fetchError) {
          console.error(`[Dashboard Stats] Error fetching students page ${studentPage}:`, fetchError);
          jkknApiFailed = true;
          break;
        }
      }

      if (!jkknApiFailed || allStudents.length > 0) {
        // Filter by institution if non-super-admin
        const filtered = institutionFilter !== null
          ? allStudents.filter(s => s.institution_id === institutionFilter)
          : allStudents;

        totalStudents = filtered.length;
        activeStudents = filtered.length;
        console.log(`[Dashboard Stats] JKKN API student count: ${totalStudents} (fetched ${allStudents.length} total, institution filter: ${institutionFilter ?? 'none'})`);
      } else {
        // Fallback to Supabase only if JKKN API completely failed
        console.warn('[Dashboard Stats] JKKN API failed, falling back to Supabase');
        let localQuery = supabase.from('students').select('id', { count: 'exact', head: true });
        let localActiveQuery = supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_active', true);
        if (institutionFilter) {
          localQuery = localQuery.eq('institution_id', institutionFilter);
          localActiveQuery = localActiveQuery.eq('institution_id', institutionFilter);
        }
        const [localResult, localActive] = await Promise.all([localQuery, localActiveQuery]);
        totalStudents = localResult.count || 0;
        activeStudents = localActive.count || 0;
      }
    } else {
      // No API key — fallback to Supabase
      let localQuery = supabase.from('students').select('id', { count: 'exact', head: true });
      let localActiveQuery = supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_active', true);
      if (institutionFilter) {
        localQuery = localQuery.eq('institution_id', institutionFilter);
        localActiveQuery = localActiveQuery.eq('institution_id', institutionFilter);
      }
      const [localResult, localActive] = await Promise.all([localQuery, localActiveQuery]);
      totalStudents = localResult.count || 0;
      activeStudents = localActive.count || 0;
    }

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
