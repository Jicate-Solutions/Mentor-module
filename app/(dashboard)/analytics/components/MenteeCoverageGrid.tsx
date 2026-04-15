'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import type { PairingRow } from '@/lib/types/session-analytics';
import { format } from 'date-fns';

interface MenteeCoverageGridProps {
  rows: PairingRow[];
  loading: boolean;
}

interface MentorGroup {
  mentorId: string;
  mentorName: string | null;
  mentees: PairingRow[];
  metCount: number;
  total: number;
  coverage: number; // 0..100
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

export default function MenteeCoverageGrid({ rows, loading }: MenteeCoverageGridProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const groups = useMemo<MentorGroup[]>(() => {
    const map = new Map<string, MentorGroup>();
    for (const row of rows) {
      const g = map.get(row.mentorId);
      if (g) {
        g.mentees.push(row);
        if (row.hasCompletedSession) g.metCount += 1;
        g.total += 1;
      } else {
        map.set(row.mentorId, {
          mentorId: row.mentorId,
          mentorName: row.mentorName,
          mentees: [row],
          metCount: row.hasCompletedSession ? 1 : 0,
          total: 1,
          coverage: 0,
        });
      }
    }
    const list = Array.from(map.values()).map((g) => ({
      ...g,
      coverage: g.total > 0 ? Math.round((g.metCount / g.total) * 100) : 0,
    }));
    // Worst coverage first (these need attention).
    list.sort((a, b) => a.coverage - b.coverage);
    return list;
  }, [rows]);

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <Card variant="elevated" padding="md">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-neutral-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </Card>
    );
  }

  if (groups.length === 0) {
    return (
      <Card variant="elevated" padding="md">
        <EmptyState
          illustration="user"
          title="No mentor–mentee assignments found"
          description="Once mentees are assigned to mentors, coverage will appear here."
        />
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="md">
      <div className="mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-brand-green" />
        <h3 className="text-base font-medium text-neutral-900">
          Mentee Coverage by Mentor
        </h3>
        <span className="ml-auto text-xs text-neutral-500">
          Sorted by lowest coverage
        </span>
      </div>

      <div className="space-y-3">
        {groups.map((g) => {
          const isOpen = !!expanded[g.mentorId];
          const coverageColor =
            g.coverage >= 75
              ? 'text-brand-green'
              : g.coverage >= 40
                ? 'text-yellow-600'
                : 'text-red-600';

          return (
            <div
              key={g.mentorId}
              className="border border-neutral-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggle(g.mentorId)}
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900 truncate">
                      {g.mentorName || 'Unknown Mentor'}
                    </p>
                    <p className="text-sm text-neutral-600">
                      <span className={coverageColor + ' font-medium tabular-nums'}>
                        {g.metCount} of {g.total}
                      </span>{' '}
                      mentees met
                      <span className="text-neutral-400"> · {g.coverage}%</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* coverage bar */}
                  <div className="hidden sm:block w-28 h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        g.coverage >= 75
                          ? 'bg-brand-green'
                          : g.coverage >= 40
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${g.coverage}%` }}
                    />
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-neutral-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-neutral-400" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-neutral-200 bg-neutral-50/60 divide-y divide-neutral-100">
                  {g.mentees.map((m) => (
                    <div
                      key={`${g.mentorId}-${m.menteeId}`}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          m.hasCompletedSession ? 'bg-brand-green' : 'bg-red-500'
                        }`}
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">
                          {m.menteeName || 'Unknown Mentee'}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {m.menteeRollNo || 'No roll no.'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-neutral-500">Last session</p>
                        <p className="text-sm text-neutral-700 tabular-nums">
                          {formatDate(m.lastSessionDate)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
