'use client';

import Card from '@/components/ui/Card';
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

  return (
    <Card variant="elevated" className="h-full">
      <div className="mb-6">
        <h3 className="text-[17px] font-medium text-neutral-900">Department Progress</h3>
        <p className="text-[13px] text-neutral-600 mt-1 leading-relaxed">Session completion rates</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2" />
              <div className="h-8 bg-neutral-200 rounded" />
            </div>
          ))}
        </div>
      ) : departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-brand-green/10 rounded-full blur-xl" />
            <div className="relative bg-gradient-to-br from-brand-green/10 to-brand-yellow/10 rounded-full p-4">
              <svg className="w-12 h-12 text-brand-green/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <h4 className="text-[16px] font-medium text-neutral-900 mb-2">No department data available</h4>
          <p className="text-[14px] text-neutral-500 text-center max-w-sm leading-relaxed">
            Department progress tracking will appear here once counseling sessions are scheduled and completed
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {departments.map((dept, index) => {
            const percentage = calculatePercentage(dept.completed, dept.total);
            return (
              <div key={index} className="group relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full shadow-sm ring-2 ring-white transition-transform group-hover:scale-125"
                      style={{ backgroundColor: dept.color }}
                    />
                    <span className="text-[14px] font-semibold text-neutral-800 group-hover:text-brand-green transition-colors">
                      {dept.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[20px] font-bold text-neutral-900 tracking-tight">
                      {percentage}%
                    </span>
                    {percentage === 100 && (
                      <CheckCircleIcon className="w-6 h-6 text-green-500 animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Enhanced Progress Bar with Gradient */}
                <div className="relative h-4 bg-neutral-100 rounded-full overflow-hidden shadow-inner">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                  {/* Progress Fill */}
                  <div
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                    style={{
                      width: `${percentage}%`,
                      background: `linear-gradient(90deg, ${dept.color} 0%, ${dept.color}dd 100%)`,
                    }}
                  >
                    {/* Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </div>

                  {/* Glowing Indicator at Progress End */}
                  {percentage > 0 && (
                    <div
                      className="absolute top-0 h-full w-1 transition-all duration-1000 ease-out"
                      style={{
                        left: `${percentage}%`,
                        backgroundColor: dept.color,
                        boxShadow: `0 0 10px ${dept.color}`,
                      }}
                    />
                  )}
                </div>

                {/* Details */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[12px] text-neutral-600 font-medium">
                    {dept.completed} of {dept.total} sessions
                  </span>
                  {dept.completed < dept.total && (
                    <span className="text-[11px] text-neutral-500 px-2 py-0.5 rounded-full bg-neutral-100">
                      {dept.total - dept.completed} remaining
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Enhanced Summary */}
      {!loading && departments.length > 0 && (
        <div className="mt-8 pt-6 border-t-2 border-neutral-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-green/20 to-brand-green/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-[14px] font-semibold text-neutral-700">Overall Progress</span>
            </div>
            <div className="text-right">
              <p className="text-[28px] font-bold text-brand-green tracking-tight">
                {Math.round(
                  departments.reduce((acc, dept) => acc + calculatePercentage(dept.completed, dept.total), 0) /
                    departments.length
                )}%
              </p>
              <p className="text-[11px] text-neutral-500 font-medium">across all departments</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
