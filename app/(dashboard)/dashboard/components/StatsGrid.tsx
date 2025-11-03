'use client';

import Card from '@/components/ui/Card';
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
    <Card variant="elevated" className="hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-600 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 bg-neutral-200 rounded animate-pulse w-20" />
          ) : (
            <p className="text-3xl font-bold text-neutral-900 mb-2">{value}</p>
          )}
          {subtitle && (
            <p className="text-xs text-neutral-500">{subtitle}</p>
          )}
          {trend !== undefined && !loading && (
            <div className="flex items-center gap-1 mt-2">
              {isPositiveTrend ? (
                <ArrowUpIcon className="w-4 h-4 text-success" />
              ) : (
                <ArrowDownIcon className="w-4 h-4 text-error" />
              )}
              <span
                className={`text-sm font-semibold ${
                  isPositiveTrend ? 'text-success' : 'text-error'
                }`}
              >
                {Math.abs(trend)}%
              </span>
              <span className="text-xs text-neutral-500 ml-1">vs last week</span>
            </div>
          )}
        </div>
        <div className="ml-4">{icon}</div>
      </div>
    </Card>
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Mentors"
        value={loading ? '...' : stats.totalMentors}
        icon={<MentoringIllustration className="w-16 h-16" />}
        subtitle="Active faculty members"
        loading={loading}
      />
      <StatCard
        title="Active Students"
        value={loading ? '...' : stats.activeStudents}
        icon={<StudentsIllustration className="w-16 h-16" />}
        subtitle="Currently enrolled"
        loading={loading}
      />
      <StatCard
        title="Counseling Sessions"
        value={loading ? '...' : stats.totalSessions}
        trend={stats.trends?.sessions}
        icon={<SessionsIllustration className="w-16 h-16" />}
        subtitle="All time sessions"
        loading={loading}
      />
      <StatCard
        title="Pending Feedback"
        value={loading ? '...' : stats.pendingFeedback}
        icon={<FeedbackIllustration className="w-16 h-16" />}
        subtitle="Awaiting submission"
        loading={loading}
      />
    </div>
  );
};
