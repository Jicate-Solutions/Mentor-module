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
    actionTaken: ''
  });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

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
        actionTaken: session.feedback.actionTaken
      });
    } else {
      setFeedbackData({
        counselingQueries: '',
        actionTaken: ''
      });
    }
  };

  // Submit feedback
  const handleSubmitFeedback = async () => {
    // Validate required fields
    if (!accessToken || !selectedSession || !feedbackData.counselingQueries || !feedbackData.actionTaken) {
      toast.warning('Missing feedback', 'Please fill in all feedback fields');
      return;
    }

    try {
      setSubmittingFeedback(true);
      const response = await fetch(
        `/api/mentor/${mentorId}/counseling/${selectedSession.id}/feedback`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(feedbackData),
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Update session in list
        setSessions(sessions.map(s =>
          s.id === selectedSession.id ? data.session : s
        ));
        setSelectedSession(data.session);
        toast.success('Feedback submitted', 'Your feedback has been saved successfully');
        // Clear feedback form
        setFeedbackData({
          counselingQueries: '',
          actionTaken: ''
        });
      } else {
        const errorData = await response.json();
        toast.error('Failed to submit feedback', errorData.error || 'An error occurred');
      }
    } catch (error) {
      toast.error('Error submitting feedback', 'An unexpected error occurred. Please try again');
    } finally {
      setSubmittingFeedback(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-semibold text-brand-green">
          Counseling Sessions ({sessions.length})
        </h2>
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          disabled={students.length === 0}
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create Session
        </Button>
      </div>

      {/* No Students Warning */}
      {students.length === 0 && (
        <Card variant="elevated" className="mb-6">
          <div className="text-center py-6">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-brand-green font-medium mb-2">No Students Assigned</p>
            <p className="text-neutral-600">
              Please assign students first before creating counseling sessions.
            </p>
          </div>
        </Card>
      )}

      {/* Sessions List with Students Inside */}
      {sessions.length === 0 ? (
        <Card variant="elevated">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-semibold text-brand-green mb-2">
              No counseling sessions yet
            </h3>
            <p className="text-neutral-600">
              Create your first counseling session with a student
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupSessionsByDetails().map((groupedSession, index) => (
            <Card key={index} variant="default" className="border-2 border-brand-green">
              {/* Session Header */}
              <div className="flex items-start gap-3 mb-4 pb-4 border-b border-neutral-200">
                <div className="text-3xl">💬</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-brand-green mb-2">
                    {groupedSession.sessionName}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge
                      variant={
                        groupedSession.status === 'completed' ? 'success' :
                        groupedSession.status === 'scheduled' ? 'info' : 'default'
                      }
                      size="sm"
                    >
                      {groupedSession.status.toUpperCase()}
                    </Badge>
                    <Badge variant="info" size="sm">
                      {groupedSession.students.length} Student{groupedSession.students.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-neutral-600">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-brand-green"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      {new Date(groupedSession.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-brand-green"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {groupedSession.time}
                    </div>
                  </div>
                  {groupedSession.notes && (
                    <div className="mt-3 p-3 bg-neutral-50 rounded-lg">
                      <p className="text-sm text-neutral-700">
                        <span className="font-medium text-brand-green">Notes:</span> {groupedSession.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Students List Inside Session */}
              <div>
                <h4 className="text-sm font-semibold text-brand-green mb-3 uppercase tracking-wide">
                  Students in this session
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {groupedSession.students.map(({ session }) => (
                    <div
                      key={session.id}
                      className="bg-brand-cream p-4 rounded-lg border-2 border-brand-yellow hover:border-brand-green transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {/* Student Avatar */}
                        <div className="flex-shrink-0">
                          {session.student?.avatar ? (
                            <img
                              src={session.student.avatar}
                              alt={session.student.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-brand-green"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-brand-yellow text-brand-green flex items-center justify-center text-lg font-bold border-2 border-brand-green">
                              {session.studentName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Student Info */}
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-brand-green mb-1 truncate">
                            {session.studentName}
                          </h5>
                          {session.student?.rollNumber && (
                            <p className="text-xs text-neutral-600 mb-1">
                              Roll: {session.student.rollNumber}
                            </p>
                          )}
                          <div className="flex gap-1 flex-wrap">
                            {session.student?.year && (
                              <Badge variant="info" size="sm">
                                {session.student.year}
                              </Badge>
                            )}
                            {session.feedback && (
                              <Badge variant="success" size="sm">
                                ✓ Feedback
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* View Details Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewSession(session)}
                          className="flex-shrink-0"
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
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
        <div className="space-y-4">
          {/* Student Selection with Search and Checkboxes */}
          <div>
            <label className="block text-sm font-medium text-brand-green mb-2">
              Select Students <span className="text-red-500">*</span>
            </label>

            {/* Search Input */}
            <div className="mb-3">
              <div className="relative">
                <div className="absolute left-3 top-3 text-neutral-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search with student ID or name"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition-colors"
                />
              </div>
            </div>

            {/* Select All Checkbox */}
            <div className="mb-2 pb-2 border-b border-neutral-200">
              <label className="flex items-center gap-3 cursor-pointer hover:bg-neutral-50 p-2 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="w-5 h-5 text-brand-green focus:ring-brand-green rounded border-neutral-300"
                />
                <span className="font-medium text-brand-green">
                  All Students ({students.length})
                </span>
              </label>
            </div>

            {/* Student List with Checkboxes */}
            <div className="max-h-64 overflow-y-auto space-y-1 border border-neutral-200 rounded-lg p-2">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  {searchQuery ? 'No students found matching your search' : 'No students assigned'}
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <label
                    key={student.id}
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-neutral-50 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.selectedStudentIds.includes(student.id)}
                      onChange={() => toggleStudentSelection(student.id)}
                      className="w-5 h-5 text-brand-green focus:ring-brand-green rounded border-neutral-300"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-brand-green">{student.name}</div>
                      <div className="text-sm text-neutral-600">
                        {student.rollNumber} • {student.department}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>

            {/* Selected count */}
            {formData.selectedStudentIds.length > 0 && (
              <div className="mt-2 text-sm text-neutral-600">
                {formData.selectedStudentIds.length} student{formData.selectedStudentIds.length > 1 ? 's' : ''} selected
              </div>
            )}
          </div>

          {/* Session Name */}
          <Input
            label="Session Name"
            placeholder="e.g., Academic Progress Review, Career Guidance"
            value={formData.sessionName}
            onChange={(e) => handleInputChange('sessionName', e.target.value)}
            required
          />

          {/* Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="date"
              label="Date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              required
            />
            <Input
              type="time"
              label="Time"
              value={formData.time}
              onChange={(e) => handleInputChange('time', e.target.value)}
              required
            />
          </div>

          {/* Notes */}
          <TextArea
            label="Notes / Remarks"
            placeholder="Add any notes, agenda items, or discussion topics for this session..."
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={4}
          />

          {/* Attachment */}
          <Input
            label="Attachment (URL)"
            placeholder="https://example.com/document.pdf"
            value={formData.attachment}
            onChange={(e) => handleInputChange('attachment', e.target.value)}
            helperText="Optional: Add a link to any supporting documents or materials"
          />

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateSession}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Session'}
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* View Session Modal with Student Profile & Feedback Form */}
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

            {/* Feedback Form */}
            <div>
              <h3 className="text-xl font-bold text-brand-green mb-4 flex items-center gap-2">
                <span>📝</span>
                Session Feedback
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
                      Please provide feedback for this counseling session:
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

                    <Button
                      variant="primary"
                      onClick={handleSubmitFeedback}
                      disabled={submittingFeedback || !feedbackData.counselingQueries || !feedbackData.actionTaken}
                      className="w-full"
                    >
                      {submittingFeedback ? 'Submitting Feedback...' : 'Submit Feedback'}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
