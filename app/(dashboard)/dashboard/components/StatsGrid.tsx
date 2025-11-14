'use client';

import { MentoringIllustration, StudentsIllustration, SessionsIllustration, FeedbackIllustration } from '@/lib/illustrations';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

interface StatCardProps {
  title: string;
  value: number | string;
  trend?: number;
  icon: React.ReactNode;
  subtitle?: string;
  loading?: boolean;
}

const StatCard = ({ title, value, trend, icon, subtitle, loading }: StatCardProps) => {
  const isPositiveTrend = trend !== undefined && trend >= 0;

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-4 hover:shadow-sm transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">{title}</p>
          {loading ? (
            <div className="h-7 bg-neutral-100 rounded animate-pulse w-16" />
          ) : (
            <p className="text-2xl font-semibold text-neutral-900 mb-1">{value}</p>
          )}
          {subtitle && (
            <p className="text-xs text-neutral-500">{subtitle}</p>
          )}
          {trend !== undefined && !loading && (
            <div className="flex items-center gap-1 mt-1.5">
              {isPositiveTrend ? (
                <ArrowUpIcon className="w-3.5 h-3.5 text-success-600" />
              ) : (
                <ArrowDownIcon className="w-3.5 h-3.5 text-error-600" />
              )}
              <span
                className={`text-xs font-medium ${
                  isPositiveTrend ? 'text-success-600' : 'text-error-600'
                }`}
              >
                {Math.abs(trend)}%
              </span>
              <span className="text-xs text-neutral-400">vs last week</span>
            </div>
          )}
        </div>
        <div className="ml-3">{icon}</div>
      </div>
    </div>
  );
};

interface StatsGridProps {
  stats: {
    totalMentors: number;
    activeStudents: number;
    totalSessions: number;
    pendingFeedback: number;
    trends?: {
      sessions?: number;
    };
  };
  loading?: boolean;
}

export const StatsGrid = ({ stats, loading }: StatsGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Mentors"
        value={loading ? '...' : stats.totalMentors}
        icon={<MentoringIllustration className="w-10 h-10 opacity-70" />}
        subtitle="Active faculty members"
        loading={loading}
      />
      <StatCard
        title="Active Students"
        value={loading ? '...' : stats.activeStudents}
        icon={<StudentsIllustration className="w-10 h-10 opacity-70" />}
        subtitle="Currently enrolled"
        loading={loading}
      />
      <StatCard
        title="Counseling Sessions"
        value={loading ? '...' : stats.totalSessions}
        trend={stats.trends?.sessions}
        icon={<SessionsIllustration className="w-10 h-10 opacity-70" />}
        subtitle="All time sessions"
        loading={loading}
      />
      <StatCard
        title="Pending Feedback"
        value={loading ? '...' : stats.pendingFeedback}
        icon={<FeedbackIllustration className="w-10 h-10 opacity-70" />}
        subtitle="Awaiting submission"
        loading={loading}
      />
    </div>
  );
};
