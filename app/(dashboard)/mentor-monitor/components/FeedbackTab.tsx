'use client';

import { useState } from 'react';
import { MessageSquare, AlertCircle, Star, FileBarChart2, ChevronUp, ChevronDown } from 'lucide-react';
import type { FeedbackSummaryRow } from '@/app/api/mentor-monitor/feedback-summary/route';

type SortField = 'name' | 'withFeedback' | 'pending' | 'reports' | 'helpfulness' | 'approachability';
type SortDir = 'asc' | 'desc';

interface FeedbackTabProps {
  data: FeedbackSummaryRow[];
  loading: boolean;
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ChevronUp className="w-3 h-3 opacity-20" />;
  return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-[#0b6d41]" /> : <ChevronDown className="w-3 h-3 text-[#0b6d41]" />;
}

function RatingBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-neutral-300">—</span>;
  const color =
    value >= 4 ? 'text-emerald-600 bg-emerald-50' :
    value >= 3 ? 'text-amber-600 bg-amber-50' :
    'text-red-600 bg-red-50';
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
      <Star className="w-3 h-3" />
      {value.toFixed(1)}
    </span>
  );
}

export default function FeedbackTab({ data, loading }: FeedbackTabProps) {
  const [sortField, setSortField] = useState<SortField>('pending');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const sorted = [...data].sort((a, b) => {
    let va: number | string = 0;
    let vb: number | string = 0;
    if (sortField === 'name') { va = a.mentorName; vb = b.mentorName; }
    else if (sortField === 'withFeedback') { va = a.sessionsWithFeedback; vb = b.sessionsWithFeedback; }
    else if (sortField === 'pending') { va = a.pendingFeedback; vb = b.pendingFeedback; }
    else if (sortField === 'reports') { va = a.reportsGenerated; vb = b.reportsGenerated; }
    else if (sortField === 'helpfulness') { va = a.avgHelpfulnessRating ?? -1; vb = b.avgHelpfulnessRating ?? -1; }
    else if (sortField === 'approachability') { va = a.avgApproachabilityRating ?? -1; vb = b.avgApproachabilityRating ?? -1; }
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
    return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
  });

  const totalPending = data.reduce((s, r) => s + r.pendingFeedback, 0);
  const totalWithFeedback = data.reduce((s, r) => s + r.sessionsWithFeedback, 0);
  const totalReports = data.reduce((s, r) => s + r.reportsGenerated, 0);

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
        <div className="bg-emerald-50 rounded-lg p-3 flex items-center gap-3 border border-emerald-100">
          <MessageSquare className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-xl font-bold text-emerald-700">{totalWithFeedback}</p>
            <p className="text-xs text-emerald-600">Sessions with Feedback</p>
          </div>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 flex items-center gap-3 border border-amber-100">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-xl font-bold text-amber-700">{totalPending}</p>
            <p className="text-xs text-amber-600">Pending Feedback</p>
          </div>
        </div>
        <div className="bg-indigo-50 rounded-lg p-3 flex items-center gap-3 border border-indigo-100">
          <FileBarChart2 className="w-5 h-5 text-indigo-600 shrink-0" />
          <div>
            <p className="text-xl font-bold text-indigo-700">{totalReports}</p>
            <p className="text-xs text-indigo-600">Reports Generated</p>
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
                  <button onClick={() => handleSort('withFeedback')} className="flex items-center gap-1 hover:text-neutral-900 mx-auto">
                    With Feedback <SortIcon field="withFeedback" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">
                  <button onClick={() => handleSort('pending')} className="flex items-center gap-1 hover:text-neutral-900 mx-auto">
                    Pending <SortIcon field="pending" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">
                  <button onClick={() => handleSort('reports')} className="flex items-center gap-1 hover:text-neutral-900 mx-auto">
                    Reports <SortIcon field="reports" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">
                  <button onClick={() => handleSort('helpfulness')} className="flex items-center gap-1 hover:text-neutral-900 mx-auto">
                    Helpfulness <SortIcon field="helpfulness" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="text-center px-4 py-3 font-medium text-neutral-600">
                  <button onClick={() => handleSort('approachability')} className="flex items-center gap-1 hover:text-neutral-900 mx-auto">
                    Approachability <SortIcon field="approachability" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-neutral-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No feedback data found
                  </td>
                </tr>
              ) : (
                sorted.map((row) => (
                  <tr key={row.mentorId} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-neutral-900">{row.mentorName}</td>
                    <td className="px-4 py-3 text-center font-medium text-emerald-700">
                      {row.sessionsWithFeedback || <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.pendingFeedback > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                          <AlertCircle className="w-3 h-3" />
                          {row.pendingFeedback}
                        </span>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-indigo-700">
                      {row.reportsGenerated || <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <RatingBadge value={row.avgHelpfulnessRating} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <RatingBadge value={row.avgApproachabilityRating} />
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
