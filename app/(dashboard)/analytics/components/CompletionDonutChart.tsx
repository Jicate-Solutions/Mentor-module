'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import type { SessionCompletionSummary } from '@/lib/types/session-analytics';

interface CompletionDonutChartProps {
  summary: SessionCompletionSummary | null;
  loading: boolean;
}

const COMPLETED_COLOR = '#0b6d41';
const SCHEDULED_COLOR = '#ffde59';
const CANCELLED_COLOR = '#ef4444';

export default function CompletionDonutChart({
  summary,
  loading,
}: CompletionDonutChartProps) {
  const completed = summary?.totalCompletedSessions ?? 0;
  const scheduled = summary?.totalScheduledSessions ?? 0;
  const cancelled = summary?.totalCancelledSessions ?? 0;
  const total = completed + scheduled + cancelled;

  const data = [
    { name: 'Completed', value: completed, color: COMPLETED_COLOR },
    { name: 'Scheduled', value: scheduled, color: SCHEDULED_COLOR },
    { name: 'Cancelled', value: cancelled, color: CANCELLED_COLOR },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const pct = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : '0';
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-neutral-200">
          <p className="font-medium text-neutral-900">{payload[0].name}</p>
          <p className="text-sm text-neutral-600">
            {payload[0].value} ({pct}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card variant="elevated" className="h-full">
      <CardHeader>
        <CardTitle>Session Status Breakdown</CardTitle>
        <p className="text-[13px] text-neutral-600 mt-1 leading-relaxed">
          Completed vs scheduled vs cancelled sessions
        </p>
      </CardHeader>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-48 h-48 bg-neutral-200 rounded-full animate-pulse" />
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
            <svg
              className="w-8 h-8 text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19V6l12-3v13M9 19a3 3 0 11-6 0 3 3 0 016 0zm12-3a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <p className="text-sm text-neutral-600">No sessions in the selected period</p>
        </div>
      ) : (
        <>
          <div className="relative">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                >
                  {data.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center total */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[12px] uppercase tracking-wide text-neutral-500">
                Total
              </span>
              <span className="text-[26px] font-medium text-neutral-900 tabular-nums">
                {total.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {data.map((item) => {
              const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
              return (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3.5 h-3.5 rounded flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-neutral-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-neutral-600 tabular-nums">
                      {item.value} ({pct}%)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}
