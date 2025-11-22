'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SearchInput from '@/components/ui/SearchInput';
import HorizontalFilterBar from '@/components/filters/HorizontalFilterBar';
import PageContainer from '@/components/ui/PageContainer';
import PageHeader from '@/components/ui/PageHeader';
import { useFilters } from '@/hooks/useFilters';
import type { FilterConfig } from '@/lib/types/filters';
import {
  fetchStudents,
  checkApiStatus,
  type Student,
  type ApiError,
} from '@/lib/api/jkkn-api';

export default function StudentsPage() {
  // API status
  const [isConfigured, setIsConfigured] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Checking API...');
  const [isCheckingApi, setIsCheckingApi] = useState(true);

  // Students data
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');

  // Filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      key: 'institution_id',
      label: 'Institution',
      type: 'dropdown',
      options: async () => {
        // Fetch ALL institutions from API, not just from current students page
        try {
          const response = await fetch('/api/jkkn/institutions?page=1&limit=100', {
            credentials: 'include',
          });

          if (!response.ok) {
            console.error('Failed to fetch institutions for filter');
            return [];
          }

          const result = await response.json();

          if (result.success && result.data) {
            return result.data.map((inst: any) => ({
              value: inst.id,
              label: inst.name,
            }));
          }

          return [];
        } catch (error) {
          console.error('Error fetching institutions:', error);
          return [];
        }
      },
      placeholder: 'All institutions',
      width: 'w-56',
    },
    {
      key: 'department_id',
      label: 'Department',
      type: 'dropdown',
      options: async () => {
        // Fetch ALL departments from API
        try {
          const response = await fetch('/api/jkkn/departments?page=1&limit=500', {
            credentials: 'include',
          });

          if (!response.ok) {
            console.error('Failed to fetch departments for filter');
            return [];
          }

          const result = await response.json();

          if (result.success && result.data) {
            return result.data.map((dept: any) => ({
              value: dept.id,
              label: dept.name,
            }));
          }

          return [];
        } catch (error) {
          console.error('Error fetching departments:', error);
          return [];
        }
      },
      placeholder: 'All departments',
      width: 'w-56',
      dependsOn: 'institution_id',
    },
    {
      key: 'program_id',
      label: 'Program',
      type: 'dropdown',
      options: async () => {
        // Fetch ALL programs from API
        try {
          const response = await fetch('/api/jkkn/programs?page=1&limit=1000', {
            credentials: 'include',
          });

          if (!response.ok) {
            console.error('Failed to fetch programs for filter');
            return [];
          }

          const result = await response.json();

          if (result.success && result.data) {
            return result.data.map((prog: any) => ({
              value: prog.id,
              label: prog.name,
            }));
          }

          return [];
        } catch (error) {
          console.error('Error fetching programs:', error);
          return [];
        }
      },
      placeholder: 'All programs',
      width: 'w-56',
      dependsOn: 'department_id',
    },
    {
      key: 'profile_complete',
      label: 'Profile Status',
      type: 'status-toggle',
    },
  ];

  // Initialize filters hook
  const { filters, setFilter, clearAllFilters, activeFiltersCount } = useFilters({}, true);

  // Check API status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  // Fetch students when API is configured
  useEffect(() => {
    if (isConfigured) {
      loadStudents(1);
    }
  }, [isConfigured]);

  // Filter students based on search and filters
  useEffect(() => {
    console.log('[Filter Effect] Running filter...', {
      totalStudents: students.length,
      searchQuery,
      filters
    });

    let filtered = [...students];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((student) => {
        const institutionName = getInstitutionName(student.institution);
        const departmentName = getDepartmentName(student.department);
        const programName = getProgramName(student.program);
        const query = searchQuery.toLowerCase();

        return (
          student.first_name.toLowerCase().includes(query) ||
          student.last_name.toLowerCase().includes(query) ||
          student.roll_number.toLowerCase().includes(query) ||
          institutionName.toLowerCase().includes(query) ||
          departmentName.toLowerCase().includes(query) ||
          programName.toLowerCase().includes(query) ||
          `${student.first_name} ${student.last_name}`.toLowerCase().includes(query)
        );
      });
      console.log('[Filter Effect] After search filter:', filtered.length);
    }

    // Apply institution filter
    if (filters.institution_id && filters.institution_id !== '') {
      console.log('[Filter Effect] Applying institution filter:', filters.institution_id);

      // Debug: Show sample student institution data
      if (students.length > 0) {
        console.log('[Filter Effect] Sample student institution data:', {
          first3: students.slice(0, 3).map(s => ({
            name: `${s.first_name} ${s.last_name}`,
            institution: s.institution,
            instId: typeof s.institution === 'object' ? s.institution.id : s.institution
          }))
        });
      }

      const beforeCount = filtered.length;
      filtered = filtered.filter((student) => {
        const inst = student.institution;
        const instId = typeof inst === 'object' ? inst.id : inst;
        const matches = instId === filters.institution_id;

        // Debug first 5 non-matches
        if (!matches && beforeCount < 5) {
          console.log('[Filter Debug] No match:', {
            student: `${student.first_name} ${student.last_name}`,
            instId,
            filterValue: filters.institution_id,
            institution: inst
          });
        }

        return matches;
      });
      console.log('[Filter Effect] After institution filter:', {
        before: beforeCount,
        after: filtered.length,
        filterValue: filters.institution_id
      });
    }

    // Apply department filter
    if (filters.department_id && filters.department_id !== '') {
      filtered = filtered.filter((student) => {
        const dept = student.department;
        const deptId = typeof dept === 'object' ? dept.id : dept;
        return deptId === filters.department_id;
      });
    }

    // Apply program filter
    if (filters.program_id && filters.program_id !== '') {
      filtered = filtered.filter((student) => {
        const prog = student.program;
        const progId = typeof prog === 'object' ? prog.id : prog;
        return progId === filters.program_id;
      });
    }

    // Apply profile status filter
    if (filters.profile_complete !== null && filters.profile_complete !== undefined) {
      filtered = filtered.filter((student) => {
        return student.is_profile_complete === filters.profile_complete;
      });
    }

    setFilteredStudents(filtered);
  }, [searchQuery, students, filters]);

  /**
   * Check API configuration status
   */
  const checkStatus = async () => {
    setIsCheckingApi(true);
    try {
      const status = await checkApiStatus();
      setIsConfigured(status.configured);
      setStatusMessage(status.message);
    } catch (err: any) {
      setIsConfigured(false);
      setStatusMessage('Failed to check API status');
    } finally {
      setIsCheckingApi(false);
    }
  };

  /**
   * Load students data
   * Note: Loads ALL students (10000) to enable client-side filtering
   * This is necessary because filters need access to complete dataset
   */
  const loadStudents = async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      // Load ALL students (10000) for filtering to work properly
      // Using page=1, limit=10000 to get complete dataset
      console.log('[Students Page] Fetching students with limit=10000...');
      const response = await fetchStudents(1, 10000);

      console.log('[Students Page] Received students:', {
        count: response.data.length,
        metadata: response.metadata,
        firstStudent: response.data[0],
        lastStudent: response.data[response.data.length - 1]
      });

      // Debug: Check unique institutions in loaded data
      const uniqueInstitutions = new Map();
      response.data.forEach((student: any) => {
        const inst = student.institution;
        if (typeof inst === 'object' && inst.id && inst.name) {
          uniqueInstitutions.set(inst.id, inst.name);
        }
      });
      console.log('[Students Page] Unique institutions in loaded data:',
        Array.from(uniqueInstitutions.entries()).map(([id, name]) => ({ id, name }))
      );

      setStudents(response.data);
      setFilteredStudents(response.data);
      setCurrentPage(1); // Always page 1 since we load all data
      setTotalPages(1); // Single page with all data
      setTotal(response.data.length); // Total = actual data length
    } catch (err: any) {
      const apiError = err as ApiError;
      console.error('[Students Page] Error loading students:', apiError);
      setError(apiError.message || 'Failed to fetch students data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle page change
   */
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadStudents(page);
    setSearchQuery(''); // Clear search when changing pages
  };

  /**
   * Get full name of student
   */
  const getFullName = (student: Student): string => {
    return `${student.first_name} ${student.last_name}`;
  };

  /**
   * Get institution name (handles both object and string)
   */
  const getInstitutionName = (institution: { id: string; name: string } | string): string => {
    if (typeof institution === 'string') return institution;
    return institution?.name || 'N/A';
  };

  /**
   * Get department name (handles both object and string)
   */
  const getDepartmentName = (department: { id: string; name: string } | string): string => {
    if (typeof department === 'string') return department;
    return department?.name || 'N/A';
  };

  /**
   * Get program name (handles both object and string)
   */
  const getProgramName = (program: { id: string; name: string } | string): string => {
    if (typeof program === 'string') return program;
    return program?.name || 'N/A';
  };

  return (
    <PageContainer>
      {/* Hero Header */}
      <PageHeader
        title="JKKN Learners"
        description="Browse and manage learner records from MyJKKN database"
        variant="gradient"
        icon={<span>👨‍🎓</span>}
        badge={isConfigured ? { text: "✓ API Connected", variant: "success" } : undefined}
      />

      {/* Initial API Check Loading */}
      {isCheckingApi && (
        <div className="bg-white rounded-2xl border border-neutral-200/50 p-12 shadow-xl">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-brand-green border-t-transparent mb-3"></div>
            <p className="text-neutral-600 text-sm">Checking API configuration...</p>
          </div>
        </div>
      )}

      {/* API Not Configured Warning */}
      {!isCheckingApi && !isConfigured && (
        <div className="bg-yellow-50/80 rounded-2xl border border-yellow-200/60 p-5 shadow-lg">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-[16px] font-medium text-yellow-800 mb-1">API Not Configured</p>
              <p className="text-[14px] text-yellow-700 leading-relaxed">
                {statusMessage}. Please add NEXT_PUBLIC_MYJKKN_API_KEY to your .env.local file to view learners data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {isConfigured && (
        <div className="bg-white rounded-2xl border border-neutral-200/50 p-6 shadow-xl space-y-6">
          {/* Search and Actions Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <SearchInput
                value={searchQuery}
                onChange={(value) => setSearchQuery(value)}
                placeholder="Search by name or roll number..."
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadStudents(currentPage)}
              disabled={loading}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
          </div>

          {/* Horizontal Filter Bar */}
          <HorizontalFilterBar
            filters={filterConfigs}
            filterState={filters}
            onFilterChange={setFilter}
            onClearAll={clearAllFilters}
            activeFiltersCount={activeFiltersCount}
            loading={loading}
          />

          {/* Stats */}
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <span className="font-semibold text-brand-green">
              {searchQuery ? filteredStudents.length : total}
            </span>
            {searchQuery ? 'matching' : 'total'} learners
            {!searchQuery && (
              <>
                <span>•</span>
                <span>Page {currentPage} of {totalPages}</span>
              </>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-brand-green border-t-transparent mb-3"></div>
              <p className="text-neutral-600 text-sm">Loading learners...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50/80 border border-red-200/60 rounded-2xl p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-red-800">Error loading data</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Data Table */}
          {!loading && !error && filteredStudents.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-2xl border border-neutral-200/50 shadow-sm">
                <table className="w-full">
                  <thead className="bg-neutral-50/80 border-b border-neutral-200/70">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wide">
                        Learner Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wide">
                        Roll Number
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wide">
                        Institution
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wide">
                        Department
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wide">
                        Program
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wide">
                        Profile Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/50">
                    {filteredStudents.map((student) => (
                      <tr
                        key={student.id}
                        className="hover:bg-gradient-to-r hover:from-brand-cream/30 hover:to-transparent transition-all duration-300 group"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-green to-brand-green/80 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-md transition-transform duration-300 group-hover:scale-110">
                              {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-neutral-800 text-sm group-hover:text-brand-green transition-colors">
                                {getFullName(student)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-accent-100/80 text-brand-green border border-accent-200">
                            {student.roll_number}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-neutral-700">
                          {getInstitutionName(student.institution)}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-neutral-700">
                          {getDepartmentName(student.department)}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-neutral-700">
                          {getProgramName(student.program)}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge
                            variant={student.is_profile_complete ? 'success' : 'default'}
                            size="sm"
                          >
                            {student.is_profile_complete ? '✓ Complete' : '○ Incomplete'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {!searchQuery && totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-neutral-600">
                    Showing {students.length} of {total} results
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            disabled={loading}
                            className={`
                              px-3 py-1.5 text-xs rounded-lg transition-all font-medium
                              ${currentPage === pageNum
                                ? 'bg-accent-100/80 text-brand-green shadow-sm border border-accent-200'
                                : 'text-neutral-600 hover:bg-neutral-100/70'
                              }
                              disabled:opacity-50 disabled:cursor-not-allowed
                            `}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {!loading && !error && filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">👨‍🎓</div>
              <h3 className="text-lg font-semibold text-neutral-800 mb-2">
                {searchQuery ? 'No matching learners' : 'No learners found'}
              </h3>
              <p className="text-sm text-neutral-600">
                {searchQuery
                  ? 'Try adjusting your search terms'
                  : 'No data available from the API'}
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="mt-4"
                >
                  Clear search
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
