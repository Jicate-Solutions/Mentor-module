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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {/* Mentor Card - Primary with Enhanced Style */}
      <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-100/50 via-primary-50/40 to-primary-100/50 border border-primary-200/60 p-4 shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-[1.02]">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-primary-300/30 rounded-full blur-2xl group-hover:blur-xl transition-all" />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-md">
              <MentoringIllustration className="w-6 h-6 text-white" />
            </div>
            <div className="px-2 py-0.5 rounded-full bg-primary-500 border border-primary-400/40">
              <span className="text-[9px] text-white font-bold uppercase tracking-wider">Active</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-[11px] font-bold text-primary-600 uppercase tracking-wide">Total Mentors</h3>
            <p className="text-[32px] font-extrabold text-primary-800 leading-none tracking-tight group-hover:scale-105 transition-transform inline-block">
              {stats.totalMentors}
            </p>
            <p className="text-[12px] text-primary-700/70 font-medium">Active faculty members</p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary-400 to-transparent opacity-50" />
      </div>

      {/* Learners Card - Accent with Bold Design */}
      <div className="group relative overflow-hidden rounded-2xl bg-white border-2 border-brand-yellow/30 p-4 shadow-lg hover:shadow-xl hover:border-brand-yellow/60 transition-all duration-500 hover:scale-[1.02]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-yellow/20 to-transparent rounded-full blur-2xl group-hover:blur-xl transition-all" />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-yellow/20 to-brand-yellow/10 flex items-center justify-center group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
              <StudentsIllustration className="w-6 h-6 text-brand-green" />
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-lg shadow-green-500/50 animate-pulse" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-[11px] font-bold text-neutral-600 uppercase tracking-wide">Active Learners</h3>
            <p className="text-[32px] font-extrabold text-brand-green leading-none tracking-tight group-hover:scale-105 transition-transform inline-block">
              {stats.activeStudents}
            </p>
            <p className="text-[12px] text-neutral-500 font-medium">Currently enrolled</p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-brand-yellow to-transparent opacity-50" />
      </div>

      {/* Sessions Card - Clean with Trend */}
      <div className="group relative overflow-hidden rounded-2xl bg-white border border-neutral-200 p-4 shadow-lg hover:shadow-xl hover:border-brand-green/30 transition-all duration-500 hover:scale-[1.02]">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-brand-green/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
              <SessionsIllustration className="w-6 h-6 text-brand-green" />
            </div>
            {stats.trends?.sessions && (
              <div className={`px-2 py-1 rounded-lg flex items-center gap-1 ${
                stats.trends.sessions >= 0
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {stats.trends.sessions >= 0 ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  )}
                </svg>
                <span className="text-[10px] font-black">{Math.abs(stats.trends.sessions)}%</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-[11px] font-bold text-neutral-600 uppercase tracking-wide">Sessions</h3>
            <p className="text-[32px] font-extrabold text-neutral-900 leading-none tracking-tight group-hover:scale-105 transition-transform inline-block">
              {stats.totalSessions}
            </p>
            <p className="text-[12px] text-neutral-500 font-medium">All time counseling</p>
          </div>
        </div>
      </div>

      {/* Feedback Card - Alert Style */}
      <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-50 to-white border border-neutral-200 p-4 shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-[1.02]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
              <FeedbackIllustration className="w-6 h-6 text-orange-600" />
            </div>
            {stats.pendingFeedback > 0 && (
              <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 animate-bounce">
                <span className="text-[11px] font-black">{stats.pendingFeedback}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-[11px] font-bold text-neutral-600 uppercase tracking-wide">Pending</h3>
            <p className="text-[32px] font-extrabold text-neutral-900 leading-none tracking-tight group-hover:scale-105 transition-transform inline-block">
              {stats.pendingFeedback}
            </p>
            <p className="text-[12px] text-neutral-500 font-medium">Awaiting feedback</p>
          </div>

          {stats.pendingFeedback > 0 && (
            <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-orange-50 border border-orange-200">
              <p className="text-[10px] text-orange-700 font-bold">Action required</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
