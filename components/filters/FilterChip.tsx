'use client';

import React from 'react';
import { X } from 'lucide-react';

interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
  variant?: 'default' | 'primary';
}

/**
 * Compact filter chip component for displaying active filters
 * Shows filter label with value and remove button
 */
export default function FilterChip({
  label,
  value,
  onRemove,
  variant = 'primary',
}: FilterChipProps) {
  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
        transition-all duration-200 group
        ${variant === 'primary'
          ? 'bg-brand-green text-white border border-brand-green'
          : 'bg-neutral-100 text-neutral-700 border border-neutral-300'
        }
      `}
    >
      <span className="whitespace-nowrap">
        {label}: <span className="font-medium">{value}</span>
      </span>
      <button
        onClick={onRemove}
        className={`
          flex-shrink-0 rounded-sm transition-transform hover:scale-110
          ${variant === 'primary' ? 'hover:bg-white' : 'hover:bg-neutral-200'}
        `}
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
