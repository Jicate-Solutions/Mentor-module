'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { CounselingSession, SessionGroup } from '@/lib/types/mentor';
import { supabase } from '@/lib/supabase/client';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';
import SearchInput from '@/components/ui/SearchInput';
import Button from '@/components/ui/Button';
import HorizontalFilterBar from '@/components/filters/HorizontalFilterBar';
import { useFilters } from '@/hooks/useFilters';
import type { FilterConfig } from '@/lib/types/filters';
import SessionDayCard from '@/app/(dashboard)/components/SessionDayCard';

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
  attachment?: string;
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
  const { user, accessToken } = useAuth();
  const [sessions, setSessions] = useState<CounselingSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<GroupedSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<CounselingSession | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [mentorId, setMentorId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false); // Check if user is admin (not a mentor)

  // Filter configuration - role-based visibility
  // Institution: super_admin only | Department: super_admin, hod, mentor_incharge, principal | Program: all roles
  const filterConfigs: FilterConfig[] = [
    // Institution filter - super_admin only
    ...(user?.role === 'super_admin' ? [{
      key: 'institution',
      label: 'Institution',
      type: 'dropdown' as const,
      options: async () => {
        try {
          const response = await fetch('/api/jkkn/institutions', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            const uniqueInstitutions = new Map();
            (data.data || []).forEach((inst: any) => {
              const institutionName = inst.institution_name || inst.name;
              if (institutionName && !uniqueInstitutions.has(institutionName)) {
                uniqueInstitutions.set(institutionName, {
                  value: institutionName,
                  label: institutionName,
                });
              }
            });
            return Array.from(uniqueInstitutions.values());
          }
        } catch (error) {
          console.error('Error loading institutions:', error);
        }
        return [];
      },
      placeholder: 'All institutions',
      width: 'w-56',
    }] : []),
    // Department filter - super_admin, hod, mentor_incharge, principal
    ...(['super_admin', 'hod', 'mentor_incharge', 'principal'].includes(user?.role || '') ? [{
      key: 'department',
      label: 'Department',
      type: 'dropdown' as const,
      options: async () => {
        try {
          const response = await fetch('/api/jkkn/departments', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            const uniqueDepartments = new Map();
            (data.data || []).forEach((dept: any) => {
              const departmentName = dept.department_name || dept.name;
              if (departmentName && !uniqueDepartments.has(departmentName)) {
                uniqueDepartments.set(departmentName, {
                  value: departmentName,
                  label: departmentName,
                });
              }
            });
            return Array.from(uniqueDepartments.values());
          }
        } catch (error) {
          console.error('Error loading departments:', error);
        }
        return [];
      },
      placeholder: 'All departments',
      width: 'w-56',
    }] : []),
    // Program filter - all roles
    {
      key: 'program',
      label: 'Program',
      type: 'dropdown' as const,
      options: async () => {
        try {
          const response = await fetch('/api/jkkn/programs', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            const uniquePrograms = new Map();
            (data.data || []).forEach((prog: any) => {
              const programName = prog.program_name || prog.name;
              if (programName && !uniquePrograms.has(programName)) {
                uniquePrograms.set(programName, {
                  value: programName,
                  label: programName,
                });
              }
            });
            return Array.from(uniquePrograms.values());
          }
        } catch (error) {
          console.error('Error loading programs:', error);
        }
        return [];
      },
      placeholder: 'All programs',
      width: 'w-56',
    },
  ];

  // Initialize filters hook
  const { filters, setFilter, clearAllFilters, activeFiltersCount } = useFilters({}, true);

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

  // Fetch sessions as soon as user is available (doesn't depend on mentorId)
  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

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

  // Filter sessions based on active tab, search query, and filters
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

    // Apply institution filter (filter by student's institution from JKKN data)
    if (filters.institution && filters.institution !== '') {
      const institutionFilter = (filters.institution as string).toLowerCase();
      // Find sessions where at least one student matches the institution filter
      const matchingSessions = sessions.filter(session =>
        session.student?.institution?.toLowerCase().includes(institutionFilter)
      );
      const matchingSessionKeys = new Set(
        matchingSessions.map(s => `${s.sessionName}_${s.date}_${s.time}`)
      );
      grouped = grouped.filter(g =>
        matchingSessionKeys.has(`${g.sessionName}_${g.date}_${g.time}`)
      );
    }

    // Apply department filter (filter by student's department from JKKN data)
    if (filters.department && filters.department !== '') {
      const departmentFilter = (filters.department as string).toLowerCase();
      const matchingSessions = sessions.filter(session =>
        session.student?.departmentName?.toLowerCase().includes(departmentFilter)
      );
      const matchingSessionKeys = new Set(
        matchingSessions.map(s => `${s.sessionName}_${s.date}_${s.time}`)
      );
      grouped = grouped.filter(g =>
        matchingSessionKeys.has(`${g.sessionName}_${g.date}_${g.time}`)
      );
    }

    // Apply program filter (filter by student's program from JKKN data)
    if (filters.program && filters.program !== '') {
      const programFilter = (filters.program as string).toLowerCase();
      const matchingSessions = sessions.filter(session =>
        session.student?.programName?.toLowerCase().includes(programFilter)
      );
      const matchingSessionKeys = new Set(
        matchingSessions.map(s => `${s.sessionName}_${s.date}_${s.time}`)
      );
      grouped = grouped.filter(g =>
        matchingSessionKeys.has(`${g.sessionName}_${g.date}_${g.time}`)
      );
    }

    // Designation filter is not applicable for counseling sessions
    // Sessions are student-focused, not mentor-designation focused

    setFilteredSessions(grouped);
  }, [sessions, activeTab, searchQuery, filters]);

  const fetchMentorId = async () => {
    try {
      // Determine admin vs mentor from the auth context role (no DB query needed)
      const adminRoles = ['super_admin', 'administrator', 'principal', 'digital_coordinator'];
      const userIsAdmin = adminRoles.includes(user?.role || '');

      if (userIsAdmin) {
        setIsAdmin(true);
        setMentorId(null);
        console.log('User is administrator - showing all sessions');
        return;
      }

      // For mentor/faculty/hod users, verify via API route (handles self-healing)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetchWithAuthRetry(`/api/mentor/${user?.id}`, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        const json = await response.json();
        setMentorId(json.data?.id || user?.id || null);
      } else {
        // API couldn't find mentor but user is authenticated — use user.id as
        // fallback so the session fetch (which also self-heals) can proceed
        console.warn('Mentor lookup returned non-OK, using user.id as fallback');
        setMentorId(user?.id || null);
      }
      setIsAdmin(false);
    } catch (err: any) {
      console.error('Error fetching mentor ID:', err);
      // Graceful fallback — let fetchSessions attempt its own resolution
      setMentorId(user?.id || null);
      setIsAdmin(false);
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

      // For mentor users, use the API route (service-role client bypasses RLS)
      if (user?.id && !isAdmin) {
        const response = await fetchWithAuthRetry(
          `/api/mentor/${user.id}/counseling`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch sessions');
        }

        const json = await response.json();
        setSessions(json.data || []);
        return;
      }

      // Fallback for admin users: direct query to show all sessions
      const { data, error: fetchError } = await supabase
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
        `)
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform data to match CounselingSession interface
      const transformedData: CounselingSession[] = (data || []).map((session) => ({
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
          avatar: session.student.avatar_url,
          institution: undefined,
          departmentName: undefined,
          programName: undefined,
        } : undefined,
        sessionName: session.session_name,
        date: session.date,
        time: session.time,
        notes: session.notes,
        attachment: session.attachment_url,
        status: session.status as 'scheduled' | 'completed' | 'cancelled',
        createdAt: session.created_at,
        updatedAt: session.updated_at,
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
    if (!user?.id) {
      alert('User not found. Please try refreshing the page.');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetchWithAuthRetry(
        `/api/mentor/${user.id}/counseling`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student: { id: formData.studentId },
            sessionName: formData.sessionName,
            date: formData.date,
            time: formData.time,
            notes: formData.notes,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create session');
      }

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
    if (!user?.id) return;

    try {
      setSubmitting(true);

      const response = await fetchWithAuthRetry(
        `/api/mentor/${user.id}/counseling/${sessionId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionName: formData.sessionName,
            date: formData.date,
            time: formData.time,
            notes: formData.notes,
            status: formData.status,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update session');
      }

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
    if (!user?.id) return;

    try {
      const response = await fetchWithAuthRetry(
        `/api/mentor/${user.id}/counseling/${sessionId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete session');
      }

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
    <div className="min-h-screen bg-neutral-50/50 p-4 lg:p-6 space-y-4 lg:space-y-5">
      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-neutral-200/50 p-4 lg:p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3 lg:mb-4">
          <svg className="w-4 h-4 lg:w-5 lg:h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h2 className="text-[16px] lg:text-lg font-medium text-neutral-700">Filters & Search</h2>
        </div>

        <div className="space-y-3 lg:space-y-4">
          <SearchInput
            value={searchQuery}
            onChange={(value) => setSearchQuery(value)}
            placeholder="Search sessions..."
            className="w-full"
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
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-4 py-2.5 lg:py-2 rounded-lg font-medium text-[13px] lg:text-sm transition-all whitespace-nowrap min-h-[44px] lg:min-h-0 flex items-center
              ${activeTab === tab.id
                ? 'bg-white text-brand-green border border-neutral-200 shadow-sm'
                : 'text-neutral-600 hover:bg-white hover:text-neutral-800'
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
                <p className="text-sm font-medium text-red-800">Error loading sessions</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && filteredSessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-brand-green/10 rounded-full blur-2xl" />
              <div className="relative bg-gradient-to-br from-brand-green/10 to-brand-yellow/10 rounded-full p-6">
                <svg className="w-16 h-16 text-brand-green/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              No sessions found
            </h3>
            <p className="text-sm text-neutral-600 text-center max-w-sm">
              {searchQuery
                ? 'Try adjusting your search terms or filters to find what you\'re looking for'
                : 'No counseling sessions have been scheduled yet. Create your first session to get started.'}
            </p>
            {mentorId && !isAdmin && (
              <Button
                onClick={openCreateModal}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create First Session
              </Button>
            )}
          </div>
        )}

        {!loading && !error && filteredSessions.length > 0 && (
          <div className="space-y-4">
            {filteredSessions.map((session, index) => {
              // Convert the page's local GroupedSession shape to the shared SessionGroup
              // type so SessionDayCard can render it. Actions are disabled here because
              // this page is an admin overview without per-student session IDs needed
              // to call deleteSession/addStudentToSession.
              const group: SessionGroup = {
                date: session.date,
                sessionName: session.sessionName,
                sessionTime: session.time,
                status: session.status,
                sessions: session.students.map((student: any) => ({
                  id: session.id, // group-level ID (best available without per-student rows)
                  mentorId: session.mentorId,
                  studentId: student.id,
                  studentName: student.name,
                  student: {
                    id: student.id,
                    name: student.name,
                    email: student.email || '',
                    rollNumber: student.rollNumber || '',
                    department: '',
                    year: '',
                    avatar: student.avatar,
                  },
                  sessionName: session.sessionName,
                  date: session.date,
                  time: session.time,
                  notes: session.notes,
                  status: session.status,
                  createdAt: session.createdAt,
                })),
              };
              return (
                <SessionDayCard
                  key={`${session.id}-${index}`}
                  group={group}
                  assignedStudents={[]}
                  onRemoveStudent={() => {}}
                  onAddStudent={() => {}}
                  disabled={true}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="border-b border-neutral-200 p-6 sticky top-0 bg-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-medium text-neutral-800">
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
