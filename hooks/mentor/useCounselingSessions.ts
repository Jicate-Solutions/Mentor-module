'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CounselingSession, Student } from '@/lib/types/mentor';

export function useCounselingSessions(mentorId: string) {
  const [sessions, setSessions] = useState<CounselingSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Fetch both sessions and assigned students for this mentor. */
  const fetchData = useCallback(async () => {
    if (!mentorId) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [sessionsRes, studentsRes] = await Promise.all([
        fetch(`/api/mentor/${mentorId}/counseling`, { headers }),
        fetch(`/api/mentor/${mentorId}/students`, { headers }),
      ]);

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data.sessions || data.data || []);
      } else {
        const data = await sessionsRes.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch counseling sessions');
      }

      if (studentsRes.ok) {
        const data = await studentsRes.json();
        // Normalise the student shape to match the Student type
        const list: Student[] = (data.data ?? data.students ?? []).map((s: any) => ({
          id: s.id,
          name: s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown',
          email: s.email || '',
          rollNumber: s.roll_number || s.rollNumber || '',
          department: s.department || '',
          year: s.year || '',
          avatar: s.avatar || s.avatar_url || undefined,
          isActive: s.is_active !== false,
        }));
        setStudents(list);
      } else {
        const data = await studentsRes.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch assigned students');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [mentorId]);

  /**
   * POST /api/mentor/{mentorId}/counseling
   * Creates a new counseling session for a single student.
   * Returns the created session or throws on error.
   */
  const createSession = useCallback(
    async (payload: {
      student: { id: string; name: string; rollNumber?: string; email?: string; department?: string; year?: string };
      sessionName: string;
      date: string;
      time: string;
      notes?: string;
      attachment?: string;
    }): Promise<CounselingSession> => {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/mentor/${mentorId}/counseling`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to create session');
      }

      const newSession: CounselingSession = json.session ?? json.data ?? json;
      setSessions(prev => [newSession, ...prev]);
      return newSession;
    },
    [mentorId]
  );

  /**
   * PUT /api/mentor/{mentorId}/counseling/{sessionId}
   * Updates an existing counseling session.
   */
  const updateSession = useCallback(
    async (
      sessionId: string,
      payload: {
        sessionName?: string;
        date?: string;
        time?: string;
        notes?: string;
        attachment?: string;
        status?: 'scheduled' | 'completed' | 'cancelled';
      }
    ): Promise<CounselingSession> => {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/mentor/${mentorId}/counseling/${sessionId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to update session');
      }

      const updated: CounselingSession = json.session ?? json.data ?? json;
      setSessions(prev => prev.map(s => (s.id === sessionId ? updated : s)));
      return updated;
    },
    [mentorId]
  );

  /**
   * DELETE /api/mentor/{mentorId}/counseling/{sessionId}
   * Deletes a counseling session and removes it from local state.
   */
  const deleteSession = useCallback(
    async (sessionId: string): Promise<void> => {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/mentor/${mentorId}/counseling/${sessionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to delete session');
      }

      setSessions(prev => prev.filter(s => s.id !== sessionId));
    },
    [mentorId]
  );

  /**
   * POST /api/mentor/{mentorId}/counseling/{sessionId}/feedback
   * Submits the mentor's session log / feedback for a counseling session.
   */
  const submitFeedback = useCallback(
    async (
      sessionId: string,
      payload: {
        counselingQueries: string;
        actionTaken: string;
        attachmentUrl?: string;
      }
    ): Promise<CounselingSession> => {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/mentor/${mentorId}/counseling/${sessionId}/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to submit feedback');
      }

      const updated: CounselingSession = json.session ?? json.data ?? json;
      setSessions(prev => prev.map(s => (s.id === sessionId ? updated : s)));
      return updated;
    },
    [mentorId]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    sessions,
    students,
    loading,
    error,
    refetch: fetchData,
    createSession,
    updateSession,
    deleteSession,
    submitFeedback,
  };
}
