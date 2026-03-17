'use client';

import { useState, useEffect } from 'react';
import { UserCheck, UserX, Clock, AlertCircle } from 'lucide-react';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';

interface AttendanceStats {
  totalInvited: number;
  attended: number;
  absent: number;
  excused: number;
  attendanceRate: number;
}

interface NotAttendedStudent {
  studentId: string;
  studentName: string;
  sessionName: string;
  sessionDate: string;
}

interface AttendanceOverviewProps {
  mentorId: string | null;
  isAdmin: boolean;
}

export default function AttendanceOverview({ mentorId, isAdmin }: AttendanceOverviewProps) {
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [notAttended, setNotAttended] = useState<NotAttendedStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mentorId) {
      setLoading(false);
      return;
    }

    async function fetchAttendance() {
      try {
        setLoading(true);
        const res = await fetchWithAuthRetry(
          `/api/mentor/${mentorId}/activity/stats`,
          {},
          1
        );
        const json = await res.json();

        if (res.ok) {
          const data = json.data ?? json;
          // Stats come from the session stats endpoint
          // For a more detailed attendance view, we'd need a dedicated attendance endpoint
          // For now, show session stats as a proxy
          const sessionStats = data.stats;
          if (sessionStats) {
            setStats({
              totalInvited: sessionStats.total || 0,
              attended: sessionStats.completed || 0,
              absent: sessionStats.cancelled || 0,
              excused: 0,
              attendanceRate: sessionStats.total > 0
                ? Math.round((sessionStats.completed / sessionStats.total) * 100)
                : 0,
            });
          }
        }
      } catch (e) {
        console.error('Error fetching attendance:', e);
      } finally {
        setLoading(false);
      }
    }

    fetchAttendance();
  }, [mentorId]);

  if (isAdmin && !mentorId) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats || stats.totalInvited === 0) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="p-5 border-b border-neutral-100 bg-gradient-to-r from-amber-50/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              <UserCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-medium text-neutral-900">Session Completion</h3>
              <p className="text-sm text-neutral-500">Track session completion rates</p>
            </div>
          </div>
        </div>
        <div className="p-8 text-center text-gray-500">
          <UserCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm">No session data available yet</p>
        </div>
      </div>
    );
  }

  const overdue = (stats.totalInvited - stats.attended - stats.absent - stats.excused);

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-neutral-100 bg-gradient-to-r from-amber-50/50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              <UserCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-medium text-neutral-900">Session Completion</h3>
              <p className="text-sm text-neutral-500">
                {stats.attendanceRate}% completion rate &middot; {stats.totalInvited} total sessions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5">
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700 uppercase">Completed</span>
          </div>
          <p className="text-2xl font-semibold text-emerald-800">{stats.attended}</p>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700 uppercase">Scheduled</span>
          </div>
          <p className="text-2xl font-semibold text-blue-800">{overdue > 0 ? overdue : 0}</p>
        </div>

        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <div className="flex items-center gap-2 mb-2">
            <UserX className="w-4 h-4 text-red-600" />
            <span className="text-xs font-medium text-red-700 uppercase">Cancelled</span>
          </div>
          <p className="text-2xl font-semibold text-red-800">{stats.absent}</p>
        </div>

        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-medium text-amber-700 uppercase">Overdue</span>
          </div>
          <p className="text-2xl font-semibold text-amber-800">{stats.excused}</p>
        </div>
      </div>

      {/* Completion Progress Bar */}
      <div className="px-5 pb-5">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Completion Rate</span>
          <span className="font-medium">{stats.attendanceRate}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(stats.attendanceRate, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
