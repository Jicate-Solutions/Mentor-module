'use client';

import Card from '@/components/ui/Card';
import { TrophyIcon } from '@heroicons/react/24/solid';
import { UserIcon } from '@heroicons/react/24/outline';

interface TopMentor {
  id: string;
  name: string;
  avatar?: string;
  sessionCount: number;
}

interface TopMentorsCardProps {
  mentors: TopMentor[];
  loading?: boolean;
}

export const TopMentorsCard = ({ mentors, loading }: TopMentorsCardProps) => {
  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-yellow-500';
      case 2:
        return 'text-gray-400';
      case 3:
        return 'text-amber-600';
      default:
        return 'text-neutral-400';
    }
  };

  return (
    <Card variant="elevated" className="h-full">
      <div className="flex items-center gap-2 mb-6">
        <TrophyIcon className="w-6 h-6 text-accent-600" />
        <div>
          <h3 className="text-[17px] font-medium text-neutral-900">Top Mentors</h3>
          <p className="text-[13px] text-neutral-600 mt-1 leading-relaxed">Most active this month</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 bg-neutral-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-neutral-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : mentors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-brand-yellow/10 rounded-full blur-xl" />
            <div className="relative bg-gradient-to-br from-brand-yellow/10 to-brand-green/10 rounded-full p-4">
              <TrophyIcon className="w-12 h-12 text-brand-yellow/60" />
            </div>
          </div>
          <h4 className="text-[16px] font-medium text-neutral-900 mb-2">No mentor rankings yet</h4>
          <p className="text-[14px] text-neutral-500 text-center max-w-sm leading-relaxed">
            Top performing mentors will be displayed here based on their session activity
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {mentors.slice(0, 10).map((mentor, index) => {
            const rank = index + 1;
            const isTopThree = rank <= 3;

            return (
              <div
                key={mentor.id}
                className={`
                  flex items-center gap-3 p-3 rounded-lg transition-all hover:shadow-md cursor-pointer
                  ${isTopThree ? 'bg-gradient-to-r from-accent-50 to-transparent' : 'hover:bg-neutral-50'}
                `}
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-8 text-center">
                  {isTopThree ? (
                    <TrophyIcon className={`w-6 h-6 ${getMedalColor(rank)}`} />
                  ) : (
                    <span className="text-sm font-medium text-neutral-400">#{rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="flex-shrink-0">
                  {mentor.avatar ? (
                    <img
                      src={mentor.avatar}
                      alt={mentor.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center border-2 border-white shadow-sm">
                      <span className="text-sm font-medium text-primary-600">
                        {mentor.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Name & Sessions */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-neutral-900 truncate">
                    {mentor.name}
                  </h4>
                  <p className="text-xs text-neutral-600">
                    {mentor.sessionCount} {mentor.sessionCount === 1 ? 'session' : 'sessions'}
                  </p>
                </div>

                {/* Session Count Badge */}
                <div
                  className={`
                    flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium
                    ${
                      isTopThree
                        ? 'bg-accent-600 text-white'
                        : 'bg-neutral-100 text-neutral-700'
                    }
                  `}
                >
                  {mentor.sessionCount}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mentors.length > 10 && (
        <div className="mt-4 pt-4 border-t border-neutral-100 text-center">
          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
            View all mentors →
          </button>
        </div>
      )}
    </Card>
  );
};
