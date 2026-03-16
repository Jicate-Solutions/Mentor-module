'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';
import { readCache, writeCache } from '@/lib/utils/session-cache';
import type { LoginHistoryEntry } from '@/lib/types/mentor';

const CACHE_TTL = 5 * 60 * 1000;

interface LoginHistoryCacheShape {
  logins: LoginHistoryEntry[];
  totalLogins: number;
  lastLogin: string | null;
}

export function useLoginHistory(mentorId: string) {
  const cacheKey = `login_history_${mentorId}`;
  const cachedData = useRef(readCache<LoginHistoryCacheShape>(cacheKey, CACHE_TTL));

  const [logins, setLogins] = useState<LoginHistoryEntry[]>(cachedData.current?.logins ?? []);
  const [totalLogins, setTotalLogins] = useState(cachedData.current?.totalLogins ?? 0);
  const [lastLogin, setLastLogin] = useState<string | null>(cachedData.current?.lastLogin ?? null);
  const [loading, setLoading] = useState(!cachedData.current);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!mentorId) return;

    if (!cachedData.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetchWithAuthRetry(`/api/mentor/${mentorId}/activity/login`, {}, 1);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch login history');
      }

      const data = json.data ?? json;
      const loginsData: LoginHistoryEntry[] = data.logins ?? data ?? [];
      const totalCount = data.totalLogins ?? loginsData.length;
      const lastLoginDate = data.lastLogin ?? (loginsData.length > 0 ? loginsData[0].loginAt : null);

      setLogins(loginsData);
      setTotalLogins(totalCount);
      setLastLogin(lastLoginDate);
      writeCache(cacheKey, { logins: loginsData, totalLogins: totalCount, lastLogin: lastLoginDate });
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

  return { logins, totalLogins, lastLogin, loading, error, refresh: fetchData };
}
