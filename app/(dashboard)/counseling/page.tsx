'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { CounselingSession } from '@/lib/types/mentor';
import { supabase } from '@/lib/supabase/client';
import SearchInput from '@/components/ui/SearchInput';
import Button from '@/components/ui/Button';

type TabType = 'all' | 'upcoming' | 'completed';

interface SessionFormData {
  sessionName: string;
  studentId: string;
  date: string;
  time: string;
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface GroupedSession {
  id: string;
  sessionName: string;
  date: string;
  time: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  mentorId: string;
  createdAt: string;
  students: Array<{
    id: string;
    name: string;
    rollNumber?: string;
    email?: string;
    avatar?: string;
  }>;
}

export default function CounselingSessionsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<CounselingSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<GroupedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<CounselingSession | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [mentorId, setMentorId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null); // Store users.id (UUID)
  const [isAdmin, setIsAdmin] = useState(false); // Check if user is admin (not a mentor)

  // Fetch mentor ID and initial data
  useEffect(() => {
    if (user) {
      const initData = async () => {
        await fetchMentorId(); // Wait for mentor ID first
        fetchStudents();
        // fetchSessions will be called after mentorId/isAdmin is set
      };
      initData();
    }
  }, [user]);

  // Fetch sessions after we know if user is admin or mentor
  useEffect(() => {
    if (user && (mentorId !== null || isAdmin)) {
      fetchSessions();
    }
  }, [user, mentorId, isAdmin]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('counseling_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'counseling_sessions'
        },
        (payload) => {
          console.log('Real-time update:', payload);
          // Refresh sessions on any change
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Group sessions by session details (same session_name, date, time = one group)
  const groupSessionsByDetails = () => {
    const grouped = new Map();

    sessions.forEach(session => {
      // Create unique key for each session group
      const key = `${session.sessionName}_${session.date}_${session.time}`;

      if (!grouped.has(key)) {
        // First time seeing this session - create group
        grouped.set(key, {
          id: session.id, // Use first session's ID as group ID
          sessionName: session.sessionName,
          date: session.date,
          time: session.time,
          notes: session.notes,
          status: session.status,
          mentorId: session.mentorId,
          createdAt: session.createdAt,
          students: [] // Array to hold all students in this session
        });
      }

      // Add this student to the session group
      const group = grouped.get(key);
      group.students.push({
        id: session.studentId,
        name: session.studentName,
        rollNumber: session.student?.rollNumber,
        email: session.student?.email,
        avatar: session.student?.avatar
      });
    });

    return Array.from(grouped.values());
  };

  // Filter sessions based on active tab and search query
  useEffect(() => {
    let grouped = groupSessionsByDetails();

    // Filter by tab
    if (activeTab === 'upcoming') {
      grouped = grouped.filter(s => s.status === 'scheduled');
    } else if (activeTab === 'completed') {
      grouped = grouped.filter(s => s.status === 'completed');
    }

    // Filter by search query
    if (searchQuery) {
      grouped = grouped.filter(s =>
        s.sessionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.students.some((student: any) =>
          student.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    setFilteredSessions(grouped);
  }, [sessions, activeTab, searchQuery]);

  const fetchMentorId = async () => {
    try {
      // First get the users.id from jkkn_user_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, role')
        .eq('jkkn_user_id', user?.id)
        .single();

      if (userError) throw userError;

      if (!userData?.id) {
        throw new Error('User not found in database');
      }

      // Store the users.id for later use
      setUserId(userData.id);

      // Check if user is an administrator (not a mentor)
      const adminRoles = ['super_admin', 'administrator', 'principal', 'digital_coordinator'];
      const userIsAdmin = adminRoles.includes(userData.role);

      // Then get mentor ID using users.id
      const { data, error } = await supabase
        .from('mentors')
        .select('id')
        .eq('user_id', userData.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No mentor record found - user might be admin only
        if (userIsAdmin) {
          setIsAdmin(true);
          setMentorId(null);
          console.log('User is administrator - showing all sessions');
        } else {
          throw new Error('User is not a mentor and not an administrator');
        }
      } else if (error) {
        throw error;
      } else {
        setMentorId(data?.id || null);
        setIsAdmin(false);
      }
    } catch (err: any) {
      console.error('Error fetching mentor ID:', err);
      setError(err.message || 'Failed to fetch user information');
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, roll_number, email, department_id, year')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStudents(data || []);
    } catch (err: any) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query based on user role
      let query = supabase
        .from('counseling_sessions')
        .select(`
          *,
          student:students (
            id,
            name,
            roll_number,
            email,
            department_id,
            year,
            avatar_url
          ),
          mentor:mentors (
            id,
            user_id
          )
        `);

      // If user is a mentor (not admin), filter by their mentor_id
      if (mentorId && !isAdmin) {
        query = query.eq('mentor_id', mentorId);
      }
      // If admin, show all sessions (no filter)

      const { data, error: fetchError } = await query
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform data to match CounselingSession interface
      const transformedData: CounselingSession[] = (data || []).map(session => ({
        id: session.id,
        mentorId: session.mentor_id,
        studentId: session.student_id,
        studentName: session.student?.name || 'Unknown Student',
        student: session.student ? {
          id: session.student.id,
          name: session.student.name,
          email: session.student.email,
          rollNumber: session.student.roll_number,
          department: session.student.department_id,
          year: session.student.year,
          avatar: session.student.avatar_url
        } : undefined,
        sessionName: session.session_name,
        date: session.date,
        time: session.time,
        notes: session.notes,
        attachment: session.attachment_url,
        status: session.status as 'scheduled' | 'completed' | 'cancelled',
        createdAt: session.created_at,
        updatedAt: session.updated_at
      }));

      setSessions(transformedData);
    } catch (err: any) {
      console.error('Error fetching sessions:', err);
      setError(err.message || 'Failed to fetch counseling sessions');
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (formData: SessionFormData) => {
    if (!mentorId) {
      alert('Mentor ID not found. Please try refreshing the page.');
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.from('counseling_sessions').insert({
        mentor_id: mentorId,
        student_id: formData.studentId,
        session_name: formData.sessionName,
        date: formData.date,
        time: formData.time,
        notes: formData.notes,
        status: formData.status,
        created_by: userId  // Use users.id (UUID), not jkkn_user_id (text)
      });

      if (error) throw error;

      setIsModalOpen(false);
      fetchSessions(); // Refresh list
    } catch (err: any) {
      console.error('Error creating session:', err);
      alert('Failed to create session: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateSession = async (sessionId: string, formData: SessionFormData) => {
    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('counseling_sessions')
        .update({
          session_name: formData.sessionName,
          student_id: formData.studentId,
          date: formData.date,
          time: formData.time,
          notes: formData.notes,
          status: formData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      setIsModalOpen(false);
      setEditingSession(null);
      fetchSessions(); // Refresh list
    } catch (err: any) {
      console.error('Error updating session:', err);
      alert('Failed to update session: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('counseling_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      fetchSessions(); // Refresh list
    } catch (err: any) {
      console.error('Error deleting session:', err);
      alert('Failed to delete session: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData: SessionFormData = {
      sessionName: form.session_name.value,
      studentId: form.student_id.value,
      date: form.date.value,
      time: form.time.value,
      notes: form.notes.value,
      status: form.status.value as 'scheduled' | 'completed' | 'cancelled'
    };

    if (editingSession) {
      await updateSession(editingSession.id, formData);
    } else {
      await createSession(formData);
    }
  };

  const openCreateModal = () => {
    setEditingSession(null);
    setIsModalOpen(true);
  };

  const openEditModal = (session: CounselingSession) => {
    setEditingSession(session);
    setIsModalOpen(true);
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'all', label: 'All Sessions' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'completed', label: 'Completed' }
  ];

  return (
    <div className="min-h-screen bg-neutral-50/50 p-4 lg:p-6 space-y-6">
      {/* Hero Header */}
      <div className="bg-white rounded-xl border border-neutral-200/50 p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-neutral-800 mb-2">
              Counseling Sessions
            </h1>
            <p className="text-neutral-600 text-sm lg:text-base">
              {isAdmin
                ? 'View and monitor all counseling sessions across the institution'
                : 'Manage and track your counseling sessions'}
            </p>
          </div>
          {/* Only show New Session button for mentors, not admins */}
          {mentorId && !isAdmin && (
            <Button
              onClick={openCreateModal}
              variant="primary"
              size="md"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Session
            </Button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-neutral-200/50 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h2 className="text-lg font-semibold text-neutral-700">Filters & Search</h2>
        </div>

        <SearchInput
          value={searchQuery}
          onChange={(value) => setSearchQuery(value)}
          placeholder="Search sessions..."
        />
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm transition-all
              ${activeTab === tab.id
                ? 'bg-white text-brand-green border border-neutral-200 shadow-sm'
                : 'text-neutral-600 hover:bg-white/50 hover:text-neutral-800'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sessions Content */}
      <div className="bg-white rounded-xl border border-neutral-200/50 p-6 shadow-sm">
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-brand-green border-t-transparent mb-3"></div>
            <p className="text-neutral-600 text-sm">Loading sessions...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50/80 border border-red-200/60 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-800">Error loading sessions</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && filteredSessions.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-lg font-semibold text-neutral-800 mb-2">
              No sessions found
            </h3>
            <p className="text-sm text-neutral-600">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'No counseling sessions have been scheduled yet'}
            </p>
          </div>
        )}

        {!loading && !error && filteredSessions.length > 0 && (
          <div className="space-y-4">
            {filteredSessions.map(session => (
              <div
                key={session.id}
                className="border border-neutral-200 rounded-lg p-5 hover:border-brand-green/30 hover:shadow-sm transition-all"
              >
                {/* Session Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-800 text-lg mb-2">
                      {session.sessionName}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-neutral-600">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(session.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {session.time}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {session.students.length} {session.students.length === 1 ? 'Student' : 'Students'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`
                        px-3 py-1 rounded-full text-xs font-medium
                        ${session.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : session.status === 'scheduled'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                        }
                      `}
                    >
                      {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    </span>
                    {/* Edit/Delete buttons removed for grouped view - grouped sessions represent multiple DB records */}
                  </div>
                </div>

                {/* Students List */}
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-neutral-700 mb-2">Students:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {session.students.map((student, index) => (
                      <div
                        key={student.id || index}
                        className="flex items-center gap-2 p-2 bg-neutral-50 rounded-lg border border-neutral-200"
                      >
                        <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center text-brand-green font-semibold text-sm">
                          {student.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-800 truncate">
                            {student.name}
                          </p>
                          {student.rollNumber && (
                            <p className="text-xs text-neutral-500">
                              {student.rollNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {session.notes && (
                  <div className="mt-4 pt-4 border-t border-neutral-200">
                    <h4 className="text-sm font-semibold text-neutral-700 mb-1">Notes:</h4>
                    <p className="text-sm text-neutral-600 bg-neutral-50 rounded p-3">
                      {session.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="border-b border-neutral-200 p-6 sticky top-0 bg-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-neutral-800">
                  {editingSession ? 'Edit Session' : 'New Counseling Session'}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingSession(null);
                  }}
                  className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Session Name */}
              <div>
                <label htmlFor="session_name" className="block text-sm font-medium text-neutral-700 mb-2">
                  Session Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="session_name"
                  name="session_name"
                  required
                  defaultValue={editingSession?.sessionName || ''}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all text-neutral-800"
                  placeholder="e.g., Career Guidance Session"
                />
              </div>

              {/* Student Selection */}
              <div>
                <label htmlFor="student_id" className="block text-sm font-medium text-neutral-700 mb-2">
                  Student <span className="text-red-500">*</span>
                </label>
                <select
                  id="student_id"
                  name="student_id"
                  required
                  defaultValue={editingSession?.studentId || ''}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all text-neutral-800"
                >
                  <option value="">Select a student</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.roll_number})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date and Time Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-neutral-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    required
                    defaultValue={editingSession?.date || ''}
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all text-neutral-800"
                  />
                </div>

                {/* Time */}
                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-neutral-700 mb-2">
                    Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    id="time"
                    name="time"
                    required
                    defaultValue={editingSession?.time || ''}
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all text-neutral-800"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-neutral-700 mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  id="status"
                  name="status"
                  required
                  defaultValue={editingSession?.status || 'scheduled'}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all text-neutral-800"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-neutral-700 mb-2">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  defaultValue={editingSession?.notes || ''}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all text-neutral-800 resize-none"
                  placeholder="Add any additional notes or comments..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingSession(null);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      {editingSession ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingSession ? 'Update Session' : 'Create Session'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
