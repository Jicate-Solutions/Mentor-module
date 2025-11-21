import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { getUserAccess } from '@/lib/middleware/access-control';

/**
 * GET /api/mentor-activity/institution-stats
 * Get mentor performance stats for an institution (for Mentor In-Charge)
 *
 * Query params:
 * - period: 'week' | 'month' | 'last_month' | 'year' (default: 'month')
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
    const period = searchParams.get('period') || 'month';
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
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (period) {
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
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

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

    // Get session counts for each mentor in the period
    const mentorStats = await Promise.all(
      (mentors || []).map(async (mentor) => {
        // Count sessions in period
        const { count: sessionCount } = await supabase
          .from('counseling_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('mentor_id', mentor.id)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        // Get last session date
        const { data: lastSession } = await supabase
          .from('counseling_sessions')
          .select('created_at')
          .eq('mentor_id', mentor.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Count total students assigned
        const { count: studentCount } = await supabase
          .from('mentor_students')
          .select('id', { count: 'exact', head: true })
          .eq('mentor_id', mentor.id);

        const user = mentor.users as unknown as { full_name: string; email: string } | null;

        return {
          mentorId: mentor.id,
          mentorName: user?.full_name || 'Unknown',
          email: user?.email || '',
          departmentId: mentor.department_id,
          designation: mentor.designation,
          sessionCount: sessionCount || 0,
          studentCount: studentCount || 0,
          lastSessionDate: lastSession?.created_at || null,
          status: (sessionCount || 0) === 0 ? 'inactive' : (sessionCount || 0) <= 2 ? 'low' : 'active',
        };
      })
    );

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
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
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
