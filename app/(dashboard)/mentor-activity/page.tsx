'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Activity } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useUserAccess } from '@/hooks/useUserAccess';
import type { MentorActivity, ActivityStats } from '@/lib/types/activity';
import ActivityStatsGrid from './components/ActivityStatsGrid';
import ActivityFilters, { type FilterState } from './components/ActivityFilters';
import ActivityTimeline from './components/ActivityTimeline';

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

  // Fetch activities - for admins, fetch immediately; for mentors, wait for mentorId
  useEffect(() => {
    // Wait for loading to complete
    if (authLoading || accessLoading) return;
    if (!accessToken) return;
    // For non-admins, wait until we have a mentorId
    if (!isAdmin && !mentorId) return;

    fetchActivities();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentorId, isAdmin, filterKey, accessToken, authLoading, accessLoading]);

  async function fetchActivities(loadMore = false) {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      // Set mentor ID
      if (filters.mentorId) {
        params.append('mentorId', filters.mentorId);
      } else if (mentorId) {
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
        headers: accessToken ? {
          'Authorization': `Bearer ${accessToken}`,
        } : {},
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
  }

  async function fetchStats() {
    const targetMentorId = filters.mentorId || mentorId;
    // For admins, we can fetch system-wide stats even without a mentorId
    // For non-admins, we need a mentorId
    if (!isAdmin && !targetMentorId) {
      setStatsLoading(false);
      return;
    }

    try {
      setStatsLoading(true);

      const url = targetMentorId
        ? `/api/mentor-activity/stats?mentorId=${targetMentorId}`
        : `/api/mentor-activity/stats`;

      const response = await fetch(url, {
        headers: accessToken ? {
          'Authorization': `Bearer ${accessToken}`,
        } : {},
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
  }

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
    <div className="min-h-screen bg-[#fbfbee] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-[#d1fae5] rounded-lg">
              <Activity className="w-6 h-6 text-[#0b6d41]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Mentor Activity
              </h1>
              <p className="text-sm text-gray-600">
                {isAdmin
                  ? 'View and track all mentor activities across the system'
                  : 'Track your mentoring activities and performance'}
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
            {error.includes('Authentication') && (
              <button
                onClick={() => {
                  localStorage.removeItem('access_token');
                  localStorage.removeItem('refresh_token');
                  localStorage.removeItem('user');
                  localStorage.removeItem('token_expires_at');
                  window.location.href = '/';
                }}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Re-login
              </button>
            )}
          </div>
        )}

        {/* Statistics Grid */}
        <ActivityStatsGrid stats={stats} loading={statsLoading} />

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
