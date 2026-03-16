'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';
import { readCache, writeCache } from '@/lib/utils/session-cache';
import type { SessionStats, MentorEngagement } from '@/lib/types/mentor';

const CACHE_TTL = 5 * 60 * 1000;

interface SessionStatsCacheShape {
  stats: SessionStats | null;
  engagement: MentorEngagement | null;
}

export function useSessionStats(mentorId: string) {
  const cacheKey = `session_stats_${mentorId}`;
  const cachedData = useRef(readCache<SessionStatsCacheShape>(cacheKey, CACHE_TTL));

  const [stats, setStats] = useState<SessionStats | null>(cachedData.current?.stats ?? null);
  const [engagement, setEngagement] = useState<MentorEngagement | null>(cachedData.current?.engagement ?? null);
  const [loading, setLoading] = useState(!cachedData.current);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!mentorId) return;

    if (!cachedData.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetchWithAuthRetry(`/api/mentor/${mentorId}/activity/stats`, {}, 1);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch session stats');
      }

      const data = json.data ?? json;
      const statsData: SessionStats | null = data.stats ?? data ?? null;
      const engagementData: MentorEngagement | null = data.engagement ?? null;

      setStats(statsData);
      setEngagement(engagementData);
      writeCache(cacheKey, { stats: statsData, engagement: engagementData });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      cachedData.current = null;
    }
  }, [mentorId, cacheKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { stats, engagement, loading, error, refresh: fetchData };
}
