'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { readCache, writeCache } from '@/lib/utils/session-cache';

interface DashboardStats {
  totalMentors: number;
  activeStudents: number;
  totalSessions: number;
  pendingFeedback: number;
  trends: {
    sessions?: number;
  };
}

interface Activity {
  id: string;
  type: 'session' | 'assignment' | 'feedback' | 'student';
  title: string;
  description: string;
  timestamp: string;
  user?: {
    name: string;
    avatar?: string;
  };
}

interface Session {
  id: string;
  session_name: string;
  date: string;
  time: string;
  mentor_name?: string;
  student_name?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface TopMentor {
  id: string;
  name: string;
  avatar?: string;
  sessionCount: number;
}

interface DepartmentData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface DepartmentProgress {
  name: string;
  completed: number;
  total: number;
  color: string;
}

interface Notification {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'action';
  actionLabel?: string;
  actionUrl?: string;
}

interface DashboardData {
  stats: DashboardStats;
  activities: Activity[];
  upcomingSessions: Session[];
  topMentors: TopMentor[];
  departmentData: DepartmentData[];
  departmentProgress: DepartmentProgress[];
  notifications: Notification[];
}

const CACHE_KEY = 'dashboard_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
// sessionStorage flag — survives DashboardPage remounts within the same tab session
// so we never re-flash skeletons after the first successful load in this session.
const HAS_LOADED_KEY = 'dashboard_has_loaded';

function readHasLoaded(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    return sessionStorage.getItem(HAS_LOADED_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeHasLoaded() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(HAS_LOADED_KEY, 'true');
  } catch {
    // ignore
  }
}

const DEFAULT_STATS: DashboardStats = {
  totalMentors: 0,
  activeStudents: 0,
  totalSessions: 0,
  pendingFeedback: 0,
  trends: {},
};

export function useDashboard() {
  const router = useRouter();
  const redirecting = useRef(false);
  const cachedData = useRef(readCache<DashboardData>(CACHE_KEY, CACHE_TTL));
  // hasLoadedRef seeded from sessionStorage so it survives DashboardPage remounts
  // (which would otherwise reset useRef(false) and re-trigger the skeleton flash).
  const hasLoadedRef = useRef<boolean>(readHasLoaded());
  // Concurrency guard — without this, two near-simultaneous fetches can race
  // and clobber loading states (one sets true, another sets false out-of-order).
  const isFetchingRef = useRef<boolean>(false);

  // Skeletons only fire on a TRUE cold load: no in-memory cache AND no prior
  // successful load in this tab session. This is the single source of truth.
  const showInitialSkeletons = !cachedData.current && !hasLoadedRef.current;

  const [stats, setStats] = useState<DashboardStats>(cachedData.current?.stats ?? DEFAULT_STATS);
  const [activities, setActivities] = useState<Activity[]>(cachedData.current?.activities ?? []);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>(cachedData.current?.upcomingSessions ?? []);
  const [topMentors, setTopMentors] = useState<TopMentor[]>(cachedData.current?.topMentors ?? []);
  const [departmentData, setDepartmentData] = useState<DepartmentData[]>(cachedData.current?.departmentData ?? []);
  const [departmentProgress, setDepartmentProgress] = useState<DepartmentProgress[]>(cachedData.current?.departmentProgress ?? []);
  const [notifications, setNotifications] = useState<Notification[]>(cachedData.current?.notifications ?? []);

  // Per-section loading — each section renders independently as its data arrives
  const [statsLoading, setStatsLoading] = useState(showInitialSkeletons);
  const [activityLoading, setActivityLoading] = useState(showInitialSkeletons);
  const [trendsLoading, setTrendsLoading] = useState(showInitialSkeletons);
  const [sessionsLoading, setSessionsLoading] = useState(showInitialSkeletons);

  const fetchDashboardData = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const handleUnauthorized = () => {
      if (redirecting.current) return;
      redirecting.current = true;
      localStorage.removeItem('access_token');
      router.push('/login');
    };

    // Concurrency guard: drop redundant overlapping fetches (e.g., realtime burst
    // that fires while the previous fetch is still in flight). Without this, two
    // overlapping runs can race the loading-state setters and flash skeletons.
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    const authHeaders = { Authorization: `Bearer ${token}` };

    // Skeletons ONLY on a true cold load — never on background refetches.
    // hasLoadedRef is sessionStorage-backed, so a DashboardPage remount in the
    // same tab session does NOT re-show skeletons.
    if (!cachedData.current && !hasLoadedRef.current) {
      setStatsLoading(true);
      setActivityLoading(true);
      setTrendsLoading(true);
      setSessionsLoading(true);
    }

    // Mutable refs to collect data for cache + notifications after all complete
    let statsData: DashboardStats | null = null;
    let activitiesData: Activity[] = [];
    let topMentorsData: TopMentor[] = [];
    let departmentDataResult: DepartmentData[] = [];
    let departmentProgressResult: DepartmentProgress[] = [];
    let upcomingSessionsData: Session[] = [];
    let sessionsRaw: { sessions?: Session[] } | null = null;

    // Fire all 4 fetches independently — each resolves its own state
    const allDone: Promise<void>[] = [];

    // --- Stats (independent) ---
    allDone.push(
      fetch('/api/dashboard/stats', { headers: authHeaders })
        .then(async (res) => {
          if (res.ok) {
            statsData = await res.json();
            setStats(statsData!);
          } else if (res.status === 401) {
            handleUnauthorized();
          } else {
            const text = await res.text().catch(() => '');
            console.error(`[Dashboard] Stats API failed: ${res.status}`, text);
          }
        })
        .catch((e) => console.error('[Dashboard] Stats fetch error:', e))
        .finally(() => setStatsLoading(false))
    );

    // --- Activity feed (independent) ---
    allDone.push(
      fetch('/api/dashboard/activity?limit=10', { headers: authHeaders })
        .then(async (res) => {
          if (res.ok) {
            const json = await res.json();
            activitiesData = json.activities || [];
            setActivities(activitiesData);
          } else if (res.status === 401) {
            handleUnauthorized();
          } else {
            console.error(`[Dashboard] Activity API failed: ${res.status}`);
          }
        })
        .catch((e) => console.error('[Dashboard] Activity fetch error:', e))
        .finally(() => setActivityLoading(false))
    );

    // --- Trends: top mentors + department distribution (independent) ---
    allDone.push(
      fetch('/api/dashboard/trends?days=30', { headers: authHeaders })
        .then(async (res) => {
          if (res.ok) {
            const trendsData = await res.json();
            topMentorsData = trendsData.topMentors || [];
            departmentDataResult = trendsData.departmentDistribution || [];
            setTopMentors(topMentorsData);
            setDepartmentData(departmentDataResult);

            const colors = ['#0b6d41', '#ffde59', '#84efc2', '#48dfa0', '#1ec481'];
            departmentProgressResult = departmentDataResult.map((dept: any, index: number) => ({
              name: dept.name,
              completed: dept.completed || 0,
              total: dept.total || 0,
              color: colors[index % colors.length],
            }));
            setDepartmentProgress(departmentProgressResult);
          } else if (res.status === 401) {
            handleUnauthorized();
          } else {
            console.error(`[Dashboard] Trends API failed: ${res.status}`);
          }
        })
        .catch((e) => console.error('[Dashboard] Trends fetch error:', e))
        .finally(() => setTrendsLoading(false))
    );

    // --- Upcoming sessions (independent) ---
    allDone.push(
      fetch('/api/dashboard/sessions?limit=10', { headers: authHeaders })
        .then(async (res) => {
          if (res.ok) {
            sessionsRaw = await res.json();
            upcomingSessionsData = sessionsRaw!.sessions || [];
            setUpcomingSessions(upcomingSessionsData);
          } else if (res.status === 401) {
            handleUnauthorized();
          } else {
            console.error(`[Dashboard] Sessions API failed: ${res.status}`);
          }
        })
        .catch((e) => console.error('[Dashboard] Sessions fetch error:', e))
        .finally(() => setSessionsLoading(false))
    );

    // After ALL complete: derive notifications (depends on stats + sessions) and write cache
    Promise.allSettled(allDone).then(() => {
      const notifs: Notification[] = [];
      if (statsData && (statsData as any).pendingFeedback > 0) {
        const count = (statsData as any).pendingFeedback;
        notifs.push({
          id: 'feedback-1',
          title: 'Pending Feedback',
          description: `You have ${count} counseling session${count > 1 ? 's' : ''} awaiting feedback submission.`,
          type: 'action',
          actionLabel: 'Submit Feedback',
          actionUrl: '/mentor',
        });
      }
      if (sessionsRaw?.sessions && sessionsRaw.sessions.length > 0) {
        notifs.push({
          id: 'upcoming-1',
          title: 'Upcoming Sessions',
          description: `You have ${sessionsRaw.sessions.length} upcoming counseling session${sessionsRaw.sessions.length > 1 ? 's' : ''} scheduled.`,
          type: 'info',
        });
      }
      setNotifications(notifs);

      writeCache(CACHE_KEY, {
        stats: statsData ?? DEFAULT_STATS,
        activities: activitiesData,
        upcomingSessions: upcomingSessionsData,
        topMentors: topMentorsData,
        departmentData: departmentDataResult,
        departmentProgress: departmentProgressResult,
        notifications: notifs,
      });
      cachedData.current = null;
      hasLoadedRef.current = true;
      writeHasLoaded();
      isFetchingRef.current = false;
    });
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    stats,
    activities,
    upcomingSessions,
    topMentors,
    departmentData,
    departmentProgress,
    notifications,
    // Per-section loading for progressive rendering
    statsLoading,
    activityLoading,
    trendsLoading,
    sessionsLoading,
    // Backward-compatible overall loading
    loading: statsLoading || activityLoading || trendsLoading || sessionsLoading,
    refetch: fetchDashboardData,
    clearNotifications: () => setNotifications([]),
  };
}
