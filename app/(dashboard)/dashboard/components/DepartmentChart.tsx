'use client';

import Card from '@/components/ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface DepartmentData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface DepartmentChartProps {
  data: DepartmentData[];
  loading?: boolean;
}

const COLORS = ['#0b6d41', '#ffde59', '#84efc2', '#48dfa0', '#1ec481', '#f5c700', '#0a5a36'];

export const DepartmentChart = ({ data, loading }: DepartmentChartProps) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const percentage = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-neutral-200">
          <p className="font-semibold text-neutral-900">{payload[0].name}</p>
          <p className="text-sm text-neutral-600">
            {payload[0].value} sessions ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card variant="elevated" className="h-full">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-neutral-900">Department Distribution</h3>
        <p className="text-sm text-neutral-600 mt-1">Sessions by department</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-48 h-48 bg-neutral-200 rounded-full animate-pulse" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          <p>No department data available</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data as any}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {data.map((item, index) => {
              const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
              return (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded flex-shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-neutral-600">
                      {item.value} ({percentage}%)
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
};
