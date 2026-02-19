'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SearchInput from '@/components/ui/SearchInput';
import PageContainer from '@/components/ui/PageContainer';
import PageHeader from '@/components/ui/PageHeader';
import {
  fetchStaff,
  checkApiStatus,
  type StaffMember,
  type ApiError,
} from '@/lib/api/jkkn-api';

export default function StaffPage() {
  // API status
  const [isConfigured, setIsConfigured] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Checking API...');
  const [isCheckingApi, setIsCheckingApi] = useState(true);

  // Staff data
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Check API status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  // Fetch staff when API is configured
  useEffect(() => {
    if (isConfigured) {
      loadStaff(1);
    }
  }, [isConfigured]);

  // Filter staff based on search
  useEffect(() => {
    if (searchQuery) {
      const filtered = staff.filter((member) => {
        const departmentName = getDepartmentName(member.department);
        const institutionName = getInstitutionName(member.institution);
        const query = searchQuery.toLowerCase();

        return (
          member.first_name.toLowerCase().includes(query) ||
          member.last_name.toLowerCase().includes(query) ||
          member.email.toLowerCase().includes(query) ||
          member.designation.toLowerCase().includes(query) ||
          departmentName.toLowerCase().includes(query) ||
          institutionName.toLowerCase().includes(query) ||
          `${member.first_name} ${member.last_name}`.toLowerCase().includes(query)
        );
      });
      setFilteredStaff(filtered);
    } else {
      setFilteredStaff(staff);
    }
  }, [searchQuery, staff]);

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
   * Load staff data
   */
  const loadStaff = async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchStaff(page, 10);

      setStaff(response.data);
      setFilteredStaff(response.data);
      setCurrentPage(response.metadata.page);
      setTotalPages(response.metadata.totalPages);
      setTotal(response.metadata.total);
    } catch (err: any) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch staff data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle page change
   */
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadStaff(page);
    setSearchQuery(''); // Clear search when changing pages
  };

  /**
   * Get full name of staff member
   */
  const getFullName = (member: StaffMember): string => {
    return `${member.first_name} ${member.last_name}`;
  };

  /**
   * Get department name (handles both object and string)
   */
  const getDepartmentName = (department: { id: string; department_name: string } | string): string => {
    if (typeof department === 'string') return department;
    return department?.department_name || 'N/A';
  };

  /**
   * Get institution name (handles both object and string)
   */
  const getInstitutionName = (institution: { id: string; institution_name: string } | string): string => {
    if (typeof institution === 'string') return institution;
    return institution?.institution_name || 'N/A';
  };

  /**
   * Get designation badge variant based on role
   */
  const getDesignationVariant = (designation: string): 'default' | 'success' | 'warning' | 'info' => {
    const role = designation.toLowerCase();
    if (role.includes('hod') || role.includes('principal') || role.includes('dean')) {
      return 'success'; // Green for leadership
    }
    if (role.includes('professor') || role.includes('associate')) {
      return 'info'; // Blue for senior faculty
    }
    if (role.includes('assistant') || role.includes('lecturer')) {
      return 'warning'; // Yellow for junior faculty
    }
    return 'default'; // Gray for others
  };

  /**
   * Get gender display with icon
   */
  const getGenderDisplay = (gender: string) => {
    const isMale = gender.toLowerCase() === 'male';
    return {
      icon: isMale ? '♂' : '♀',
      variant: isMale ? 'info' as const : 'success' as const,
      label: gender.charAt(0).toUpperCase() + gender.slice(1)
    };
  };

  /**
   * Format display value (handle N/A)
   */
  const formatDisplayValue = (value: string | null | undefined, fallback: string = '—'): string => {
    if (!value || value === 'N/A' || value.trim() === '') {
      return fallback;
    }
    return value;
  };

  return (
    <PageContainer>
      {/* Hero Header */}
      <PageHeader
        title="JKKN Staff Directory"
        description="Browse and manage staff members from MyJKKN database"
        variant="gradient"
        icon={<span>👨‍🏫</span>}
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
                {statusMessage}. Please add NEXT_PUBLIC_MYJKKN_API_KEY to your .env.local file to view staff data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {isConfigured && (
        <div className="bg-white rounded-2xl border border-neutral-200/50 p-6 shadow-xl space-y-6">
          {/* Search and Actions Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 w-full sm:max-w-md">
              <SearchInput
                value={searchQuery}
                onChange={(value) => setSearchQuery(value)}
                placeholder="Search by name, email, designation, or department..."
              />
            </div>
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-white rounded-xl border border-neutral-200/50 p-1 shadow-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2.5 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center gap-2 text-sm font-medium ${
                    viewMode === 'grid'
                      ? 'bg-accent-100/80 text-brand-green shadow-sm'
                      : 'text-neutral-600 hover:bg-neutral-100/70'
                  }`}
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span className="hidden md:inline">Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-2.5 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center gap-2 text-sm font-medium ${
                    viewMode === 'table'
                      ? 'bg-accent-100/80 text-brand-green shadow-sm'
                      : 'text-neutral-600 hover:bg-neutral-100/70'
                  }`}
                  aria-label="Table view"
                  aria-pressed={viewMode === 'table'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden md:inline">Table</span>
                </button>
              </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadStaff(currentPage)}
                  disabled={loading}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <span className="font-medium text-brand-green">
              {searchQuery ? filteredStaff.length : total}
            </span>
            {searchQuery ? 'matching' : 'total'} staff members
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
              <p className="text-neutral-600 text-sm">Loading staff...</p>
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
                  <p className="text-sm font-medium text-red-800">Error loading data</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

            {/* Data Content */}
            {!loading && !error && filteredStaff.length > 0 && (
              <>
              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStaff.map((member) => {
                    const genderInfo = getGenderDisplay(member.gender);
                    return (
                      <div
                        key={member.id}
                        className="group bg-white rounded-2xl border border-neutral-200/50 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                      >
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-green to-brand-green/80 text-white flex items-center justify-center text-lg font-medium shadow-md transition-transform duration-300 group-hover:scale-110">
                              {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                            </div>
                          </div>

                          {/* Staff Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-medium text-neutral-800 mb-1 truncate group-hover:text-brand-green transition-colors">
                              {getFullName(member)}
                            </h3>

                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <Badge variant={getDesignationVariant(member.designation)} size="sm">
                                {member.designation}
                              </Badge>
                              <Badge variant={genderInfo.variant} size="sm">
                                {genderInfo.icon} {genderInfo.label}
                              </Badge>
                            </div>

                            <div className="space-y-2 text-xs text-neutral-600 mb-3">
                              <div className="flex items-center gap-2">
                                <svg
                                  className="w-4 h-4 flex-shrink-0 text-neutral-500"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                  />
                                </svg>
                                <span className="truncate">{member.email}</span>
                              </div>

                              {member.phone && (
                                <div className="flex items-center gap-2">
                                  <svg
                                    className="w-4 h-4 flex-shrink-0 text-neutral-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                    />
                                  </svg>
                                  <span>{member.phone}</span>
                                </div>
                              )}
                            </div>

                            <div className="pt-3 border-t border-neutral-200/70 space-y-1">
                              <div className="text-xs text-neutral-500">Department</div>
                              <div className="text-sm font-medium text-brand-green">
                                {formatDisplayValue(getDepartmentName(member.department))}
                              </div>
                              {getInstitutionName(member.institution) !== 'N/A' && (
                                <>
                                  <div className="text-xs text-neutral-500 mt-2">Institution</div>
                                  <div className="text-sm text-neutral-700">
                                    {getInstitutionName(member.institution)}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}

              {/* Table View */}
              {viewMode === 'table' && (
                <div className="overflow-x-auto rounded-2xl border border-neutral-200/50 shadow-sm">
                  <table className="w-full">
                    <thead className="bg-neutral-50/80 border-b border-neutral-200/70">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wide">
                          Staff Member
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wide">
                          Designation
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wide">
                          Contact
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wide">
                          Department
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wide">
                          Institution
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wide">
                          Gender
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/50">
                      {filteredStaff.map((member) => {
                        const genderInfo = getGenderDisplay(member.gender);
                        return (
                          <tr
                            key={member.id}
                            className="hover:bg-gradient-to-r hover:from-brand-cream/30 hover:to-transparent transition-all duration-300 group"
                          >
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-green to-brand-green/80 text-white flex items-center justify-center text-xs font-medium flex-shrink-0 shadow-md transition-transform duration-300 group-hover:scale-110">
                                  {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium text-neutral-800 text-sm group-hover:text-brand-green transition-colors">
                                    {getFullName(member)}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <Badge variant={getDesignationVariant(member.designation)} size="sm">
                                {member.designation}
                              </Badge>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-xs text-neutral-700">
                                  <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  <span className="truncate max-w-[200px]">{member.email}</span>
                                </div>
                                {member.phone && (
                                  <div className="flex items-center gap-1.5 text-xs text-neutral-700">
                                    <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span>{member.phone}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="text-sm font-medium text-brand-green">
                                {formatDisplayValue(getDepartmentName(member.department))}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="text-sm text-neutral-700">
                                {formatDisplayValue(getInstitutionName(member.institution))}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <Badge
                                variant={genderInfo.variant}
                                size="sm"
                              >
                                {genderInfo.icon} {genderInfo.label}
                              </Badge>
                            </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

              {/* Pagination */}
              {!searchQuery && totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-neutral-600">
                    Showing {staff.length} of {total} results
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
          {!loading && !error && filteredStaff.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-brand-green/10 rounded-full blur-2xl" />
                <div className="relative bg-gradient-to-br from-brand-green/10 to-brand-yellow/10 rounded-full p-6">
                  <svg className="w-16 h-16 text-brand-green/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                {searchQuery ? 'No matching staff members' : 'No staff found'}
              </h3>
              <p className="text-sm text-neutral-600 text-center max-w-sm mb-4">
                {searchQuery
                  ? 'Try adjusting your search terms or filters to find what you\'re looking for'
                  : 'No data available from the API at this time'}
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery('')}
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
