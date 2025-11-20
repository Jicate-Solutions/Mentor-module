'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, ChevronDown, ChevronUp, Inbox } from 'lucide-react';
import type { MentorActivity } from '@/lib/types/activity';
import { formatActivityDescription } from '@/lib/types/activity';
import ActivityTypeIcon from './ActivityTypeIcon';

interface ActivityTimelineProps {
  activities: MentorActivity[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export default function ActivityTimeline({
  activities,
  loading,
  onLoadMore,
  hasMore,
}: ActivityTimelineProps) {
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedActivities);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedActivities(newExpanded);
  };

  const getActivityLink = (activity: MentorActivity): string | undefined => {
    if (activity.relatedSessionId) {
      return `/mentor/${activity.mentorId}?tab=counseling`;
    }
    if (activity.relatedStudentId) {
      return `/mentor/${activity.mentorId}?tab=students`;
    }
    return undefined;
  };

  // Loading skeleton
  if (loading && activities.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!loading && activities.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Activities Found
          </h3>
          <p className="text-sm text-gray-500 max-w-md">
            There are no activities to display for the selected filters.
            Try adjusting your filters or check back later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Timeline Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Activity Timeline
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
        </p>
      </div>

      {/* Timeline List */}
      <div className="divide-y divide-gray-200">
        {activities.map((activity, index) => {
          const isExpanded = expandedActivities.has(activity.id);
          const link = getActivityLink(activity);
          const hasDetails = activity.activityData && Object.keys(activity.activityData).length > 0;

          return (
            <div
              key={activity.id}
              className="p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex gap-4">
                {/* Activity Icon */}
                <div className="flex-shrink-0">
                  <ActivityTypeIcon type={activity.activityType} size={24} />
                </div>

                {/* Activity Content */}
                <div className="flex-1 min-w-0">
                  {/* Activity Header */}
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">
                        {formatActivityDescription(activity)}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        {activity.mentorName && (
                          <span className="font-medium text-gray-700">
                            {activity.mentorName}
                          </span>
                        )}
                        {activity.studentName && (
                          <span>
                            Student: <span className="font-medium">{activity.studentName}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {link && (
                        <Link
                          href={link}
                          className="p-1.5 rounded-lg hover:bg-white border border-gray-200 transition-colors"
                          title="View details"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-600" />
                        </Link>
                      )}
                      {hasDetails && (
                        <button
                          onClick={() => toggleExpanded(activity.id)}
                          className="p-1.5 rounded-lg hover:bg-white border border-gray-200 transition-colors"
                          title={isExpanded ? 'Collapse details' : 'Expand details'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Activity Description */}
                  <p className="text-sm text-gray-600 mb-2">
                    {activity.activityDescription}
                  </p>

                  {/* Expanded Details */}
                  {isExpanded && hasDetails && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <h5 className="text-xs font-semibold text-gray-700 mb-2">
                        Additional Details
                      </h5>
                      <dl className="space-y-1">
                        {Object.entries(activity.activityData || {}).map(([key, value]) => (
                          <div key={key} className="flex text-xs">
                            <dt className="font-medium text-gray-600 w-32 flex-shrink-0">
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                            </dt>
                            <dd className="text-gray-900">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="p-4 border-t border-gray-200 text-center">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-6 py-2 bg-[#0b6d41] text-white rounded-lg hover:bg-[#094d2e] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
