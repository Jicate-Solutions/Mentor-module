'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterState {
  institution_id: string;
  degree_id: string;
  department_id: string;
  program_id: string;
  semester: string;
  section: string;
  academic_year: string;
  status: string;
}

export interface FilterOptions {
  institutions: FilterOption[];
  degrees: FilterOption[];
  departments: FilterOption[];
  programs: FilterOption[];
  semesters: FilterOption[];
  sections: FilterOption[];
  academicYears: FilterOption[];
  statuses: FilterOption[];
}

export interface LoadingState {
  institutions: boolean;
  degrees: boolean;
  departments: boolean;
  programs: boolean;
  semesters: boolean;
  sections: boolean;
  any: boolean;
}

export interface UseAddLearnerFiltersReturn {
  filters: FilterState;
  setFilter: (key: keyof FilterState, value: string) => void;
  clearAllFilters: () => void;
  filterOptions: FilterOptions;
  loading: LoadingState;
  activeFiltersCount: number;
}

const initialFilterState: FilterState = {
  institution_id: '',
  degree_id: '',
  department_id: '',
  program_id: '',
  semester: '',
  section: '',
  academic_year: '',
  status: '',
};

// Static options
const STATIC_SEMESTERS: FilterOption[] = [
  { value: '1', label: 'Semester 1' },
  { value: '2', label: 'Semester 2' },
  { value: '3', label: 'Semester 3' },
  { value: '4', label: 'Semester 4' },
  { value: '5', label: 'Semester 5' },
  { value: '6', label: 'Semester 6' },
  { value: '7', label: 'Semester 7' },
  { value: '8', label: 'Semester 8' },
];

const STATIC_ACADEMIC_YEARS: FilterOption[] = [
  { value: '2024-25', label: '2024-25' },
  { value: '2023-24', label: '2023-24' },
  { value: '2022-23', label: '2022-23' },
  { value: '2021-22', label: '2021-22' },
];

const STATIC_STATUSES: FilterOption[] = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const STATIC_SECTIONS: FilterOption[] = [
  { value: 'A', label: 'Section A' },
  { value: 'B', label: 'Section B' },
  { value: 'C', label: 'Section C' },
  { value: 'D', label: 'Section D' },
];

/**
 * Custom hook for managing Add Learner advanced filters with cascading logic
 */
