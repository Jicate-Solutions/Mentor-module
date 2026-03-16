'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import useConfirm from '@/lib/hooks/useConfirm';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SearchInput from '@/components/ui/SearchInput';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { SkeletonCard } from '@/components/ui/Skeleton';
import BulkImportModal from './BulkImportModal';
import AddLearnerFilters from './AddLearnerFilters';
import { useAddLearnerFilters } from '@/hooks/useAddLearnerFilters';
import { useAssignedStudents } from '@/hooks/mentor/useAssignedStudents';
import { useStudentSearch } from '@/hooks/mentor/useStudentSearch';
import type { Student } from '@/lib/types/mentor';

interface StudentsTabProps {
  mentorId: string;
}

export default function StudentsTab({ mentorId }: StudentsTabProps) {
  const { accessToken } = useAuth();
  const toast = useToast();
  const { ConfirmationDialog, confirm } = useConfirm();

  const {
    students: assignedStudents,
    loading,
    refetch: fetchStudents,
  } = useAssignedStudents(mentorId);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);

  // Add Student Modal State
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Advanced Filters
  const {
    filters: advancedFilters,
    setFilter: setAdvancedFilter,
    clearAllFilters,
    filterOptions,
    loading: filterLoading,
    activeFiltersCount,
  } = useAddLearnerFilters();

  const assignedStudentIds = useMemo(() => assignedStudents.map(s => s.id), [assignedStudents]);

  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    searching,
    error: searchError,
    clearSearch,
  } = useStudentSearch(assignedStudentIds, mentorId);

  useEffect(() => {
    if (searchError) {
      toast.error('Search error', searchError);
    }
  }, [searchError, toast]);

  // Apply advanced filters to search results
  const filteredSearchResults = useMemo(() => {
    let results = [...searchResults];

    // Apply institution filter
    if (advancedFilters.institution_id) {
      results = results.filter((student: any) => {
        const instId = student.institution_id || student.institution?.id;
        return instId === advancedFilters.institution_id;
      });
    }

    // Apply degree filter
    if (advancedFilters.degree_id) {
      results = results.filter((student: any) => {
        const degId = student.degree_id || student.degree?.id;
        return degId === advancedFilters.degree_id;
      });
    }

    // Apply department filter
    if (advancedFilters.department_id) {
      results = results.filter((student: any) => {
        const deptId = student.department_id || student.department?.id;
        // Also check by department name if ID not available
        if (deptId) {
          return deptId === advancedFilters.department_id;
        }
        // Fallback: check if department name matches
        const selectedDept = filterOptions.departments.find(
          (d) => d.value === advancedFilters.department_id
        );
        return selectedDept && student.department === selectedDept.label;
      });
    }

    // Apply program filter
    if (advancedFilters.program_id) {
      results = results.filter((student: any) => {
        const progId = student.program_id || student.program?.id;
        return progId === advancedFilters.program_id;
      });
    }

    // Apply semester filter
    if (advancedFilters.semester) {
      results = results.filter((student: any) => {
        const semester = String(student.semester || student.current_semester || '');
        return semester === advancedFilters.semester;
      });
    }

    // Apply section filter
    if (advancedFilters.section) {
      results = results.filter((student: any) => {
        const section = String(student.section || '').toUpperCase();
        return section === advancedFilters.section.toUpperCase();
      });
    }

    // Apply academic year filter
    if (advancedFilters.academic_year) {
      results = results.filter((student: any) => {
        const year = student.academic_year || student.year || student.batch_year || '';
        return String(year) === advancedFilters.academic_year;
      });
    }

    // Apply status filter
    if (advancedFilters.status && advancedFilters.status !== 'all') {
      results = results.filter((student: any) => {
        const isActive = student.is_active !== false && student.status !== 'inactive';
        return advancedFilters.status === 'active' ? isActive : !isActive;
      });
    }

    return results;
  }, [searchResults, advancedFilters, filterOptions.departments]);

  // Toggle student selection
  const toggleStudentSelection = (student: Student) => {
    setSelectedStudents((prev) => {
      const isSelected = prev.some(s => s.id === student.id);
      if (isSelected) {
        return prev.filter(s => s.id !== student.id);
      } else {
        return [...prev, student];
      }
    });
  };

  // Assign students to mentor via a single bulk request
  const handleAssignStudents = async () => {
    if (selectedStudents.length === 0 || !accessToken) return;

    try {
      setAssigning(true);

      const response = await fetch(`/api/mentor/${mentorId}/students/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ students: selectedStudents }),
      });

      const json = await response.json();

      if (!response.ok) {
        toast.error('Assignment failed', json.error || 'Could not assign learners');
        return;
      }

      const { summary, results } = json.data;

      if (summary.assigned > 0) {
        await fetchStudents();
      }

      if (summary.assigned > 0 && summary.failed === 0 && summary.alreadyAssigned === 0) {
        toast.success(
          'Learners assigned',
          `Successfully assigned ${summary.assigned} learner${summary.assigned > 1 ? 's' : ''}`
        );
      } else if (summary.assigned > 0) {
        const parts: string[] = [`Assigned ${summary.assigned}`];
        if (summary.alreadyAssigned > 0) parts.push(`${summary.alreadyAssigned} already assigned`);
        if (summary.failed > 0) parts.push(`${summary.failed} failed`);
        toast.warning('Partial success', parts.join('. '));
      } else if (summary.alreadyAssigned > 0 && summary.failed === 0) {
        toast.warning('Already assigned', 'All selected learners are already assigned to this mentor');
      } else {
        const failMessages = results.failed
          .map((f: { rollNumber: string; error: string }) => f.error)
          .join('. ');
        toast.error('Assignment failed', failMessages || 'Could not assign any learners');
      }

      setShowAddModal(false);
      clearSearch();
      setSelectedStudents([]);
    } catch (error) {
      console.error('[StudentsTab] Assignment error:', error);
      toast.error('Assignment error', 'An unexpected error occurred. Please try again');
    } finally {
      setAssigning(false);
    }
  };

  // Remove student from mentor
  const handleRemoveStudent = async (studentId: string) => {
    if (!accessToken) return;

    const student = assignedStudents.find(s => s.id === studentId);
    if (!student) return;

    const confirmed = await confirm({
      title: 'Remove Learner',
      message: `Are you sure you want to remove ${student.name} from this mentor? This action cannot be undone.`,
      confirmText: 'Remove',
      variant: 'danger'
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/mentor/${mentorId}/students/${studentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        await fetchStudents();
        toast.success('Learner removed', `${student.name} has been removed from this mentor`);
      } else {
        const errorData = await response.json();
        toast.error('Failed to remove learner', errorData.error || 'An error occurred');
      }
    } catch (error) {
      toast.error('Removal error', 'An unexpected error occurred. Please try again');
    }
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 bg-neutral-200 rounded animate-pulse"></div>
          <div className="h-11 w-36 bg-neutral-200 rounded animate-pulse"></div>
        </div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-6">
        <h2 className="text-[17px] font-medium text-neutral-900">
          Assigned Learners ({assignedStudents.length})
        </h2>
        <div className="flex gap-2">
          {/* Bulk Import Button */}
          <button
            onClick={() => setShowBulkImportModal(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white hover:bg-neutral-50 text-brand-green font-medium rounded-lg transition-all flex items-center justify-center gap-2 text-[14px] border border-brand-green"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Bulk Import</span>
          </button>

          {/* Add Learner Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-brand-green hover:bg-brand-green/90 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 text-[14px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Learner</span>
          </button>
        </div>
      </div>

      {/* Students List */}
      {assignedStudents.length === 0 ? (
        <Card variant="elevated">
          <div className="text-center py-8 lg:py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-yellow/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-[16px] font-medium text-neutral-900 mb-2">
              No learners assigned yet
            </h3>
            <p className="text-[14px] text-neutral-600 leading-relaxed mb-4">
              Click "Add Learner" to assign learners to this mentor
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
          {assignedStudents.map((student) => (
            <div key={student.id} className="bg-white rounded-xl border border-neutral-200 hover:border-brand-green/30 shadow-sm hover:shadow-md transition-all p-4">
                <div className="flex items-start gap-3 mb-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {student.avatar ? (
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover border border-brand-green/20"
                      />
                    ) : (
                      <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-brand-yellow/20 text-brand-green flex items-center justify-center text-[14px] font-medium border border-brand-green/20">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Student Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-neutral-900 text-[15px] mb-0.5 truncate">
                      {student.name}
                    </h4>
                    <p className="text-[13px] text-neutral-600 mb-2 font-medium">
                      {student.rollNumber}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[12px] text-neutral-600 mb-1">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                        Year {student.year}
                      </span>
                      <span className="text-neutral-300">•</span>
                      <span>{student.department}</span>
                    </div>
                    <p className="text-[12px] text-neutral-500 truncate">
                      {student.email}
                    </p>
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemoveStudent(student.id)}
                  className="w-full px-3 py-2 text-[13px] font-medium text-red-600 hover:text-white bg-white hover:bg-red-600 border border-red-300 hover:border-red-600 rounded-lg transition-all"
                >
                  Remove Learner
                </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Student Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          clearSearch();
          setSelectedStudents([]);
          clearAllFilters();
        }}
        title="Add Learners"
        size="lg"
      >
        <div className="space-y-4">
          {/* Advanced Filters */}
          <AddLearnerFilters
            filters={advancedFilters}
            onFilterChange={setAdvancedFilter}
            onClearAll={clearAllFilters}
            filterOptions={filterOptions}
            loading={filterLoading}
            activeFiltersCount={activeFiltersCount}
          />

          {/* Search Input */}
          <SearchInput
            placeholder="Search by name, roll number, or email..."
            value={searchQuery}
            onChange={setSearchQuery}
            loading={searching}
          />

          {/* Filter Status */}
          {searchResults.length > 0 && activeFiltersCount > 0 && (
            <div className="text-xs text-neutral-500">
              Showing {filteredSearchResults.length} of {searchResults.length} results
              {filteredSearchResults.length === 0 && (
                <span className="text-amber-600 ml-2">
                  - No matches for current filters. Try adjusting filters.
                </span>
              )}
            </div>
          )}

          {/* Search Results */}
          {filteredSearchResults.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredSearchResults.map((student) => {
                const isSelected = selectedStudents.some(s => s.id === student.id);

                return (
                  <Card
                    key={student.id}
                    variant={isSelected ? 'outline' : 'default'}
                    className="transition-shadow cursor-pointer hover:shadow-md"
                    onClick={() => toggleStudentSelection(student)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <div className="flex-shrink-0">
                        <div className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                          ${isSelected
                            ? 'bg-brand-green border-brand-green'
                            : 'border-neutral-300 bg-white'
                          }
                        `}>
                          {isSelected && (
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Avatar */}
                      {student.avatar ? (
                        <img
                          src={student.avatar}
                          alt={student.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-brand-yellow text-brand-green flex items-center justify-center font-medium">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-brand-green">
                            {student.name}
                          </h4>
                        </div>
                        <p className="text-sm text-neutral-600">
                          {student.rollNumber} • {student.year} • {student.department}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : searchQuery && !searching ? (
            <div className="text-center py-8 text-neutral-600">
              {searchResults.length > 0 && filteredSearchResults.length === 0
                ? 'No learners match the selected filters. Try adjusting your filters.'
                : 'No learners found. Try a different search term.'
              }
            </div>
          ) : null}

          {/* Action Buttons */}
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                clearSearch();
                setSelectedStudents([]);
                clearAllFilters();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAssignStudents}
              disabled={selectedStudents.length === 0 || assigning}
            >
              {assigning
                ? 'Assigning...'
                : `Assign Learner${selectedStudents.length !== 1 ? 's' : ''} ${
                    selectedStudents.length > 0 ? `(${selectedStudents.length})` : ''
                  }`
              }
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmationDialog />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        mentorId={mentorId}
        onSuccess={fetchStudents}
      />
    </div>
  );
}
