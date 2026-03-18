'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';
import { readCache, writeCache, clearCache } from '@/lib/utils/session-cache';
import type { CounselingSession, Student } from '@/lib/types/mentor';

const CACHE_TTL = 5 * 60 * 1000;

interface CounselingCacheShape {
  sessions: CounselingSession[];
  students: Student[];
}

export function useCounselingSessions(mentorId: string) {
  const cacheKey = `counseling_${mentorId}`;
  const cachedData = useRef(readCache<CounselingCacheShape>(cacheKey, CACHE_TTL));

  const [sessions, setSessions] = useState<CounselingSession[]>(cachedData.current?.sessions ?? []);
  const [students, setStudents] = useState<Student[]>(cachedData.current?.students ?? []);
  const [loading, setLoading] = useState(!cachedData.current);
  const [error, setError] = useState<string | null>(null);

  /** Fetch both sessions and assigned students for this mentor. */
  const fetchData = useCallback(async () => {
    if (!mentorId) return;

    if (!cachedData.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const [sessionsRes, studentsRes] = await Promise.all([
        fetchWithAuthRetry(`/api/mentor/${mentorId}/counseling`),
        fetchWithAuthRetry(`/api/mentor/${mentorId}/students`),
      ]);

      let sessionsData: CounselingSession[] = [];
      let studentsData: Student[] = [];
      const errors: string[] = [];

      // Process students FIRST — a sessions failure must never block the
      // student list, because that gates the "Create Session" button.
      if (studentsRes.ok) {
        const data = await studentsRes.json();
        studentsData = (data.data ?? data.students ?? []).map((s: any) => ({
          id: s.id,
          name: s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown',
          email: s.email || '',
          rollNumber: s.roll_number || s.rollNumber || '',
          department: s.department || '',
          year: s.year || '',
          avatar: s.avatar || s.avatar_url || undefined,
          isActive: s.is_active !== false,
        }));
        setStudents(studentsData);
      } else {
        const data = await studentsRes.json().catch(() => ({}));
        errors.push(data.error || 'Failed to fetch assigned students');
      }

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        sessionsData = data.data || [];
        setSessions(sessionsData);
      } else {
        const data = await sessionsRes.json().catch(() => ({}));
        errors.push(data.error || 'Failed to fetch counseling sessions');
      }

      if (errors.length > 0) {
        throw new Error(errors.join('; '));
      }

      writeCache(cacheKey, { sessions: sessionsData, students: studentsData });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      cachedData.current = null;
    }
  }, [mentorId, cacheKey]);

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
      const res = await fetchWithAuthRetry(`/api/mentor/${mentorId}/counseling`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to create session');
      }

      const newSession: CounselingSession = json.session ?? json.data ?? json;
      setSessions(prev => [newSession, ...prev]);
      clearCache(cacheKey);
      return newSession;
    },
    [mentorId, cacheKey]
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
      const res = await fetchWithAuthRetry(`/api/mentor/${mentorId}/counseling/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to update session');
      }

      const updated: CounselingSession = json.session ?? json.data ?? json;
      setSessions(prev => prev.map(s => (s.id === sessionId ? updated : s)));
      clearCache(cacheKey);
      return updated;
    },
    [mentorId, cacheKey]
  );

  /**
   * DELETE /api/mentor/{mentorId}/counseling/{sessionId}
   * Deletes a counseling session and removes it from local state.
   */
  const deleteSession = useCallback(
    async (sessionId: string): Promise<void> => {
      const res = await fetchWithAuthRetry(`/api/mentor/${mentorId}/counseling/${sessionId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to delete session');
      }

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      clearCache(cacheKey);
    },
    [mentorId, cacheKey]
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
      const res = await fetchWithAuthRetry(`/api/mentor/${mentorId}/counseling/${sessionId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to submit feedback');
      }

      const updated: CounselingSession = json.session ?? json.data ?? json;
      setSessions(prev => prev.map(s => (s.id === sessionId ? updated : s)));
      clearCache(cacheKey);
      return updated;
    },
    [mentorId, cacheKey]
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
