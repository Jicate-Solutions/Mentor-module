'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';
import { readCache, writeCache } from '@/lib/utils/session-cache';
import type { StudentFeedback, StudentFeedbackStats } from '@/lib/types/mentor';

const CACHE_TTL = 5 * 60 * 1000;

interface FeedbackCacheShape {
  feedback: StudentFeedback[];
  stats: StudentFeedbackStats | null;
}

export function useStudentFeedback(mentorId: string) {
  const cacheKey = `feedback_${mentorId}`;
  const cachedData = useRef(readCache<FeedbackCacheShape>(cacheKey, CACHE_TTL));

  const [feedback, setFeedback] = useState<StudentFeedback[]>(cachedData.current?.feedback ?? []);
  const [stats, setStats] = useState<StudentFeedbackStats | null>(cachedData.current?.stats ?? null);
  const [loading, setLoading] = useState(!cachedData.current);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'pending'>('all');

  /** GET /api/mentor/{mentorId}/feedback */
  const fetchFeedback = useCallback(async () => {
    if (!mentorId) return;

    if (!cachedData.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetchWithAuthRetry(`/api/mentor/${mentorId}/feedback`);

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch feedback');
      }

      if (json.success) {
        const feedbackData = json.data?.feedback ?? [];
        const statsData = json.data?.stats ?? null;
        setFeedback(feedbackData);
        setStats(statsData);
        writeCache(cacheKey, { feedback: feedbackData, stats: statsData });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      cachedData.current = null;
    }
  }, [mentorId, cacheKey]);

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
