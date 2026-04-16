'use client';

import React from 'react';
import type { PerMentorRow } from '@/lib/types/session-analytics';

interface MentorCompletionTableProps {
  rows: PerMentorRow[];
  loading: boolean;
}

// Institution UUID prefix → display name
const INST_NAMES: Record<string, string> = {
  e8fbe8aa: 'JKKN Dental College and Hospital',
  '70e54e51': 'JKKN College of Nursing and Research',
  '5736d86f': 'JKKN College of Pharmacy',
  '5de4fba1': 'JKKN College of Engineering and Technology',
  b0b8a724: 'JKKN College of Arts and Science (Self)',
  a33138b6: 'JKKN College of Arts and Science (Aided)',
  '9c1554e8': 'JKKN College of Allied Health Sciences',
};
const INST_ORDER = [
  'e8fbe8aa',
  '70e54e51',
  '5736d86f',
  '5de4fba1',
  'b0b8a724',
  'a33138b6',
  '9c1554e8',
];

function instPrefix(id: string | null): string {
  if (!id) return '';
  return id.replace(/-/g, '').slice(0, 8).toLowerCase();
}
function instName(id: string | null): string {
  return INST_NAMES[instPrefix(id)] ?? id ?? 'Unknown';
}
function instOrder(id: string | null): number {
  const idx = INST_ORDER.indexOf(instPrefix(id));
  return idx === -1 ? 99 : idx;
}

type MentorStatus = 'First Cycle Complete' | 'Partial' | 'Not Started' | 'No Assignment';

function computeStatus(row: PerMentorRow): MentorStatus {
  if (row.assignedMentees === 0) return 'No Assignment';
  if (row.uniqueMenteesMet === 0 && row.completedSessions === 0) return 'Not Started';
  if (row.uniqueMenteesMet >= row.assignedMentees) return 'First Cycle Complete';
  return 'Partial';
}

function sessionRate(row: PerMentorRow): string {
  const total = row.completedSessions + row.scheduledSessions + row.cancelledSessions;
  if (total === 0) return '—';
  return ((row.completedSessions / total) * 100).toFixed(1) + '%';
}

const STATUS_STYLES: Record<MentorStatus, string> = {
  'First Cycle Complete': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Partial: 'bg-amber-50 text-amber-700 border-amber-200',
  'Not Started': 'bg-orange-50 text-orange-700 border-orange-200',
  'No Assignment': 'bg-neutral-100 text-neutral-500 border-neutral-200',
};

