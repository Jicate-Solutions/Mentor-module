'use client';

import { Users, UserCheck, CheckCircle2, TrendingUp, GraduationCap } from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import type { SessionCompletionSummary } from '@/lib/types/session-analytics';

interface CompletionKPIGridProps {
  summary: SessionCompletionSummary | null;
  loading: boolean;
}

export default function CompletionKPIGrid({ summary, loading }: CompletionKPIGridProps) {
  // Only show the Coverage card when we actually have an enrolled-student count
  // (non-admin mentors get 0 from the API and shouldn't see it).
  const showCoverage = !!summary && summary.totalEnrolledStudents > 0;
  const cardCount = showCoverage ? 5 : 4;
  const gridCols = showCoverage
    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5'
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';

  if (loading) {
    return (
      <div className={`grid ${gridCols} gap-4`}>
        {Array.from({ length: cardCount }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white shadow-sm p-6 animate-pulse"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-14 h-14 rounded-2xl bg-neutral-200" />
              <div className="w-16 h-8 rounded bg-neutral-200" />
            </div>
            <div className="space-y-2">
              <div className="w-24 h-3 rounded bg-neutral-200" />
              <div className="w-32 h-3 rounded bg-neutral-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const s = summary ?? {
    totalMentors: 0,
    mentorsWithFirstSession: 0,
    mentorsWithZeroSessions: 0,
    totalAssignedMentees: 0,
    menteesWithFirstSession: 0,
    menteesNotYetMet: 0,
    totalEnrolledStudents: 0,
    studentsNotAssigned: 0,
    assignmentCoverageRate: 0,
    totalCompletedSessions: 0,
    totalScheduledSessions: 0,
    totalCancelledSessions: 0,
    completionRate: 0,
    mentorFirstSessionRate: 0,
    menteeMetRate: 0,
  };

  return (
    <div className={`grid ${gridCols} gap-4`}>
      {showCoverage && (
        <StatCard
          title="Students Assigned"
          value={`${s.totalAssignedMentees.toLocaleString()}/${s.totalEnrolledStudents.toLocaleString()}`}
          subtitle={`${s.assignmentCoverageRate}% have a mentor · ${s.studentsNotAssigned.toLocaleString()} unassigned`}
          icon={<GraduationCap className="w-6 h-6" />}
        />
      )}
      <StatCard
        title="Mentors Started"
        value={`${s.mentorsWithFirstSession}/${s.totalMentors}`}
        subtitle={`${s.mentorFirstSessionRate}% started mentoring`}
        variant="primary"
        icon={<Users className="w-6 h-6" />}
      />
      <StatCard
        title="Mentees Met"
        value={`${s.menteesWithFirstSession}/${s.totalAssignedMentees}`}
        subtitle={`${s.menteeMetRate}% received first session`}
        variant="accent"
        icon={<UserCheck className="w-6 h-6" />}
      />
      <StatCard
        title="Completed Sessions"
        value={s.totalCompletedSessions.toLocaleString()}
        subtitle={`${s.totalScheduledSessions} scheduled, ${s.totalCancelledSessions} cancelled`}
        icon={<CheckCircle2 className="w-6 h-6" />}
      />
      <StatCard
        title="Completion Rate"
        value={`${s.completionRate}%`}
        subtitle="of all sessions"
        icon={<TrendingUp className="w-6 h-6" />}
      />
    </div>
  );
}
