'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
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

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {

    // Subscribe to counseling sessions changes
    const sessionsChannel = supabase
      .channel('dashboard-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'counseling_sessions' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    // Subscribe to mentor-student assignments changes
    const assignmentsChannel = supabase
      .channel('dashboard-assignments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mentor_students' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    // Subscribe to feedback changes
    const feedbackChannel = supabase
      .channel('dashboard-feedback')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_feedback' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(assignmentsChannel);
      supabase.removeChannel(feedbackChannel);
    };
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch stats
      const statsResponse = await fetch('/api/dashboard/stats');
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch activity feed
      const activityResponse = await fetch('/api/dashboard/activity?limit=10');
      const activityData = await activityResponse.json();
      setActivities(activityData.activities || []);

      // Fetch trends (includes top mentors and department distribution)
      const trendsResponse = await fetch('/api/dashboard/trends?days=30');
      const trendsData = await trendsResponse.json();
      setTopMentors(trendsData.topMentors || []);
      setDepartmentData(trendsData.departmentDistribution || []);

      // Fetch upcoming sessions
      const today = new Date().toISOString().split('T')[0];
      const { data: sessionsData } = await supabase
        .from('counseling_sessions')
        .select(`
          id,
          session_name,
          date,
          time,
          status,
          mentors:mentor_id (
            users:user_id (full_name)
          ),
          students:student_id (name)
        `)
        .gte('date', today)
        .eq('status', 'scheduled')
        .order('date', { ascending: true })
        .limit(10);

      const formattedSessions = sessionsData?.map((session: any) => ({
        id: session.id,
        session_name: session.session_name,
        date: session.date,
        time: session.time || 'TBD',
        status: session.status,
        mentor_name: session.mentors?.users?.full_name,
        student_name: session.students?.name,
      })) || [];

      setUpcomingSessions(formattedSessions);

      // Generate department progress (mock data based on department distribution)
      const colors = ['#0b6d41', '#ffde59', '#84efc2', '#48dfa0', '#1ec481'];
      const progress = trendsData.departmentDistribution?.slice(0, 5).map((dept: any, index: number) => ({
        name: dept.name,
        completed: Math.floor(dept.value * 0.7), // Simulate 70% completion
        total: dept.value,
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
      if (formattedSessions.length > 0) {
        notifs.push({
          id: 'upcoming-1',
          title: 'Upcoming Sessions',
          description: `You have ${formattedSessions.length} upcoming counseling session${formattedSessions.length > 1 ? 's' : ''} scheduled.`,
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
    <div className="min-h-screen bg-neutral-50 p-4 lg:p-8 space-y-8">
      {/* Welcome Hero */}
      <WelcomeHero />

      {/* Stats Grid */}
      <StatsGrid stats={stats} loading={loading} />

      {/* Department Progress & Upcoming Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProgressCard departments={departmentProgress} loading={loading} />
        </div>
        <div>
          <SessionCalendar upcomingSessions={upcomingSessions} loading={loading} />
        </div>
      </div>

      {/* Activity Feed & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

      {/* Top Mentors & Department Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopMentorsCard mentors={topMentors} loading={loading} />
        <DepartmentChart data={departmentData} loading={loading} />
      </div>
    </div>
  );
}
