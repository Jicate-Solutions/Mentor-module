'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useUserAccess } from '@/hooks/useUserAccess';
import type { MentorActivity, ActivityStats } from '@/lib/types/activity';
import ActivityStatsGrid from './components/ActivityStatsGrid';
import ActivityFilters, { type FilterState } from './components/ActivityFilters';
import ActivityTimeline from './components/ActivityTimeline';
import MentorPerformanceTable from './components/MentorPerformanceTable';
import PageHeader from '@/components/ui/PageHeader';

export default function MentorActivityPage() {
  const { user, loading: authLoading, accessToken } = useAuth();
  const { accessInfo, loading: accessLoading } = useUserAccess();

  const [activities, setActivities] = useState<MentorActivity[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [mentorId, setMentorId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    timePeriod: 'week',
    activityTypes: [],
  });
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    hasMore: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Memoize isAdmin to prevent unnecessary re-renders
  const isAdmin = useMemo(() => {
    if (accessLoading || !accessInfo) return false;
    return (
      accessInfo.role === 'super_admin' ||
      accessInfo.role === 'institution_admin' ||
      accessInfo.isSuperAdmin ||
      accessInfo.isMentorIncharge
    );
  }, [accessInfo, accessLoading]);

  // Memoize filter key for dependency tracking
  const filterKey = useMemo(() =>
    JSON.stringify({
      timePeriod: filters.timePeriod,
      activityTypes: filters.activityTypes,
      mentorId: filters.mentorId,
      startDate: filters.startDate,
      endDate: filters.endDate,
    }),
    [filters.timePeriod, filters.activityTypes, filters.mentorId, filters.startDate, filters.endDate]
  );

  // Get mentor ID for current user (only for non-admin mentors)
  useEffect(() => {
    // Wait for all loading to complete
    if (authLoading || accessLoading) return;
    // Skip if no user or token
    if (!user || !accessToken) return;

    // Debug log
    console.log('[MentorActivity] accessInfo:', accessInfo);

    // Skip for admin users - they don't need a mentor ID
    const isAdminUser = accessInfo && (
      accessInfo.role === 'super_admin' ||
      accessInfo.role === 'institution_admin' ||
      accessInfo.isSuperAdmin === true ||
      accessInfo.isMentorIncharge === true
    );

    console.log('[MentorActivity] isAdminUser:', isAdminUser, 'role:', accessInfo?.role);

    if (isAdminUser) {
      console.log('[MentorActivity] Skipping mentor fetch for admin user');
      return;
    }

    async function fetchMentorId() {
      try {
        const response = await fetch('/api/mentor/current', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setMentorId(data.mentorId);
        }
        // Don't log 404 - it's expected for admin/non-mentor users
      } catch (error) {
        console.error('Error fetching mentor ID:', error);
      }
    }

    fetchMentorId();
  }, [user, accessToken, authLoading, accessLoading, accessInfo]);

  // Fetch activities wrapped in useCallback for realtime subscriptions
  const fetchActivities = useCallback(async (loadMore = false) => {
    if (!accessToken) return;
    if (!isAdmin && !mentorId) return;

    try {
      setLoading(true);

      const params = new URLSearchParams();

      // Set mentor ID - only for non-admin users or when explicitly filtered
      if (filters.mentorId) {
        params.append('mentorId', filters.mentorId);
      } else if (!isAdmin && mentorId) {
        params.append('mentorId', mentorId);
      }

      // Set activity types
      if (filters.activityTypes.length > 0) {
        params.append('activityType', filters.activityTypes.join(','));
      }

      // Set date range
      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }

      // Set pagination
      const currentOffset = loadMore ? pagination.offset + pagination.limit : 0;
      params.append('limit', pagination.limit.toString());
      params.append('offset', currentOffset.toString());

      const response = await fetch(`/api/mentor-activity?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication failed. Please refresh the page or log in again.');
          return;
        }
        throw new Error('Failed to fetch activities');
      }
      setError(null);

      const data = await response.json();

      if (loadMore) {
        setActivities((prev) => [...prev, ...data.activities]);
      } else {
        setActivities(data.activities);
      }

      setPagination({
        ...pagination,
        offset: currentOffset,
        hasMore: data.pagination.hasMore,
      });
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, isAdmin, mentorId, filters, pagination.limit, pagination.offset]);

  // Fetch stats wrapped in useCallback for realtime subscriptions
  const fetchStats = useCallback(async () => {
    if (!accessToken) return;
    if (!isAdmin && !mentorId) {
      setStatsLoading(false);
      return;
    }

    try {
      setStatsLoading(true);

      let url = '/api/mentor-activity/stats';
      if (filters.mentorId) {
        url = `/api/mentor-activity/stats?mentorId=${filters.mentorId}`;
      } else if (!isAdmin && mentorId) {
        url = `/api/mentor-activity/stats?mentorId=${mentorId}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, [accessToken, isAdmin, mentorId, filters.mentorId]);

  // Fetch activities - for admins, fetch immediately; for mentors, wait for mentorId
  useEffect(() => {
    if (authLoading || accessLoading) return;
    if (!accessToken) return;
    if (!isAdmin && !mentorId) return;

    fetchActivities();
    fetchStats();
  }, [mentorId, isAdmin, filterKey, accessToken, authLoading, accessLoading, fetchActivities, fetchStats]);

  // Set up Supabase Realtime subscriptions for live updates
  useEffect(() => {
    const activityLogChannel = supabase
      .channel('mentor-activity-log')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mentor_activity_log' }, () => {
        console.log('[MentorActivity] Realtime: mentor_activity_log changed, refreshing...');
        fetchActivities();
        fetchStats();
      })
      .subscribe();

    const sessionsChannel = supabase
      .channel('mentor-activity-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'counseling_sessions' }, () => {
        console.log('[MentorActivity] Realtime: counseling_sessions changed, refreshing...');
        fetchActivities();
        fetchStats();
      })
      .subscribe();

    const assignmentsChannel = supabase
      .channel('mentor-activity-assignments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mentor_students' }, () => {
        console.log('[MentorActivity] Realtime: mentor_students changed, refreshing...');
        fetchActivities();
        fetchStats();
      })
      .subscribe();

    const idpsChannel = supabase
      .channel('mentor-activity-idps')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'individual_development_plans' }, () => {
        console.log('[MentorActivity] Realtime: individual_development_plans changed, refreshing...');
        fetchStats();
      })
      .subscribe();

    const feedbackChannel = supabase
      .channel('mentor-activity-feedback')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_feedback' }, () => {
        console.log('[MentorActivity] Realtime: session_feedback changed, refreshing...');
        fetchActivities();
        fetchStats();
      })
      .subscribe();

    const emailsChannel = supabase
      .channel('mentor-activity-emails')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_notifications' }, () => {
        console.log('[MentorActivity] Realtime: email_notifications changed, refreshing...');
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(activityLogChannel);
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(assignmentsChannel);
      supabase.removeChannel(idpsChannel);
      supabase.removeChannel(feedbackChannel);
      supabase.removeChannel(emailsChannel);
    };
  }, [fetchActivities, fetchStats]);

  function handleFilterChange(newFilters: FilterState) {
    setFilters(newFilters);
    setPagination({ ...pagination, offset: 0 });
  }

  function handleLoadMore() {
    fetchActivities(true);
  }

  if (authLoading || accessLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b6d41]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <PageHeader
          variant="gradient"
          title="Mentor Activity"
          description={isAdmin
            ? 'View and track all mentor activities across the system'
            : 'Track your mentoring activities and performance'}
          icon={<Activity className="w-6 h-6" />}
        />

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <div className="p-1 bg-red-100 rounded-lg">
              <Activity className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-red-700 font-medium">{error}</p>
              {error.includes('Authentication') && (
                <button
                  onClick={() => {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('token_expires_at');
                    window.location.href = '/';
                  }}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Re-login
                </button>
              )}
            </div>
          </div>
        )}

        {/* Statistics Grid */}
        <ActivityStatsGrid stats={stats} loading={statsLoading} />

        {/* Mentor Performance Table - Only for Admin/Mentor In-Charge */}
        {isAdmin && <MentorPerformanceTable />}

        {/* Filters */}
        <ActivityFilters
          onFilterChange={handleFilterChange}
          isAdmin={isAdmin}
          mentors={[]} // TODO: Fetch mentors list for admin
        />

        {/* Activity Timeline */}
        <ActivityTimeline
          activities={activities}
          loading={loading}
          onLoadMore={handleLoadMore}
          hasMore={pagination.hasMore}
        />
      </div>
    </div>
  );
}
