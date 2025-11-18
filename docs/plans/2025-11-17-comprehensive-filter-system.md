# Comprehensive Filter System Implementation Plan

**Date**: 2025-11-17
**Feature**: Implement institution-wise, department-wise, course-wise, program-wise filters across all list pages
**Analysis**: Based on comprehensive codebase exploration

---

## EXECUTIVE SUMMARY

This plan provides a complete roadmap for implementing a unified filtering system across the entire Mentor Module application. Based on thorough analysis, **10 pages** require filtering capabilities, with **ZERO** pages currently having dropdown filters (only basic search exists).

### Key Findings:
- **Current State**: All list pages have only text search, NO dropdown filters
- **Pages Requiring Filters**: 10 pages identified
- **Data Hierarchy**: Institution → Department → Program → Course
- **Existing Utilities**: Access control filters exist but not used for UI
- **No Reusable Components**: Need to build from scratch

---

## ARCHITECTURE DESIGN

### 1. Filter System Components Architecture

```
┌─────────────────────────────────────────────────┐
│         Application Pages (10 pages)            │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│           FilterBar Component                    │
│  - Renders multiple filter controls             │
│  - Manages active filters count                 │
│  - Provides "Clear All" functionality           │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│        Individual Filter Components              │
│  - FilterDropdown (single/multi-select)         │
│  - StatusToggle (active/inactive/all)           │
│  - DateRangePicker (start/end dates)            │
│  - SearchInput (text search - existing)         │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│          Filter State Management                 │
│  - useFilters hook                              │
│  - URL parameter synchronization                │
│  - Local state management                       │
│  - Filter persistence                           │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│             API Layer                           │
│  - Server-side filtering (optimized)            │
│  - Client-side filtering (fallback)             │
│  - Pagination with filters                      │
└─────────────────────────────────────────────────┘
```

### 2. Data Flow

```
User Interaction
       ↓
Filter Component (e.g., Department Dropdown)
       ↓
useFilters Hook (updates state & URL)
       ↓
API Request with filter params (e.g., ?department_id=xxx)
       ↓
Backend filters data
       ↓
Filtered results returned
       ↓
UI updates with filtered data
```

### 3. Cascading Filter Logic

```
Institution Filter
    ↓ (filters departments)
Department Filter
    ↓ (filters programs)
Program Filter
    ↓ (filters courses & students)
```

---

## IMPLEMENTATION PHASES

### Phase 1: Foundation & Components (Days 1-3)

**Deliverables:**
- Reusable filter components
- Filter state management hook
- URL synchronization utility
- Filter configuration types

### Phase 2: High-Priority Pages (Days 4-8)

**Deliverables:**
- Students page filters
- Staff page filters
- Mentor directory filters
- Counseling sessions enhancements

### Phase 3: Administrative Pages (Days 9-12)

**Deliverables:**
- Departments page filters
- Programs page filters
- Courses page filters

### Phase 4: Reference Data Pages (Days 13-15)

**Deliverables:**
- Institutions page filters
- Degrees page filters
- Mentor Incharge page filters

### Phase 5: API Optimization (Days 16-18)

**Deliverables:**
- Backend filter parameters
- Server-side filtering logic
- Performance optimization

---

## DETAILED TASK BREAKDOWN

## PHASE 1: FOUNDATION & COMPONENTS

### Task 1.1: Create TypeScript Types & Interfaces

**File**: `lib/types/filters.ts`

```typescript
// Filter option type
export interface FilterOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// Filter configuration
export interface FilterConfig {
  key: string;
  label: string;
  type: 'dropdown' | 'multi-select' | 'status-toggle' | 'date-range' | 'search';
  options?: FilterOption[] | (() => Promise<FilterOption[]>);
  placeholder?: string;
  defaultValue?: any;
  dependsOn?: string; // For cascading filters
  width?: string; // Tailwind width class
}

// Filter state
export interface FilterState {
  [key: string]: string | string[] | boolean | null | { start: string; end: string };
}

// Filter hook return type
export interface UseFiltersReturn {
  filters: FilterState;
  setFilter: (key: string, value: any) => void;
  clearFilter: (key: string) => void;
  clearAllFilters: () => void;
  activeFiltersCount: number;
  getFilterParams: () => URLSearchParams;
  hasActiveFilters: boolean;
}

// Page-specific filter configs
export type PageFilterConfigs = {
  students: FilterConfig[];
  staff: FilterConfig[];
  mentors: FilterConfig[];
  counseling: FilterConfig[];
  departments: FilterConfig[];
  programs: FilterConfig[];
  courses: FilterConfig[];
  institutions: FilterConfig[];
  degrees: FilterConfig[];
  mentorIncharge: FilterConfig[];
};
```

