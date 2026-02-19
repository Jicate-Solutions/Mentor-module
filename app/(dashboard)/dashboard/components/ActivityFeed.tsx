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
  const iconClass = "w-11 h-11 p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-6";

  switch (type) {
    case 'session':
      return (
        <div className={`${iconClass} bg-gradient-to-br from-brand-green/20 to-brand-green/10 text-brand-green`}>
          <CalendarIcon className="w-full h-full stroke-2" />
        </div>
      );
    case 'assignment':
      return (
        <div className={`${iconClass} bg-gradient-to-br from-brand-yellow/30 to-brand-yellow/15 text-brand-green`}>
          <UserPlusIcon className="w-full h-full stroke-2" />
        </div>
      );
    case 'feedback':
      return (
        <div className={`${iconClass} bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600`}>
          <ChatBubbleLeftEllipsisIcon className="w-full h-full stroke-2" />
        </div>
      );
    case 'student':
      return (
        <div className={`${iconClass} bg-gradient-to-br from-purple-100 to-purple-50 text-purple-600`}>
          <AcademicCapIcon className="w-full h-full stroke-2" />
        </div>
      );
  }
};

export const ActivityFeed = ({ activities, loading }: ActivityFeedProps) => {
  return (
    <Card variant="elevated" className="h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[17px] font-medium text-neutral-900">Recent Activity</h3>
          <p className="text-[13px] text-neutral-600 mt-1 leading-relaxed">Latest updates from your system</p>
        </div>
        <button className="text-[13px] text-primary-600 hover:text-primary-700 font-medium transition-colors">
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
          <h4 className="text-[16px] font-medium text-neutral-900 mt-4 mb-1">No activity yet</h4>
          <p className="text-[14px] text-neutral-500 text-center max-w-xs leading-relaxed">
            Activity will appear here as you interact with the mentoring system
          </p>
        </div>
      ) : (
        <div className="relative space-y-1 max-h-[500px] overflow-y-auto pr-2">
          {/* Timeline Line */}
          <div className="absolute left-[22px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-brand-green/20 via-brand-yellow/20 to-transparent" />

          {activities.map((activity, index) => (
            <div
              key={activity.id}
              className="relative flex gap-4 p-4 rounded-xl hover:bg-gradient-to-r hover:from-brand-cream/50 hover:to-transparent transition-all duration-300 cursor-pointer group"
            >
              {/* Timeline Dot */}
              <div className="absolute left-[18px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-brand-green border-2 border-white shadow-md group-hover:scale-150 transition-transform duration-300 z-10" />

              {/* Icon */}
              <div className="flex-shrink-0 relative z-10">
                {getActivityIcon(activity.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-[14px] font-medium text-neutral-900 group-hover:text-brand-green transition-colors">
                    {activity.title}
                  </h4>
                  <span className="text-[11px] text-neutral-500 whitespace-nowrap font-medium px-2 py-1 rounded-full bg-neutral-100 group-hover:bg-brand-green/10 group-hover:text-brand-green transition-colors">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-[13px] text-neutral-600 line-clamp-2 leading-relaxed">
                  {activity.description}
                </p>
                {activity.user && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100">
                    {activity.user.avatar ? (
                      <img
                        src={activity.user.avatar}
                        alt={activity.user.name}
                        className="w-6 h-6 rounded-full object-cover ring-2 ring-white shadow-sm"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-green to-brand-green/80 flex items-center justify-center shadow-sm">
                        <span className="text-[10px] font-medium text-white">
                          {activity.user.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="text-[12px] text-neutral-600 font-medium">{activity.user.name}</span>
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
