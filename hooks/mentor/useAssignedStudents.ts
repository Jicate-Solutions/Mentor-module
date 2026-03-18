'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { readCache, writeCache, clearCache, clearCacheByPrefix } from '@/lib/utils/session-cache';
import type { Student } from '@/lib/types/mentor';

const CACHE_TTL = 5 * 60 * 1000;

/** Clear all caches that depend on the student list for this mentor */
function invalidateStudentCaches(mentorId: string, ownCacheKey: string) {
  clearCache(ownCacheKey);
  // CounselingTab's useCounselingSessions also fetches students; clear its cache
  // so it doesn't serve stale data showing zero students.
  clearCache(`counseling_${mentorId}`);
}

export function useAssignedStudents(mentorId: string) {
  const cacheKey = `assigned_students_${mentorId}`;
  const cachedData = useRef(readCache<Student[]>(cacheKey, CACHE_TTL));

  const [students, setStudents] = useState<Student[]>(cachedData.current ?? []);
  const [loading, setLoading] = useState(!cachedData.current);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    if (!mentorId) return;

    if (!cachedData.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/mentor/${mentorId}/students`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch students');
      }

      // The existing route returns { success, data, meta } — data is the students array
      const list: Student[] = (json.data ?? json.students ?? []).map((s: any) => ({
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
      writeCache(cacheKey, list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error(`[useAssignedStudents] Error fetching students for mentor ${mentorId}:`, msg);
      setError(msg);
      // Clear stale cache on error so next attempt doesn't show outdated data
      clearCache(cacheKey);
    } finally {
      setLoading(false);
      cachedData.current = null;
    }
  }, [mentorId, cacheKey]);

  /**
   * POST /api/mentor/{mentorId}/students
   * Assigns a student to the mentor.
   */
  const assignStudent = useCallback(
    async (studentData: Partial<Student>): Promise<{ success: boolean; error?: string }> => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`/api/mentor/${mentorId}/students`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ student: studentData }),
        });

        const json = await res.json();

        if (!res.ok) {
          return { success: false, error: json.error || 'Failed to assign student' };
        }

        invalidateStudentCaches(mentorId, cacheKey);
        await fetchStudents();
        return { success: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        return { success: false, error: message };
      }
    },
    [mentorId, fetchStudents, cacheKey]
  );

  /**
   * DELETE /api/mentor/{mentorId}/students/{studentId}
   * Removes a student from the mentor.
   */
  const removeStudent = useCallback(
    async (studentId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`/api/mentor/${mentorId}/students/${studentId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();

        if (!res.ok) {
          return { success: false, error: json.error || 'Failed to remove student' };
        }

        invalidateStudentCaches(mentorId, cacheKey);
        await fetchStudents();
        return { success: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        return { success: false, error: message };
      }
    },
    [mentorId, fetchStudents, cacheKey]
  );

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return {
    students,
    loading,
    error,
    refetch: fetchStudents,
    assignStudent,
    removeStudent,
  };
}