---

### Task 1.2: Create useFilters Hook

**File**: `hooks/useFilters.ts`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FilterState, UseFiltersReturn } from '@/lib/types/filters';

/**
 * Custom hook for managing filter state with URL synchronization
 *
 * @param initialFilters - Initial filter state
 * @param syncWithUrl - Whether to sync filters with URL parameters (default: true)
 * @returns Filter state and methods
 */
export function useFilters(
  initialFilters: FilterState = {},
  syncWithUrl: boolean = true
): UseFiltersReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize filters from URL if syncWithUrl is enabled
  const [filters, setFilters] = useState<FilterState>(() => {
    if (!syncWithUrl) return initialFilters;

    const urlFilters: FilterState = { ...initialFilters };
    searchParams.forEach((value, key) => {
      // Handle multi-value parameters (arrays)
      if (value.includes(',')) {
        urlFilters[key] = value.split(',');
      } else if (value === 'true' || value === 'false') {
        urlFilters[key] = value === 'true';
      } else if (value === 'null') {
        urlFilters[key] = null;
      } else {
        urlFilters[key] = value;
      }
    });
    return urlFilters;
  });

  // Sync filters to URL
  useEffect(() => {
    if (!syncWithUrl) return;

    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;

      if (Array.isArray(value)) {
        if (value.length > 0) {
          params.set(key, value.join(','));
        }
      } else if (typeof value === 'object') {
        // Handle date range objects
        params.set(key, JSON.stringify(value));
      } else {
        params.set(key, String(value));
      }
    });

    // Update URL without reload
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : window.location.pathname;

    // Only update if URL actually changed
    if (window.location.search !== `?${queryString}`) {
      router.replace(newUrl, { scroll: false });
    }
  }, [filters, syncWithUrl, router]);

  // Set a single filter
  const setFilter = useCallback((key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Clear a single filter
  const clearFilter = useCallback((key: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Count active filters
  const activeFiltersCount = Object.keys(filters).filter(key => {
    const value = filters[key];
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }).length;

  // Get URL search params for API calls
  const getFilterParams = useCallback(() => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;

      if (Array.isArray(value)) {
        if (value.length > 0) {
          params.set(key, value.join(','));
        }
      } else if (typeof value === 'object') {
        params.set(key, JSON.stringify(value));
      } else {
        params.set(key, String(value));
      }
    });

    return params;
  }, [filters]);

  const hasActiveFilters = activeFiltersCount > 0;

  return {
    filters,
    setFilter,
    clearFilter,
    clearAllFilters,
    activeFiltersCount,
    getFilterParams,
    hasActiveFilters,
  };
}
```

---

### Task 1.3: Create FilterDropdown Component

**File**: `components/filters/FilterDropdown.tsx`

```typescript
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
```

---

### Task 1.4: Create StatusToggle Component

**File**: `components/filters/StatusToggle.tsx`

```typescript
'use client';

import React from 'react';