function StatusBadge({ status }: { status: MentorStatus }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

function SkeletonTable() {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-100">
        <div className="h-5 w-48 bg-neutral-100 rounded-lg animate-pulse" />
      </div>
      <div className="divide-y divide-neutral-100">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-6 py-3 flex gap-4">
            <div className="h-4 w-40 bg-neutral-100 rounded animate-pulse" />
            <div className="h-4 w-24 bg-neutral-100 rounded animate-pulse" />
            <div className="h-4 w-16 bg-neutral-100 rounded animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MentorCompletionTable({ rows, loading }: MentorCompletionTableProps) {
  if (loading) return <SkeletonTable />;

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center text-neutral-500 text-sm">
        No mentor data available.
      </div>
    );
  }

  // Group by institution, sorted by institution order then status then name
  const STATUS_RANK: Record<MentorStatus, number> = {
    'First Cycle Complete': 0,
    Partial: 1,
    'Not Started': 2,
    'No Assignment': 3,
  };

  // Normalise institutionId: treat empty string the same as null so they
  // always land in the same section and produce a unique Fragment key.
  const enriched = rows.map((r) => ({
    row: { ...r, institutionId: r.institutionId || null },
    status: computeStatus(r),
  }));
  enriched.sort((a, b) => {
    const io = instOrder(a.row.institutionId) - instOrder(b.row.institutionId);
    if (io !== 0) return io;
    // Secondary: sort by the raw institution ID so all rows from the same
    // institution are always consecutive even when instOrder maps multiple
    // different IDs to the same bucket (99 = "unknown").
    const idA = a.row.institutionId ?? '';
    const idB = b.row.institutionId ?? '';
    const ic = idA.localeCompare(idB);
    if (ic !== 0) return ic;
    const so = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (so !== 0) return so;
    return (a.row.mentorName ?? '').localeCompare(b.row.mentorName ?? '');
  });

  // Group into sections
  type Section = { instId: string | null; items: typeof enriched };
  const sections: Section[] = [];
  for (const item of enriched) {
    const last = sections[sections.length - 1];
    if (!last || last.instId !== item.row.institutionId) {
      sections.push({ instId: item.row.institutionId, items: [item] });
    } else {
      last.items.push(item);
    }
  }

  // Summary counts per section
  function sectionSummary(items: Section['items']) {
    const counts = { complete: 0, partial: 0, notStarted: 0, noAssign: 0 };
    for (const { status } of items) {
      if (status === 'First Cycle Complete') counts.complete++;
      else if (status === 'Partial') counts.partial++;
      else if (status === 'Not Started') counts.notStarted++;
      else counts.noAssign++;
    }
    return counts;
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
      {/* Global header */}
      <div className="px-6 py-3 border-b border-neutral-100 flex items-center justify-end">
        <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-1 rounded-full">
          {rows.length} mentors
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-100">
              <th className="text-left px-4 py-2.5 font-medium text-neutral-500 whitespace-nowrap">
                Mentor
              </th>
              <th className="text-center px-4 py-2.5 font-medium text-neutral-500 whitespace-nowrap">
                Status
              </th>
              <th className="text-right px-4 py-2.5 font-medium text-neutral-500 whitespace-nowrap">
                Assigned
              </th>
              <th className="text-right px-4 py-2.5 font-medium text-neutral-500 whitespace-nowrap">
                Met
              </th>
              <th className="text-right px-4 py-2.5 font-medium text-neutral-500 whitespace-nowrap">
                Remaining
              </th>
              <th className="text-right px-4 py-2.5 font-medium text-neutral-500 whitespace-nowrap">
                Done
              </th>
              <th className="text-right px-4 py-2.5 font-medium text-neutral-500 whitespace-nowrap">
                Sched
              </th>
              <th className="text-right px-4 py-2.5 font-medium text-neutral-500 whitespace-nowrap">
                Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => {
              const sum = sectionSummary(section.items);
              const name = instName(section.instId);
              return (
                <React.Fragment key={section.instId ?? '__unknown__'}>
                  {/* Institution header row */}
                  <tr className="bg-neutral-50/80 border-y border-neutral-200">
                    <td colSpan={8} className="px-4 py-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">
                          {name}
                        </span>
                        <span className="flex items-center gap-2 text-[11px]">
                          <span className="text-neutral-500">{section.items.length} mentors</span>
                          {sum.complete > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
                              ✓ {sum.complete} complete
                            </span>
                          )}
                          {sum.partial > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                              {sum.partial} partial
                            </span>
                          )}
                          {sum.notStarted > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">
                              {sum.notStarted} not started
                            </span>
                          )}
                          {sum.noAssign > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-500 font-medium">
                              {sum.noAssign} unassigned
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Mentor rows */}
                  {section.items.map(({ row, status }, idx) => (
                    <tr
                      key={row.mentorId}
                      className={`border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${
                        idx % 2 === 1 ? 'bg-neutral-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5 max-w-[180px]">
                        <p className="font-medium text-neutral-900 truncate text-sm" title={row.mentorName ?? ''}>
                          {row.mentorName || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                        {row.assignedMentees}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700 font-medium">
                        {row.uniqueMenteesMet}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-500">
                        {Math.max(0, row.assignedMentees - row.uniqueMenteesMet)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-neutral-800">
                        {row.completedSessions}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-500">
                        {row.scheduledSessions}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700 font-medium">
                        {sessionRate(row)}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
