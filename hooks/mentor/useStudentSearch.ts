'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { readCache, writeCache, clearCache } from '@/lib/utils/session-cache';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';
import type { Student } from '@/lib/types/mentor';

const CACHE_TTL = 5 * 60 * 1000;

export function useStudentSearch(assignedStudentIds: string[], mentorId: string) {
  const { accessToken } = useAuth();
  const cacheKey = `student_search_${mentorId}`;
  // Treat cached empty arrays as stale (from previous failed requests)
  const cachedData = useRef((() => {
    const cached = readCache<Student[]>(cacheKey, CACHE_TTL);
    return cached && cached.length > 0 ? cached : null;
  })());

  const [allStudents, setAllStudents] = useState<Student[]>(cachedData.current ?? []);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(!cachedData.current);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  /** Load all eligible students */
  const loadAllStudents = useCallback(async () => {
    if (!cachedData.current) {
      setSearching(true);
    }
    setError(null);

    try {
      console.log('[useStudentSearch] Fetching students...');
      // fetchWithAuthRetry reads the current token from localStorage on every
      // attempt and automatically retries once after refreshing on 401.
      const res = await fetchWithAuthRetry(
        `/api/students/search?q=*&for_assignment=true`,
        {},
        1
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errData.error || 'Failed to load students');
      }

      const data = await res.json();
      const students: Student[] = data.students || [];
      console.log(`[useStudentSearch] Loaded ${students.length} students`);
      setAllStudents(students);
      writeCache(cacheKey, students);
      hasFetched.current = true;
    } catch (err) {
      console.error('[useStudentSearch] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load students');
    } finally {
      setSearching(false);
      cachedData.current = null;
    }
  }, [cacheKey]);

  // Fire when accessToken becomes available (handles auth timing race condition).
  // Re-fire if previous attempt failed (allStudents still empty).
  useEffect(() => {
    if (hasFetched.current && allStudents.length > 0) return; // Already have data
    if (!accessToken) {
      console.log('[useStudentSearch] Waiting for auth...');
      return; // Wait for auth to be ready
    }
    loadAllStudents();
  }, [loadAllStudents, accessToken, allStudents.length]);

  /** Client-side filter: by name, email, roll number, department */
  const searchResults = useMemo(() => {
    const assignedSet = new Set(assignedStudentIds);
    const unassigned = allStudents.filter(s => !assignedSet.has(s.id));

    if (!searchQuery.trim()) return [];

    const q = searchQuery.toLowerCase();
    return unassigned.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.rollNumber?.toLowerCase().includes(q) ||
      s.department?.toLowerCase().includes(q)
    );
  }, [allStudents, searchQuery, assignedStudentIds]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setError(null);
  }, []);

  /** Force refresh — clears cache and re-fetches */
  const refetch = useCallback(() => {
    clearCache(cacheKey);
    cachedData.current = null;
    hasFetched.current = false;
    return loadAllStudents();
  }, [cacheKey, loadAllStudents]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    searching,
    error,
    clearSearch,
    refetch,
  };
}
