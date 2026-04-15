'use client';

import { Users, TrendingUp, CheckCircle2, CalendarClock, XCircle } from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import type { SessionCompletionSummary } from '@/lib/types/session-analytics';

interface SecondaryKPIRowProps {
  summary: SessionCompletionSummary | null;
  loading: boolean;
}

export default function SecondaryKPIRow({ summary, loading }: SecondaryKPIRowProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white shadow-sm p-6 animate-pulse">
            <div className="w-12 h-12 rounded-xl bg-neutral-200 mb-4" />
            <div className="w-28 h-3 bg-neutral-200 rounded mb-2" />
            <div className="w-20 h-8 bg-neutral-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const s = summary;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        title="Mentors Started"
        value={s ? `${s.mentorsWithFirstSession}/${s.totalMentors}` : '0/0'}
        subtitle={s ? `${s.mentorFirstSessionRate}% began mentoring` : '—'}
        variant="primary"
        icon={<Users className="w-6 h-6" />}
      />

      <StatCard
        title="Completion Rate"
        value={s ? `${s.completionRate}%` : '0%'}
        subtitle={
          s
            ? `${s.totalCompletedSessions} done vs ${s.totalCancelledSessions} cancelled (100% = no cancellations)`
            : 'of resolved sessions'
        }
        icon={<TrendingUp className="w-6 h-6" />}
      />

      <div className="rounded-2xl bg-white shadow-sm p-6 hover:shadow-lg transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
          <p className="text-[12px] font-medium text-neutral-600 tracking-wider uppercase">
            Sessions
          </p>
          <span className="text-[12px] text-neutral-500">
            {s ? (s.totalCompletedSessions + s.totalScheduledSessions + s.totalCancelledSessions).toLocaleString() : 0} total
          </span>
        </div>
        <ul className="space-y-2.5">
          <SessionRow
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Completed"
            value={s?.totalCompletedSessions ?? 0}
            tone="green"
          />
          <SessionRow
            icon={<CalendarClock className="w-4 h-4" />}
            label="Scheduled"
            value={s?.totalScheduledSessions ?? 0}
            tone="blue"
          />
          <SessionRow
            icon={<XCircle className="w-4 h-4" />}
            label="Cancelled"
            value={s?.totalCancelledSessions ?? 0}
            tone="red"
          />
        </ul>
      </div>
    </div>
  );
}

const toneClass: Record<'green' | 'blue' | 'red', string> = {
  green: 'text-[#0b6d41] bg-[#0b6d41]/10',
  blue: 'text-blue-700 bg-blue-100',
  red: 'text-red-700 bg-red-100',
};

function SessionRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'green' | 'blue' | 'red';
}) {
  return (
    <li className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${toneClass[tone]}`}>
          {icon}
        </span>
        <span className="text-sm font-medium text-neutral-700">{label}</span>
      </div>
      <span className="text-lg font-medium text-neutral-900 tabular-nums">
        {value.toLocaleString()}
      </span>
    </li>
  );
}
