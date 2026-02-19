'use client';

import { useEffect, useState } from 'react';
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

  // Fetch dashboard data (gate on accessToken)
  useEffect(() => {
    if (!accessToken) return;
    fetchDashboardData();
  }, [accessToken]);

  // Set up real-time subscriptions for live dashboard updates
  useEffect(() => {
    // Subscribe to counseling sessions changes
    const sessionsChannel = supabase
      .channel('dashboard-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'counseling_sessions' }, () => {
        console.log('[Dashboard] Realtime: counseling_sessions changed, refreshing...');
        fetchDashboardData();
      })
      .subscribe((status) => {
        console.log('[Dashboard] Sessions channel status:', status);
      });

    // Subscribe to mentor-student assignments changes
    const assignmentsChannel = supabase
      .channel('dashboard-assignments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mentor_students' }, () => {
        console.log('[Dashboard] Realtime: mentor_students changed, refreshing...');
        fetchDashboardData();
      })
      .subscribe((status) => {
        console.log('[Dashboard] Assignments channel status:', status);
      });

    // Subscribe to feedback changes
    const feedbackChannel = supabase
      .channel('dashboard-feedback')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_feedback' }, () => {
        console.log('[Dashboard] Realtime: session_feedback changed, refreshing...');
        fetchDashboardData();
      })
      .subscribe((status) => {
        console.log('[Dashboard] Feedback channel status:', status);
      });

    // Subscribe to mentor changes (new mentors added/removed)
    const mentorsChannel = supabase
      .channel('dashboard-mentors')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mentors' }, () => {
        console.log('[Dashboard] Realtime: mentors changed, refreshing...');
        fetchDashboardData();
      })
      .subscribe((status) => {
        console.log('[Dashboard] Mentors channel status:', status);
      });

    // Subscribe to student changes
    const studentsChannel = supabase
      .channel('dashboard-students')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        console.log('[Dashboard] Realtime: students changed, refreshing...');
        fetchDashboardData();
      })
      .subscribe((status) => {
        console.log('[Dashboard] Students channel status:', status);
      });

    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(assignmentsChannel);
      supabase.removeChannel(feedbackChannel);
      supabase.removeChannel(mentorsChannel);
      supabase.removeChannel(studentsChannel);
    };
  }, []);

  const fetchDashboardData = async () => {
    if (!accessToken) return;

    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
    };

    setLoading(true);
    try {
      // Fetch stats
      const statsResponse = await fetch('/api/dashboard/stats', { headers: authHeaders });
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch activity feed
      const activityResponse = await fetch('/api/dashboard/activity?limit=10', { headers: authHeaders });
      const activityData = await activityResponse.json();
      setActivities(activityData.activities || []);

      // Fetch trends (includes top mentors and department distribution)
      const trendsResponse = await fetch('/api/dashboard/trends?days=30', { headers: authHeaders });
      const trendsData = await trendsResponse.json();
      setTopMentors(trendsData.topMentors || []);
      setDepartmentData(trendsData.departmentDistribution || []);

      // Fetch upcoming sessions from API
      const sessionsResponse = await fetch('/api/dashboard/sessions?limit=10', { headers: authHeaders });
      const sessionsData = await sessionsResponse.json();
      setUpcomingSessions(sessionsData.sessions || []);

      // Use real department progress data from API
      const colors = ['#0b6d41', '#ffde59', '#84efc2', '#48dfa0', '#1ec481'];
      const progress = trendsData.departmentDistribution?.slice(0, 5).map((dept: any, index: number) => ({
        name: dept.name,
        completed: dept.completed || 0, // Real completed sessions count
        total: dept.total || 0, // Real total sessions count
        color: colors[index % colors.length],
      })) || [];
      setDepartmentProgress(progress);

      // Generate notifications based on pending feedback
      const notifs: Notification[] = [];
      if (statsData.pendingFeedback > 0) {
        notifs.push({
          id: 'feedback-1',
          title: 'Pending Feedback',
          description: `You have ${statsData.pendingFeedback} counseling session${statsData.pendingFeedback > 1 ? 's' : ''} awaiting feedback submission.`,
          type: 'action',
          actionLabel: 'Submit Feedback',
          actionUrl: '/mentor',
        });
      }
      if (sessionsData.sessions && sessionsData.sessions.length > 0) {
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-brand-cream/20 to-neutral-50 p-4 lg:p-8 space-y-8">
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
