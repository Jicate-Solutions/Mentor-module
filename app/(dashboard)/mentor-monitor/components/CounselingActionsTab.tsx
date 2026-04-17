'use client';

import { useState } from 'react';
import { CalendarCheck, CheckCircle2, Clock, XCircle, ChevronUp, ChevronDown } from 'lucide-react';
import type { CounselingSummaryRow } from '@/app/api/mentor-monitor/counseling-summary/route';

type SortField = 'name' | 'total' | 'completed' | 'queries' | 'actions' | 'pending';
type SortDir = 'asc' | 'desc';

interface CounselingActionsTabProps {
  data: CounselingSummaryRow[];
  loading: boolean;
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ChevronUp className="w-3 h-3 opacity-20" />;
  return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-[#0b6d41]" /> : <ChevronDown className="w-3 h-3 text-[#0b6d41]" />;
}

function ResolutionBar({ resolved, pending }: { resolved: number; pending: number }) {
  const total = resolved + pending;
  if (total === 0) return <span className="text-neutral-300 text-xs">—</span>;
  const pct = Math.round((resolved / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden min-w-[48px]">
        <div
          className="h-full bg-[#0b6d41] rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-neutral-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function CounselingActionsTab({ data, loading }: CounselingActionsTabProps) {
  const [sortField, setSortField] = useState<SortField>('total');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const sorted = [...data].sort((a, b) => {
    let va: number | string = 0;
    let vb: number | string = 0;
    if (sortField === 'name') { va = a.mentorName; vb = b.mentorName; }
    else if (sortField === 'total') { va = a.totalSessions; vb = b.totalSessions; }
    else if (sortField === 'completed') { va = a.completedSessions; vb = b.completedSessions; }
    else if (sortField === 'queries') { va = a.queriesRaised; vb = b.queriesRaised; }
    else if (sortField === 'actions') { va = a.actionsTaken; vb = b.actionsTaken; }
    else if (sortField === 'pending') { va = a.pending; vb = b.pending; }
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
    return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
  });

  const totalSessions = data.reduce((s, r) => s + r.totalSessions, 0);
  const totalQueries = data.reduce((s, r) => s + r.queriesRaised, 0);
  const totalActions = data.reduce((s, r) => s + r.actionsTaken, 0);
  const totalPending = data.reduce((s, r) => s + r.pending, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-200 border-t-[#0b6d41]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0b6d41]/5 rounded-lg p-3 flex items-center gap-3 border border-[#0b6d41]/20">
          <CalendarCheck className="w-5 h-5 text-[#0b6d41] shrink-0" />
          <div>
            <p className="text-xl font-bold text-[#0b6d41]">{totalSessions}</p>
            <p className="text-xs text-[#0b6d41]/70">Total Sessions</p>
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-3 border border-blue-100">
          <Clock className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <p className="text-xl font-bold text-blue-700">{totalQueries}</p>
            <p className="text-xs text-blue-600">Queries Raised</p>
          </div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3 flex items-center gap-3 border border-emerald-100">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-xl font-bold text-emerald-700">{totalActions}</p>
            <p className="text-xs text-emerald-600">Actions Taken</p>
          </div>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 flex items-center gap-3 border border-amber-100">
          <XCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-xl font-bold text-amber-700">{totalPending}</p>
            <p className="text-xs text-amber-600">Pending Actions</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left px-4 py-3 font-medium text-neutral-600">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-neutral-900">
                    Mentor <SortIcon field="name" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">
                  <button onClick={() => handleSort('total')} className="flex items-center gap-1 hover:text-neutral-900 mx-auto">
                    Sessions <SortIcon field="total" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">
                  <button onClick={() => handleSort('completed')} className="flex items-center gap-1 hover:text-neutral-900 mx-auto">
                    Completed <SortIcon field="completed" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">
                  <button onClick={() => handleSort('queries')} className="flex items-center gap-1 hover:text-neutral-900 mx-auto">
                    Queries <SortIcon field="queries" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">
                  <button onClick={() => handleSort('actions')} className="flex items-center gap-1 hover:text-neutral-900 mx-auto">
                    Actions Taken <SortIcon field="actions" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">
                  <button onClick={() => handleSort('pending')} className="flex items-center gap-1 hover:text-neutral-900 mx-auto">
                    Pending <SortIcon field="pending" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600 min-w-[120px]">
                  Resolution
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-neutral-400">
                    <CalendarCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No counseling session data found
                  </td>
                </tr>
              ) : (
                sorted.map((row) => (
                  <tr key={row.mentorId} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-neutral-900">{row.mentorName}</td>
                    <td className="px-4 py-3 text-center font-medium text-neutral-700">
                      {row.totalSessions || <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.completedSessions > 0 ? (
                        <span className="text-emerald-600 font-medium">{row.completedSessions}</span>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.queriesRaised > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                          {row.queriesRaised}
                        </span>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.actionsTaken > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" />
                          {row.actionsTaken}
                        </span>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.pending > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                          {row.pending}
                        </span>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ResolutionBar resolved={row.resolved} pending={row.pending} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