interface StatusToggleProps {
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  label?: string;
  labels?: {
    all: string;
    active: string;
    inactive: string;
  };
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
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="flex border border-gray-300 rounded-lg overflow-hidden">
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
                ${index !== options.length - 1 ? 'border-r border-gray-300' : ''}
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
```

---

### Task 1.5: Create DateRangePicker Component

**File**: `components/filters/DateRangePicker.tsx`

```typescript
'use client';

import React from 'react';
import { Calendar } from 'lucide-react';

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
    <div className="w-full">
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
        </div>
      </div>
    </div>
  );
}
```

---

### Task 1.6: Create FilterBar Component

**File**: `components/filters/FilterBar.tsx`

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import FilterDropdown from './FilterDropdown';
import StatusToggle from './StatusToggle';
import DateRangePicker from './DateRangePicker';
import type { FilterConfig, FilterOption } from '@/lib/types/filters';

interface FilterBarProps {
  filters: FilterConfig[];
  filterState: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  onClearAll: () => void;
  activeFiltersCount: number;
  loading?: boolean;
}

export default function FilterBar({
  filters,
  filterState,
  onFilterChange,
  onClearAll,
  activeFiltersCount,
  loading = false,
}: FilterBarProps) {
  const [filterOptions, setFilterOptions] = useState<Record<string, FilterOption[]>>({});
  const [loadingFilters, setLoadingFilters] = useState<Set<string>>(new Set());

  // Load async filter options
  useEffect(() => {
    filters.forEach(async (filter) => {
      if (typeof filter.options === 'function') {
        setLoadingFilters(prev => new Set(prev).add(filter.key));

        try {
          const options = await filter.options();
          setFilterOptions(prev => ({
            ...prev,
            [filter.key]: options,
          }));
        } catch (error) {
          console.error(`Error loading options for ${filter.key}:`, error);
          setFilterOptions(prev => ({
            ...prev,
            [filter.key]: [],
          }));
        } finally {
          setLoadingFilters(prev => {
            const newSet = new Set(prev);
            newSet.delete(filter.key);
            return newSet;
          });
        }
      } else if (Array.isArray(filter.options)) {
        setFilterOptions(prev => ({
          ...prev,
          [filter.key]: filter.options as FilterOption[],
        }));
      }
    });
  }, [filters]);

  // Check if a filter is dependent on another and should be disabled
  const isFilterDisabled = (filter: FilterConfig): boolean => {
    if (!filter.dependsOn) return false;
    return !filterState[filter.dependsOn];
  };

  // Filter options based on dependencies (cascading)
  const getFilteredOptions = (filter: FilterConfig): FilterOption[] => {
    const baseOptions = filterOptions[filter.key] || [];

    if (!filter.dependsOn || !filterState[filter.dependsOn]) {
      return baseOptions;
    }

    // Example: Filter departments based on selected institution
    // This would need custom logic based on your data structure
    return baseOptions;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>

        {activeFiltersCount > 0 && (
          <button
            onClick={onClearAll}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {filters.map((filter) => {
          switch (filter.type) {
            case 'dropdown':
            case 'multi-select':
              return (
                <FilterDropdown
                  key={filter.key}
                  label={filter.label}
                  options={getFilteredOptions(filter)}
                  value={filterState[filter.key] || (filter.type === 'multi-select' ? [] : '')}
                  onChange={(value) => onFilterChange(filter.key, value)}
                  multiSelect={filter.type === 'multi-select'}
                  placeholder={filter.placeholder}
                  loading={loadingFilters.has(filter.key)}
                  width={filter.width || 'w-48'}
                  disabled={isFilterDisabled(filter) || loading}
                />
              );

            case 'status-toggle':
              return (
                <StatusToggle
                  key={filter.key}
                  value={filterState[filter.key] ?? null}
                  onChange={(value) => onFilterChange(filter.key, value)}
                  label={filter.label}
                  disabled={loading}
                />
              );

            case 'date-range':
              const dateRange = filterState[filter.key] || { start: null, end: null };
              return (
                <DateRangePicker
                  key={filter.key}
                  startDate={dateRange.start}
                  endDate={dateRange.end}
                  onChange={(start, end) => onFilterChange(filter.key, { start, end })}
                  label={filter.label}
                  disabled={loading}
                />
              );

            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
```

---

## PHASE 2: HIGH-PRIORITY PAGES

### Task 2.1: Students Listing Page Filters

**File to Modify**: `app/(dashboard)/students/page.tsx`

**Filter Configuration**:
```typescript
const studentFilters: FilterConfig[] = [
  {
    key: 'institution_id',
    label: 'Institution',
    type: 'dropdown',
    options: async () => {
      const response = await fetch('/api/jkkn/institutions');
      const data = await response.json();
      return data.institutions.map((inst: any) => ({
        value: inst.id,
        label: inst.name,
      }));
    },
    placeholder: 'All institutions',
  },
  {
    key: 'department_id',
    label: 'Department',
    type: 'dropdown',
    options: async () => {
      const response = await fetch('/api/jkkn/departments');
      const data = await response.json();
      return data.departments.map((dept: any) => ({
        value: dept.id,
        label: dept.name,
      }));
    },
    placeholder: 'All departments',
    dependsOn: 'institution_id',
  },
  {
    key: 'program_id',
    label: 'Program',
    type: 'dropdown',
    options: async () => {
      const response = await fetch('/api/jkkn/programs');
      const data = await response.json();
      return data.programs.map((prog: any) => ({
        value: prog.id,
        label: prog.name,
      }));
    },
    placeholder: 'All programs',
    dependsOn: 'department_id',
  },
  {
    key: 'year',
    label: 'Year',
    type: 'dropdown',
    options: [
      { value: '1', label: 'Year 1' },
      { value: '2', label: 'Year 2' },
      { value: '3', label: 'Year 3' },
      { value: '4', label: 'Year 4' },
    ],
    placeholder: 'All years',
  },
  {
    key: 'profile_complete',
    label: 'Profile Status',
    type: 'status-toggle',
    labels: {
      all: 'All',
      active: 'Complete',
      inactive: 'Incomplete',
    },
  },
];
```

