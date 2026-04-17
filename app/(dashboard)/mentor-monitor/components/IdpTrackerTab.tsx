'use client';

import { useState } from 'react';
import { FileText, AlertTriangle, CheckCircle2, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import type { IdpSummaryRow } from '@/app/api/mentor-monitor/idp-summary/route';

type StatusFilter = 'all' | 'overdue' | 'active' | 'completed';
type SortField = 'name' | 'active' | 'completed' | 'overdue' | 'total';
type SortDir = 'asc' | 'desc';

interface IdpTrackerTabProps {
  data: IdpSummaryRow[];
  loading: boolean;
}

const FILTER_OPTIONS: { value: StatusFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All Mentors', color: 'bg-neutral-100 text-neutral-700 border-neutral-200' },
  { value: 'overdue', label: 'Has Overdue', color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'active', label: 'Has Active', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'completed', label: 'Completed Only', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ChevronUp className="w-3 h-3 opacity-20" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-[#0b6d41]" />
    : <ChevronDown className="w-3 h-3 text-[#0b6d41]" />;
}

export default function IdpTrackerTab({ data, loading }: IdpTrackerTabProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('overdue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filtered = data.filter((row) => {
    if (statusFilter === 'overdue') return row.overdueIdps > 0;
    if (statusFilter === 'active') return row.activeIdps > 0;
    if (statusFilter === 'completed') return row.completedIdps > 0 && row.activeIdps === 0 && row.overdueIdps === 0;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let va: number | string = 0;
    let vb: number | string = 0;
    if (sortField === 'name') { va = a.mentorName; vb = b.mentorName; }
    else if (sortField === 'active') { va = a.activeIdps; vb = b.activeIdps; }
    else if (sortField === 'completed') { va = a.completedIdps; vb = b.completedIdps; }
    else if (sortField === 'overdue') { va = a.overdueIdps; vb = b.overdueIdps; }
    else if (sortField === 'total') { va = a.totalIdps; vb = b.totalIdps; }
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
    return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
  });

  // Summary cards
  const totalActive = data.reduce((s, r) => s + r.activeIdps, 0);
  const totalOverdue = data.reduce((s, r) => s + r.overdueIdps, 0);
  const totalCompleted = data.reduce((s, r) => s + r.completedIdps, 0);

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
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-3 border border-blue-100">
          <Clock className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <p className="text-xl font-bold text-blue-700">{totalActive}</p>
            <p className="text-xs text-blue-600">Active IDPs</p>
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-3 flex items-center gap-3 border border-red-100">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <p className="text-xl font-bold text-red-700">{totalOverdue}</p>
            <p className="text-xs text-red-600">Overdue IDPs</p>
          </div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3 flex items-center gap-3 border border-emerald-100">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-xl font-bold text-emerald-700">{totalCompleted}</p>
            <p className="text-xs text-emerald-600">Completed IDPs</p>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              statusFilter === f.value
                ? f.color + ' ring-2 ring-offset-1 ring-current/30'
                : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
            }`}
          >
            {f.label}
          </button>
        ))}
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
                  <button onClick={() => handleSort('active')} className="flex items-center gap-1 hover:text-neutral-900 mx-auto">
                    Active <SortIcon field="active" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">
                  <button onClick={() => handleSort('overdue')} className="flex items-center gap-1 hover:text-neutral-900 mx-auto">
                    Overdue <SortIcon field="overdue" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">
                  <button onClick={() => handleSort('completed')} className="flex items-center gap-1 hover:text-neutral-900 mx-auto">
                    Completed <SortIcon field="completed" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">
                  <button onClick={() => handleSort('total')} className="flex items-center gap-1 hover:text-neutral-900 mx-auto">
                    Total <SortIcon field="total" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Last IDP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-neutral-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No IDPs found
                  </td>
                </tr>
              ) : (
                sorted.map((row) => (
                  <tr key={row.mentorId} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-neutral-900">{row.mentorName}</td>
                    <td className="px-4 py-3 text-center">
                      {row.activeIdps > 0 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                          {row.activeIdps}
                        </span>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.overdueIdps > 0 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                          {row.overdueIdps}
                        </span>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.completedIdps > 0 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                          {row.completedIdps}
                        </span>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-neutral-700">
                      {row.totalIdps || <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-neutral-500 text-xs">
                      {row.lastIdpDate
                        ? new Date(row.lastIdpDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
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
