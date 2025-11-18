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

  // Filter configuration - Fetch options from JKKN API
  const filterConfigs: FilterConfig[] = [
    {
      key: 'institution',
      label: 'Institution',
      type: 'dropdown',
      options: async () => {
        try {
          const response = await fetch('/api/jkkn/institutions', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            return (data.data || []).map((inst: any) => ({
              value: inst.institution_name || inst.name,
              label: inst.institution_name || inst.name,
            }));
          }
        } catch (error) {
          console.error('Error loading institutions:', error);
        }
        return [];
      },
      placeholder: 'All institutions',
      width: 'w-56',
    },
    {
      key: 'department',
      label: 'Department',
      type: 'dropdown',
      options: async () => {
        try {
          const response = await fetch('/api/jkkn/departments', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            return (data.data || []).map((dept: any) => ({
              value: dept.department_name || dept.name,
              label: dept.department_name || dept.name,
            }));
          }
        } catch (error) {
          console.error('Error loading departments:', error);
        }
        return [];
      },
      placeholder: 'All departments',
      width: 'w-56',
    },
    {
      key: 'program',
      label: 'Program',
      type: 'dropdown',
      options: async () => {
        try {
          const response = await fetch('/api/jkkn/programs', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            return (data.data || []).map((prog: any) => ({
              value: prog.program_name || prog.name,
              label: prog.program_name || prog.name,
            }));
          }
        } catch (error) {
          console.error('Error loading programs:', error);
        }
        return [];
      },
      placeholder: 'All programs',
      width: 'w-56',
    },
    {
      key: 'designation',
      label: 'Designation',
      type: 'dropdown',
      options: [
        { value: 'professor', label: 'Professor' },
        { value: 'associate professor', label: 'Associate Professor' },
        { value: 'assistant professor', label: 'Assistant Professor' },
        { value: 'lecturer', label: 'Lecturer' },
        { value: 'tutor', label: 'Tutor' },
      ],
      placeholder: 'All designations',
      width: 'w-56',
    },
  ];

  // Initialize filters hook
  const { filters, setFilter, clearAllFilters, activeFiltersCount } = useFilters({}, true);

  useEffect(() => {
    if (accessToken) {
      fetchIncharges();
    }
  }, [accessToken]);

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
        return inchargeName.includes(query) || inchargeEmail.includes(query);
      });
    }

    // Apply institution filter (Note: This will filter based on institution_id)
    // For now, keeping simple - you may need to enhance this to fetch institution names
    if (filters.institution && filters.institution !== '') {
      filtered = filtered.filter((assignment) => {
        // Filter assignments where the incharge's institution matches
        const inchargeInstitutionId = assignment.incharge?.[0]?.institution_id;
        return inchargeInstitutionId && inchargeInstitutionId.includes(filters.institution as string);
      });
    }

    // Apply department filter
    if (filters.department && filters.department !== '') {
      filtered = filtered.filter((assignment) => {
        const inchargeDepartmentId = assignment.incharge?.[0]?.department_id;
        return inchargeDepartmentId && inchargeDepartmentId.includes(filters.department as string);
      });
    }

    // Apply program filter (if program data is available in the future)
    if (filters.program && filters.program !== '') {
      // Program filtering logic - to be implemented when program data is available
      // filtered = filtered.filter((assignment) => ...);
    }

    // Apply designation filter (if designation data is available in the future)
    if (filters.designation && filters.designation !== '') {
      // Designation filtering logic - to be implemented when designation data is available
      // filtered = filtered.filter((assignment) => ...);
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Mentor Incharge Management</h1>
          <p className="text-neutral-600 mt-1">Assign mentors to supervise other mentors in their department or institution</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowAssignModal(true)}
          className="bg-brand-green hover:bg-brand-green/90"
        >
          Assign Mentor Incharge
        </Button>
      </div>

      {/* Search and Filters - Always visible */}
      <div className="space-y-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by incharge name or email..."
          className="max-w-md"
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
        <Card>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-brand-yellow/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="text-neutral-600 mb-4">No Mentor Incharges assigned yet</p>
            <p className="text-sm text-neutral-500 mb-6">Assign a mentor to supervise other mentors' activities</p>
            <Button
              variant="primary"
              onClick={() => setShowAssignModal(true)}
              className="bg-brand-green hover:bg-brand-green/90"
            >
              Assign First Incharge
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredIncharges.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <p className="text-neutral-600">No incharges match your filters</p>
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              </div>
            </Card>
          ) : (
            filteredIncharges.map((incharge) => {
            const inchargeUser = incharge.incharge?.[0];
            const assignerUser = incharge.assigner?.[0];

            return (
              <Card key={incharge.id} className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-neutral-900 truncate">
                        {inchargeUser?.full_name || 'Unknown'}
                      </h3>
                      <Badge variant={incharge.is_active ? 'success' : 'default'}>
                        {incharge.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="warning">
                        {getScopeLabel(incharge)}
                      </Badge>
                    </div>
                    <p className="text-sm text-neutral-600 mb-3 break-words">{inchargeUser?.email}</p>

                    {incharge.department_ids && incharge.department_ids.length > 0 && (
                      <div className="text-sm text-neutral-600 mb-2">
                        <strong>Departments:</strong> {incharge.department_ids.join(', ')}
                      </div>
                    )}

                    {incharge.notes && (
                      <div className="text-sm text-neutral-600 mb-2">
                        <strong>Notes:</strong> {incharge.notes}
                      </div>
                    )}

                    <div className="text-xs text-neutral-500 mt-3">
                      Assigned on {new Date(incharge.assigned_at).toLocaleDateString()}
                      {assignerUser && ` by ${assignerUser.full_name}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {incharge.is_active ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeactivate(incharge.id)}
                        >
                          Deactivate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(incharge.id)}
                          className="text-red-600 hover:text-red-700 hover:border-red-600"
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(incharge.id)}
                        className="text-red-600 hover:text-red-700 hover:border-red-600"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
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
