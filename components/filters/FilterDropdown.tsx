'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';
import type { FilterOption } from '@/lib/types/filters';

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiSelect?: boolean;
  placeholder?: string;
  loading?: boolean;
  width?: string;
  disabled?: boolean;
}

export default function FilterDropdown({
  label,
  options,
  value,
  onChange,
  multiSelect = false,
  placeholder = 'Select...',
  loading = false,
  width = 'w-48',
  disabled = false,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    if (multiSelect) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter(v => v !== optionValue)
        : [...currentValues, optionValue];
      onChange(newValues);
    } else {
      onChange(optionValue);
      setIsOpen(false);
    }
  };

  const getDisplayText = () => {
    if (loading) return 'Loading...';

    if (multiSelect && Array.isArray(value) && value.length > 0) {
      const selectedOptions = options.filter(opt => value.includes(opt.value));
      if (selectedOptions.length === 1) {
        return selectedOptions[0].label;
      }
      return `${selectedOptions.length} selected`;
    }

    if (!multiSelect && value) {
      const selectedOption = options.find(opt => opt.value === value);
      return selectedOption?.label || placeholder;
    }

    return placeholder;
  };

  const hasValue = multiSelect
    ? Array.isArray(value) && value.length > 0
    : Boolean(value);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(multiSelect ? [] : '');
  };

  return (
    <div ref={dropdownRef} className={`relative ${width}`}>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>

      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className={`
          w-full px-3 py-2 text-sm text-left bg-white border border-gray-300 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          flex items-center justify-between
          ${hasValue ? 'text-gray-900' : 'text-gray-500'}
        `}
      >
        <span className="truncate">{getDisplayText()}</span>
        <div className="flex items-center gap-1 ml-2">
          {hasValue && !disabled && (
            <X
              className="h-4 w-4 text-gray-400 hover:text-gray-600"
              onClick={handleClear}
            />
          )}
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              No options available
            </div>
          ) : (
            options.map((option) => {
              const isSelected = multiSelect
                ? Array.isArray(value) && value.includes(option.value)
                : value === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => !option.disabled && handleSelect(option.value)}
                  disabled={option.disabled}
                  className={`
                    w-full px-3 py-2 text-sm text-left flex items-center justify-between
                    hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed
                    ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}
                  `}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && multiSelect && (
                    <Check className="h-4 w-4 text-blue-600 ml-2 flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
