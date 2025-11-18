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
  [key: string]: string | string[] | boolean | null | { start: string | null; end: string | null };
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

// Status toggle labels
export interface StatusToggleLabels {
  all: string;
  active: string;
  inactive: string;
}

// Date range type
export interface DateRange {
  start: string | null;
  end: string | null;
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
