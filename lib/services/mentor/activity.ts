/**
 * Mentor Activity & Engagement Service
 * Provides activity log queries, login history, session stats, and engagement metrics.
 * All methods use createAdminClient() and throw on error (routes catch + convert to HTTP).
 */

import { createAdminClient } from '@/lib/supabase/server';
import type { ActivityType, MentorActivity } from '@/lib/types/activity';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ActivityFilters {
  type?: ActivityType;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface ActivityStats {
  byType: Record<string, number>;
  thisWeek: number;
  thisMonth: number;
  total: number;
}

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  mentorId: string | null;
  loginAt: string;
  logoutAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  sessionDurationMinutes: number | null;
}

export interface SessionStats {
  total: number;
  completed: number;
  scheduled: number;
  cancelled: number;
  overdue: number;
  thisMonth: number;
  lastSessionDate: string | null;
}

export interface MentorEngagement {
  mentorId: string;
  userId: string;
  mentorName: string | null;
  departmentId: string | null;
  institutionId: string | null;
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  cancelledSessions: number;
  overdueSessions: number;
  assignedStudents: number;
  sessionsThisMonth: number;
  lastSessionCreated: string | null;
  lastActivityAt: string | null;
  totalLogins: number;
  loginsThisMonth: number;
  lastLoginAt: string | null;
  engagementLevel: 'no_sessions' | 'inactive' | 'low' | 'active';
}

// ── Activity Log ─────────────────────────────────────────────────────────────

/**
 * Returns activity log entries for a mentor, with optional filters.
 */
export async function getActivityLog(
  mentorId: string,
  filters?: ActivityFilters
): Promise<MentorActivity[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('mentor_activity_log')
    .select('*')
    .eq('mentor_id', mentorId)
    .order('created_at', { ascending: false });

  if (filters?.type) {
    query = query.eq('activity_type', filters.type);
  }
  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch activity log: ${error.message}`);

  return (data || []).map((row: any) => ({
    id: row.id,
    mentorId: row.mentor_id,
    activityType: row.activity_type,
    activityDescription: row.activity_description,
    activityData: row.activity_data,
    relatedStudentId: row.related_student_id,
    relatedSessionId: row.related_session_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }));
}

/**
 * Returns aggregated activity stats for a mentor (counts by type, weekly/monthly totals).
 */
export async function getActivityStats(mentorId: string): Promise<ActivityStats> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('mentor_activity_log')
    .select('activity_type, created_at')
    .eq('mentor_id', mentorId);

  if (error) throw new Error(`Failed to fetch activity stats: ${error.message}`);

  const rows = data || [];
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const byType: Record<string, number> = {};
  let thisWeek = 0;
  let thisMonth = 0;

  for (const row of rows) {
    byType[row.activity_type] = (byType[row.activity_type] || 0) + 1;
    const createdAt = new Date(row.created_at);
    if (createdAt >= weekAgo) thisWeek++;
    if (createdAt >= monthStart) thisMonth++;
  }

  return { byType, thisWeek, thisMonth, total: rows.length };
}

// ── Login History ────────────────────────────────────────────────────────────

/**
 * Returns login history entries for a user.
 */
export async function getLoginHistory(
  userId: string,
  limit: number = 20
): Promise<LoginHistoryEntry[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('mentor_login_history')
    .select('*')
    .eq('user_id', userId)
    .order('login_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch login history: ${error.message}`);

  return (data || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    mentorId: row.mentor_id,
    loginAt: row.login_at,
    logoutAt: row.logout_at,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    sessionDurationMinutes: row.session_duration_minutes,
  }));
}

/**
 * Records a login event for a user/mentor.
 */
export async function recordLogin(
  userId: string,
  mentorId: string | null,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from('mentor_login_history').insert({
    user_id: userId,
    mentor_id: mentorId,
    login_at: new Date().toISOString(),
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
  });

  if (error) throw new Error(`Failed to record login: ${error.message}`);
}

// ── Session Stats ────────────────────────────────────────────────────────────

/**
 * Returns aggregated session statistics for a mentor.
 */
export async function getSessionStats(mentorId: string): Promise<SessionStats> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('counseling_sessions')
    .select('id, status, date, created_at')
    .eq('mentor_id', mentorId);

  if (error) throw new Error(`Failed to fetch session stats: ${error.message}`);

  const rows = data || [];
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  let completed = 0;
  let scheduled = 0;
  let cancelled = 0;
  let overdue = 0;
  let thisMonth = 0;
  let lastSessionDate: string | null = null;

  for (const row of rows) {
    if (row.status === 'completed') completed++;
    else if (row.status === 'scheduled') {
      if (row.date < today) overdue++;
      else scheduled++;
    } else if (row.status === 'cancelled') cancelled++;

    if (row.created_at >= monthStart) thisMonth++;
    if (!lastSessionDate || row.created_at > lastSessionDate) {
      lastSessionDate = row.created_at;
    }
  }

  return {
    total: rows.length,
    completed,
    scheduled,
    cancelled,
    overdue,
    thisMonth,
    lastSessionDate,
  };
}

// ── Engagement View ──────────────────────────────────────────────────────────

/**
 * Returns engagement data for a single mentor from the engagement view.
 */
export async function getMentorEngagement(mentorId: string): Promise<MentorEngagement | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('mentor_engagement_stats')
    .select('*')
    .eq('mentor_id', mentorId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw new Error(`Failed to fetch mentor engagement: ${error.message}`);
  }

  return mapEngagementRow(data);
}

/**
 * Returns mentors with zero counseling sessions (optionally scoped by institution).
 */
export async function getMentorsWithNoSessions(
  institutionId?: string
): Promise<MentorEngagement[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('mentor_engagement_stats')
    .select('*')
    .eq('engagement_level', 'no_sessions');

  if (institutionId) {
    query = query.eq('institution_id', institutionId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch mentors with no sessions: ${error.message}`);

  return (data || []).map(mapEngagementRow);
}

/**
 * Returns mentors who have been inactive for the specified number of days.
 */
export async function getInactiveMentors(
  days: number = 30,
  institutionId?: string
): Promise<MentorEngagement[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('mentor_engagement_stats')
    .select('*')
    .in('engagement_level', ['inactive', 'no_sessions']);

  if (institutionId) {
    query = query.eq('institution_id', institutionId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch inactive mentors: ${error.message}`);

  // Further filter by actual last_activity_at if days param is stricter than the view logic
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  return (data || [])
    .map(mapEngagementRow)
    .filter(
      (m) => !m.lastActivityAt || m.lastActivityAt < cutoff
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapEngagementRow(row: any): MentorEngagement {
  return {
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
  };
}
