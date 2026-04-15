'use client';

import { useEffect, useState } from 'react';
import { Filter, X, Calendar as CalendarIcon, Building2 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';

export type AnalyticsTimePeriod = 'week' | 'month' | 'semester' | 'custom';

export interface FilterState {
  timePeriod: AnalyticsTimePeriod;
  startDate?: string; // ISO
  endDate?: string; // ISO
  departmentId?: string;
  institutionId?: string;
}

interface AnalyticsFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  isAdmin: boolean;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface InstitutionOption {
  id: string;
  name: string;
}

const TIME_PERIOD_OPTIONS: { value: AnalyticsTimePeriod; label: string }[] = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'semester', label: 'This Semester' },
  { value: 'custom', label: 'Custom Range' },
];

/**
 * Compute dateFrom/dateTo from a time period preset.
 * Semester = 6 months back → now (simple heuristic).
 */
export function getAnalyticsDateRange(
  period: AnalyticsTimePeriod,
): { startDate: Date; endDate: Date } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'week': {
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek;
      const weekStart = new Date(today);
      weekStart.setDate(diff);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      return { startDate: weekStart, endDate: weekEnd };
    }
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { startDate: monthStart, endDate: monthEnd };
    }
    case 'semester': {
      // Approximate: 6 months back to now.
      const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      return { startDate: start, endDate: now };
    }
    case 'custom':
    default:
      return null;
  }
}

export default function AnalyticsFilters({
  filters,
  onChange,
  isAdmin,
}: AnalyticsFiltersProps) {
  const { accessToken } = useAuth();
  const [draft, setDraft] = useState<FilterState>(filters);
  const [showCustom, setShowCustom] = useState(filters.timePeriod === 'custom');
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [instLoading, setInstLoading] = useState(false);

  // Keep local draft in sync if parent filters change externally.
  useEffect(() => {
    setDraft(filters);
    setShowCustom(filters.timePeriod === 'custom');
  }, [filters]);

  // Load departments for admin users (optional filter).
  useEffect(() => {
    if (!isAdmin || !accessToken) return;

    let cancelled = false;
    (async () => {
      try {
        setDeptLoading(true);
        const res = await fetchWithAuthRetry('/api/jkkn/departments?limit=500', {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const list: DepartmentOption[] = (json?.data || []).map((d: any) => ({
          id: d.id,
          name: d.name || d.id,
        }));
        setDepartments(list);
      } catch (err) {
        console.error('[AnalyticsFilters] failed to load departments', err);
      } finally {
        if (!cancelled) setDeptLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, accessToken]);

  // Load institutions for admin users (optional filter).
  useEffect(() => {
    if (!isAdmin || !accessToken) return;

    let cancelled = false;
    (async () => {
      try {
        setInstLoading(true);
        const res = await fetchWithAuthRetry('/api/jkkn/institutions?limit=500', {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const list: InstitutionOption[] = (json?.data || []).map((i: any) => ({
          id: i.id,
          name: i.name || i.id,
        }));
        setInstitutions(list);
      } catch (err) {
        console.error('[AnalyticsFilters] failed to load institutions', err);
      } finally {
        if (!cancelled) setInstLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, accessToken]);

  const handleTimePeriod = (period: AnalyticsTimePeriod) => {
    const next: FilterState = { ...draft, timePeriod: period };
    if (period === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      const range = getAnalyticsDateRange(period);
      if (range) {
        next.startDate = range.startDate.toISOString();
        next.endDate = range.endDate.toISOString();
      }
    }
    setDraft(next);
    onChange(next);
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const next: FilterState = {
      ...draft,
      [field]: value ? new Date(value).toISOString() : undefined,
    };
    setDraft(next);
  };

  const handleDept = (id: string) => {
    const next: FilterState = { ...draft, departmentId: id || undefined };
    setDraft(next);
    onChange(next);
  };

  const handleInst = (id: string) => {
    // Changing institution clears department (department is institution-scoped)
    const next: FilterState = {
      ...draft,
      institutionId: id || undefined,
      departmentId: undefined,
    };
    setDraft(next);
    onChange(next);
  };

  const handleApply = () => {
    onChange(draft);
  };

  const handleReset = () => {
    const reset: FilterState = { timePeriod: 'month' };
    const range = getAnalyticsDateRange('month');
    if (range) {
      reset.startDate = range.startDate.toISOString();
      reset.endDate = range.endDate.toISOString();
    }
    setDraft(reset);
    setShowCustom(false);
    onChange(reset);
  };

  const activeCount =
    (draft.institutionId ? 1 : 0) +
    (draft.departmentId ? 1 : 0) +
    (draft.timePeriod === 'custom' && (draft.startDate || draft.endDate) ? 1 : 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          {activeCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-[#0b6d41] text-white rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        <button
          onClick={handleReset}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          Reset
        </button>
      </div>

      {/* Time Period buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TIME_PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleTimePeriod(opt.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              draft.timePeriod === opt.value
                ? 'bg-[#0b6d41] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Custom Date Range */}
      {showCustom && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CalendarIcon className="w-4 h-4 inline mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={draft.startDate ? draft.startDate.split('T')[0] : ''}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b6d41] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CalendarIcon className="w-4 h-4 inline mr-1" />
              End Date
            </label>
            <input
              type="date"
              value={draft.endDate ? draft.endDate.split('T')[0] : ''}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b6d41] focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-[#0b6d41] text-white rounded-lg text-sm font-medium hover:bg-[#0a5a36] transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Admin-only: institution + department dropdowns */}
      {isAdmin && (
        <div className="pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building2 className="w-4 h-4 inline mr-1" />
              Institution
            </label>
            <select
              value={draft.institutionId || ''}
              onChange={(e) => handleInst(e.target.value)}
              disabled={instLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b6d41] focus:border-transparent disabled:opacity-60"
            >
              <option value="">All Institutions</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            {instLoading && (
              <p className="text-xs text-neutral-500 mt-1">Loading institutions...</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building2 className="w-4 h-4 inline mr-1" />
              Department
            </label>
            <select
              value={draft.departmentId || ''}
              onChange={(e) => handleDept(e.target.value)}
              disabled={deptLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b6d41] focus:border-transparent disabled:opacity-60"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {deptLoading && (
              <p className="text-xs text-neutral-500 mt-1">Loading departments...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
