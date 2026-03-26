'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import Card from '@/components/ui/Card';
import SearchInput from '@/components/ui/SearchInput';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ErrorState, NoSearchResults } from '@/components/ui/EmptyState';
import HorizontalFilterBar from '@/components/filters/HorizontalFilterBar';
import { useFilters } from '@/hooks/useFilters';
import { useMentorDirectory } from '@/hooks/mentor/useMentorDirectory';
import type { FilterConfig } from '@/lib/types/filters';

export default function MentorListingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const { allMentors, mentors, loading, error, refetch } = useMentorDirectory(searchQuery);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Derive filter options from the actual loaded mentor data
  // This guarantees filter values match the data exactly
  const filterConfigs: FilterConfig[] = useMemo(() => {
    const uniqueInstitutions = [...new Set(allMentors.map(m => m.institution).filter(Boolean))].sort();
    const uniqueDepartments = [...new Set(allMentors.map(m => m.department).filter(Boolean))].sort();
    const uniqueDesignations = [...new Set(allMentors.map(m => m.designation).filter(Boolean))].sort();

    return [
      {
        key: 'institution',
        label: 'Institution',
        type: 'dropdown' as const,
        options: uniqueInstitutions.map(inst => ({ value: inst!, label: inst! })),
        placeholder: 'All institutions',
        width: 'w-56',
      },
      {
        key: 'department',
        label: 'Department',
        type: 'dropdown' as const,
        options: uniqueDepartments.map(dept => ({ value: dept, label: dept })),
        placeholder: 'All departments',
        width: 'w-56',
      },
      {
        key: 'designation',
        label: 'Designation',
        type: 'dropdown' as const,
        options: uniqueDesignations.map(des => ({ value: des, label: des })),
        placeholder: 'All designations',
        width: 'w-56',
      },
    ];
  }, [allMentors]);

  // Initialize filters hook
  const { filters, setFilter, clearAllFilters, activeFiltersCount } = useFilters({}, true);

  const displayedMentors = useMemo(() => {
    let result = mentors;
    if (filters.institution && filters.institution !== '') {
      result = result.filter((m) =>
        m.institution?.toLowerCase().includes((filters.institution as string).toLowerCase())
      );
    }
    if (filters.department && filters.department !== '') {
      result = result.filter((m) =>
        m.department?.toLowerCase().includes((filters.department as string).toLowerCase())
      );
    }
    if (filters.designation && filters.designation !== '') {
      result = result.filter((m) =>
        m.designation?.toLowerCase().includes((filters.designation as string).toLowerCase())
      );
    }
    return result;
  }, [mentors, filters]);

  const handleMentorClick = (mentorId: string) => {
    router.push(`/mentor/${mentorId}`);
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 p-4 lg:p-6 space-y-4 lg:space-y-5">
      {user?.role === 'faculty' && (
        <p className="text-amber-700 text-[12px] lg:text-[13px] flex items-center gap-1.5 -mt-2">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          You can only view your own profile. Contact HOD for broader access.
        </p>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-xl p-4 lg:p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:gap-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <SearchInput
              placeholder="Search mentors by name, email, department..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="w-full sm:flex-1"
            />

            {/* View Toggle - Super Admin only */}
            {user?.role === 'super_admin' && (
              <div className="hidden lg:flex items-center gap-1 rounded-lg bg-neutral-100 p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 rounded-md transition-all min-w-[40px] min-h-[40px] flex items-center gap-1.5 text-sm font-medium ${
                    viewMode === 'grid'
                      ? 'bg-accent-100/80 text-brand-green shadow-sm'
                      : 'text-neutral-500 hover:bg-neutral-100/70'
                  }`}
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-2 rounded-md transition-all min-w-[40px] min-h-[40px] flex items-center gap-1.5 text-sm font-medium ${
                    viewMode === 'table'
                      ? 'bg-accent-100/80 text-brand-green shadow-sm'
                      : 'text-neutral-500 hover:bg-neutral-100/70'
                  }`}
                  aria-label="Table view"
                  aria-pressed={viewMode === 'table'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Table
                </button>
              </div>
            )}
          </div>

          {/* Filters - Super Admin only */}
          {user?.role === 'super_admin' && (
            <HorizontalFilterBar
              filters={filterConfigs}
              filterState={filters}
              onFilterChange={setFilter}
              onClearAll={clearAllFilters}
              activeFiltersCount={activeFiltersCount}
              loading={loading}
            />
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <ErrorState
          title="Failed to load mentors"
          message={error}
          onRetry={refetch}
        />
      )}

      {/* Initial State - No Search (only show for non-faculty users when no data loaded) */}
      {!loading && !error && allMentors.length === 0 && user?.role !== 'faculty' && (
        <div className="bg-white rounded-xl p-10 lg:p-12 text-center shadow-sm">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-base font-medium text-neutral-800 mb-1.5">
              Search for Mentors
            </h3>
            <p className="text-neutral-600 text-sm">
              Use the search bar above to find learning facilitators by name, email, or department.
            </p>
          </div>
        </div>
      )}

      {/* No Results After Search */}
      {!loading && !error && displayedMentors.length === 0 && allMentors.length > 0 && (
        <NoSearchResults
          searchQuery={searchQuery}
          onClearSearch={() => setSearchQuery('')}
        />
      )}

      {/* Mentors Content */}
      {!loading && !error && displayedMentors.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-600">
              Found <span className="font-medium text-brand-green">{displayedMentors.length}</span> mentor{displayedMentors.length !== 1 ? 's' : ''}
              {activeFiltersCount > 0 && (
                <span className="text-xs ml-2">({allMentors.length} total)</span>
              )}
            </p>
          </div>

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayedMentors.map((mentor) => (
                  <div
                    key={mentor.id}
                    onClick={() => handleMentorClick(mentor.id)}
                    className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col h-full group"
                  >
                    {/* Avatar and Basic Info */}
                    <div className="flex items-start gap-3 mb-2.5">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {mentor.avatar ? (
                          <img
                            src={mentor.avatar}
                            alt={mentor.name}
                            className="w-11 h-11 rounded-full object-cover border-2 border-primary-500 shadow-sm"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center text-sm font-medium shadow-sm">
                            {mentor.name ? mentor.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2) : '?'}
                          </div>
                        )}
                      </div>

                      {/* Mentor Basic Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium text-neutral-800 mb-1 line-clamp-2 group-hover:text-brand-green transition-colors">
                          {mentor.name}
                        </h3>

                        <p className="text-sm text-neutral-600 mb-0.5 line-clamp-1">
                          {mentor.designation}
                        </p>
                      </div>
                    </div>

                    {/* Department Badge */}
                    {mentor.department && (
                      <div className="mb-2.5">
                        <Badge variant="success" size="sm" className="inline-flex">
                          {mentor.department}
                        </Badge>
                      </div>
                    )}

                    {/* Contact Information */}
                    <div className="space-y-1.5 text-sm text-neutral-700 mb-2.5">
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
                        <span className="truncate text-xs">{mentor.email}</span>
                      </div>

                      {mentor.phone && (
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
                          <span className="text-xs">{mentor.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Student Count and View Details - Footer */}
                    <div className="mt-auto pt-3 border-t border-neutral-100">
                      <div className="flex items-center justify-between">
                        {mentor.totalStudents !== undefined && (
                          <div className="flex items-center gap-2 text-sm">
                            <svg
                              className="w-4 h-4 flex-shrink-0 text-brand-green"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                              />
                            </svg>
                            <span className="font-medium text-brand-green">
                              {mentor.totalStudents}
                            </span>
                            <span className="text-neutral-600 text-xs">
                              {mentor.totalStudents === 1 ? 'Student' : 'Students'}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center text-brand-green font-medium text-sm group-hover:translate-x-1 transition-transform">
                          View
                          <svg
                            className="w-4 h-4 ml-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <DataTable
                  columns={[
                    {
                      key: 'name',
                      label: 'Name',
                      sortable: true,
                      render: (mentor) => (
                        <div className="flex items-center gap-3">
                          {mentor.avatar ? (
                            <img
                              src={mentor.avatar}
                              alt={mentor.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-brand-green"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-brand-yellow text-brand-green flex items-center justify-center text-lg font-medium border-2 border-brand-green">
                              {mentor.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                          <span className="font-medium text-brand-green">{mentor.name}</span>
                        </div>
                      ),
                    },
                    {
                      key: 'designation',
                      label: 'Designation',
                      sortable: true,
                    },
                    {
                      key: 'department',
                      label: 'Department',
                      sortable: true,
                      render: (mentor) => mentor.department ? (
                        <Badge variant="success" size="sm">
                          {mentor.department}
                        </Badge>
                      ) : <span className="text-neutral-400">—</span>,
                    },
                    {
                      key: 'email',
                      label: 'Email',
                      hideOnMobile: true,
                      mobileLabel: 'Email',
                    },
                    {
                      key: 'totalStudents',
                      label: 'Students',
                      sortable: true,
                      render: (mentor) => (
                        <span className="font-medium text-brand-green">
                          {mentor.totalStudents || 0}
                        </span>
                      ),
                    },
                  ]}
                  data={displayedMentors}
                  keyExtractor={(mentor) => mentor.id}
                  onRowClick={(mentor) => handleMentorClick(mentor.id)}
                  hoverable
                />
              )}
        </>
      )}
    </div>
  );
}
