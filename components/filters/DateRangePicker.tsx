'use client';

import React from 'react';

interface DateRangePickerProps {
  startDate: string | null;
  endDate: string | null;
  onChange: (start: string | null, end: string | null) => void;
  label?: string;
  disabled?: boolean;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  label = 'Date Range',
  disabled = false,
}: DateRangePickerProps) {
  return (
    <div className="w-full min-w-[300px]">
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <input
            type="date"
            value={startDate || ''}
            onChange={(e) => onChange(e.target.value || null, endDate)}
            disabled={disabled}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Start date"
          />
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
            {!startDate && 'From'}
          </span>
        </div>
        <div className="relative">
          <input
            type="date"
            value={endDate || ''}
            onChange={(e) => onChange(startDate, e.target.value || null)}
            disabled={disabled}
            min={startDate || undefined}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="End date"
          />
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
            {!endDate && 'To'}
          </span>
        </div>
      </div>
    </div>
  );
}
