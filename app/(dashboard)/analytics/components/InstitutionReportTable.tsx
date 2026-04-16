'use client';

import type { InstitutionSummaryRow } from '@/lib/types/session-analytics';

interface Props {
  rows: InstitutionSummaryRow[];
  loading: boolean;
}

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  const color =
    clamped >= 75
      ? 'bg-emerald-500'
      : clamped >= 40
        ? 'bg-amber-400'
        : 'bg-red-400';
  return (
    <div className="mt-1 h-1.5 w-full rounded-full bg-neutral-200">
      <div
        className={`h-1.5 rounded-full transition-all ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function RateCell({ value, label }: { value: number; label?: string }) {
  return (
    <div className="min-w-[80px]">
      <span className="text-sm font-semibold text-neutral-800">{value.toFixed(1)}%</span>
      {label && <p className="text-[10px] text-neutral-400 leading-none mt-0.5">{label}</p>}
      <ProgressBar value={value} />
    </div>
  );
}

export default function InstitutionReportTable({ rows, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-6">
        <div className="h-5 w-48 bg-neutral-100 rounded-lg animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-full bg-neutral-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 text-center text-neutral-500 text-sm">
        No institution data available.
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-neutral-100 flex items-center justify-end">
        <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-1 rounded-full">
          {rows.length} college{rows.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50">
              <th className="text-left px-4 py-3 font-medium text-neutral-600 whitespace-nowrap">
                Institution
              </th>
              <th className="text-right px-4 py-3 font-medium text-neutral-600 whitespace-nowrap">
                Mentors
              </th>
              <th className="text-right px-4 py-3 font-medium text-neutral-600 whitespace-nowrap">
                Sessions Done
              </th>
              <th className="px-4 py-3 font-medium text-neutral-600 whitespace-nowrap">
                Mentor Start %
              </th>
              <th className="px-4 py-3 font-medium text-neutral-600 whitespace-nowrap">
                Mentee Met %
              </th>
              <th className="px-4 py-3 font-medium text-neutral-600 whitespace-nowrap">
                Completion %
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.institutionId}
                className={`border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${
                  idx % 2 === 0 ? '' : 'bg-neutral-50/40'
                }`}
              >
                {/* Institution name */}
                <td className="px-4 py-3 max-w-[220px]">
                  <p className="font-medium text-neutral-900 truncate" title={row.institutionName}>
                    {row.institutionName}
                  </p>
                </td>

                {/* Total mentors */}
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold text-neutral-800">{row.totalMentors}</span>
                </td>

                {/* Completed sessions */}
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold text-neutral-800">
                    {row.totalCompletedSessions}
                  </span>
                  <span className="text-xs text-neutral-400 block">
                    sched: {row.totalScheduledSessions}
                  </span>
                </td>

                {/* Rate columns */}
                <td className="px-4 py-3">
                  <RateCell value={row.mentorStartRate} />
                </td>
                <td className="px-4 py-3">
                  <RateCell value={row.menteeMetRate} />
                </td>
                <td className="px-4 py-3">
                  <RateCell value={row.completionRate} />
                </td>
              </tr>
            ))}
          </tbody>

          {/* Totals footer */}
          <tfoot>
            <tr className="bg-neutral-50 border-t border-neutral-200">
              <td className="px-4 py-3 font-semibold text-neutral-700">Total</td>
              <td className="px-4 py-3 text-right font-bold text-neutral-900">
                {rows.reduce((s, r) => s + r.totalMentors, 0)}
              </td>
              <td className="px-4 py-3 text-right font-bold text-neutral-900">
                {rows.reduce((s, r) => s + r.totalCompletedSessions, 0)}
              </td>
              <td colSpan={3} className="px-4 py-3 text-xs text-neutral-400 text-center">
                — weighted avg not shown —
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
