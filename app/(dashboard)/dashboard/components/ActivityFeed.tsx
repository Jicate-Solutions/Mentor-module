'use client';

import Card from '@/components/ui/Card';
import {
  CalendarIcon,
  UserPlusIcon,
  ChatBubbleLeftEllipsisIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

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

interface ActivityFeedProps {
  activities: Activity[];
  loading?: boolean;
}

const getActivityIcon = (type: Activity['type']) => {
  const iconClass = "w-10 h-10 p-2 rounded-lg";

  switch (type) {
    case 'session':
      return (
        <div className={`${iconClass} bg-primary-100 text-primary-600`}>
          <CalendarIcon className="w-full h-full" />
        </div>
      );
    case 'assignment':
      return (
        <div className={`${iconClass} bg-accent-100 text-accent-700`}>
          <UserPlusIcon className="w-full h-full" />
        </div>
      );
    case 'feedback':
      return (
        <div className={`${iconClass} bg-blue-100 text-blue-600`}>
          <ChatBubbleLeftEllipsisIcon className="w-full h-full" />
        </div>
      );
    case 'student':
      return (
        <div className={`${iconClass} bg-purple-100 text-purple-600`}>
          <AcademicCapIcon className="w-full h-full" />
        </div>
      );
  }
};

export const ActivityFeed = ({ activities, loading }: ActivityFeedProps) => {
  return (
    <Card variant="elevated" className="h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-neutral-900">Recent Activity</h3>
          <p className="text-sm text-neutral-600 mt-1">Latest updates from your system</p>
        </div>
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
          View all
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-10 h-10 bg-neutral-200 rounded-lg flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-neutral-200 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="relative">
            <div className="absolute inset-0 bg-brand-green/10 rounded-full blur-xl" />
            <div className="relative bg-gradient-to-br from-brand-green/10 to-brand-yellow/10 rounded-full p-4">
              <CalendarIcon className="w-12 h-12 text-brand-green/60" />
            </div>
          </div>
          <h4 className="text-base font-semibold text-neutral-900 mt-4 mb-1">No activity yet</h4>
          <p className="text-sm text-neutral-500 text-center max-w-xs">
            Activity will appear here as you interact with the mentoring system
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              className="flex gap-4 p-3 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer group"
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                {getActivityIcon(activity.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors">
                    {activity.title}
                  </h4>
                  <span className="text-xs text-neutral-500 whitespace-nowrap">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 mt-1 line-clamp-2">
                  {activity.description}
                </p>
                {activity.user && (
                  <div className="flex items-center gap-2 mt-2">
                    {activity.user.avatar ? (
                      <img
                        src={activity.user.avatar}
                        alt={activity.user.name}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary-600">
                          {activity.user.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="text-xs text-neutral-500">{activity.user.name}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
