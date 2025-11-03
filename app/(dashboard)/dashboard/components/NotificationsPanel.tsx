'use client';

import Card from '@/components/ui/Card';
import { BellIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';

interface Notification {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'action';
  actionLabel?: string;
  actionUrl?: string;
}

interface NotificationsPanelProps {
  notifications: Notification[];
  loading?: boolean;
  onClearAll?: () => void;
}

export const NotificationsPanel = ({
  notifications,
  loading,
  onClearAll,
}: NotificationsPanelProps) => {
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'warning':
        return <ExclamationCircleIcon className="w-5 h-5 text-warning" />;
      case 'action':
        return <BellIcon className="w-5 h-5 text-primary-600" />;
      default:
        return <BellIcon className="w-5 h-5 text-info" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'warning':
        return 'border-l-warning bg-warning/5';
      case 'action':
        return 'border-l-primary-600 bg-primary-50/50';
      default:
        return 'border-l-info bg-info/5';
    }
  };

  return (
    <Card variant="elevated" className="h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-neutral-900">Notifications</h3>
          <p className="text-sm text-neutral-600 mt-1">
            {notifications.length} pending {notifications.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        {notifications.length > 0 && onClearAll && (
          <button
            onClick={onClearAll}
            className="text-sm text-neutral-500 hover:text-neutral-700 font-medium transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg border-l-4 border-neutral-200 bg-neutral-50 animate-pulse">
              <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-neutral-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          <BellIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">You're all caught up!</p>
          <p className="text-sm mt-1">No pending notifications</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`
                p-4 rounded-lg border-l-4 transition-all hover:shadow-md
                ${getNotificationColor(notification.type)}
              `}
            >
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-neutral-900 mb-1">
                    {notification.title}
                  </h4>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    {notification.description}
                  </p>
                  {notification.actionLabel && (
                    <div className="mt-3">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          if (notification.actionUrl) {
                            window.location.href = notification.actionUrl;
                          }
                        }}
                      >
                        {notification.actionLabel}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
