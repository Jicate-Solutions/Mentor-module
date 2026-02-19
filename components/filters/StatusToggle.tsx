'use client';

import React from 'react';
import type { StatusToggleLabels } from '@/lib/types/filters';

interface StatusToggleProps {
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  label?: string;
  labels?: StatusToggleLabels;
  disabled?: boolean;
}

export default function StatusToggle({
  value,
  onChange,
  label = 'Status',
  labels = {
    all: 'All',
    active: 'Active',
    inactive: 'Inactive',
  },
  disabled = false,
}: StatusToggleProps) {
  const options = [
    { value: null, label: labels.all },
    { value: true, label: labels.active },
    { value: false, label: labels.inactive },
  ];

  return (
    <div className="w-48">
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="flex border border-gray-200 rounded-lg overflow-hidden">
        {options.map((option, index) => {
          const isSelected = value === option.value;

          return (
            <button
              key={index}
              type="button"
              onClick={() => !disabled && onChange(option.value)}
              disabled={disabled}
              className={`
                flex-1 px-3 py-2 text-xs font-medium transition-colors
                ${index !== options.length - 1 ? 'border-r border-gray-200' : ''}
                ${isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
