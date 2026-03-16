'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';
import { readCache, writeCache } from '@/lib/utils/session-cache';
import type { Mentor } from '@/lib/types/mentor';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useMentorDirectory(searchQuery: string = '') {
  const cachedData = useRef(readCache<Mentor[]>('mentor_directory', CACHE_TTL));
  const [allMentors, setAllMentors] = useState<Mentor[]>(cachedData.current ?? []);
  const [loading, setLoading] = useState(!cachedData.current);
  const [error, setError] = useState<string | null>(null);

  const fetchMentors = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      if (!cachedData.current) setLoading(true);
      setError(null);

      const response = await fetchWithAuthRetry(
        `/api/mentor/list?search=${encodeURIComponent('*')}`,
        {},
        2
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Failed to fetch mentors');
      }

      const data = await response.json();
      const list: Mentor[] = data.data || [];
      setAllMentors(list);
      writeCache('mentor_directory', list);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch mentors';
      setError(errorMessage);
    } finally {
      setLoading(false);
      cachedData.current = null;
    }
  }, []);

  useEffect(() => {
    fetchMentors();
  }, [fetchMentors]);

  const mentors = useMemo(() => {
    if (!searchQuery.trim()) return allMentors;
    const q = searchQuery.toLowerCase();
    return allMentors.filter((m) =>
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.department?.toLowerCase().includes(q) ||
      m.designation?.toLowerCase().includes(q) ||
      m.institution?.toLowerCase().includes(q)
    );
  }, [allMentors, searchQuery]);

  return { allMentors, mentors, loading, error, refetch: fetchMentors };
}
