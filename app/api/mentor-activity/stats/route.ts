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
    const isAdminOrIncharge = userAccess.role === 'super_admin' || userAccess.role === 'institution_admin' || userAccess.isSuperAdmin || userAccess.isMentorIncharge;

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

    // For admins without a specific mentorId, return system-wide stats
    const isSystemWideStats = isAdminOrIncharge && !mentorId;

    // Calculate date ranges
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

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
        if (!isSystemWideStats && mentorId) {
          query = query.eq('mentor_id', mentorId);
        }
        return query;
      })(),

      // Total counseling sessions
      (() => {
        let query = supabaseAdmin.from('counseling_sessions').select('id', { count: 'exact', head: true });
        if (!isSystemWideStats && mentorId) {
          query = query.eq('mentor_id', mentorId);
        }
        return query;
      })(),

      // Active IDPs
      (() => {
        let query = supabaseAdmin.from('individual_development_plans')
          .select('id, status', { count: 'exact', head: true })
          .in('status', ['draft', 'in_progress']);
        if (!isSystemWideStats && mentorId) {
          query = query.eq('mentor_id', mentorId);
        }
        return query;
      })(),

      // Reports generated
      (() => {
        let query = supabaseAdmin.from('generated_reports').select('id', { count: 'exact', head: true });
        if (!isSystemWideStats && mentorId) {
          query = query.eq('mentor_id', mentorId);
        }
        return query;
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
        if (!isSystemWideStats && mentorId) {
          query = query.eq('mentor_id', mentorId);
        }
        return query;
      })(),

      // Emails sent
      (() => {
        let query = supabaseAdmin.from('email_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'sent');
        if (!isSystemWideStats && mentorId) {
          query = query.eq('mentor_id', mentorId);
        }
        return query;
      })(),

      // Activities this week
      (() => {
        let query = supabaseAdmin.from('mentor_activity_log')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', oneWeekAgo.toISOString());
        if (!isSystemWideStats && mentorId) {
          query = query.eq('mentor_id', mentorId);
        }
        return query;
      })(),

      // Activities this month
      (() => {
        let query = supabaseAdmin.from('mentor_activity_log')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', oneMonthAgo.toISOString());
        if (!isSystemWideStats && mentorId) {
          query = query.eq('mentor_id', mentorId);
        }
        return query;
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

    if (!isSystemWideStats && mentorId) {
      completedIdpsQuery = completedIdpsQuery.eq('mentor_id', mentorId);
    }

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
