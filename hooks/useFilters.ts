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
        const dateRange = value as { start: string | null; end: string | null };
        if (dateRange.start || dateRange.end) {
          params.set(key, JSON.stringify(value));
        }
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
    if (typeof value === 'object' && !Array.isArray(value)) {
      const dateRange = value as { start: string | null; end: string | null };
      return !!(dateRange.start || dateRange.end);
    }
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
