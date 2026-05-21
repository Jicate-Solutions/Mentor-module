'use client';

import { useDashboard } from '@/hooks/useDashboard';
import { StatsGrid } from './components/StatsGrid';
import { ProgressCard } from './components/ProgressCard';
import { ActivityFeed } from './components/ActivityFeed';
import { SessionCalendar } from './components/SessionCalendar';
import { NotificationsPanel } from './components/NotificationsPanel';
import { TopMentorsCard } from './components/TopMentorsCard';
import { DepartmentChart } from './components/DepartmentChart';

export default function DashboardPage() {
  const {
    stats,
    activities,
    upcomingSessions,
    topMentors,
    departmentData,
    departmentProgress,
    notifications,
    statsLoading,
    activityLoading,
    trendsLoading,
    sessionsLoading,
    clearNotifications,
  } = useDashboard();

  // Realtime subscriptions removed — this is a summary view, not an ops console.
  // Previously subscribed to postgres_changes on multiple tables, which under
  // production load (JKKN sync writes, many concurrent users) caused continuous
  // refetches and skeleton flash. Users see fresh data on page navigation;
  // that's sufficient for a dashboard. Refetch on demand via useDashboard().refetch.

  return (
    <div className="min-h-screen bg-neutral-50/50 p-4 lg:p-6 space-y-4 lg:space-y-5">
      {/* Stats Grid - Enhanced Cards */}
      <div className="animate-fadeIn" style={{ animationDelay: '100ms' }}>
        <StatsGrid stats={stats} loading={statsLoading} />
      </div>

      {/* Department Progress & Upcoming Sessions - Better Proportions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn" style={{ animationDelay: '200ms' }}>
        <div className="lg:col-span-2">
          <ProgressCard departments={departmentProgress} loading={trendsLoading} />
        </div>
        <div>
          <SessionCalendar upcomingSessions={upcomingSessions} loading={sessionsLoading} />
        </div>
      </div>

      {/* Activity Feed & Notifications - Modern Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn" style={{ animationDelay: '300ms' }}>
        <div className="lg:col-span-2">
          <ActivityFeed activities={activities} loading={activityLoading} />
        </div>
        <div>
          <NotificationsPanel
            notifications={notifications}
            loading={statsLoading || sessionsLoading}
            onClearAll={clearNotifications}
          />
        </div>
      </div>

      {/* Top Mentors & Department Chart - Equal Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn" style={{ animationDelay: '400ms' }}>
        <TopMentorsCard mentors={topMentors} loading={trendsLoading} />
        <DepartmentChart data={departmentData} loading={trendsLoading} />
      </div>

      {/* Bottom Spacer for Mobile Nav */}
      <div className="h-4 lg:hidden" />
    </div>
  );
}
