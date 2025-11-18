'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import useConfirm from '@/lib/hooks/useConfirm';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SearchInput from '@/components/ui/SearchInput';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { SkeletonCard } from '@/components/ui/Skeleton';
import type { Student } from '@/lib/types/mentor';

interface StudentsTabProps {
  mentorId: string;
}

export default function StudentsTab({ mentorId }: StudentsTabProps) {
  const { accessToken } = useAuth();
  const toast = useToast();
  const { ConfirmationDialog, confirm } = useConfirm();

  const [assignedStudents, setAssignedStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add Student Modal State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Fetch assigned students (extracted for reuse)
  const fetchStudents = useCallback(async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/mentor/${mentorId}/students`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAssignedStudents(data.students || []);
      } else {
        toast.error('Failed to load students', 'Could not fetch assigned students');
      }
    } catch (error) {
      toast.error('Error loading students', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [accessToken, mentorId, toast]);

  // Fetch assigned students on mount
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Search for students
  const handleSearch = async () => {
    if (!searchQuery.trim() || !accessToken) return;

    try {
      setSearching(true);
      const response = await fetch(
        `/api/students/search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Show all students (don't filter out assigned ones)
        setSearchResults(data.students || []);
      } else {
        toast.error('Search failed', 'Could not search for students');
      }
    } catch (error) {
      toast.error('Search error', 'An unexpected error occurred while searching');
    } finally {
      setSearching(false);
    }
  };

  // Automatic debounced search (300ms delay, 2 character minimum)
  useEffect(() => {
    // Only search if query has at least 2 characters
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    // Set up debounce timer
    const debounceTimer = setTimeout(() => {
      handleSearch();
    }, 300);

    // Cleanup function to cancel timer if query changes
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]); // Re-run when searchQuery changes

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

  // Assign students to mentor
  const handleAssignStudents = async () => {
    if (selectedStudents.length === 0 || !accessToken) return;

    try {
      setAssigning(true);

      // Assign each student
      let successCount = 0;
      let failCount = 0;
      const failedStudents: string[] = [];

      for (const student of selectedStudents) {
        try {
          const response = await fetch(`/api/mentor/${mentorId}/students`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ student }),
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
            failedStudents.push(student.name);
            try {
              const errorData = await response.json();
              console.error(`Failed to assign ${student.name}:`, errorData.error);
            } catch (e) {
              console.error(`Failed to assign ${student.name}`);
            }
          }
        } catch (error) {
          failCount++;
          failedStudents.push(student.name);
          console.error(`Error assigning ${student.name}:`, error);
        }
      }

      // Refetch assigned students list to sync with backend
      if (successCount > 0) {
        await fetchStudents();
      }

      // Show results
      if (successCount > 0 && failCount === 0) {
        toast.success(
          'Students assigned',
          `Successfully assigned ${successCount} student${successCount > 1 ? 's' : ''}`
        );
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(
          'Partial success',
          `Assigned ${successCount}, failed ${failCount}. Already assigned: ${failedStudents.join(', ')}`
        );
      } else {
        toast.error(
          'Assignment failed',
          failedStudents.length > 0
            ? `Could not assign: ${failedStudents.join(', ')}. They may already be assigned.`
            : 'Could not assign any students'
        );
      }

      // Close modal and reset
      setShowAddModal(false);
      setSearchQuery('');
      setSearchResults([]);
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
      title: 'Remove Student',
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
        setAssignedStudents(assignedStudents.filter(s => s.id !== studentId));
        toast.success('Student removed', `${student.name} has been removed from this mentor`);
      } else {
        const errorData = await response.json();
        toast.error('Failed to remove student', errorData.error || 'An error occurred');
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-brand-green">
          Assigned Students ({assignedStudents.length})
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="group relative px-6 py-3.5 bg-brand-green hover:bg-brand-green/90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand-green via-brand-green/90 to-brand-green opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10 w-6 h-6 bg-brand-yellow rounded-full flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
            <svg className="w-4 h-4 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="relative z-10">Add Student</span>
        </button>
      </div>

      {/* Students List */}
      {assignedStudents.length === 0 ? (
        <Card variant="elevated">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">👨‍🎓</div>
            <h3 className="text-xl font-semibold text-brand-green mb-2">
              No students assigned yet
            </h3>
            <p className="text-neutral-600 mb-4">
              Click "Add Student" to assign students to this mentor
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {assignedStudents.map((student) => (
            <div key={student.id} className="bg-white rounded-lg border border-brand-green/20 hover:border-brand-green/40 shadow-sm hover:shadow-md transition-all duration-200 p-4">
                <div className="flex items-start gap-3 mb-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {student.avatar ? (
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-12 h-12 rounded-full object-cover border border-brand-green/30"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-brand-yellow/80 text-brand-green flex items-center justify-center text-base font-semibold border border-brand-green/30">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Student Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-brand-green text-base mb-0.5 truncate">
                      {student.name}
                    </h4>
                    <p className="text-sm text-neutral-600 mb-2 font-medium">
                      {student.rollNumber}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600 mb-1">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                        Year {student.year}
                      </span>
                      <span className="text-neutral-300">•</span>
                      <span>{student.department}</span>
                    </div>
                    <p className="text-xs text-neutral-500 truncate">
                      {student.email}
                    </p>
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemoveStudent(student.id)}
                  className="w-full px-3 py-2 text-sm font-medium text-red-600 hover:text-white bg-white hover:bg-red-600 border border-red-300 hover:border-red-600 rounded-lg transition-all duration-200"
                >
                  Remove Student
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
          setSearchQuery('');
          setSearchResults([]);
          setSelectedStudents([]);
        }}
        title="Add Students"
        size="lg"
      >
        <div className="space-y-4">
          {/* Search Input */}
          <SearchInput
            placeholder="Search by name, roll number, or email (min 2 chars)..."
            value={searchQuery}
            onChange={setSearchQuery}
            loading={searching}
          />

          {/* Search Results */}
          {searchResults.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map((student) => {
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
                        <div className="w-10 h-10 rounded-full bg-brand-yellow text-brand-green flex items-center justify-center font-bold">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-brand-green">
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
              {searchQuery.length < 2
                ? 'Please enter at least 2 characters to search'
                : 'No students found. Try a different search term.'
              }
            </div>
          ) : null}

          {/* Action Buttons */}
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setSearchQuery('');
                setSearchResults([]);
                setSelectedStudents([]);
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
                : `Assign Student${selectedStudents.length !== 1 ? 's' : ''} ${
                    selectedStudents.length > 0 ? `(${selectedStudents.length})` : ''
                  }`
              }
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmationDialog />
    </div>
  );
}
