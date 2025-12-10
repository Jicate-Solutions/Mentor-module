'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, Filter } from 'lucide-react';
import type { FilterState, FilterOptions, LoadingState } from '@/hooks/useAddLearnerFilters';

interface AddLearnerFiltersProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onClearAll: () => void;
  filterOptions: FilterOptions;
  loading: LoadingState;
  activeFiltersCount: number;
}

interface FilterDropdownProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  loading = false,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const displayText = loading ? 'Loading...' : selectedOption?.label || placeholder;

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-medium text-neutral-500 mb-1">{label}</label>
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between gap-1 px-3 py-2 text-sm cursor-pointer
          border rounded-lg transition-all select-none
          ${disabled || loading
            ? 'bg-neutral-100 border-neutral-200 text-neutral-400 cursor-not-allowed'
            : value
              ? 'bg-brand-green/5 border-brand-green text-brand-green'
              : 'bg-white border-neutral-300 text-neutral-700 hover:border-brand-green'
          }
        `}
      >
        <span
          className={`flex-1 text-left ${!selectedOption ? 'text-neutral-400' : ''}`}
          title={displayText}
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0
          }}
        >
          {displayText}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value && !disabled && (
            <span
              role="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-red-100 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5 text-neutral-400 hover:text-red-500" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && !loading && (
        <div
          className="absolute top-full left-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-48 overflow-auto"
          style={{
            zIndex: 9999,
            minWidth: '100%',
            width: 'max-content',
            maxWidth: '300px'
          }}
        >
          {/* Clear/Default option */}
          <div
            role="option"
            onClick={() => handleSelect('')}
            className="px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100"
          >
            {placeholder}
          </div>

          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-neutral-400">No options available</div>
          ) : (
            options.map((option) => (
              <div
                key={option.value}
                role="option"
                aria-selected={value === option.value}
                onClick={() => handleSelect(option.value)}
                className={`
                  px-3 py-2 text-sm cursor-pointer transition-colors
                  ${value === option.value
                    ? 'bg-brand-green/10 text-brand-green font-medium'
                    : 'text-neutral-700 hover:bg-neutral-50'
                  }
                `}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function AddLearnerFilters({
  filters,
  onFilterChange,
  onClearAll,
  filterOptions,
  loading,
  activeFiltersCount,
}: AddLearnerFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleHeaderClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClearAll();
  };

  return (
    <div className="border border-neutral-200 rounded-lg">
      {/* Header - Always visible (using div instead of button to avoid nested button issue) */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleHeaderClick}
        onKeyDown={(e) => e.key === 'Enter' && handleHeaderClick()}
        className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer rounded-t-lg select-none"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-neutral-600" />
          <span className="text-sm font-medium text-neutral-700">Advanced Filters</span>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-brand-green text-white rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {activeFiltersCount > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClearAll}
              onKeyDown={(e) => e.key === 'Enter' && handleClearAll(e as any)}
              className="text-xs text-neutral-500 hover:text-red-500 transition-colors cursor-pointer"
            >
              Clear all
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-neutral-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-500" />
          )}
        </div>
      </div>

      {/* Filter Grid - Collapsible */}
      {isExpanded && (
        <div className="p-4 bg-white border-t border-neutral-200 rounded-b-lg">
          {/* Row 1: Institution, Degree, Department, Program */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
            <FilterDropdown
              label="Institution"
              value={filters.institution_id}
              options={filterOptions.institutions}
              onChange={(value) => onFilterChange('institution_id', value)}
              placeholder="Select Institution"
              loading={loading.institutions}
            />

            <FilterDropdown
              label="Degree"
              value={filters.degree_id}
              options={filterOptions.degrees}
              onChange={(value) => onFilterChange('degree_id', value)}
              placeholder="Select Degree"
              loading={loading.degrees}
            />

            <FilterDropdown
              label="Department"
              value={filters.department_id}
              options={filterOptions.departments}
              onChange={(value) => onFilterChange('department_id', value)}
              placeholder="Select Department"
              loading={loading.departments}
            />

            <FilterDropdown
              label="Program"
              value={filters.program_id}
              options={filterOptions.programs}
              onChange={(value) => onFilterChange('program_id', value)}
              placeholder="Select Program"
              loading={loading.programs}
            />
          </div>

          {/* Row 2: Semester, Section, Academic Year, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <FilterDropdown
              label="Semester"
              value={filters.semester}
              options={filterOptions.semesters}
              onChange={(value) => onFilterChange('semester', value)}
              placeholder="Select Semester"
            />

            <FilterDropdown
              label="Section"
              value={filters.section}
              options={filterOptions.sections}
              onChange={(value) => onFilterChange('section', value)}
              placeholder="Select Section"
            />

            <FilterDropdown
              label="Academic Year"
              value={filters.academic_year}
              options={filterOptions.academicYears}
              onChange={(value) => onFilterChange('academic_year', value)}
              placeholder="Select Year"
            />

            <FilterDropdown
              label="Status"
              value={filters.status}
              options={filterOptions.statuses}
              onChange={(value) => onFilterChange('status', value)}
              placeholder="All Status"
            />
          </div>
        </div>
      )}
    </div>
  );
}
