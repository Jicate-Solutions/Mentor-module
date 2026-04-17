import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { getUserAccess } from '@/lib/middleware/access-control';
import type { ActivityStats } from '@/lib/types/activity';

/**
 * GET /api/mentor-activity/stats
 * Get aggregated statistics for mentor activities
 *
 * Query params:
 * - mentorId: Filter by specific mentor (required)
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userAccess = await getUserAccess();
    if (!userAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const mentorId = searchParams.get('mentorId');

    const supabaseAdmin = createAdminClient();

    // Authorization check
    const isSuperAdmin = userAccess.role === 'super_admin' || userAccess.isSuperAdmin;
    const isInstitutionAdmin = userAccess.role === 'institution_admin';
    const isMentorIncharge = userAccess.isMentorIncharge;
    const isAdminOrIncharge = isSuperAdmin || isInstitutionAdmin || isMentorIncharge;

    // Determine institution filter for mentor incharge / institution admin
    let institutionFilter: string | null = null;
    let mentorIdsInInstitution: string[] = [];

    if (!mentorId) {
      if (isSuperAdmin) {
        // Super admin sees all - no filter
      } else if (isInstitutionAdmin) {
        institutionFilter = userAccess.institutionId;
      } else if (isMentorIncharge) {
        institutionFilter = userAccess.mentorInchargeInstitutionId;
      }

      // Get mentor IDs in the institution for filtering
      if (institutionFilter) {
        const { data: mentorsInInstitution } = await supabaseAdmin
          .from('mentors')
          .select('id')
          .eq('institution_id', institutionFilter)
          .eq('is_active', true);
        mentorIdsInInstitution = (mentorsInInstitution || []).map(m => m.id);
      }
    }

    // For non-admins, mentorId is required and must match their own
    if (!isAdminOrIncharge) {
      if (!mentorId) {
        return NextResponse.json(
          { error: 'mentorId parameter is required' },
          { status: 400 }
        );
      }

      // Regular users can only view their own stats
      const { data: mentor } = await supabaseAdmin
        .from('mentors')
        .select('id')
        .eq('user_id', currentUser.id)
        .single();

      if (!mentor || mentor.id !== mentorId) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot view stats for other mentors' },
          { status: 403 }
        );
      }
    }

    // Determine query mode
    const isSystemWideStats = isSuperAdmin && !mentorId;
    const isInstitutionWideStats = !mentorId && mentorIdsInInstitution.length > 0;

    // Calculate date ranges
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Helper function to apply mentor filter
    const applyMentorFilter = (query: any) => {
      if (mentorId) {
        return query.eq('mentor_id', mentorId);
      } else if (isInstitutionWideStats && mentorIdsInInstitution.length > 0) {
        return query.in('mentor_id', mentorIdsInInstitution);
      }
      // isSystemWideStats - no filter
      return query;
    };

    // Parallel queries for better performance
    const [
      studentsResult,
      sessionsResult,
      idpsResult,
      reportsResult,
      feedbackResult,
      emailsResult,
      activitiesWeekResult,
      activitiesMonthResult,
    ] = await Promise.all([
      // Total students assigned
      (() => {
        let query = supabaseAdmin.from('mentor_students').select('student_id', { count: 'exact', head: true });
        return applyMentorFilter(query);
      })(),

      // Total counseling sessions
      (() => {
        let query = supabaseAdmin.from('counseling_sessions').select('id', { count: 'exact', head: true });
        return applyMentorFilter(query);
      })(),

      // Active IDPs
      (() => {
        let query = supabaseAdmin.from('individual_development_plans')
          .select('id, status', { count: 'exact', head: true })
          .in('status', ['draft', 'in_progress']);
        return applyMentorFilter(query);
      })(),

      // Reports generated
      (() => {
        let query = supabaseAdmin.from('generated_reports').select('id', { count: 'exact', head: true });
        return applyMentorFilter(query);
      })(),

      // Pending feedback (sessions without feedback)
      (() => {
        let query = supabaseAdmin.from('counseling_sessions')
          .select(`
            id,
            session_feedback!left (
              id
            )
          `)
          .eq('status', 'completed');
        return applyMentorFilter(query);
      })(),

      // Emails sent
      (() => {
        let query = supabaseAdmin.from('email_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'sent');
        return applyMentorFilter(query);
      })(),

      // Activities this week
      (() => {
        let query = supabaseAdmin.from('mentor_activity_log')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', oneWeekAgo.toISOString());
        return applyMentorFilter(query);
      })(),

      // Activities this month
      (() => {
        let query = supabaseAdmin.from('mentor_activity_log')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', oneMonthAgo.toISOString());
        return applyMentorFilter(query);
      })(),
    ]);

    // Count pending feedback (sessions without feedback)
    const pendingFeedbackCount = (feedbackResult.data || []).filter(
      (session: any) => !session.session_feedback || session.session_feedback.length === 0
    ).length;

    // Get completed IDPs count
    let completedIdpsQuery = supabaseAdmin
      .from('individual_development_plans')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed');

    completedIdpsQuery = applyMentorFilter(completedIdpsQuery);

    const { count: completedIdpsCount } = await completedIdpsQuery;

    const stats: ActivityStats = {
      totalStudents: studentsResult.count || 0,
      totalSessions: sessionsResult.count || 0,
      activeIdps: idpsResult.count || 0,
      completedIdps: completedIdpsCount || 0,
      reportsGenerated: reportsResult.count || 0,
      pendingFeedback: pendingFeedbackCount,
      emailsSent: emailsResult.count || 0,
      activitiesThisWeek: activitiesWeekResult.count || 0,
      activitiesThisMonth: activitiesMonthResult.count || 0,
    };

    console.log('[Mentor Activity Stats API] Stats:', {
      isSystemWideStats,
      mentorId,
      stats,
      errors: {
        students: studentsResult.error,
        sessions: sessionsResult.error,
        idps: idpsResult.error,
        reports: reportsResult.error,
        emails: emailsResult.error,
      }
    });

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[Mentor Activity Stats API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity statistics' },
      { status: 500 }
    );
  }
}
