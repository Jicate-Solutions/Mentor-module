'use client';

import { useState } from 'react';
import { Filter, X, Calendar as CalendarIcon } from 'lucide-react';
import type { ActivityType, TimePeriod } from '@/lib/types/activity';
import { TIME_PERIOD_OPTIONS, ACTIVITY_TYPE_METADATA, getDateRangeForPeriod } from '@/lib/types/activity';

interface ActivityFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  isAdmin?: boolean;
  mentors?: Array<{ id: string; name: string }>;
}

export interface FilterState {
  timePeriod: TimePeriod;
  activityTypes: ActivityType[];
  mentorId?: string;
  startDate?: string;
  endDate?: string;
}

export default function ActivityFilters({ onFilterChange, isAdmin, mentors }: ActivityFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    timePeriod: 'week',
    activityTypes: [],
    mentorId: undefined,
    startDate: undefined,
    endDate: undefined,
  });

  const [showCustomDate, setShowCustomDate] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleTimePeriodChange = (period: TimePeriod) => {
    const newFilters = { ...filters, timePeriod: period };

    if (period === 'custom') {
      setShowCustomDate(true);
    } else {
      setShowCustomDate(false);
      const dateRange = getDateRangeForPeriod(period);
      if (dateRange) {
        newFilters.startDate = dateRange.startDate.toISOString();
        newFilters.endDate = dateRange.endDate.toISOString();
      } else {
        newFilters.startDate = undefined;
        newFilters.endDate = undefined;
      }
    }

    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleActivityTypeToggle = (type: ActivityType) => {
    const newTypes = filters.activityTypes.includes(type)
      ? filters.activityTypes.filter(t => t !== type)
      : [...filters.activityTypes, type];

    const newFilters = { ...filters, activityTypes: newTypes };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleMentorChange = (mentorId: string) => {
    const newFilters = { ...filters, mentorId: mentorId || undefined };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const newFilters = { ...filters, [field]: value ? new Date(value).toISOString() : undefined };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
      timePeriod: 'week',
      activityTypes: [],
      mentorId: undefined,
      startDate: undefined,
      endDate: undefined,
    };
    setFilters(resetFilters);
    setShowCustomDate(false);
    onFilterChange(resetFilters);
  };

  const activeFiltersCount =
    filters.activityTypes.length +
    (filters.mentorId ? 1 : 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-[#0b6d41] text-white rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={handleReset}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Reset
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-[#0b6d41] hover:underline"
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
        </div>
      </div>

      {/* Time Period Quick Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TIME_PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleTimePeriodChange(option.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters.timePeriod === option.value
                ? 'bg-[#0b6d41] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Custom Date Range */}
      {showCustomDate && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CalendarIcon className="w-4 h-4 inline mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate ? filters.startDate.split('T')[0] : ''}
              onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
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
              value={filters.endDate ? filters.endDate.split('T')[0] : ''}
              onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b6d41] focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Expandable Filters */}
      {showFilters && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          {/* Mentor Selector (Admin Only) */}
          {isAdmin && mentors && mentors.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Mentor
              </label>
              <select
                value={filters.mentorId || ''}
                onChange={(e) => handleMentorChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b6d41] focus:border-transparent"
              >
                <option value="">All Mentors</option>
                {mentors.map((mentor) => (
                  <option key={mentor.id} value={mentor.id}>
                    {mentor.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Activity Type Multi-Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Activity Types
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {Object.entries(ACTIVITY_TYPE_METADATA).map(([type, metadata]) => (
                <button
                  key={type}
                  onClick={() => handleActivityTypeToggle(type as ActivityType)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    filters.activityTypes.includes(type as ActivityType)
                      ? 'ring-2 ring-[#0b6d41]'
                      : 'hover:bg-gray-100'
                  }`}
                  style={{
                    backgroundColor: filters.activityTypes.includes(type as ActivityType)
                      ? metadata.bgColor
                      : '#f9fafb',
                    color: filters.activityTypes.includes(type as ActivityType)
                      ? metadata.textColor
                      : '#374151',
                  }}
                >
                  {metadata.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
