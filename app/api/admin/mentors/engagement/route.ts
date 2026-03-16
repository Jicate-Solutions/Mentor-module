import { NextRequest } from 'next/server';
import { getUserAccess } from '@/lib/middleware/access-control';
import {
  getMentorsWithNoSessions,
  getInactiveMentors,
} from '@/lib/services/mentor/activity';
import { createAdminClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api-response';
import type { MentorEngagement } from '@/lib/services/mentor/activity';

/**
 * GET /api/admin/mentors/engagement
 * Returns engagement data for all mentors (admin only).
 * Query params: filter (all | inactive | no_sessions), days, institutionId
 */
export async function GET(request: NextRequest) {
  const userAccess = await getUserAccess();
  if (!userAccess) {
    return err('Unauthorized', 401);
  }

  // Admin-only endpoint
  const allowedRoles = ['admin', 'super_admin', 'principal', 'digital_coordinator'];
  if (!allowedRoles.includes(userAccess.role) && !userAccess.isSuperAdmin) {
    return err('Forbidden — admin access required', 403);
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter') || 'all';
    const days = searchParams.get('days') ? parseInt(searchParams.get('days')!, 10) : 30;
    const institutionId = searchParams.get('institutionId') || userAccess.institutionId || undefined;

    let data: MentorEngagement[];

    if (filter === 'inactive') {
      data = await getInactiveMentors(days, institutionId);
    } else if (filter === 'no_sessions') {
      data = await getMentorsWithNoSessions(institutionId);
    } else {
      // Return all engagement data from the view
      const supabase = createAdminClient();
      let query = supabase.from('mentor_engagement_stats').select('*');

      if (institutionId) {
        query = query.eq('institution_id', institutionId);
      }

      const { data: rows, error } = await query;
      if (error) throw new Error(`Failed to fetch engagement data: ${error.message}`);

      data = (rows || []).map((row: any) => ({
        mentorId: row.mentor_id,
        userId: row.user_id,
        mentorName: row.mentor_name,
        departmentId: row.department_id,
        institutionId: row.institution_id,
        totalSessions: Number(row.total_sessions) || 0,
        completedSessions: Number(row.completed_sessions) || 0,
        upcomingSessions: Number(row.upcoming_sessions) || 0,
        cancelledSessions: Number(row.cancelled_sessions) || 0,
        overdueSessions: Number(row.overdue_sessions) || 0,
        assignedStudents: Number(row.assigned_students) || 0,
        sessionsThisMonth: Number(row.sessions_this_month) || 0,
        lastSessionCreated: row.last_session_created || null,
        lastActivityAt: row.last_activity_at || null,
        totalLogins: Number(row.total_logins) || 0,
        loginsThisMonth: Number(row.logins_this_month) || 0,
        lastLoginAt: row.last_login_at || null,
        engagementLevel: row.engagement_level || 'no_sessions',
      }));
    }

    return ok(data, { total: data.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch engagement data';
    return err(message, 500);
  }
}
