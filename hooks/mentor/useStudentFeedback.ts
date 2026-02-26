'use client';

import { useState, useEffect, useCallback } from 'react';
import type { StudentFeedback, StudentFeedbackStats } from '@/lib/types/mentor';

export function useStudentFeedback(mentorId: string) {
  const [feedback, setFeedback] = useState<StudentFeedback[]>([]);
  const [stats, setStats] = useState<StudentFeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'pending'>('all');

  /** GET /api/mentor/{mentorId}/feedback */
  const fetchFeedback = useCallback(async () => {
    if (!mentorId) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/mentor/${mentorId}/feedback`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch feedback');
      }

      if (json.success) {
        setFeedback(json.feedback || json.data || []);
        setStats(json.stats || null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [mentorId]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  return {
    feedback,
    stats,
    loading,
    error,
    filter,
    setFilter,
    refetch: fetchFeedback,
  };
}
