'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';
import { readCache, writeCache, clearCache } from '@/lib/utils/session-cache';
import type { SessionAttendanceRecord, SessionAttendanceStatus, StudentAttendanceStats } from '@/lib/types/mentor';

const CACHE_TTL = 5 * 60 * 1000;

interface AttendanceCacheShape {
  attendance: SessionAttendanceRecord[];
  stats: StudentAttendanceStats | null;
}

export function useSessionAttendance(mentorId: string, sessionId: string) {
  const cacheKey = `attendance_${mentorId}_${sessionId}`;
  const cachedData = useRef(readCache<AttendanceCacheShape>(cacheKey, CACHE_TTL));

  const [attendance, setAttendance] = useState<SessionAttendanceRecord[]>(cachedData.current?.attendance ?? []);
  const [stats, setStats] = useState<StudentAttendanceStats | null>(cachedData.current?.stats ?? null);
  const [loading, setLoading] = useState(!cachedData.current);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!mentorId || !sessionId) return;

    if (!cachedData.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetchWithAuthRetry(
        `/api/mentor/${mentorId}/counseling/${sessionId}/attendance`,
        {},
        1
      );
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch attendance');
      }

      const data = json.data ?? json;
      const attendanceData: SessionAttendanceRecord[] = data.attendance ?? data ?? [];
      const statsData: StudentAttendanceStats | null = data.stats ?? null;

      setAttendance(attendanceData);
      setStats(statsData);
      writeCache(cacheKey, { attendance: attendanceData, stats: statsData });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      cachedData.current = null;
    }
  }, [mentorId, sessionId, cacheKey]);

  const markAttendance = useCallback(
    async (studentId: string, status: SessionAttendanceStatus): Promise<void> => {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/mentor/${mentorId}/counseling/${sessionId}/attendance`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId, status }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to mark attendance');
      }

      // Update local state optimistically
      setAttendance(prev =>
        prev.map(record =>
          record.studentId === studentId ? { ...record, status, markedAt: new Date().toISOString() } : record
        )
      );
      clearCache(cacheKey);
    },
    [mentorId, sessionId, cacheKey]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { attendance, stats, markAttendance, loading, error, refresh: fetchData };
}
