'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';
import { readCache, writeCache } from '@/lib/utils/session-cache';
import type { Mentor } from '@/lib/types/mentor';

const CACHE_TTL = 5 * 60 * 1000;

export function useMentorDetails(mentorId: string) {
  const cacheKey = `mentor_detail_${mentorId}`;
  const cachedData = useRef(readCache<Mentor>(cacheKey, CACHE_TTL));

  const [mentor, setMentor] = useState<Mentor | null>(cachedData.current ?? null);
  const [loading, setLoading] = useState(!cachedData.current);
  const [error, setError] = useState<string | null>(null);

  const fetchMentor = useCallback(async () => {
    if (!mentorId) return;

    if (!cachedData.current) {
      setLoading(true);
    }
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
      writeCache(cacheKey, mentorData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      cachedData.current = null;
    }
  }, [mentorId, cacheKey]);

  useEffect(() => {
    fetchMentor();
  }, [fetchMentor]);

  return { mentor, loading, error, refetch: fetchMentor };
}
