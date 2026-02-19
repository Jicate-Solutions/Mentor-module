'use client';

import { useState, useEffect } from 'react';
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
  const [mounted, setMounted] = useState(false);
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    setMounted(true);
  }, []);

  const getSessionsForDate = (date: Date) => {
    return upcomingSessions.filter((session) =>
      isSameDay(new Date(session.date), date)
    );
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-primary-100/50 p-6 shadow-lg h-full">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
      <div className="absolute -top-8 -right-8 w-24 h-24 bg-primary-300/20 rounded-full blur-2xl" />

      <div className="relative z-10">
        <div className="mb-6">
          <h3 className="text-[17px] font-medium text-primary-800" suppressHydrationWarning>
            {format(today, 'MMMM yyyy')}
          </h3>
          <p className="text-[13px] text-primary-700/80 mt-1 leading-relaxed font-medium">Upcoming counseling sessions</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="h-12 bg-primary-100 rounded animate-pulse" />
              ))}
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-primary-100 rounded animate-pulse" />
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
                  className="text-xs font-medium text-primary-700 text-center uppercase tracking-wide"
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
                      relative aspect-square rounded-lg p-2 text-center transition-all cursor-pointer shadow-sm
                      ${
                        isToday
                          ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg border border-primary-400/40'
                          : sessionsCount > 0
                          ? 'bg-primary-100/60 text-primary-800 hover:bg-primary-200/60 border border-primary-200/50'
                          : 'bg-white text-primary-700 hover:bg-white border border-primary-100/30'
                      }
                    `}
                    suppressHydrationWarning
                  >
                    <div className="text-sm font-medium" suppressHydrationWarning>
                      {format(date, 'd')}
                    </div>
                    {sessionsCount > 0 && (
                      <div
                        className={`
                          absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full shadow-sm
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
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary-300/20 rounded-full blur-xl" />
                  <div className="relative bg-gradient-to-br from-primary-100/60 to-primary-200/40 rounded-full p-4">
                    <ClockIcon className="w-10 h-10 text-primary-600" />
                  </div>
                </div>
                <h4 className="text-sm font-medium text-primary-800 mt-4 mb-1">No sessions scheduled</h4>
                <p className="text-xs text-primary-700/70 text-center max-w-xs font-medium">
                  Your upcoming counseling sessions will appear here
                </p>
              </div>
            ) : (
              upcomingSessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="p-4 rounded-lg bg-white border border-primary-100/50 hover:border-primary-300/60 hover:bg-white hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium text-primary-800 group-hover:text-primary-600 transition-colors">
                      {session.session_name}
                    </h4>
                    <span
                      className={`
                        text-xs px-2 py-1 rounded-full font-medium
                        ${
                          session.status === 'scheduled'
                            ? 'bg-primary-100/60 text-primary-700 border border-primary-200/50'
                            : session.status === 'completed'
                            ? 'bg-primary-100/60 text-primary-700 border border-primary-200/50'
                            : 'bg-red-100/60 text-red-700 border border-red-200/50'
                        }
                      `}
                    >
                      {session.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-primary-700/80 font-medium">
                    <div className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      <span suppressHydrationWarning>
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
            <div className="mt-4 pt-4 border-t border-primary-100 text-center">
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors hover:underline">
                View all {upcomingSessions.length} sessions →
              </button>
            </div>
          )}
        </>
        )}
      </div>

      {/* Bottom Accent Line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary-400/30 to-transparent opacity-50" />
    </div>
  );
};
