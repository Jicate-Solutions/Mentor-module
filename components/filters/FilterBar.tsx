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
    const dependentValue = filterState[filter.dependsOn];
    return !dependentValue || dependentValue === '';
  };

  // Filter options based on dependencies (cascading)
  const getFilteredOptions = (filter: FilterConfig): FilterOption[] => {
    const baseOptions = filterOptions[filter.key] || [];

    if (!filter.dependsOn || !filterState[filter.dependsOn]) {
      return baseOptions;
    }

    // For cascading filters, you can add custom logic here
    // Example: Filter departments based on selected institution
    // This would require additional metadata in the options
    return baseOptions;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">Filters</h3>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>

        {activeFiltersCount > 0 && (
          <button
            onClick={onClearAll}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors"
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