**Implementation Steps**:
1. Import FilterBar and useFilters
2. Add filter configuration
3. Initialize useFilters hook
4. Render FilterBar component
5. Update data fetching to use filter params
6. Apply filters to displayed data

---

### Task 2.2: Staff Listing Page Filters

**File to Modify**: `app/(dashboard)/staff/page.tsx`

**Filter Configuration**:
```typescript
const staffFilters: FilterConfig[] = [
  {
    key: 'institution_id',
    label: 'Institution',
    type: 'dropdown',
    options: async () => {
      // Fetch institutions
    },
    placeholder: 'All institutions',
  },
  {
    key: 'department_id',
    label: 'Department',
    type: 'dropdown',
    options: async () => {
      // Fetch departments
    },
    placeholder: 'All departments',
    dependsOn: 'institution_id',
  },
  {
    key: 'designation',
    label: 'Designation',
    type: 'dropdown',
    options: [
      { value: 'professor', label: 'Professor' },
      { value: 'associate_professor', label: 'Associate Professor' },
      { value: 'assistant_professor', label: 'Assistant Professor' },
      { value: 'lecturer', label: 'Lecturer' },
    ],
    placeholder: 'All designations',
  },
  {
    key: 'gender',
    label: 'Gender',
    type: 'dropdown',
    options: [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
      { value: 'other', label: 'Other' },
    ],
    placeholder: 'All genders',
  },
];
```

---

### Task 2.3: Mentor Directory Page Filters

**File to Modify**: `app/(dashboard)/mentor/page.tsx`

**Filter Configuration**:
```typescript
const mentorFilters: FilterConfig[] = [
  {
    key: 'institution_id',
    label: 'Institution',
    type: 'dropdown',
    options: async () => {
      // Fetch institutions
    },
    placeholder: 'All institutions',
  },
  {
    key: 'department_id',
    label: 'Department',
    type: 'dropdown',
    options: async () => {
      // Fetch departments
    },
    placeholder: 'All departments',
    dependsOn: 'institution_id',
  },
  {
    key: 'designation',
    label: 'Designation',
    type: 'dropdown',
    options: [
      { value: 'professor', label: 'Professor' },
      { value: 'associate_professor', label: 'Associate Professor' },
      { value: 'assistant_professor', label: 'Assistant Professor' },
      { value: 'lecturer', label: 'Lecturer' },
      { value: 'tutor', label: 'Tutor' },
    ],
    placeholder: 'All designations',
  },
];
```

---

### Task 2.4: Counseling Sessions Page Enhancements

**File to Modify**: `app/(dashboard)/counseling/page.tsx`

**Filter Configuration**:
```typescript
const counselingFilters: FilterConfig[] = [
  {
    key: 'date_range',
    label: 'Date Range',
    type: 'date-range',
  },
  {
    key: 'mentor_id',
    label: 'Mentor',
    type: 'dropdown',
    options: async () => {
      // Fetch mentors (admin view only)
    },
    placeholder: 'All mentors',
  },
  {
    key: 'student_search',
    label: 'Student',
    type: 'search',
    placeholder: 'Search student...',
  },
];
```

---

## PHASE 3: ADMINISTRATIVE PAGES

### Task 3.1: Departments Page
- Institution filter
- Status toggle

### Task 3.2: Programs Page
- Department filter (cascading)
- Degree filter
- Status toggle

### Task 3.3: Courses Page
- Program filter (cascading)
- Credit hours filter
- Status toggle

---

## PHASE 4: REFERENCE DATA PAGES

