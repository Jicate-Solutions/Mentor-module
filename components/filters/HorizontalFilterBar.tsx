'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Filter } from 'lucide-react';
import type { FilterConfig, FilterOption } from '@/lib/types/filters';

interface HorizontalFilterBarProps {
  filters: FilterConfig[];
  filterState: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  onClearAll: () => void;
  activeFiltersCount: number;
  loading?: boolean;
  className?: string;
}

export default function HorizontalFilterBar({
  filters,
  filterState,
  onFilterChange,
  onClearAll,
  activeFiltersCount,
  loading = false,
  className = '',
}: HorizontalFilterBarProps) {
  const [filterOptions, setFilterOptions] = useState<Record<string, FilterOption[]>>({});
  const [loadingFilters, setLoadingFilters] = useState<Set<string>>(new Set());
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  const getDisplayValue = (filter: FilterConfig) => {
    const value = filterState[filter.key];

    if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
      return null;
    }

    // For status toggle
    if (filter.type === 'status-toggle') {
      return value === true ? 'Active' : value === false ? 'Inactive' : null;
    }

    // For dropdowns
    const options = filterOptions[filter.key] || [];
    if (Array.isArray(value)) {
      const selectedOptions = options.filter(opt => value.includes(opt.value));
      return selectedOptions.map(opt => opt.label).join(', ');
    }

    const selectedOption = options.find(opt => opt.value === value);
    return selectedOption?.label || value;
  };

  const isFilterActive = (filter: FilterConfig) => {
    const value = filterState[filter.key];
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  };

  const clearFilter = (filterKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filter = filters.find(f => f.key === filterKey);
    onFilterChange(filterKey, filter?.type === 'multi-select' ? [] : '');
    setOpenDropdown(null);
  };

  const toggleDropdown = (filterKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdown(openDropdown === filterKey ? null : filterKey);
  };

  const handleOptionSelect = (filter: FilterConfig, optionValue: string) => {
    if (filter.type === 'multi-select') {
      const currentValues = Array.isArray(filterState[filter.key]) ? filterState[filter.key] : [];
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter((v: any) => v !== optionValue)
        : [...currentValues, optionValue];
      onFilterChange(filter.key, newValues);
    } else {
      onFilterChange(filter.key, optionValue);
      setOpenDropdown(null);
    }
  };

  return (
    <div className={`bg-white shadow-sm rounded-lg p-2 lg:p-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5 lg:gap-2">
        {/* Filter Icon and Label - Hidden on mobile */}
        <div className="hidden sm:flex items-center gap-2 text-xs lg:text-sm font-medium text-neutral-700">
          <Filter className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
          <span>Filters:</span>
        </div>

        {/* Filter Chips */}
        {filters.map((filter) => {
          const isActive = isFilterActive(filter);
          const displayValue = getDisplayValue(filter);
          const isOpen = openDropdown === filter.key;
          const options = filterOptions[filter.key] || [];
          const isLoading = loadingFilters.has(filter.key);

          return (
            <div key={filter.key} className="relative">
              <button
                onClick={(e) => toggleDropdown(filter.key, e)}
                disabled={loading || isLoading}
                className={`
                  flex items-center gap-1.5 lg:gap-2 px-2 py-1 lg:px-3 lg:py-1.5 rounded-md border text-xs lg:text-sm font-medium
                  transition-all duration-200
                  ${isActive
                    ? 'bg-brand-green text-white border-brand-green shadow-sm'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:border-brand-green hover:bg-neutral-50'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <span className="whitespace-nowrap">
                  {isActive && displayValue ? `${filter.label}: ${displayValue}` : filter.label}
                </span>

                {isActive ? (
                  <X
                    className="h-3 w-3 lg:h-3.5 lg:w-3.5 hover:scale-110 transition-transform"
                    onClick={(e) => clearFilter(filter.key, e)}
                  />
                ) : (
                  <ChevronDown className={`h-3 w-3 lg:h-3.5 lg:w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
              </button>

              {/* Dropdown Menu */}
              {isOpen && !loading && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 min-w-[180px] lg:min-w-[200px] max-h-64 overflow-auto">
                  {isLoading ? (
                    <div className="px-3 py-2 lg:px-4 lg:py-3 text-xs lg:text-sm text-neutral-500">Loading...</div>
                  ) : options.length === 0 ? (
                    <div className="px-3 py-2 lg:px-4 lg:py-3 text-xs lg:text-sm text-neutral-500">No options available</div>
                  ) : (
                    options.map((option) => {
                      const isSelected = filter.type === 'multi-select'
                        ? Array.isArray(filterState[filter.key]) && filterState[filter.key].includes(option.value)
                        : filterState[filter.key] === option.value;

                      return (
                        <button
                          key={option.value}
                          onClick={() => handleOptionSelect(filter, option.value)}
                          disabled={option.disabled}
                          className={`
                            w-full px-3 py-1.5 lg:px-4 lg:py-2 text-left text-xs lg:text-sm transition-colors
                            ${isSelected
                              ? 'bg-brand-green/10 text-brand-green font-medium'
                              : 'text-neutral-700 hover:bg-neutral-50'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <span>{option.label}</span>
                            {isSelected && filter.type === 'multi-select' && (
                              <svg className="h-3.5 w-3.5 lg:h-4 lg:w-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Clear All Button */}
        {activeFiltersCount > 0 && (
          <>
            <div className="hidden sm:block h-6 w-px bg-neutral-200 mx-0.5 lg:mx-1" />
            <button
              onClick={onClearAll}
              className="flex items-center gap-1 lg:gap-1.5 px-2 py-1 lg:px-3 lg:py-1.5 rounded-md text-xs lg:text-sm font-medium text-neutral-600 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <X className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
              <span className="hidden sm:inline">Clear all ({activeFiltersCount})</span>
              <span className="sm:hidden">Clear ({activeFiltersCount})</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
