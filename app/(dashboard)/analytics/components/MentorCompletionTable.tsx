'use client';

import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import DataTable, { type Column } from '@/components/ui/DataTable';
import Badge from '@/components/ui/Badge';
import type { PerMentorRow } from '@/lib/types/session-analytics';
import { format } from 'date-fns';

interface MentorCompletionTableProps {
  rows: PerMentorRow[];
  loading: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

export default function MentorCompletionTable({
  rows,
  loading,
}: MentorCompletionTableProps) {
  const columns: Column<PerMentorRow>[] = [
    {
      key: 'mentorName',
      label: 'Mentor',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-neutral-900">
          {row.mentorName || '—'}
        </span>
      ),
    },
    {
      key: 'assignedMentees',
      label: 'Assigned',
      sortable: true,
      render: (row) => (
        <span className="tabular-nums text-right block">{row.assignedMentees}</span>
      ),
    },
    {
      key: 'uniqueMenteesMet',
      label: 'Met',
      sortable: true,
      render: (row) => (
        <span className="tabular-nums text-right block">{row.uniqueMenteesMet}</span>
      ),
    },
    {
      key: 'completedSessions',
      label: 'Completed',
      sortable: true,
      render: (row) => (
        <span className="tabular-nums text-right block font-medium text-brand-green">
          {row.completedSessions}
        </span>
      ),
    },
    {
      key: 'scheduledSessions',
      label: 'Scheduled',
      sortable: true,
      hideOnMobile: true,
      render: (row) => (
        <span className="tabular-nums text-right block text-neutral-600">
          {row.scheduledSessions}
        </span>
      ),
    },
    {
      key: 'cancelledSessions',
      label: 'Cancelled',
      sortable: true,
      hideOnMobile: true,
      render: (row) => (
        <span className="tabular-nums text-right block text-red-600">
          {row.cancelledSessions}
        </span>
      ),
    },
    {
      key: 'firstSessionCompleted',
      label: 'First Session',
      render: (row) =>
        row.firstSessionCompleted ? (
          <Badge variant="success" size="sm">
            ✓ Done
          </Badge>
        ) : (
          <Badge variant="error" size="sm">
            ✗ Not Yet
          </Badge>
        ),
    },
    {
      key: 'lastSessionDate',
      label: 'Last Session',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-neutral-600">{formatDate(row.lastSessionDate)}</span>
      ),
    },
  ];

  return (
    <Card variant="elevated" className="h-full" padding="md">
      <CardHeader>
        <CardTitle>Per-Mentor Breakdown</CardTitle>
        <p className="text-[13px] text-neutral-600 mt-1 leading-relaxed">
          Session completion stats per mentor
        </p>
      </CardHeader>

      <DataTable<PerMentorRow>
        columns={columns}
        data={rows}
        keyExtractor={(row) => row.mentorId}
        loading={loading}
        emptyMessage="No mentor data available"
      />
    </Card>
  );
}
