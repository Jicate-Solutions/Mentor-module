'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input, { TextArea } from '@/components/ui/Input';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { SkeletonCard } from '@/components/ui/Skeleton';
import type { CounselingSession, Student } from '@/lib/types/mentor';

interface CounselingTabProps {
  mentorId: string;
}

export default function CounselingTab({ mentorId }: CounselingTabProps) {
  const { accessToken, user } = useAuth();
  const toast = useToast();

  const [sessions, setSessions] = useState<CounselingSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Session Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    selectedStudentIds: [] as string[],
    sessionName: '',
    date: '',
    time: '',
    notes: '',
    attachment: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  // View Session Modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CounselingSession | null>(null);
  const [feedbackData, setFeedbackData] = useState({
    counselingQueries: '',
    actionTaken: '',
    attachment: null as File | null
  });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Edit Session Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSession, setEditingSession] = useState<CounselingSession | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editFormData, setEditFormData] = useState({
    sessionName: '',
    date: '',
    time: '',
    notes: '',
    attachment: '',
    status: 'scheduled' as 'scheduled' | 'completed' | 'cancelled'
  });

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSession, setDeletingSession] = useState<CounselingSession | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Group sessions by session details (same session name, date, time = same group session)
  const groupSessionsByDetails = () => {
    const grouped = new Map<string, {
      sessionName: string;
      date: string;
      time: string;
      notes?: string;
      attachment?: string;
      status: string;
      students: Array<{
        id: string;
        session: CounselingSession;
      }>;
    }>();

    sessions.forEach(session => {
      // Create a unique key based on session details
      const key = `${session.sessionName}-${session.date}-${session.time}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          sessionName: session.sessionName,
          date: session.date,
          time: session.time,
          notes: session.notes,
          attachment: session.attachment,
          status: session.status,
          students: []
        });
      }

      grouped.get(key)!.students.push({
        id: session.studentId,
        session: session
      });
    });

    return Array.from(grouped.values());
  };

  // Fetch sessions and students
  useEffect(() => {
    if (!accessToken) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch sessions
        const sessionsRes = await fetch(`/api/mentor/${mentorId}/counseling`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        // Fetch assigned students
        const studentsRes = await fetch(`/api/mentor/${mentorId}/students`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (sessionsRes.ok) {
          const data = await sessionsRes.json();
          setSessions(data.sessions || []);
        } else {
          toast.error('Failed to load sessions', 'Could not fetch counseling sessions');
        }

        if (studentsRes.ok) {
          const data = await studentsRes.json();
          setStudents(data.students || []);
        } else {
          toast.error('Failed to load students', 'Could not fetch assigned students');
        }
      } catch (error) {
        toast.error('Error loading data', 'An unexpected error occurred while loading the page');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [accessToken, mentorId]);

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Toggle student selection
  const toggleStudentSelection = (studentId: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedStudentIds.includes(studentId);
      const newSelectedIds = isSelected
        ? prev.selectedStudentIds.filter(id => id !== studentId)
        : [...prev.selectedStudentIds, studentId];

      // Update select all state
      setSelectAll(newSelectedIds.length === students.length);

      return {
        ...prev,
        selectedStudentIds: newSelectedIds
      };
    });
  };

  // Toggle select all
  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setFormData(prev => ({
      ...prev,
      selectedStudentIds: newSelectAll ? students.map(s => s.id) : []
    }));
  };

  // Filter students based on search query
  const filteredStudents = students.filter(student => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      student.name.toLowerCase().includes(query) ||
      student.rollNumber.toLowerCase().includes(query)
    );
  });

  // Create new session
  const handleCreateSession = async () => {
    // Validate required fields
    if (!accessToken || formData.selectedStudentIds.length === 0 || !formData.sessionName || !formData.date || !formData.time) {
      toast.warning('Missing fields', 'Please select at least one student and fill in all required fields');
      return;
    }

    // Validate date is not in the past
    const selectedDate = new Date(`${formData.date}T${formData.time}`);
    const now = new Date();
    if (selectedDate < now) {
      toast.warning('Invalid date', 'Please select a future date and time for the session');
      return;
    }

    try {
      setCreating(true);

      // Create a session for each selected student
      let successCount = 0;
      let failCount = 0;
      const newSessions: CounselingSession[] = [];

      for (const studentId of formData.selectedStudentIds) {
        try {
          // Find the full student object
          const student = students.find(s => s.id === studentId);
          if (!student) continue; // Skip if student not found

          const response = await fetch(`/api/mentor/${mentorId}/counseling`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              student: {
                id: student.id,
                name: student.name,
                rollNumber: student.rollNumber,
                email: student.email,
                department: student.department,
                year: student.year
              },
              sessionName: formData.sessionName,
              date: formData.date,
              time: formData.time,
              notes: formData.notes,
              attachment: formData.attachment
            }),
          });

          if (response.ok) {
            const data = await response.json();
            newSessions.push(data.session);
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      // Update sessions list
      if (newSessions.length > 0) {
        setSessions([...newSessions, ...sessions]);
      }

      // Show results
      if (successCount > 0 && failCount === 0) {
        toast.success(
          'Sessions created',
          `Successfully created ${successCount} counseling session${successCount > 1 ? 's' : ''}`
        );
        setShowCreateModal(false);
        // Reset form
        setFormData({
          selectedStudentIds: [],
          sessionName: '',
          date: '',
          time: '',
          notes: '',
          attachment: ''
        });
        setSearchQuery('');
        setSelectAll(false);
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(
          'Partial success',
          `Created ${successCount} session${successCount > 1 ? 's' : ''}, ${failCount} failed`
        );
      } else {
        toast.error('Failed to create sessions', 'Could not create any counseling sessions');
      }
    } catch (error) {
      toast.error('Error creating sessions', 'An unexpected error occurred. Please try again');
    } finally {
      setCreating(false);
    }
  };

  // View session details
  const handleViewSession = (session: CounselingSession) => {
    setSelectedSession(session);
    setShowViewModal(true);
    // Pre-fill feedback if exists
    if (session.feedback) {
      setFeedbackData({
        counselingQueries: session.feedback.counselingQueries,
        actionTaken: session.feedback.actionTaken,
        attachment: null
      });
    } else {
      setFeedbackData({
        counselingQueries: '',
        actionTaken: '',
        attachment: null
      });
    }
  };

  // Submit session log
  const handleSubmitFeedback = async () => {
    // Validate required fields
    if (!accessToken || !selectedSession || !feedbackData.counselingQueries || !feedbackData.actionTaken) {
      toast.warning('Missing information', 'Please fill in all required fields');
      return;
    }

    try {
      setSubmittingFeedback(true);

      let attachmentUrl = '';

      // Upload file if attached
      if (feedbackData.attachment) {
        setUploadingFile(true);
        const formData = new FormData();
        formData.append('file', feedbackData.attachment);
        formData.append('bucket', 'documents');
        formData.append('path', `feedback/${selectedSession.id}`);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          attachmentUrl = uploadData.url;
        } else {
          toast.error('File upload failed', 'Could not upload attachment. Submitting feedback without it.');
        }
        setUploadingFile(false);
      }

      const response = await fetch(
        `/api/mentor/${mentorId}/counseling/${selectedSession.id}/feedback`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            counselingQueries: feedbackData.counselingQueries,
            actionTaken: feedbackData.actionTaken,
            attachmentUrl: attachmentUrl || undefined,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Update session in list
        setSessions(sessions.map(s =>
          s.id === selectedSession.id ? data.session : s
        ));
        setSelectedSession(data.session);
        toast.success('Session log submitted', 'Your session log has been saved successfully');
        // Clear feedback form
        setFeedbackData({
          counselingQueries: '',
          actionTaken: '',
          attachment: null
        });
      } else {
        const errorData = await response.json();
        toast.error('Failed to submit session log', errorData.error || 'An error occurred');
      }
    } catch (error) {
      toast.error('Error submitting session log', 'An unexpected error occurred. Please try again');
    } finally {
      setSubmittingFeedback(false);
      setUploadingFile(false);
    }
  };

  // Open edit modal
  const handleEditSession = (session: CounselingSession) => {
    setEditingSession(session);
    setEditFormData({
      sessionName: session.sessionName,
      date: session.date,
      time: session.time,
      notes: session.notes || '',
      attachment: session.attachment || '',
      status: session.status
    });
    setShowEditModal(true);
  };

  // Update session
  const handleUpdateSession = async () => {
    if (!accessToken || !editingSession) return;

    // Validate required fields
    if (!editFormData.sessionName || !editFormData.date || !editFormData.time) {
      toast.warning('Missing fields', 'Please fill in all required fields');
      return;
    }

    try {
      setUpdating(true);

      const response = await fetch(`/api/mentor/${mentorId}/counseling/${editingSession.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionName: editFormData.sessionName,
          date: editFormData.date,
          time: editFormData.time,
          notes: editFormData.notes,
          attachment: editFormData.attachment,
          status: editFormData.status
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update session in list
        setSessions(sessions.map(s =>
          s.id === editingSession.id ? data.session : s
        ));
        toast.success('Session updated', 'Counseling session has been updated successfully');
        setShowEditModal(false);
        setEditingSession(null);
      } else {
        const errorData = await response.json();
        toast.error('Failed to update session', errorData.error || 'An error occurred');
      }
    } catch (error) {
      toast.error('Error updating session', 'An unexpected error occurred. Please try again');
    } finally {
      setUpdating(false);
    }
  };

  // Open delete confirmation
  const handleDeleteClick = (session: CounselingSession) => {
    setDeletingSession(session);
    setShowDeleteModal(true);
  };

  // Delete session
  const handleDeleteSession = async () => {
    if (!accessToken || !deletingSession) return;

    try {
      setDeleting(true);

      const response = await fetch(`/api/mentor/${mentorId}/counseling/${deletingSession.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        // Remove session from list
        setSessions(sessions.filter(s => s.id !== deletingSession.id));
        toast.success('Session deleted', 'Counseling session has been deleted successfully');
        setShowDeleteModal(false);
        setDeletingSession(null);
      } else {
        const errorData = await response.json();
        toast.error('Failed to delete session', errorData.error || 'An error occurred');
      }
    } catch (error) {
      toast.error('Error deleting session', 'An unexpected error occurred. Please try again');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-neutral-200 rounded animate-pulse"></div>
          <div className="h-11 w-40 bg-neutral-200 rounded animate-pulse"></div>
        </div>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  // Note: selectedStudent not used, formData uses selectedStudentIds array instead
  // const selectedStudent = students.find(s => s.id === formData.studentId);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-6">
        <h2 className="text-[17px] font-medium text-neutral-900">
          Counseling Sessions ({sessions.length})
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={students.length === 0}
          className="w-full sm:w-auto px-4 py-2.5 bg-brand-green hover:bg-brand-green/90 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-[14px]"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>Create Session</span>
        </button>
      </div>

      {/* No Students Warning */}
      {students.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center mb-4 lg:mb-6">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-[15px] font-medium text-neutral-900 mb-2">No Students Assigned</p>
          <p className="text-[14px] text-neutral-600 leading-relaxed">
            Please assign students first before creating counseling sessions.
          </p>
        </div>
      )}

      {/* Sessions List with Students Inside */}
      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 p-8 lg:p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-yellow/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
          </div>
          <h3 className="text-[16px] font-medium text-neutral-900 mb-2">
            No counseling sessions yet
          </h3>
          <p className="text-[14px] text-neutral-600 leading-relaxed">
            Create your first counseling session with a student
          </p>
        </div>
      ) : (
        <div className="space-y-3 lg:space-y-4">
          {groupSessionsByDetails().map((groupedSession, index) => (
            <div key={index} className="bg-white rounded-xl border border-neutral-200 hover:border-brand-green/30 shadow-sm hover:shadow-md transition-all p-4 lg:p-5">
              {/* Session Header */}
              <div className="flex items-start gap-3 lg:gap-4 mb-4 pb-4 border-b border-neutral-100">
                {/* Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-yellow/10 border border-brand-green/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-brand-green"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[15px] font-medium text-neutral-900">
                      {groupedSession.sessionName}
                    </h3>

                    {/* Edit and Delete Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditSession(groupedSession.students[0].session)}
                        className="p-1.5 text-brand-green hover:bg-brand-green/10 rounded-md transition-colors"
                        title="Edit session"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(groupedSession.students[0].session)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete session"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:gap-3 text-[13px] text-neutral-600">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-brand-green/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{new Date(groupedSession.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}</span>
                    </div>
                    <span className="text-neutral-300">•</span>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-brand-green/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{groupedSession.time}</span>
                    </div>
                    <span className="text-neutral-300">•</span>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-brand-green/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span className="font-medium text-brand-green">{groupedSession.students.length}</span>
                    </div>
                    <span className="text-neutral-300">•</span>
                    <span className={`px-2 py-0.5 rounded-full text-[12px] font-medium ${groupedSession.status === 'completed'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                      {groupedSession.status === 'completed' ? 'Completed' : 'Scheduled'}
                    </span>
                  </div>

                  {groupedSession.notes && (
                    <div className="mt-3 p-2.5 bg-brand-yellow/5 rounded-md border-l-2 border-brand-yellow">
                      <p className="text-[13px] text-neutral-700 leading-relaxed">
                        {groupedSession.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Students List Inside Session */}
              <div>
                <h4 className="text-[12px] font-medium text-neutral-500 mb-3 uppercase tracking-wider">
                  Students ({groupedSession.students.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 lg:gap-2.5">
                  {groupedSession.students.map(({ session }) => (
                    <div
                      key={session.id}
                      className="bg-neutral-50 hover:bg-neutral-100 p-3 lg:p-3.5 rounded-lg border border-neutral-200 hover:border-brand-green/30 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        {/* Student Avatar */}
                        <div className="flex-shrink-0">
                          {session.student?.avatar ? (
                            <img
                              src={session.student.avatar}
                              alt={session.student.name}
                              className="w-8 h-8 lg:w-10 lg:h-10 rounded-full object-cover border border-brand-green/20"
                            />
                          ) : (
                            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-brand-yellow/20 text-brand-green flex items-center justify-center text-[13px] font-medium border border-brand-green/20">
                              {session.studentName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Student Info */}
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-brand-green text-sm mb-0.5 truncate">
                            {session.studentName}
                          </h5>
                          <div className="flex items-center gap-2 text-xs text-neutral-600">
                            {session.student?.rollNumber && (
                              <span>{session.student.rollNumber}</span>
                            )}
                            {session.student?.year && (
                              <>
                                <span className="text-neutral-300">•</span>
                                <span>Year {session.student.year}</span>
                              </>
                            )}
                            {session.feedback && (
                              <>
                                <span className="text-neutral-300">•</span>
                                <span className="flex items-center gap-1 text-green-600 font-medium">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Logged
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* View Details Button */}
                        <button
                          onClick={() => handleViewSession(session)}
                          className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-brand-green hover:text-white bg-white hover:bg-brand-green border border-brand-green/30 hover:border-brand-green rounded-md transition-all duration-200"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Session Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Counseling Session"
        size="lg"
      >
        <div className="space-y-6">
          {/* Student Selection with Search and Checkboxes */}
          <div className="bg-brand-cream p-5 rounded-xl border-2 border-brand-yellow">
            <label className="block text-base font-semibold text-brand-green mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Select Students <span className="text-red-600">*</span>
            </label>

            {/* Search Input */}
            <div className="mb-4">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-green/60">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or roll number..."
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-brand-green/20 bg-white focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition-all placeholder:text-neutral-400 text-brand-green"
                />
              </div>
            </div>

            {/* Select All Checkbox */}
            <div className="mb-3 pb-3 border-b-2 border-brand-yellow/50">
              <label className="flex items-center gap-3 cursor-pointer hover:bg-brand-yellow/20 p-3 rounded-lg transition-all group">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="w-5 h-5 text-brand-green focus:ring-brand-green focus:ring-offset-2 rounded border-2 border-brand-green/30 cursor-pointer"
                />
                <span className="font-semibold text-brand-green group-hover:text-brand-green flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Select All Students ({students.length})
                </span>
              </label>
            </div>

            {/* Student List with Checkboxes */}
            <div className="max-h-72 overflow-y-auto space-y-2 bg-white rounded-xl border-2 border-brand-green/10 p-3">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="font-medium text-brand-green mb-1">
                    {searchQuery ? 'No students found' : 'No students assigned'}
                  </p>
                  <p className="text-sm text-neutral-600">
                    {searchQuery ? 'Try a different search term' : 'Please assign students first'}
                  </p>
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <label
                    key={student.id}
                    className={`flex items-center gap-4 p-4 cursor-pointer rounded-xl transition-all border-2 ${formData.selectedStudentIds.includes(student.id)
                        ? 'bg-brand-yellow/30 border-brand-yellow hover:bg-brand-yellow/40'
                        : 'bg-white border-brand-green/10 hover:bg-brand-cream hover:border-brand-green/30'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.selectedStudentIds.includes(student.id)}
                      onChange={() => toggleStudentSelection(student.id)}
                      className="w-5 h-5 text-brand-green focus:ring-brand-green focus:ring-offset-2 rounded border-2 border-brand-green/30 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-brand-green mb-0.5 truncate">{student.name}</div>
                      <div className="text-sm text-neutral-600 flex items-center gap-2">
                        <span className="font-medium">{student.rollNumber}</span>
                        <span className="text-brand-green/40">•</span>
                        <span className="truncate">{student.department}</span>
                      </div>
                    </div>
                    {formData.selectedStudentIds.includes(student.id) && (
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 rounded-full bg-brand-green flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </label>
                ))
              )}
            </div>

            {/* Selected count */}
            {formData.selectedStudentIds.length > 0 && (
              <div className="mt-3 flex items-center gap-2 text-sm bg-brand-green/10 px-4 py-2.5 rounded-lg border border-brand-green/20">
                <svg className="w-4 h-4 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-brand-green">
                  {formData.selectedStudentIds.length} student{formData.selectedStudentIds.length > 1 ? 's' : ''} selected
                </span>
              </div>
            )}
          </div>

          {/* Session Details Section */}
          <div className="bg-brand-cream p-5 rounded-xl border-2 border-brand-yellow">
            <h4 className="text-base font-semibold text-brand-green mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Session Details
            </h4>

            <div className="space-y-4">
              {/* Session Name */}
              <div>
                <label className="block text-sm font-medium text-brand-green mb-2">
                  Session Name <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.sessionName}
                    onChange={(e) => handleInputChange('sessionName', e.target.value)}
                    placeholder="e.g., Academic Progress Review, Career Guidance"
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-brand-green/20 bg-white focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition-all placeholder:text-neutral-400 text-brand-green"
                    required
                  />
                </div>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-green mb-2">
                    Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-brand-green/20 bg-white focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition-all text-brand-green"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-green mb-2">
                    Time <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-brand-green/20 bg-white focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition-all text-brand-green"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information Section */}
          <div className="bg-brand-cream p-5 rounded-xl border-2 border-brand-yellow">
            <h4 className="text-base font-semibold text-brand-green mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Additional Information
            </h4>

            <div className="space-y-4">
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-brand-green mb-2">
                  Notes / Agenda
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Add any notes, agenda items, or discussion topics for this session..."
                  rows={4}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-brand-green/20 bg-white focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition-all placeholder:text-neutral-400 text-brand-green resize-none"
                />
              </div>

              {/* Attachment */}
              <div>
                <label className="block text-sm font-medium text-brand-green mb-2">
                  Attachment URL (Optional)
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-green/60">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </div>
                  <input
                    type="url"
                    value={formData.attachment}
                    onChange={(e) => handleInputChange('attachment', e.target.value)}
                    placeholder="https://example.com/document.pdf"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-brand-green/20 bg-white focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition-all placeholder:text-neutral-400 text-brand-green"
                  />
                </div>
                <p className="mt-2 text-xs text-neutral-600">
                  Add a link to any supporting documents or materials
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t-2 border-brand-yellow/30">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 px-6 py-3.5 rounded-xl border-2 border-brand-green/30 bg-white hover:bg-brand-cream text-brand-green font-semibold transition-all duration-200 hover:border-brand-green"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateSession}
              disabled={creating || formData.selectedStudentIds.length === 0 || !formData.sessionName || !formData.date || !formData.time}
              className="flex-1 px-6 py-3.5 rounded-xl bg-brand-green hover:bg-brand-green/90 text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              {creating ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Sessions...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Session
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Session Modal with Student Profile & Session Log Form */}
      {selectedSession && (
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title="Session Details & Student Profile"
          size="xl"
        >
          <div className="space-y-6">
            {/* Student Profile Card */}
            {selectedSession.student && (
              <Card variant="elevated" className="border-2 border-brand-green">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-brand-green flex items-center justify-center text-white text-2xl font-bold">
                    {selectedSession.student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-brand-green mb-1">
                      {selectedSession.student.name}
                    </h3>
                    <p className="text-neutral-600 flex items-center gap-2">
                      <span className="font-medium">Roll No:</span> {selectedSession.student.rollNumber}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-200">
                  <div>
                    <p className="text-sm font-medium text-brand-green mb-1 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email
                    </p>
                    <p className="text-neutral-700">{selectedSession.student.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand-green mb-1 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Department
                    </p>
                    <p className="text-neutral-700">{selectedSession.student.department || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand-green mb-1 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Year
                    </p>
                    <p className="text-neutral-700">{selectedSession.student.year || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand-green mb-1 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Status
                    </p>
                    <p className="text-neutral-700">{selectedSession.student.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Session Information */}
            <Card variant="default">
              <div className="flex items-start gap-3 mb-4">
                <div className="text-3xl">💬</div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-brand-green mb-2">
                    {selectedSession.sessionName}
                  </h3>
                  <Badge
                    variant={
                      selectedSession.status === 'completed' ? 'success' :
                        selectedSession.status === 'scheduled' ? 'info' : 'default'
                    }
                  >
                    {selectedSession.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-brand-green mb-1">Session Date</p>
                  <p className="text-neutral-700">
                    {new Date(selectedSession.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-brand-green mb-1">Time</p>
                  <p className="text-neutral-700">{selectedSession.time}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-brand-green mb-1">Created On</p>
                  <p className="text-neutral-700">
                    {new Date(selectedSession.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {selectedSession.notes && (
                <div className="mb-4 pt-4 border-t border-neutral-200">
                  <p className="text-sm font-medium text-brand-green mb-2">Session Notes</p>
                  <p className="text-neutral-700 whitespace-pre-wrap bg-brand-cream p-3 rounded-lg">{selectedSession.notes}</p>
                </div>
              )}

              {selectedSession.attachment && (
                <div className="pt-4 border-t border-neutral-200">
                  <p className="text-sm font-medium text-brand-green mb-2">Attachment</p>
                  <a
                    href={selectedSession.attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-green hover:text-primary-700 hover:underline flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    View Attachment
                  </a>
                </div>
              )}
            </Card>

            {/* Session Log Form */}
            <div>
              <h3 className="text-xl font-bold text-brand-green mb-4 flex items-center gap-2">
                <span>📝</span>
                Session Log
              </h3>

              {selectedSession.feedback ? (
                <Card variant="outline">
                  <div className="space-y-4">
                    <div className="bg-brand-cream p-4 rounded-lg">
                      <p className="text-sm font-semibold text-brand-green mb-2">
                        Counseling Queries
                      </p>
                      <p className="text-neutral-700 whitespace-pre-wrap">
                        {selectedSession.feedback.counselingQueries}
                      </p>
                    </div>
                    <div className="bg-brand-cream p-4 rounded-lg">
                      <p className="text-sm font-semibold text-brand-green mb-2">
                        Action Taken
                      </p>
                      <p className="text-neutral-700 whitespace-pre-wrap">
                        {selectedSession.feedback.actionTaken}
                      </p>
                    </div>
                    {selectedSession.feedback.attachmentUrl && (
                      <div className="bg-brand-cream p-4 rounded-lg">
                        <p className="text-sm font-semibold text-brand-green mb-2">
                          Attachment
                        </p>
                        <a
                          href={selectedSession.feedback.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-brand-green hover:underline"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          View Attachment
                        </a>
                      </div>
                    )}
                    <div className="pt-4 border-t border-neutral-200 text-sm text-neutral-600 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Submitted on {new Date(selectedSession.feedback.submittedAt).toLocaleString()}
                    </div>
                  </div>
                </Card>
              ) : (
                <Card variant="default">
                  <div className="space-y-4">
                    <p className="text-neutral-600 mb-4">
                      Please provide the session log for this counseling session:
                    </p>

                    <TextArea
                      label="Counseling Queries"
                      placeholder="What queries, concerns, or issues were discussed during the session?"
                      value={feedbackData.counselingQueries}
                      onChange={(e) => setFeedbackData(prev => ({
                        ...prev,
                        counselingQueries: e.target.value
                      }))}
                      rows={4}
                      required
                    />

                    <TextArea
                      label="Action Taken"
                      placeholder="What actions, recommendations, or solutions were provided?"
                      value={feedbackData.actionTaken}
                      onChange={(e) => setFeedbackData(prev => ({
                        ...prev,
                        actionTaken: e.target.value
                      }))}
                      rows={4}
                      required
                    />

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-neutral-700">
                        Attachment (Optional)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setFeedbackData(prev => ({
                              ...prev,
                              attachment: file
                            }));
                          }}
                          className="flex-1 text-sm text-neutral-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-green file:text-white hover:file:bg-brand-green/90 cursor-pointer"
                        />
                        {feedbackData.attachment && (
                          <button
                            type="button"
                            onClick={() => setFeedbackData(prev => ({ ...prev, attachment: null }))}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {feedbackData.attachment && (
                        <p className="text-xs text-neutral-600">
                          Selected: {feedbackData.attachment.name} ({(feedbackData.attachment.size / 1024).toFixed(2)} KB)
                        </p>
                      )}
                      <p className="text-xs text-neutral-500">
                        Supported: Images, Videos, Audio, PDF, Word, Excel, PowerPoint (Max 10MB)
                      </p>
                    </div>

                    <Button
                      variant="primary"
                      onClick={handleSubmitFeedback}
                      disabled={submittingFeedback || uploadingFile || !feedbackData.counselingQueries || !feedbackData.actionTaken}
                      className="w-full"
                    >
                      {uploadingFile ? 'Uploading file...' : submittingFeedback ? 'Submitting...' : 'Submit'}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Session Modal */}
      {editingSession && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Counseling Session"
          size="lg"
        >
          <div className="space-y-6">
            {/* Session Name */}
            <div>
              <label className="block text-sm font-medium text-brand-green mb-2">
                Session Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={editFormData.sessionName}
                onChange={(e) => setEditFormData(prev => ({ ...prev, sessionName: e.target.value }))}
                placeholder="e.g., Academic Progress Review, Career Guidance"
                className="w-full px-4 py-3.5 rounded-xl border-2 border-brand-green/20 bg-white focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition-all placeholder:text-neutral-400 text-brand-green"
                required
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-green mb-2">
                  Date <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={editFormData.date}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-brand-green/20 bg-white focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition-all text-brand-green"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-green mb-2">
                  Time <span className="text-red-600">*</span>
                </label>
                <input
                  type="time"
                  value={editFormData.time}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-brand-green/20 bg-white focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition-all text-brand-green"
                  required
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-brand-green mb-2">
                Status
              </label>
              <select
                value={editFormData.status}
                onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value as 'scheduled' | 'completed' | 'cancelled' }))}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-brand-green/20 bg-white focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition-all text-brand-green"
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-brand-green mb-2">
                Notes / Agenda
              </label>
              <textarea
                value={editFormData.notes}
                onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes, agenda items, or discussion topics for this session..."
                rows={4}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-brand-green/20 bg-white focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition-all placeholder:text-neutral-400 text-brand-green resize-none"
              />
            </div>

            {/* Attachment */}
            <div>
              <label className="block text-sm font-medium text-brand-green mb-2">
                Attachment URL (Optional)
              </label>
              <input
                type="url"
                value={editFormData.attachment}
                onChange={(e) => setEditFormData(prev => ({ ...prev, attachment: e.target.value }))}
                placeholder="https://example.com/document.pdf"
                className="w-full px-4 py-3.5 rounded-xl border-2 border-brand-green/20 bg-white focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition-all placeholder:text-neutral-400 text-brand-green"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t-2 border-brand-yellow/30">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-6 py-3.5 rounded-xl border-2 border-brand-green/30 bg-white hover:bg-brand-cream text-brand-green font-semibold transition-all duration-200 hover:border-brand-green"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateSession}
                disabled={updating || !editFormData.sessionName || !editFormData.date || !editFormData.time}
                className="flex-1 px-6 py-3.5 rounded-xl bg-brand-green hover:bg-brand-green/90 text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                {updating ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Update Session
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSession && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Counseling Session"
          size="md"
        >
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  Are you sure you want to delete this session?
                </h3>
                <p className="text-sm text-neutral-600 mb-4">
                  This action cannot be undone. This will permanently delete the counseling session:
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="font-semibold text-brand-green mb-1">{deletingSession.sessionName}</p>
                  <p className="text-sm text-neutral-600">
                    {new Date(deletingSession.date).toLocaleDateString()} at {deletingSession.time}
                  </p>
                  <p className="text-sm text-neutral-600 mt-1">
                    Student: {deletingSession.studentName}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-6 py-3.5 rounded-xl border-2 border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSession}
                disabled={deleting}
                className="flex-1 px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Session
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
