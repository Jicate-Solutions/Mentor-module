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
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
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
    <div className="rounded-2xl bg-white shadow-sm border border-neutral-100 h-full flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-neutral-100">
        <h3 className="text-[15px] font-semibold text-neutral-900" suppressHydrationWarning>
          {format(today, 'MMMM yyyy')}
        </h3>
        <p className="text-[12px] text-neutral-500 mt-0.5">Upcoming counseling sessions</p>
      </div>

      <div className="flex-1 px-5 py-4">
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="h-12 bg-neutral-100 rounded-lg animate-pulse" />
              ))}
            </div>
            <div className="space-y-2 mt-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 bg-neutral-50 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Week Calendar */}
            <div className="mb-5">
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
                  <div key={day} className="text-[10px] font-medium text-neutral-400 text-center tracking-wider">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {weekDays.map((date, index) => {
                  const isToday = isSameDay(date, today);
                  const sessionsCount = getSessionsForDate(date).length;

                  return (
                    <div
                      key={index}
                      className={`
                        relative flex flex-col items-center justify-center py-2.5 rounded-xl transition-all cursor-pointer
                        ${isToday
                          ? 'bg-brand-green text-white shadow-md shadow-brand-green/20'
                          : sessionsCount > 0
                          ? 'bg-brand-green/5 text-neutral-800 hover:bg-brand-green/10'
                          : 'text-neutral-600 hover:bg-neutral-50'
                        }
                      `}
                      suppressHydrationWarning
                    >
                      <span className="text-[14px] font-semibold tabular-nums" suppressHydrationWarning>
                        {format(date, 'd')}
                      </span>
                      {sessionsCount > 0 && (
                        <div className={`w-1 h-1 rounded-full mt-0.5 ${isToday ? 'bg-white' : 'bg-brand-green'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Session List */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-thin">
              {upcomingSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center mb-3">
                    <ClockIcon className="w-6 h-6 text-neutral-400" />
                  </div>
                  <h4 className="text-[13px] font-medium text-neutral-700 mb-0.5">No sessions scheduled</h4>
                  <p className="text-[11px] text-neutral-500 text-center">
                    Upcoming sessions will appear here
                  </p>
                </div>
              ) : (
                upcomingSessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer group"
                  >
                    {/* Date Badge */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-green/5 flex flex-col items-center justify-center" suppressHydrationWarning>
                      <span className="text-[10px] font-medium text-brand-green leading-none">
                        {format(new Date(session.date), 'MMM')}
                      </span>
                      <span className="text-[14px] font-bold text-brand-green leading-tight">
                        {format(new Date(session.date), 'd')}
                      </span>
                    </div>

                    {/* Session Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-neutral-800 truncate group-hover:text-brand-green transition-colors">
                        {session.session_name}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {session.time}
                        </span>
                        {session.student_name && (
                          <span className="text-[11px] text-neutral-500 flex items-center gap-1 truncate">
                            <UserIcon className="w-3 h-3" />
                            {session.student_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <span className={`
                      flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium
                      ${session.status === 'scheduled' ? 'bg-blue-50 text-blue-600'
                        : session.status === 'completed' ? 'bg-green-50 text-green-600'
                        : 'bg-red-50 text-red-600'}
                    `}>
                      {session.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            {upcomingSessions.length > 5 && (
              <div className="mt-3 pt-3 border-t border-neutral-100 text-center">
                <button className="text-[12px] text-brand-green hover:text-brand-green/80 font-medium transition-colors">
                  View all {upcomingSessions.length} sessions
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
