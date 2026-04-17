'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SearchInput from '@/components/ui/SearchInput';
import { SkeletonCard } from '@/components/ui/Skeleton';
import HorizontalFilterBar from '@/components/filters/HorizontalFilterBar';
import { useFilters } from '@/hooks/useFilters';
import type { FilterConfig } from '@/lib/types/filters';
import AssignInchargeModal from './components/AssignInchargeModal';

interface InchargeAssignment {
  id: string;
  incharge_id: string;
  scope_type: string;
  institution_id: string | null;
  department_ids: string[];
  assigned_at: string;
  is_active: boolean;
  notes: string | null;
  incharge: {
    id: string;
    full_name: string;
    email: string;
    department_id: string | null;
    institution_id: string | null;
  }[];
  assigner: {
    id: string;
    full_name: string;
  }[];
}

export default function MentorInchargePage() {
  const { accessToken } = useAuth();
  const toast = useToast();

  const [incharges, setIncharges] = useState<InchargeAssignment[]>([]);
  const [filteredIncharges, setFilteredIncharges] = useState<InchargeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter configuration - Simplified for mentor incharge (institution/department scope only)
  const filterConfigs: FilterConfig[] = [
    {
      key: 'scope_type',
      label: 'Scope',
      type: 'dropdown',
      options: [
        { value: 'institution', label: 'Institution-wide' },
        { value: 'multi_department', label: 'Multi-Department' },
        { value: 'department', label: 'Department' },
      ],
      placeholder: 'All scopes',
      width: 'w-48',
    },
  ];

  // Initialize filters hook
  const { filters, setFilter, clearAllFilters, activeFiltersCount } = useFilters({}, true);

  useEffect(() => {
    if (accessToken) {
      fetchIncharges();
      // Delay background sync to ensure auth is fully initialized
      // This prevents race conditions with token validation
      const syncTimer = setTimeout(() => {
        performBackgroundSync();
      }, 1000); // 1 second delay

      return () => clearTimeout(syncTimer);
    }
  }, [accessToken]);

  const performBackgroundSync = async (retryCount = 0) => {
    // Verify we have a valid access token before attempting sync
    if (!accessToken) {
      console.warn('[Background Sync] Skipped: No access token available');
      return;
    }

    try {
      console.log('[Background Sync] Checking mentor sync status...');
      const response = await fetch('/api/admin/mentors/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('[Background Sync] ✓ Complete:', data.stats);
        // Show toast when mentors are created or deactivated
        if (data.stats.created > 0 || data.stats.deactivated > 0) {
          const parts: string[] = [];
          if (data.stats.created > 0) parts.push(`${data.stats.created} new`);
          if (data.stats.deactivated > 0) parts.push(`${data.stats.deactivated} deactivated`);
          toast.success('Mentors Synced', parts.join(', ') + ' — refresh page to update list');
        }
      } else if (response.status === 403 && retryCount < 2) {
        // Auth issue - retry once after a delay (token might not be fully validated yet)
        console.warn('[Background Sync] Auth failed, retrying in 2s... (attempt', retryCount + 1, ')');
        setTimeout(() => {
          performBackgroundSync(retryCount + 1);
        }, 2000);
      } else {
        console.warn('[Background Sync] Failed:', data.error);
        // Don't show toast for auth errors to avoid annoying users
        if (response.status !== 403) {
          console.error('[Background Sync] Unexpected error:', data.error);
        }
      }
    } catch (error) {
      console.error('[Background Sync] Error:', error);
      // Don't show toast for network errors during background sync
    }
  };

  const fetchIncharges = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/mentor-incharge', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        const inchargeData = data.data || [];
        setIncharges(inchargeData);
        setFilteredIncharges(inchargeData);
      } else {
        toast.error('Failed to load incharges', data.error);
      }
    } catch (error) {
      toast.error('Error loading incharges', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Apply search and filters
  useEffect(() => {
    let filtered = [...incharges];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((assignment) => {
        const inchargeName = assignment.incharge?.[0]?.full_name?.toLowerCase() || '';
        const inchargeEmail = assignment.incharge?.[0]?.email?.toLowerCase() || '';
        const scopeLabel = getScopeLabel(assignment).toLowerCase();
        const notes = assignment.notes?.toLowerCase() || '';
        return inchargeName.includes(query) ||
               inchargeEmail.includes(query) ||
               scopeLabel.includes(query) ||
               notes.includes(query);
      });
    }

    // Apply scope type filter
    if (filters.scope_type && filters.scope_type !== '') {
      filtered = filtered.filter((assignment) => {
        return assignment.scope_type === filters.scope_type;
      });
    }

    setFilteredIncharges(filtered);
  }, [searchQuery, filters, incharges]);

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this Mentor Incharge assignment?')) return;

    try {
      const response = await fetch(`/api/admin/mentor-incharge/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: false }),
      });

      if (response.ok) {
        toast.success('Deactivated', 'Assignment deactivated successfully');
        fetchIncharges();
      } else {
        const data = await response.json();
        toast.error('Failed to deactivate', data.error);
      }
    } catch (error) {
      toast.error('Error', 'Failed to deactivate assignment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove Mentor Incharge assignment? The mentor will no longer have supervisory access.')) return;

    try {
      const response = await fetch(`/api/admin/mentor-incharge/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        toast.success('Removed', 'Mentor Incharge assignment removed successfully');
        fetchIncharges();
      } else {
        const data = await response.json();
        toast.error('Failed to remove', data.error);
      }
    } catch (error) {
      toast.error('Error', 'Failed to remove assignment');
    }
  };

  const getScopeLabel = (assignment: InchargeAssignment) => {
    if (assignment.scope_type === 'institution') {
      return 'Institution-wide';
    }
    if (assignment.scope_type === 'multi_department') {
      return `${assignment.department_ids?.length || 0} Departments`;
    }
    return 'Department';
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50 p-4 lg:p-6 space-y-4 lg:space-y-5">
      {/* Assign Incharge Button */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={() => setShowAssignModal(true)}
          className="bg-brand-green hover:bg-brand-green/90 w-full lg:w-auto flex items-center justify-center min-h-[44px] lg:min-h-0"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Assign Incharge
        </Button>
      </div>

      {/* Search and Filters - Always visible */}
      <div className="space-y-3 lg:space-y-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by incharge name or email..."
          className="w-full lg:max-w-md"
        />

        <HorizontalFilterBar
          filters={filterConfigs}
          filterState={filters}
          onFilterChange={setFilter}
          onClearAll={clearAllFilters}
          activeFiltersCount={activeFiltersCount}
          loading={loading}
        />
      </div>

      {incharges.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200/50 p-4 lg:p-6 shadow-sm">
          <div className="flex flex-col items-center justify-center py-12 lg:py-16 px-4">
            <div className="relative mb-4 lg:mb-6">
              <div className="absolute inset-0 bg-brand-green/10 rounded-full blur-2xl" />
              <div className="relative bg-gradient-to-br from-brand-green/10 to-brand-yellow/10 rounded-full p-4 lg:p-6">
                <svg className="w-12 h-12 lg:w-16 lg:h-16 text-brand-green/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <h3 className="text-[16px] lg:text-[18px] font-medium text-neutral-900 mb-2 text-center">
              No Mentor Incharges assigned yet
            </h3>
            <p className="text-[13px] lg:text-[14px] text-neutral-600 text-center max-w-sm mb-4 leading-relaxed">
              Assign a mentor to supervise other mentors' activities in their department or institution
            </p>
            <Button
              variant="primary"
              onClick={() => setShowAssignModal(true)}
              className="bg-brand-green hover:bg-brand-green/90 w-full sm:w-auto min-h-[44px] sm:min-h-0"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Assign First Incharge
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 lg:space-y-4">
          {filteredIncharges.length === 0 ? (
            <div className="bg-white rounded-xl border border-neutral-200/50 p-4 lg:p-6 shadow-sm">
              <div className="flex flex-col items-center justify-center py-8 lg:py-12 px-4">
                <div className="relative mb-4 lg:mb-6">
                  <div className="absolute inset-0 bg-brand-green/10 rounded-full blur-xl" />
                  <div className="relative bg-gradient-to-br from-brand-green/10 to-brand-yellow/10 rounded-full p-3 lg:p-4">
                    <svg className="w-10 h-10 lg:w-12 lg:h-12 text-brand-green/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <h4 className="text-[15px] lg:text-[16px] font-medium text-neutral-900 mb-1 text-center">
                  No matches found
                </h4>
                <p className="text-[13px] lg:text-[14px] text-neutral-600 text-center max-w-sm mb-4 leading-relaxed">
                  No incharges match your current filters. Try adjusting your search criteria.
                </p>
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          ) : (
            filteredIncharges.map((incharge) => {
            const inchargeUser = incharge.incharge?.[0];
            const assignerUser = incharge.assigner?.[0];

            return (
              <div key={incharge.id} className="bg-white border border-neutral-200 rounded-xl p-4 lg:p-6 hover:border-brand-green/30 hover:shadow-md transition-all">
                <div className="flex flex-col gap-4">
                  {/* Header Section */}
                  <div className="flex items-start justify-between gap-3">
                    {/* User Avatar */}
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-brand-green to-primary-600 text-white flex items-center justify-center text-sm lg:text-base font-medium flex-shrink-0">
                      {inchargeUser?.full_name?.charAt(0).toUpperCase() || 'N'}
                    </div>

                    {/* Name and Badges */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] lg:text-[16px] font-medium text-neutral-900 mb-2 break-words">
                        {inchargeUser?.full_name || 'Unknown'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={incharge.is_active ? 'success' : 'default'}>
                          {incharge.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="warning">
                          {getScopeLabel(incharge)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="text-[13px] lg:text-[14px] text-neutral-600 break-words leading-relaxed">
                    {inchargeUser?.email}
                  </div>

                  {/* Department Info */}
                  {incharge.department_ids && incharge.department_ids.length > 0 && (
                    <div className="text-[13px] lg:text-[14px] text-neutral-600 leading-relaxed">
                      <strong className="font-medium text-neutral-800">Departments:</strong>
                      <span className="ml-1">{incharge.department_ids.join(', ')}</span>
                    </div>
                  )}

                  {/* Notes */}
                  {incharge.notes && (
                    <div className="text-[13px] lg:text-[14px] text-neutral-600 leading-relaxed">
                      <strong className="font-medium text-neutral-800">Notes:</strong>
                      <span className="ml-1">{incharge.notes}</span>
                    </div>
                  )}

                  {/* Assignment Info */}
                  <div className="text-[12px] lg:text-[13px] text-neutral-500 pt-2 border-t border-neutral-100">
                    Assigned on {new Date(incharge.assigned_at).toLocaleDateString()}
                    {assignerUser && ` by ${assignerUser.full_name}`}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    {incharge.is_active ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeactivate(incharge.id)}
                          className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
                        >
                          Deactivate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(incharge.id)}
                          className="w-full sm:w-auto min-h-[44px] sm:min-h-0 text-red-600 hover:text-red-700 hover:border-red-600"
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(incharge.id)}
                        className="w-full sm:w-auto min-h-[44px] sm:min-h-0 text-red-600 hover:text-red-700 hover:border-red-600"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
          )}
        </div>
      )}

      {showAssignModal && (
        <AssignInchargeModal
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            setShowAssignModal(false);
            fetchIncharges();
          }}
        />
      )}
    </div>
  );
}
