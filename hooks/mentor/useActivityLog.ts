'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';
import { readCache, writeCache } from '@/lib/utils/session-cache';
import type { MentorActivity, ActivityFilters } from '@/lib/types/activity';

const CACHE_TTL = 5 * 60 * 1000;

interface ActivityLogCacheShape {
  activities: MentorActivity[];
  total: number;
}

export function useActivityLog(mentorId: string, filters?: ActivityFilters) {
  const filterKey = filters
    ? `_${filters.activityType?.join(',') || ''}_${filters.startDate || ''}_${filters.endDate || ''}_${filters.limit || ''}_${filters.offset || ''}`
    : '';
  const cacheKey = `activity_log_${mentorId}${filterKey}`;
  const cachedData = useRef(readCache<ActivityLogCacheShape>(cacheKey, CACHE_TTL));

  const [activities, setActivities] = useState<MentorActivity[]>(cachedData.current?.activities ?? []);
  const [total, setTotal] = useState(cachedData.current?.total ?? 0);
  const [loading, setLoading] = useState(!cachedData.current);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!mentorId) return;

    if (!cachedData.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters?.activityType?.length) {
        params.set('type', filters.activityType.join(','));
      }
      if (filters?.startDate) params.set('dateFrom', filters.startDate);
      if (filters?.endDate) params.set('dateTo', filters.endDate);
      if (filters?.limit) params.set('limit', String(filters.limit));
      if (filters?.offset) params.set('offset', String(filters.offset));

      const qs = params.toString();
      const url = `/api/mentor/${mentorId}/activity${qs ? `?${qs}` : ''}`;

      const res = await fetchWithAuthRetry(url, {}, 1);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch activity log');
      }

      const data = json.data ?? json;
      const activitiesData: MentorActivity[] = data.activities ?? data ?? [];
      const totalCount = data.total ?? activitiesData.length;

      setActivities(activitiesData);
      setTotal(totalCount);
      writeCache(cacheKey, { activities: activitiesData, total: totalCount });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      cachedData.current = null;
    }
  }, [mentorId, cacheKey, filters?.activityType, filters?.startDate, filters?.endDate, filters?.limit, filters?.offset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { activities, total, loading, error, refresh: fetchData };
}
