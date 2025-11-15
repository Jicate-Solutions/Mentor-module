'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SearchInput from '@/components/ui/SearchInput';
import {
  fetchDepartments,
  checkApiStatus,
  formatDate,
  type Department,
  type ApiError,
} from '@/lib/api/jkkn-api';

export default function DepartmentsPage() {
  // API status
  const [isConfigured, setIsConfigured] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Checking API...');

  // Departments data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');

  // Check API status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  // Fetch departments when API is configured
  useEffect(() => {
    if (isConfigured) {
      loadDepartments(1);
    }
  }, [isConfigured]);

  // Filter departments based on search
  useEffect(() => {
    if (searchQuery) {
      const filtered = departments.filter((dept) =>
        dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dept.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDepartments(filtered);
    } else {
      setFilteredDepartments(departments);
    }
  }, [searchQuery, departments]);

  /**
   * Check API configuration status
   */
  const checkStatus = async () => {
    try {
      const status = await checkApiStatus();
      setIsConfigured(status.configured);
      setStatusMessage(status.message);
    } catch (err: any) {
      setIsConfigured(false);
      setStatusMessage('Failed to check API status');
    }
  };

  /**
   * Load departments data
   */
  const loadDepartments = async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchDepartments(page, 10);

      setDepartments(response.data);
      setFilteredDepartments(response.data);
      setCurrentPage(response.metadata.page);
      setTotalPages(response.metadata.totalPages);
      setTotal(response.metadata.total);
    } catch (err: any) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch departments data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle page change
   */
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadDepartments(page);
    setSearchQuery(''); // Clear search when changing pages
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 p-4 lg:p-6 space-y-6">
      {/* Hero Header */}
      <div className="bg-white rounded-xl border border-neutral-200/50 p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-brand-green mb-2">
              JKKN Departments
            </h1>
            <p className="text-neutral-600 text-sm lg:text-base">
              Browse and manage departments from MyJKKN database
            </p>
          </div>
          {isConfigured && (
            <Badge variant="success" size="lg">
              ✓ API Connected
            </Badge>
          )}
        </div>
      </div>

      {/* API Not Configured Warning */}
      {!isConfigured && (
        <div className="bg-yellow-50/80 rounded-xl border border-yellow-200/60 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-base font-semibold text-yellow-800 mb-1">API Not Configured</p>
              <p className="text-sm text-yellow-700">
                {statusMessage}. Please add NEXT_PUBLIC_MYJKKN_API_KEY to your .env.local file to view departments data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {isConfigured && (
        <div className="bg-white rounded-xl border border-neutral-200/50 p-6 shadow-sm space-y-6">
          {/* Search and Actions Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <SearchInput
                value={searchQuery}
                onChange={(value) => setSearchQuery(value)}
                placeholder="Search by name or code..."
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadDepartments(currentPage)}
              disabled={loading}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <span className="font-semibold text-brand-green">
              {searchQuery ? filteredDepartments.length : total}
            </span>
            {searchQuery ? 'matching' : 'total'} departments
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
              <p className="text-neutral-600 text-sm">Loading departments...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50/80 border border-red-200/60 rounded-xl p-4">
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
          {!loading && !error && filteredDepartments.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-lg border border-neutral-200/50">
                <table className="w-full">
                  <thead className="bg-neutral-50/80 border-b border-neutral-200/70">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wide">
                        Department Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wide">
                        Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wide">
                        Institution ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wide">
                        Created
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wide">
                        Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/50">
                    {filteredDepartments.map((department) => (
                      <tr
                        key={department.id}
                        className="hover:bg-neutral-50/60 transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-neutral-800 text-sm">
                            {department.name}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-accent-100/80 text-brand-green border border-accent-200">
                            {department.code}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-neutral-700 font-mono">
                          {department.institution_id}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge
                            variant={department.is_active ? 'success' : 'default'}
                            size="sm"
                          >
                            {department.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-neutral-600">
                          {formatDate(department.created_at)}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-neutral-600">
                          {formatDate(department.updated_at)}
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
                    Showing {departments.length} of {total} results
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
          {!loading && !error && filteredDepartments.length === 0 && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📚</div>
              <h3 className="text-lg font-semibold text-neutral-800 mb-2">
                {searchQuery ? 'No matching departments' : 'No departments found'}
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
    </div>
  );
}
