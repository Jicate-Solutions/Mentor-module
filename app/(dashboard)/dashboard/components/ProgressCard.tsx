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
        <h3 className="text-lg font-bold text-neutral-900">Department Progress</h3>
        <p className="text-sm text-neutral-600 mt-1">Session completion rates</p>
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
        <div className="text-center py-8 text-neutral-500">
          <p>No department data available</p>
        </div>
      ) : (
        <div className="space-y-5">
          {departments.map((dept, index) => {
            const percentage = calculatePercentage(dept.completed, dept.total);
            return (
              <div key={index} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: dept.color }}
                    />
                    <span className="text-sm font-medium text-neutral-700">
                      {dept.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-neutral-900">
                      {percentage}%
                    </span>
                    {percentage === 100 && (
                      <CheckCircleIcon className="w-5 h-5 text-success" />
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-3 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out group-hover:opacity-90"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: dept.color,
                    }}
                  />
                </div>

                {/* Details */}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-neutral-500">
                    {dept.completed} of {dept.total} sessions completed
                  </span>
                  {dept.completed < dept.total && (
                    <span className="text-xs text-neutral-400">
                      {dept.total - dept.completed} remaining
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {!loading && departments.length > 0 && (
        <div className="mt-6 pt-6 border-t border-neutral-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">Overall Progress</span>
            <span className="font-bold text-primary-600">
              {Math.round(
                departments.reduce((acc, dept) => acc + calculatePercentage(dept.completed, dept.total), 0) /
                  departments.length
              )}%
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};
