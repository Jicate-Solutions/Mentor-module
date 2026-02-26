'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Student } from '@/lib/types/mentor';

export function useAssignedStudents(mentorId: string) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    if (!mentorId) return;

    setLoading(true);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [mentorId]);

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

        await fetchStudents();
        return { success: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        return { success: false, error: message };
      }
    },
    [mentorId, fetchStudents]
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

        await fetchStudents();
        return { success: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        return { success: false, error: message };
      }
    },
    [mentorId, fetchStudents]
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