export function useAddLearnerFilters(): UseAddLearnerFiltersReturn {
  const [filters, setFilters] = useState<FilterState>(initialFilterState);

  // Dynamic options (loaded from API)
  const [institutions, setInstitutions] = useState<FilterOption[]>([]);
  const [degrees, setDegrees] = useState<FilterOption[]>([]);
  const [departments, setDepartments] = useState<FilterOption[]>([]);
  const [programs, setPrograms] = useState<FilterOption[]>([]);

  // All data for cascading (unfiltered)
  const [allDegrees, setAllDegrees] = useState<FilterOption[]>([]);
  const [allDepartments, setAllDepartments] = useState<any[]>([]);
  const [allPrograms, setAllPrograms] = useState<any[]>([]);

  // Loading states
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [loadingDegrees, setLoadingDegrees] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  // Load institutions on mount
  useEffect(() => {
    const loadInstitutions = async () => {
      setLoadingInstitutions(true);
      try {
        const response = await fetch('/api/jkkn/institutions?page=1&limit=100', {
          credentials: 'include',
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.length > 0) {
            setInstitutions(
              result.data.map((inst: any) => ({
                value: inst.id,
                label: inst.name,
              }))
            );
          } else {
            // Fallback: Use static JKKN institutions when API returns empty
            console.log('No institutions from API, using fallback list');
            setInstitutions([
              { value: 'jkkn-cahs', label: 'JKKN College of Allied Health Sciences' },
              { value: 'jkkn-cet', label: 'JKKN College of Engineering & Technology' },
              { value: 'jkkn-cn', label: 'JKKN College of Nursing' },
              { value: 'jkkn-cp', label: 'JKKN College of Pharmacy' },
              { value: 'jkkn-cpt', label: 'JKKN College of Physiotherapy' },
            ]);
          }
        }
      } catch (error) {
        console.error('Error loading institutions:', error);
        // Fallback on error
        setInstitutions([
          { value: 'jkkn-cahs', label: 'JKKN College of Allied Health Sciences' },
          { value: 'jkkn-cet', label: 'JKKN College of Engineering & Technology' },
          { value: 'jkkn-cn', label: 'JKKN College of Nursing' },
        ]);
      } finally {
        setLoadingInstitutions(false);
      }
    };

    loadInstitutions();
  }, []);

  // Load degrees on mount - deduplicate by name
  useEffect(() => {
    const loadDegrees = async () => {
      setLoadingDegrees(true);
      try {
        const response = await fetch('/api/jkkn/degrees?page=1&limit=100', {
          credentials: 'include',
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const degreeOptions = result.data.map((deg: any) => ({
              value: deg.id,
              label: deg.name,
              institution_id: deg.institution_id,
            }));

            // Deduplicate by label (name) - keep first occurrence
            const uniqueDegrees = degreeOptions.filter(
              (deg: any, index: number, self: any[]) =>
                index === self.findIndex((d) => d.label === deg.label)
            );

            setAllDegrees(uniqueDegrees);
            setDegrees(uniqueDegrees);
          }
        }
      } catch (error) {
        console.error('Error loading degrees:', error);
        // Fallback to common degrees
        const fallbackDegrees = [
          { value: 'ug', label: 'Undergraduate' },
          { value: 'pg', label: 'Postgraduate' },
          { value: 'diploma', label: 'Diploma' },
          { value: 'phd', label: 'Ph.D' },
        ];
        setAllDegrees(fallbackDegrees);
        setDegrees(fallbackDegrees);
      } finally {
        setLoadingDegrees(false);
      }
    };

    loadDegrees();
  }, []);

  // Load departments on mount - deduplicate by name
  useEffect(() => {
    const loadDepartments = async () => {
      setLoadingDepartments(true);
      try {
        const response = await fetch('/api/jkkn/departments?page=1&limit=500', {
          credentials: 'include',
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const deptData = result.data.map((dept: any) => ({
              value: dept.id,
              label: dept.name,
              institution_id: dept.institution_id,
              degree_id: dept.degree_id,
            }));

            // Deduplicate by label (name) - keep first occurrence
            const uniqueDepartments = deptData.filter(
              (dept: any, index: number, self: any[]) =>
                index === self.findIndex((d) => d.label === dept.label)
            );

            setAllDepartments(uniqueDepartments);
            setDepartments(uniqueDepartments.map((d: any) => ({ value: d.value, label: d.label })));
          }
        }
      } catch (error) {
        console.error('Error loading departments:', error);
      } finally {
        setLoadingDepartments(false);
      }
    };

    loadDepartments();
  }, []);

  // Load programs on mount - deduplicate by name
  useEffect(() => {
    const loadPrograms = async () => {
      setLoadingPrograms(true);
      try {
        const response = await fetch('/api/jkkn/programs?page=1&limit=1000', {
          credentials: 'include',
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const progData = result.data.map((prog: any) => ({
              value: prog.id,
              label: prog.name,
              department_id: prog.department_id,
            }));

            // Deduplicate by label (name) - keep first occurrence
            const uniquePrograms = progData.filter(
              (prog: any, index: number, self: any[]) =>
                index === self.findIndex((p) => p.label === prog.label)
            );

            setAllPrograms(uniquePrograms);
            setPrograms(uniquePrograms.map((p: any) => ({ value: p.value, label: p.label })));
          }
        }
      } catch (error) {
        console.error('Error loading programs:', error);
      } finally {
        setLoadingPrograms(false);
      }
    };

    loadPrograms();
  }, []);

  // Cascade: Filter departments when institution changes
  useEffect(() => {
    if (filters.institution_id) {
      const filtered = allDepartments
        .filter((d) => d.institution_id === filters.institution_id)
        .map((d) => ({ value: d.value, label: d.label }));
      setDepartments(filtered.length > 0 ? filtered : allDepartments.map((d) => ({ value: d.value, label: d.label })));
    } else {
      setDepartments(allDepartments.map((d) => ({ value: d.value, label: d.label })));
    }
  }, [filters.institution_id, allDepartments]);

  // Cascade: Filter programs when department changes
  useEffect(() => {
    if (filters.department_id) {
      const filtered = allPrograms
        .filter((p) => p.department_id === filters.department_id)
        .map((p) => ({ value: p.value, label: p.label }));
      setPrograms(filtered.length > 0 ? filtered : allPrograms.map((p) => ({ value: p.value, label: p.label })));
    } else {
      setPrograms(allPrograms.map((p) => ({ value: p.value, label: p.label })));
    }
  }, [filters.department_id, allPrograms]);

  // Set filter with cascading reset
  const setFilter = useCallback((key: keyof FilterState, value: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [key]: value };

      // Cascade reset: Clear child filters when parent changes
      if (key === 'institution_id') {
        newFilters.degree_id = '';
        newFilters.department_id = '';
        newFilters.program_id = '';
        newFilters.semester = '';
        newFilters.section = '';
      } else if (key === 'degree_id') {
        newFilters.department_id = '';
        newFilters.program_id = '';
        newFilters.semester = '';
        newFilters.section = '';
      } else if (key === 'department_id') {
        newFilters.program_id = '';
        newFilters.semester = '';
        newFilters.section = '';
      } else if (key === 'program_id') {
        newFilters.semester = '';
        newFilters.section = '';
      } else if (key === 'semester') {
        newFilters.section = '';
      }

      return newFilters;
    });
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters(initialFilterState);
  }, []);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter((v) => v && v !== '' && v !== 'all').length;
  }, [filters]);

  // Loading state
  const loading: LoadingState = useMemo(() => ({
    institutions: loadingInstitutions,
    degrees: loadingDegrees,
    departments: loadingDepartments,
    programs: loadingPrograms,
    semesters: false,
    sections: false,
    any: loadingInstitutions || loadingDegrees || loadingDepartments || loadingPrograms,
  }), [loadingInstitutions, loadingDegrees, loadingDepartments, loadingPrograms]);

  // Combine all filter options
  const filterOptions: FilterOptions = useMemo(() => ({
    institutions,
    degrees,
    departments,
    programs,
    semesters: STATIC_SEMESTERS,
    sections: STATIC_SECTIONS,
    academicYears: STATIC_ACADEMIC_YEARS,
    statuses: STATIC_STATUSES,
  }), [institutions, degrees, departments, programs]);

  return {
    filters,
    setFilter,
    clearAllFilters,
    filterOptions,
    loading,
    activeFiltersCount,
  };
}
