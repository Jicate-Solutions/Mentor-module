'use client';

import Card from '@/components/ui/Card';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { ClockIcon, UserIcon } from '@heroicons/react/24/outline';

interface Session {
  id: string;
  session_name: string;
  date: string;
  time: string;
  mentor_name?: string;
  student_name?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface SessionCalendarProps {
  upcomingSessions: Session[];
  loading?: boolean;
}

export const SessionCalendar = ({ upcomingSessions, loading }: SessionCalendarProps) => {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getSessionsForDate = (date: Date) => {
    return upcomingSessions.filter((session) =>
      isSameDay(new Date(session.date), date)
    );
  };

  return (
    <Card variant="elevated" className="h-full">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-neutral-900">
          {format(today, 'MMMM yyyy')}
        </h3>
        <p className="text-sm text-neutral-600 mt-1">Upcoming counseling sessions</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-12 bg-neutral-200 rounded animate-pulse" />
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-neutral-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Week Calendar */}
          <div className="mb-6">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div
                  key={day}
                  className="text-xs font-medium text-neutral-500 text-center"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((date, index) => {
                const isToday = isSameDay(date, today);
                const sessionsCount = getSessionsForDate(date).length;

                return (
                  <div
                    key={index}
                    className={`
                      relative aspect-square rounded-lg p-2 text-center transition-all cursor-pointer
                      ${
                        isToday
                          ? 'bg-primary-600 text-white shadow-md'
                          : sessionsCount > 0
                          ? 'bg-accent-100 text-accent-900 hover:bg-accent-200'
                          : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                      }
                    `}
                  >
                    <div className="text-sm font-semibold">
                      {format(date, 'd')}
                    </div>
                    {sessionsCount > 0 && (
                      <div
                        className={`
                          absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full
                          ${isToday ? 'bg-white' : 'bg-primary-600'}
                        `}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Session List */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {upcomingSessions.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                <ClockIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming sessions</p>
              </div>
            ) : (
              upcomingSessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="p-4 rounded-lg border border-neutral-200 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors">
                      {session.session_name}
                    </h4>
                    <span
                      className={`
                        text-xs px-2 py-1 rounded-full font-medium
                        ${
                          session.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-700'
                            : session.status === 'completed'
                            ? 'bg-success/10 text-success'
                            : 'bg-error/10 text-error'
                        }
                      `}
                    >
                      {session.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-neutral-600">
                    <div className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>
                        {format(new Date(session.date), 'MMM d')} • {session.time}
                      </span>
                    </div>
                    {session.student_name && (
                      <div className="flex items-center gap-1">
                        <UserIcon className="w-4 h-4" />
                        <span>{session.student_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {upcomingSessions.length > 5 && (
            <div className="mt-4 pt-4 border-t border-neutral-200 text-center">
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
                View all {upcomingSessions.length} sessions →
              </button>
            </div>
          )}
        </>
      )}
    </Card>
  );
};
