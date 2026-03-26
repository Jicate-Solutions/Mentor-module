'use client';

import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface DepartmentProgress {
  name: string;
  completed: number;
  total: number;
  color: string;
}

interface ProgressCardProps {
  departments: DepartmentProgress[];
  loading?: boolean;
}

export const ProgressCard = ({ departments, loading }: ProgressCardProps) => {
  const calculatePercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const overallCompleted = departments.reduce((sum, d) => sum + d.completed, 0);
  const overallTotal = departments.reduce((sum, d) => sum + d.total, 0);
  const overallPct = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-neutral-100 h-full flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-neutral-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-neutral-900">Department Progress</h3>
            <p className="text-[12px] text-neutral-500 mt-0.5">Session completion rates</p>
          </div>
          {!loading && departments.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-green/5">
              <span className="text-[11px] text-neutral-500 font-medium">Overall</span>
              <span className="text-[15px] font-bold text-brand-green">{overallPct}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-4 overflow-y-auto max-h-[480px] scrollbar-thin">
        {loading ? (
          <div className="space-y-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="flex justify-between">
                  <div className="h-3.5 bg-neutral-100 rounded w-2/5" />
                  <div className="h-3.5 bg-neutral-100 rounded w-10" />
                </div>
                <div className="h-2 bg-neutral-100 rounded-full" />
                <div className="h-3 bg-neutral-50 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : departments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h4 className="text-[14px] font-medium text-neutral-700 mb-1">No department data</h4>
            <p className="text-[12px] text-neutral-500 text-center max-w-xs">
              Progress tracking appears once sessions are scheduled
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {departments.map((dept, index) => {
              const percentage = calculatePercentage(dept.completed, dept.total);
              const isComplete = percentage === 100;
              const remaining = dept.total - dept.completed;

              return (
                <div
                  key={index}
                  className="group p-3 rounded-xl hover:bg-neutral-50/80 transition-colors duration-200"
                >
                  {/* Name + Percentage */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-medium text-neutral-800 truncate pr-3 max-w-[70%]">
                      {dept.name}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-[14px] font-bold tabular-nums ${isComplete ? 'text-brand-green' : 'text-neutral-700'}`}>
                        {percentage}%
                      </span>
                      {isComplete && (
                        <CheckCircleIcon className="w-4 h-4 text-brand-green" />
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: dept.color,
                      }}
                    />
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[11px] text-neutral-500">
                      {dept.completed}/{dept.total} sessions
                    </span>
                    {remaining > 0 && (
                      <span className="text-[11px] text-neutral-400">
                        {remaining} left
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
