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

    if (!mentorId) {
      return NextResponse.json(
        { error: 'mentorId parameter is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Authorization check
    const isAdminOrIncharge = userAccess.role === 'admin' || userAccess.isSuperAdmin || userAccess.isMentorIncharge;

    if (!isAdminOrIncharge) {
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
      supabaseAdmin
        .from('mentor_students')
        .select('student_id', { count: 'exact', head: true })
        .eq('mentor_id', mentorId),

      // Total counseling sessions
      supabaseAdmin
        .from('counseling_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('mentor_id', mentorId),

      // Active IDPs
      supabaseAdmin
        .from('individual_development_plans')
        .select('id, status', { count: 'exact', head: true })
        .eq('mentor_id', mentorId)
        .in('status', ['draft', 'in_progress']),

      // Reports generated
      supabaseAdmin
        .from('generated_reports')
        .select('id', { count: 'exact', head: true })
        .eq('mentor_id', mentorId),

      // Pending feedback (sessions without feedback)
      supabaseAdmin
        .from('counseling_sessions')
        .select(`
          id,
          session_feedback!left (
            id
          )
        `)
        .eq('mentor_id', mentorId)
        .eq('status', 'completed'),

      // Emails sent
      supabaseAdmin
        .from('email_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('mentor_id', mentorId)
        .eq('status', 'sent'),

      // Activities this week
      supabaseAdmin
        .from('mentor_activity_log')
        .select('id', { count: 'exact', head: true })
        .eq('mentor_id', mentorId)
        .gte('created_at', oneWeekAgo.toISOString()),

      // Activities this month
      supabaseAdmin
        .from('mentor_activity_log')
        .select('id', { count: 'exact', head: true })
        .eq('mentor_id', mentorId)
        .gte('created_at', oneMonthAgo.toISOString()),
    ]);

    // Count pending feedback (sessions without feedback)
    const pendingFeedbackCount = (feedbackResult.data || []).filter(
      (session: any) => !session.session_feedback || session.session_feedback.length === 0
    ).length;

    // Get completed IDPs count
    const { count: completedIdpsCount } = await supabaseAdmin
      .from('individual_development_plans')
      .select('id', { count: 'exact', head: true })
      .eq('mentor_id', mentorId)
      .eq('status', 'completed');

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
