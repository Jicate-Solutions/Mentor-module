'use client';

import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { getUserAccess } from '@/lib/middleware/access-control';
import type { MentorActivity, ActivityStats, ActivityType } from '@/lib/types/activity';
import ActivityStatsGrid from './components/ActivityStatsGrid';
import ActivityFilters, { type FilterState } from './components/ActivityFilters';
import ActivityTimeline from './components/ActivityTimeline';

export default function MentorActivityPage() {
  const [activities, setActivities] = useState<MentorActivity[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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

  // Initialize user and permissions
  useEffect(() => {
    async function initializeUser() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          window.location.href = '/login';
          return;
        }

        setCurrentUser(user);

        const access = await getUserAccess();
        const isAdminUser =
          access?.role === 'admin' ||
          access?.isSuperAdmin ||
          access?.isMentorIncharge;

        setIsAdmin(isAdminUser);

        // Get mentor ID for current user
        if (!isAdminUser) {
          const response = await fetch('/api/mentor/current');
          if (response.ok) {
            const data = await response.json();
            setMentorId(data.mentorId);
          }
        }
      } catch (error) {
        console.error('Error initializing user:', error);
      }
    }

    initializeUser();
  }, []);

  // Fetch activities
  useEffect(() => {
    if (!mentorId && !isAdmin) return;

    fetchActivities();
    fetchStats();
  }, [mentorId, isAdmin, filters]);

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

      const response = await fetch(`/api/mentor-activity?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

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
    try {
      setStatsLoading(true);

      const targetMentorId = filters.mentorId || mentorId;
      if (!targetMentorId) return;

      const response = await fetch(`/api/mentor-activity/stats?mentorId=${targetMentorId}`);

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

  if (!currentUser) {
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
