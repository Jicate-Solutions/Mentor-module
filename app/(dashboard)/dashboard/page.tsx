'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { WelcomeHero } from './components/WelcomeHero';
import { StatsGrid } from './components/StatsGrid';
import { ProgressCard } from './components/ProgressCard';
import { ActivityFeed } from './components/ActivityFeed';
import { SessionCalendar } from './components/SessionCalendar';
import { NotificationsPanel } from './components/NotificationsPanel';
import { TopMentorsCard } from './components/TopMentorsCard';
import { DepartmentChart } from './components/DepartmentChart';

interface DashboardStats {
  totalMentors: number;
  activeStudents: number;
  totalSessions: number;
  pendingFeedback: number;
  trends: {
    sessions?: number;
  };
}

interface Activity {
  id: string;
  type: 'session' | 'assignment' | 'feedback' | 'student';
  title: string;
  description: string;
  timestamp: string;
  user?: {
    name: string;
    avatar?: string;
  };
}

interface Session {
  id: string;
  session_name: string;
  date: string;
  time: string;
  mentor_name?: string;
  student_name?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface TopMentor {
  id: string;
  name: string;
  avatar?: string;
  sessionCount: number;
}

interface DepartmentData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface DepartmentProgress {
  name: string;
  completed: number;
  total: number;
  color: string;
}

interface Notification {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'action';
  actionLabel?: string;
  actionUrl?: string;
}

export default function DashboardPage() {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalMentors: 0,
    activeStudents: 0,
    totalSessions: 0,
    pendingFeedback: 0,
    trends: {},
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [topMentors, setTopMentors] = useState<TopMentor[]>([]);
  const [departmentData, setDepartmentData] = useState<DepartmentData[]>([]);
  const [departmentProgress, setDepartmentProgress] = useState<DepartmentProgress[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all dashboard data in parallel with per-endpoint error isolation
  const fetchDashboardData = useCallback(async () => {
    if (!accessToken) return;

    const authHeaders = { Authorization: `Bearer ${accessToken}` };
    setLoading(true);

    try {
      // Fire all 4 API calls in parallel
      const [statsResult, activityResult, trendsResult, sessionsResult] = await Promise.allSettled([
        fetch('/api/dashboard/stats', { headers: authHeaders }),
        fetch('/api/dashboard/activity?limit=10', { headers: authHeaders }),
        fetch('/api/dashboard/trends?days=30', { headers: authHeaders }),
        fetch('/api/dashboard/sessions?limit=10', { headers: authHeaders }),
      ]);

      // --- Stats ---
      let statsData: any = null;
      if (statsResult.status === 'fulfilled' && statsResult.value.ok) {
        statsData = await statsResult.value.json();
        setStats(statsData);
      }

      // --- Activity feed ---
      if (activityResult.status === 'fulfilled' && activityResult.value.ok) {
        const activityData = await activityResult.value.json();
        setActivities(activityData.activities || []);
      }

      // --- Trends (top mentors + department distribution) ---
      let trendsData: any = null;
      if (trendsResult.status === 'fulfilled' && trendsResult.value.ok) {
        trendsData = await trendsResult.value.json();
        setTopMentors(trendsData.topMentors || []);
        setDepartmentData(trendsData.departmentDistribution || []);

        const colors = ['#0b6d41', '#ffde59', '#84efc2', '#48dfa0', '#1ec481'];
        const progress = trendsData.departmentDistribution?.slice(0, 5).map((dept: any, index: number) => ({
          name: dept.name,
          completed: dept.completed || 0,
          total: dept.total || 0,
          color: colors[index % colors.length],
        })) || [];
        setDepartmentProgress(progress);
      }

      // --- Upcoming sessions ---
      let sessionsData: any = null;
      if (sessionsResult.status === 'fulfilled' && sessionsResult.value.ok) {
        sessionsData = await sessionsResult.value.json();
        setUpcomingSessions(sessionsData.sessions || []);
      }

      // --- Notifications (derived from stats + sessions) ---
      const notifs: Notification[] = [];
      if (statsData?.pendingFeedback > 0) {
        notifs.push({
          id: 'feedback-1',
          title: 'Pending Feedback',
          description: `You have ${statsData.pendingFeedback} counseling session${statsData.pendingFeedback > 1 ? 's' : ''} awaiting feedback submission.`,
          type: 'action',
          actionLabel: 'Submit Feedback',
          actionUrl: '/mentor',
        });
      }
      if (sessionsData?.sessions && sessionsData.sessions.length > 0) {
        notifs.push({
          id: 'upcoming-1',
          title: 'Upcoming Sessions',
          description: `You have ${sessionsData.sessions.length} upcoming counseling session${sessionsData.sessions.length > 1 ? 's' : ''} scheduled.`,
          type: 'info',
        });
      }
      setNotifications(notifs);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Fetch dashboard data (gate on accessToken)
  useEffect(() => {
    if (!accessToken) return;
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Debounced realtime refresh — batch rapid changes into a single data fetch
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      fetchDashboardData();
    }, 2000);
  }, [fetchDashboardData]);

  // Set up real-time subscriptions for live dashboard updates
  useEffect(() => {
    const tables = [
      'counseling_sessions',
      'mentor_students',
      'session_feedback',
      'mentors',
      'students',
    ];

    const channels = tables.map((table) =>
      supabase
        .channel(`dashboard-${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, debouncedRefresh)
        .subscribe()
    );

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [debouncedRefresh]);

  return (
    <div className="min-h-screen bg-neutral-50/50 p-4 lg:p-6 space-y-4 lg:space-y-5">
      {/* Welcome Hero - Full Width with Modern Gradient */}
      <div className="animate-fadeIn">
        <WelcomeHero />
      </div>

      {/* Stats Grid - Enhanced Cards */}
      <div className="animate-fadeIn" style={{ animationDelay: '100ms' }}>
        <StatsGrid stats={stats} loading={loading} />
      </div>

      {/* Department Progress & Upcoming Sessions - Better Proportions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn" style={{ animationDelay: '200ms' }}>
        <div className="lg:col-span-2">
          <ProgressCard departments={departmentProgress} loading={loading} />
        </div>
        <div>
          <SessionCalendar upcomingSessions={upcomingSessions} loading={loading} />
        </div>
      </div>

      {/* Activity Feed & Notifications - Modern Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn" style={{ animationDelay: '300ms' }}>
        <div className="lg:col-span-2">
          <ActivityFeed activities={activities} loading={loading} />
        </div>
        <div>
          <NotificationsPanel
            notifications={notifications}
            loading={loading}
            onClearAll={() => setNotifications([])}
          />
        </div>
      </div>

      {/* Top Mentors & Department Chart - Equal Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn" style={{ animationDelay: '400ms' }}>
        <TopMentorsCard mentors={topMentors} loading={loading} />
        <DepartmentChart data={departmentData} loading={loading} />
      </div>

      {/* Bottom Spacer for Mobile Nav */}
      <div className="h-4 lg:hidden" />
    </div>
  );
}
