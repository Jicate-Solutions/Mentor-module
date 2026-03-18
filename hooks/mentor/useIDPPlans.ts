'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';
import { readCache, writeCache } from '@/lib/utils/session-cache';
import type { IDPPlan } from '@/lib/types/mentor';

const CACHE_TTL = 5 * 60 * 1000;

export function useIDPPlans(mentorId: string) {
  const cacheKey = `idp_plans_${mentorId}`;
  const cachedData = useRef(readCache<IDPPlan[]>(cacheKey, CACHE_TTL));

  const [plans, setPlans] = useState<IDPPlan[]>(cachedData.current ?? []);
  const [loading, setLoading] = useState(!cachedData.current);
  const [error, setError] = useState<string | null>(null);

  /** GET /api/idp?mentor_id={mentorId} */
  const fetchPlans = useCallback(async () => {
    if (!mentorId) return;

    if (!cachedData.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetchWithAuthRetry(`/api/idp?mentor_id=${encodeURIComponent(mentorId)}`);

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch IDP plans');
      }

      const plansData = json.data || [];
      setPlans(plansData);
      writeCache(cacheKey, plansData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      cachedData.current = null;
    }
  }, [mentorId, cacheKey]);

  /**
   * PATCH /api/idp/{planId}
   * Updates the status of an IDP plan.
   */
  const updatePlanStatus = useCallback(
    async (planId: string, status: IDPPlan['status']): Promise<void> => {
      const res = await fetchWithAuthRetry(`/api/idp/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to update IDP plan status');
      }

      // Reflect the status change locally so the UI updates immediately
      setPlans(prev => {
        const updated = prev.map(p => (p.id === planId ? { ...p, status } : p));
        writeCache(cacheKey, updated);
        return updated;
      });
    },
    [cacheKey]
  );

  /**
   * DELETE /api/idp/{planId}
   * Deletes an IDP plan and removes it from local state.
   */
  const deletePlan = useCallback(
    async (planId: string): Promise<void> => {
      const res = await fetchWithAuthRetry(`/api/idp/${planId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to delete IDP plan');
      }

      setPlans(prev => {
        const updated = prev.filter(p => p.id !== planId);
        writeCache(cacheKey, updated);
        return updated;
      });
    },
    [cacheKey]
  );

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return {
    plans,
    loading,
    error,
    refetch: fetchPlans,
    updatePlanStatus,
    deletePlan,
  };
}
