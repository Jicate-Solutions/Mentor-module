'use client';

import { ArrowRight, ChevronDown, GraduationCap, UserPlus, UserCheck } from 'lucide-react';
import type { SessionCompletionSummary } from '@/lib/types/session-analytics';

interface CoverageFunnelCardProps {
  summary: SessionCompletionSummary | null;
  loading: boolean;
}

interface FunnelStage {
  label: string;
  value: number;
  caption: string;
  percentOfEnrolled: number | null;
  progressOfEnrolled: number;
  icon: React.ReactNode;
  tone: 'neutral' | 'primary' | 'accent';
}

const fmt = (n: number) => n.toLocaleString();

const toneStyles: Record<FunnelStage['tone'], { bar: string; chip: string; iconBg: string }> = {
  neutral: {
    bar: 'bg-neutral-400',
    chip: 'bg-neutral-100 text-neutral-700',
    iconBg: 'bg-neutral-100 text-neutral-600',
  },
  primary: {
    bar: 'bg-[#0b6d41]',
    chip: 'bg-[#0b6d41]/10 text-[#0b6d41]',
    iconBg: 'bg-[#0b6d41]/10 text-[#0b6d41]',
  },
  accent: {
    bar: 'bg-[#e0a800]',
    chip: 'bg-[#ffde59]/40 text-neutral-800',
    iconBg: 'bg-[#ffde59]/40 text-neutral-800',
  },
};

export default function CoverageFunnelCard({ summary, loading }: CoverageFunnelCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-white shadow-sm p-6 animate-pulse">
        <div className="h-5 w-56 bg-neutral-200 rounded mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-200" />
              <div className="w-24 h-8 bg-neutral-200 rounded" />
              <div className="w-40 h-3 bg-neutral-200 rounded" />
              <div className="w-full h-2 bg-neutral-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-2xl bg-white shadow-sm p-6 text-sm text-neutral-500">
        No data available yet.
      </div>
    );
  }

  const hasEnrollmentData = summary.totalEnrolledStudents > 0;

  // Mentor-scoped fallback: no enrolled universe, only show a compact 2-stage funnel.
  if (!hasEnrollmentData) {
    const met = summary.menteesWithFirstSession;
    const assigned = summary.totalAssignedMentees;
    const metPct = assigned === 0 ? 0 : Math.round((met / assigned) * 1000) / 10;

    return (
      <div className="rounded-2xl bg-white shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-medium text-neutral-900">Your Mentee Coverage</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FunnelStageTile
            stage={{
              label: 'Assigned Mentees',
              value: assigned,
              caption: 'Students assigned to you',
              percentOfEnrolled: null,
              progressOfEnrolled: 100,
              icon: <UserPlus className="w-5 h-5" />,
              tone: 'primary',
            }}
          />
          <FunnelStageTile
            stage={{
              label: 'Met at Least Once',
              value: met,
              caption: `${metPct}% of your mentees met · ${assigned - met} still unmet`,
              percentOfEnrolled: metPct,
              progressOfEnrolled: metPct,
              icon: <UserCheck className="w-5 h-5" />,
              tone: 'accent',
            }}
          />
        </div>
      </div>
    );
  }

  const enrolled = summary.totalEnrolledStudents;
  const assigned = summary.totalAssignedMentees;
  const met = summary.menteesWithFirstSession;
  const unassigned = summary.studentsNotAssigned;
  const assignedUnmet = Math.max(0, assigned - met);

  const stages: FunnelStage[] = [
    {
      label: 'Enrolled Students',
      value: enrolled,
      caption: 'Active students in MyJKKN',
      percentOfEnrolled: null,
      progressOfEnrolled: 100,
      icon: <GraduationCap className="w-5 h-5" />,
      tone: 'neutral',
    },
    {
      label: 'Assigned to a Mentor',
      value: assigned,
      caption: `${fmt(unassigned)} still unassigned`,
      percentOfEnrolled: summary.assignmentCoverageRate,
      progressOfEnrolled: summary.assignmentCoverageRate,
      icon: <UserPlus className="w-5 h-5" />,
      tone: 'primary',
    },
    {
      label: 'Met at Least Once',
      value: met,
      caption: `${fmt(assignedUnmet)} assigned but unmet`,
      percentOfEnrolled: enrolled === 0 ? 0 : Math.round((met / enrolled) * 1000) / 10,
      progressOfEnrolled: enrolled === 0 ? 0 : (met / enrolled) * 100,
      icon: <UserCheck className="w-5 h-5" />,
      tone: 'accent',
    },
  ];

  return (
    <div className="rounded-2xl bg-white shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-neutral-900">Student Coverage Funnel</h3>
          <p className="text-sm text-neutral-500 mt-0.5">
            Enrolled → Assigned → Met. The drop-off at each stage is the gap to close.
          </p>
        </div>
      </div>

      {/* Desktop: 3 columns with arrows between; Mobile: stacked with down chevrons */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 md:gap-2 items-stretch">
        <FunnelStageTile stage={stages[0]} />
        <FunnelConnector />
        <FunnelStageTile stage={stages[1]} />
        <FunnelConnector />
        <FunnelStageTile stage={stages[2]} />
      </div>
    </div>
  );
}

function FunnelStageTile({ stage }: { stage: FunnelStage }) {
  const t = toneStyles[stage.tone];
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-neutral-100 bg-neutral-50/50">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.iconBg}`}>
          {stage.icon}
        </div>
        {stage.percentOfEnrolled !== null && (
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${t.chip}`}>
            {stage.percentOfEnrolled}% of enrolled
          </span>
        )}
      </div>
      <div>
        <div className="text-[32px] font-medium text-neutral-900 tracking-tight leading-none">
          {fmt(stage.value)}
        </div>
        <div className="text-sm font-medium text-neutral-700 mt-1.5">{stage.label}</div>
        <div className="text-xs text-neutral-500 mt-0.5">{stage.caption}</div>
      </div>
      <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
        <div
          className={`h-full rounded-full ${t.bar} transition-all duration-500`}
          style={{ width: `${Math.max(0, Math.min(100, stage.progressOfEnrolled))}%` }}
        />
      </div>
    </div>
  );
}

function FunnelConnector() {
  return (
    <div className="flex items-center justify-center text-neutral-300">
      <ArrowRight className="w-6 h-6 hidden md:block" />
      <ChevronDown className="w-6 h-6 md:hidden" />
    </div>
  );
}
