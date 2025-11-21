import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { getUserAccess } from '@/lib/middleware/access-control';
import type { MentorActivity, ActivityFilters } from '@/lib/types/activity';

/**
 * GET /api/mentor-activity
 * Fetch mentor activity log with filtering
 *
 * Query params:
 * - mentorId: Filter by specific mentor (optional, required for non-admin users)
 * - activityType: Filter by activity type(s) - comma separated
 * - startDate: Filter by start date (ISO string)
 * - endDate: Filter by end date (ISO string)
 * - limit: Number of records to fetch (default: 50)
 * - offset: Pagination offset (default: 0)
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
    const activityTypeParam = searchParams.get('activityType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Parse activity types
    const activityTypes = activityTypeParam
      ? activityTypeParam.split(',').filter(Boolean)
      : [];

    const supabaseAdmin = createAdminClient();

    // Authorization: If not admin/mentor-incharge, can only view own activities
    let targetMentorId = mentorId;
    let institutionFilter: string | null = null;
    const isSuperAdmin = userAccess.role === 'super_admin' || userAccess.isSuperAdmin;
    const isInstitutionAdmin = userAccess.role === 'institution_admin';
    const isMentorIncharge = userAccess.isMentorIncharge;

    if (isSuperAdmin) {
      // Super admin can see all activities across all institutions
      // No filters applied
    } else if (isInstitutionAdmin) {
      // Institution admin can see all activities in their institution
      institutionFilter = userAccess.institutionId;
    } else if (isMentorIncharge) {
      // Mentor incharge can see all activities in their assigned institution
      institutionFilter = userAccess.mentorInchargeInstitutionId;
    } else {
      // Regular users can only view their own mentor activities
      const { data: mentor } = await supabaseAdmin
        .from('mentors')
        .select('id')
        .eq('user_id', currentUser.id)
        .single();

      if (!mentor) {
        return NextResponse.json(
          { error: 'Mentor record not found' },
          { status: 404 }
        );
      }

      targetMentorId = mentor.id;
    }

    // For mentor incharge and institution admin, get mentor IDs in their institution
    let mentorIdsInInstitution: string[] = [];
    if (institutionFilter && !targetMentorId) {
      const { data: mentorsInInstitution } = await supabaseAdmin
        .from('mentors')
        .select('id')
        .eq('institution_id', institutionFilter);

      mentorIdsInInstitution = (mentorsInInstitution || []).map(m => m.id);
    }

    // Build query
    let query = supabaseAdmin
      .from('mentor_activity_log')
      .select(`
        id,
        mentor_id,
        activity_type,
        activity_description,
        activity_data,
        related_student_id,
        related_session_id,
        created_by,
        created_at,
        mentors!mentor_id (
          id,
          institution_id,
          users!mentors_user_id_fkey (
            full_name
          )
        ),
        students:related_student_id (
          name
        ),
        counseling_sessions:related_session_id (
          session_name
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (targetMentorId) {
      query = query.eq('mentor_id', targetMentorId);
    } else if (mentorIdsInInstitution.length > 0) {
      // Filter by mentors in the institution for mentor incharge / institution admin
      query = query.in('mentor_id', mentorIdsInInstitution);
    }

    if (activityTypes.length > 0) {
      query = query.in('activity_type', activityTypes);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: activities, error, count } = await query;

    if (error) {
      console.error('[Mentor Activity API] Error fetching activities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activities', details: error.message },
        { status: 500 }
      );
    }

    // Transform data for frontend
    const transformedActivities: MentorActivity[] = (activities || []).map((activity: any) => ({
      id: activity.id,
      mentorId: activity.mentor_id,
      mentorName: activity.mentors?.users?.full_name || 'Unknown Mentor',
      activityType: activity.activity_type,
      activityDescription: activity.activity_description,
      activityData: activity.activity_data,
      relatedStudentId: activity.related_student_id,
      relatedSessionId: activity.related_session_id,
      createdBy: activity.created_by,
      createdAt: activity.created_at,
      studentName: activity.students?.name,
      sessionName: activity.counseling_sessions?.session_name,
    }));

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('mentor_activity_log')
      .select('*', { count: 'exact', head: true });

    if (targetMentorId) {
      countQuery = countQuery.eq('mentor_id', targetMentorId);
    } else if (mentorIdsInInstitution.length > 0) {
      countQuery = countQuery.in('mentor_id', mentorIdsInInstitution);
    }

    const { count: totalCount } = await countQuery;

    return NextResponse.json({
      success: true,
      activities: transformedActivities,
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (totalCount || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('[Mentor Activity API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mentor activities' },
      { status: 500 }
    );
  }
}
