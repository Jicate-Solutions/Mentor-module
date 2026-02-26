'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';
import type { Mentor } from '@/lib/types/mentor';

export function useMentorDetails(mentorId: string) {
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMentor = useCallback(async () => {
    if (!mentorId) return;

    setLoading(true);
    setError(null);

    try {
      // fetchWithAuthRetry reads the current token from localStorage on every
      // attempt and retries once after refreshing if it gets a 401.
      const res = await fetchWithAuthRetry(`/api/mentor/${mentorId}`, {}, 1);

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch mentor details');
      }

      // Route returns { success, data } — support legacy { mentor } shape too
      const mentorData = json.data ?? json.mentor ?? json;
      setMentor(mentorData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [mentorId]);

  useEffect(() => {
    fetchMentor();
  }, [fetchMentor]);

  return { mentor, loading, error, refetch: fetchMentor };
}
