'use client';

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
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-neutral-100 p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-neutral-100 rounded-lg" />
              <div className="h-3 bg-neutral-100 rounded w-16" />
            </div>
            <div className="h-7 bg-neutral-100 rounded w-12 mb-1" />
            <div className="h-3 bg-neutral-50 rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Mentors',
      value: stats.totalMentors,
      sub: 'Active faculty',
      icon: MentoringIllustration,
      iconBg: 'bg-brand-green/10',
      iconColor: 'text-brand-green',
      accent: 'border-l-brand-green',
    },
    {
      label: 'Active Learners',
      value: stats.activeStudents,
      sub: 'Currently enrolled',
      icon: StudentsIllustration,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      accent: 'border-l-amber-400',
    },
    {
      label: 'Sessions',
      value: stats.totalSessions,
      sub: 'All time counseling',
      icon: SessionsIllustration,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      accent: 'border-l-blue-400',
      trend: stats.trends?.sessions,
    },
    {
      label: 'Pending',
      value: stats.pendingFeedback,
      sub: 'Awaiting feedback',
      icon: FeedbackIllustration,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      accent: 'border-l-orange-400',
      alert: stats.pendingFeedback > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`relative bg-white rounded-xl border border-neutral-100 border-l-[3px] ${card.accent} p-4 hover:shadow-md transition-shadow duration-200`}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`w-9 h-9 rounded-lg ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider leading-tight">
                {card.label}
              </span>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-[28px] font-bold text-neutral-900 leading-none tabular-nums">
                  {card.value.toLocaleString()}
                </p>
                <p className="text-[11px] text-neutral-500 mt-1">{card.sub}</p>
              </div>

              {card.trend !== undefined && card.trend !== 0 && (
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  card.trend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}>
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {card.trend >= 0 ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    )}
                  </svg>
                  {Math.abs(card.trend)}%
                </div>
              )}

              {card.alert && (
                <span className="text-[10px] font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                  Action needed
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
