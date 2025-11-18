'use client';

import StatCard from '@/components/ui/StatCard';
import { MentoringIllustration, StudentsIllustration, SessionsIllustration, FeedbackIllustration } from '@/lib/illustrations';

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
  // Show skeleton loader during loading
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white border border-neutral-200 rounded-xl p-5 animate-pulse"
          >
            <div className="h-3 bg-neutral-100 rounded w-24 mb-3" />
            <div className="h-8 bg-neutral-100 rounded w-16 mb-2" />
            <div className="h-2 bg-neutral-100 rounded w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Mentors"
        value={stats.totalMentors}
        subtitle="Active faculty members"
        icon={<MentoringIllustration className="w-6 h-6" />}
        variant="primary"
      />
      <StatCard
        title="Active Students"
        value={stats.activeStudents}
        subtitle="Currently enrolled"
        icon={<StudentsIllustration className="w-6 h-6" />}
        variant="accent"
      />
      <StatCard
        title="Counseling Sessions"
        value={stats.totalSessions}
        subtitle="All time sessions"
        icon={<SessionsIllustration className="w-6 h-6" />}
        trend={
          stats.trends?.sessions
            ? {
                value: `${Math.abs(stats.trends.sessions)}%`,
                isPositive: stats.trends.sessions >= 0,
              }
            : undefined
        }
        variant="default"
      />
      <StatCard
        title="Pending Feedback"
        value={stats.pendingFeedback}
        subtitle="Awaiting submission"
        icon={<FeedbackIllustration className="w-6 h-6" />}
        variant="default"
      />
    </div>
  );
};
