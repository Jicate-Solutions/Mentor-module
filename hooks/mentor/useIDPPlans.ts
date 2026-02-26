'use client';

import { useState, useEffect, useCallback } from 'react';
import type { IDPPlan } from '@/lib/types/mentor';

export function useIDPPlans(mentorId: string) {
  const [plans, setPlans] = useState<IDPPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** GET /api/idp?mentor_id={mentorId} */
  const fetchPlans = useCallback(async () => {
    if (!mentorId) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/idp?mentor_id=${encodeURIComponent(mentorId)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch IDP plans');
      }

      setPlans(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [mentorId]);

  /**
   * PATCH /api/idp/{planId}
   * Updates the status of an IDP plan.
   */
  const updatePlanStatus = useCallback(
    async (planId: string, status: IDPPlan['status']): Promise<void> => {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/idp/${planId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to update IDP plan status');
      }

      // Reflect the status change locally so the UI updates immediately
      setPlans(prev =>
        prev.map(p => (p.id === planId ? { ...p, status } : p))
      );
    },
    []
  );

  /**
   * DELETE /api/idp/{planId}
   * Deletes an IDP plan and removes it from local state.
   */
  const deletePlan = useCallback(
    async (planId: string): Promise<void> => {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/idp/${planId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to delete IDP plan');
      }

      setPlans(prev => prev.filter(p => p.id !== planId));
    },
    []
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