### Task 4.1: Institutions Page
- Category filter
- Type filter
- Status toggle

### Task 4.2: Degrees Page
- Level filter (UG/PG/PhD)
- Status toggle

### Task 4.3: Mentor Incharge Page
- Search by name
- Scope type filter
- Institution filter
- Status toggle

---

## PHASE 5: API OPTIMIZATION

### Task 5.1: Update Students API

**File**: `app/api/jkkn/students/route.ts`

**Add Filter Parameters**:
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Extract filter parameters
  const institution_id = searchParams.get('institution_id');
  const department_id = searchParams.get('department_id');
  const program_id = searchParams.get('program_id');
  const year = searchParams.get('year');
  const profile_complete = searchParams.get('profile_complete');

  // Apply filters to Supabase query
  let query = supabase.from('students').select('*');

  if (institution_id) {
    query = query.eq('institution_id', institution_id);
  }

  if (department_id) {
    query = query.eq('department_id', department_id);
  }

  if (program_id) {
    query = query.eq('program_id', program_id);
  }

  if (year) {
    query = query.eq('year', year);
  }

  if (profile_complete !== null) {
    query = query.eq('is_profile_complete', profile_complete === 'true');
  }

  // Execute query
  const { data, error } = await query;

  // Return filtered results
}
```

---

### Task 5.2: Update Other API Endpoints

Apply similar pattern to:
- `/api/jkkn/staff/route.ts`
- `/api/mentor/list/route.ts`
- `/api/jkkn/departments/route.ts`
- `/api/jkkn/programs/route.ts`
- `/api/jkkn/courses/route.ts`
- `/api/jkkn/institutions/route.ts`
- `/api/jkkn/degrees/route.ts`

---

## TESTING STRATEGY

### Unit Tests
1. Test useFilters hook
   - URL synchronization
   - State updates
   - Clear functionality

2. Test FilterDropdown component
   - Single select
   - Multi-select
   - Cascading logic

3. Test StatusToggle component
   - State transitions
   - Null handling

4. Test DateRangePicker component
   - Date validation
   - Range validation

### Integration Tests
1. Test filter combinations
2. Test cascading filters
3. Test URL persistence
4. Test API filtering

### E2E Tests
1. Test filter workflows on each page
2. Test filter + pagination
3. Test filter + search
4. Test performance with large datasets

---

## PERFORMANCE CONSIDERATIONS

### 1. Debouncing
- Debounce filter changes to reduce API calls
- Implement in useFilters hook

### 2. Caching
- Cache filter options (institutions, departments, etc.)
- Use React Query or SWR for cache management

### 3. Lazy Loading
- Load filter options on demand
- Show loading states

### 4. Pagination
- Maintain pagination state with filters
- Reset to page 1 when filters change

---

## SUCCESS CRITERIA

✅ All 10 pages have functional filters
✅ Filters persist in URL (shareable links)
✅ Cascading filters work correctly
✅ API endpoints support server-side filtering
✅ Performance remains acceptable with filters
✅ Mobile-responsive filter UI
✅ Consistent UX across all pages
✅ Clear filter states visible to users
✅ "Clear all" functionality works
✅ Filter counts display correctly

---

## ESTIMATED TIMELINE

- **Phase 1**: 3 days (Foundation)
- **Phase 2**: 5 days (High-priority pages)
- **Phase 3**: 4 days (Admin pages)
- **Phase 4**: 3 days (Reference pages)
- **Phase 5**: 3 days (API optimization)

**Total**: 18 days (3.5 weeks)

---

## DEPENDENCIES

1. No external package dependencies (using native components)
2. Existing search functionality remains functional
3. Existing API endpoints need modification
4. URL routing must support query parameters

---

## ROLLOUT STRATEGY

### Week 1: Foundation + Students Page
- Build all reusable components
- Implement on Students page
- User testing and feedback

### Week 2: Staff + Mentor Pages
- Implement on Staff page
- Implement on Mentor directory
- User testing and feedback

### Week 3: Remaining Pages
- All other list pages
- API optimization
- Performance testing

### Week 4: Polish & Documentation
- Bug fixes
- Documentation
- Final testing
- Production deployment

---

This comprehensive plan provides a complete roadmap for implementing a unified filtering system across the entire application. Each task includes specific file locations, code examples, and success criteria.
