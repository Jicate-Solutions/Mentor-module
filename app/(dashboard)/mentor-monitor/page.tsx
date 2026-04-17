'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, CheckCircle2, CalendarClock, TrendingUp, Monitor } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useUserAccess } from '@/hooks/useUserAccess';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';
import { supabase } from '@/lib/supabase/client';

// Analytics types + components
import type {
  SessionCompletionSummary,
  PerMentorRow,
  PairingRow,
  InstitutionSummaryRow,
} from '@/lib/types/session-analytics';
import type { MentorActivity, ActivityStats } from '@/lib/types/activity';
import AnalyticsFilters, {
  type FilterState,
  getAnalyticsDateRange,
} from '@/app/(dashboard)/analytics/components/AnalyticsFilters';
import CoverageFunnelCard from '@/app/(dashboard)/analytics/components/CoverageFunnelCard';
import CompletionDonutChart from '@/app/(dashboard)/analytics/components/CompletionDonutChart';
import MentorCompletionTable from '@/app/(dashboard)/analytics/components/MentorCompletionTable';
import MenteeCoverageGrid from '@/app/(dashboard)/analytics/components/MenteeCoverageGrid';
import ExportBar from '@/app/(dashboard)/analytics/components/ExportBar';
import InstitutionReportTable from '@/app/(dashboard)/analytics/components/InstitutionReportTable';
import ActivityStatsGrid from '@/app/(dashboard)/mentor-activity/components/ActivityStatsGrid';
import ActivityTimeline from '@/app/(dashboard)/mentor-activity/components/ActivityTimeline';
import MentorPerformanceTable from '@/app/(dashboard)/mentor-activity/components/MentorPerformanceTable';

// New tab components
import MonitorTabs, { type MonitorTab } from './components/MonitorTabs';
import IdpTrackerTab from './components/IdpTrackerTab';
import FeedbackTab from './components/FeedbackTab';
import CounselingActionsTab from './components/CounselingActionsTab';

// New API types
import type { IdpSummaryRow } from '@/app/api/mentor-monitor/idp-summary/route';
import type { FeedbackSummaryRow } from '@/app/api/mentor-monitor/feedback-summary/route';
import type { CounselingSummaryRow } from '@/app/api/mentor-monitor/counseling-summary/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildQS(filters: FilterState): string {
  const p = new URLSearchParams();
  if (filters.startDate) p.append('dateFrom', filters.startDate);
  if (filters.endDate) p.append('dateTo', filters.endDate);
  if (filters.departmentId) p.append('departmentId', filters.departmentId);
  if (filters.institutionId) p.append('institutionId', filters.institutionId);
  return p.toString();
}

function buildDateQS(filters: FilterState): string {
  const p = new URLSearchParams();
  if (filters.startDate) p.append('dateFrom', filters.startDate);
  if (filters.endDate) p.append('dateTo', filters.endDate);
  return p.toString();
}

function initialFilters(): FilterState {
  const range = getAnalyticsDateRange('month');
  return {
    timePeriod: 'month',
    startDate: range?.startDate.toISOString(),
    endDate: range?.endDate.toISOString(),
  };
}

// ── KPI strip ─────────────────────────────────────────────────────────────────

function KPIStrip({
  summary,
  loading,
}: {
  summary: SessionCompletionSummary | null;
  loading: boolean;
}) {
  const s = summary;
  const cards = [
    {
      icon: <Users className="w-4 h-4" />,
      label: 'Mentors Active',
      value: s ? `${s.mentorsWithFirstSession} / ${s.totalMentors}` : '— / —',
      sub: s ? `${s.mentorFirstSessionRate}% started` : '—',
      accent: 'text-[#0b6d41] bg-[#0b6d41]/10',
    },
    {
      icon: <CheckCircle2 className="w-4 h-4" />,
      label: 'Mentees Met',
      value: s ? `${s.menteesWithFirstSession} / ${s.totalAssignedMentees}` : '— / —',
      sub: s ? `${s.menteeMetRate}% coverage` : '—',
      accent: 'text-emerald-700 bg-emerald-100',
    },
    {
      icon: <CalendarClock className="w-4 h-4" />,
      label: 'Sessions Done',
      value: s ? s.totalCompletedSessions.toLocaleString() : '—',
      sub: s ? `${s.totalScheduledSessions.toLocaleString()} scheduled` : '—',
      accent: 'text-blue-700 bg-blue-100',
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      label: 'Completion Rate',
      value: s ? `${s.completionRate}%` : '—',
      sub: s ? `${s.totalCancelledSessions} cancelled` : '—',
      accent: 'text-amber-700 bg-amber-100',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((_, i) => (
          <div key={i} className="bg-white border border-neutral-200 rounded-xl p-4 animate-pulse">
            <div className="w-8 h-8 bg-neutral-100 rounded-lg mb-3" />
            <div className="w-20 h-3 bg-neutral-100 rounded mb-2" />
            <div className="w-28 h-6 bg-neutral-100 rounded mb-1" />
            <div className="w-16 h-3 bg-neutral-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col gap-2"
        >
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.accent}`}>
            {c.icon}
          </span>
          <div>
            <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">{c.label}</p>
            <p className="text-xl font-semibold text-neutral-900 tabular-nums leading-tight mt-0.5">{c.value}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{c.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Department progress (derived from per-mentor data) ────────────────────────

function DepartmentProgressCard({ perMentor }: { perMentor: PerMentorRow[] }) {
  const depts = useMemo(() => {
    const map = new Map<string, { total: number; started: number; deptId: string }>();
    for (const r of perMentor) {
      const id = r.departmentId ?? 'unknown';
      if (!map.has(id)) map.set(id, { total: 0, started: 0, deptId: id });
      const e = map.get(id)!;
      e.total += 1;
      if (r.firstSessionCompleted) e.started += 1;
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 8);
  }, [perMentor]);

  if (depts.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5">
      <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-4">
        Department Progress
      </h3>
      <div className="space-y-3">
        {depts.map((d) => {
          const pct = d.total > 0 ? Math.round((d.started / d.total) * 100) : 0;
          return (
            <div key={d.deptId}>
              <div className="flex justify-between text-xs text-neutral-600 mb-1">
                <span className="font-medium truncate max-w-[60%]">
                  Dept {d.deptId.slice(0, 8)}…
                </span>
                <span>{d.started}/{d.total} mentors · {pct}%</span>
              </div>
              <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: pct >= 80 ? '#0b6d41' : pct >= 50 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const REALTIME_TABLES = [
  'counseling_sessions', 'mentor_students', 'session_feedback',
  'mentors', 'mentor_activity_log', 'individual_development_plans',
] as const;

export default function MentorMonitorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, accessToken } = useAuth();
  const { accessInfo, loading: accessLoading } = useUserAccess();

  // ── Tab state (URL-driven) ─────────────────────────────────────────────────
  const activeTab = (searchParams.get('tab') as MonitorTab) || 'leaderboard';
  const setTab = (tab: MonitorTab) => {
    router.replace(`/mentor-monitor?tab=${tab}`, { scroll: false });
  };

  // ── Filters ───────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<FilterState>(() => initialFilters());
  const [showFilters, setShowFilters] = useState(false);

  // ── Analytics state ───────────────────────────────────────────────────────
  const [summary, setSummary] = useState<SessionCompletionSummary | null>(null);
  const [perMentor, setPerMentor] = useState<PerMentorRow[]>([]);
  const [pairing, setPairing] = useState<PairingRow[]>([]);
  const [byInstitution, setByInstitution] = useState<InstitutionSummaryRow[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // ── Activity state ────────────────────────────────────────────────────────
  const [activities, setActivities] = useState<MentorActivity[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityPagination, setActivityPagination] = useState({
    limit: 50, offset: 0, hasMore: false,
  });
  const [mentorId, setMentorId] = useState<string | null>(null);

  // ── New tab state ─────────────────────────────────────────────────────────
  const [idpData, setIdpData] = useState<IdpSummaryRow[]>([]);
  const [feedbackData, setFeedbackData] = useState<FeedbackSummaryRow[]>([]);
  const [counselingData, setCounselingData] = useState<CounselingSummaryRow[]>([]);
  const [idpLoading, setIdpLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [counselingLoading, setCounselingLoading] = useState(false);

  // ── Role detection ────────────────────────────────────────────────────────
  const isAdmin = useMemo(() => {
    if (accessLoading || !accessInfo) return false;
    return (
      accessInfo.role === 'super_admin' ||
      accessInfo.role === 'institution_admin' ||
      accessInfo.isSuperAdmin ||
      accessInfo.isMentorIncharge
    );
  }, [accessInfo, accessLoading]);

  const isSuperAdmin = useMemo(() => {
    if (accessLoading || !accessInfo) return false;
    return accessInfo.role === 'super_admin' || accessInfo.isSuperAdmin;
  }, [accessInfo, accessLoading]);

  // ── Filter key (batches filter changes) ───────────────────────────────────
  const filterKey = useMemo(
    () => JSON.stringify({
      startDate: filters.startDate, endDate: filters.endDate,
      departmentId: filters.departmentId, institutionId: filters.institutionId,
    }),
    [filters.startDate, filters.endDate, filters.departmentId, filters.institutionId],
  );

  // ── Resolve mentor ID for regular users ───────────────────────────────────
  useEffect(() => {
    if (authLoading || accessLoading || !user || !accessToken || isAdmin) return;
    fetchWithAuthRetry('/api/mentor/current')
      .then((r) => r.json())
      .then((d) => setMentorId(d.data?.mentorId || d.mentorId))
      .catch(() => {});
  }, [user, accessToken, authLoading, accessLoading, isAdmin]);

  // ── Fetch analytics (Overview / Leaderboard / Coverage) ──────────────────
  const fetchAnalytics = useCallback(async () => {
    if (!accessToken) return;
    try {
      setAnalyticsLoading(true);
      const qs = buildQS(filters);
      const suffix = qs ? `?${qs}` : '';
      const init: RequestInit = {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include',
      };

      const fetches: Promise<Response>[] = [
        fetchWithAuthRetry(`/api/mentor/session-analytics/summary${suffix}`, init),
        fetchWithAuthRetry(`/api/mentor/session-analytics/per-mentor${suffix}`, init),
        fetchWithAuthRetry(`/api/mentor/session-analytics/pairing-coverage${suffix}`, init),
      ];
      if (isSuperAdmin) {
        const dqs = buildDateQS(filters);
        fetches.push(
          fetchWithAuthRetry(
            `/api/mentor/session-analytics/by-institution${dqs ? `?${dqs}` : ''}`,
            init,
          ),
        );
      }

      const [summaryRes, perMentorRes, pairingRes, byInstRes] = await Promise.all(fetches);
      if (!summaryRes.ok || !perMentorRes.ok || !pairingRes.ok) return;

      const [sj, pmj, pj] = await Promise.all([summaryRes.json(), perMentorRes.json(), pairingRes.json()]);
      setSummary(sj?.data ?? null);
      setPerMentor(pmj?.data ?? []);
      setPairing(pj?.data ?? []);
      if (byInstRes?.ok) {
        const bij = await byInstRes.json();
        setByInstitution(bij?.data ?? []);
      }
    } catch (e) {
      console.error('[MentorMonitor] analytics fetch', e);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [accessToken, filters, isSuperAdmin]);

  // ── Fetch activity ────────────────────────────────────────────────────────
  const fetchActivity = useCallback(async (loadMore = false) => {
    if (!accessToken) return;
    if (!isAdmin && !mentorId) return;
    try {
      setActivityLoading(true);
      const p = new URLSearchParams();
      if (!isAdmin && mentorId) p.append('mentorId', mentorId);
      if (filters.startDate) p.append('startDate', filters.startDate);
      if (filters.endDate) p.append('endDate', filters.endDate);
      const offset = loadMore ? activityPagination.offset + activityPagination.limit : 0;
      p.append('limit', activityPagination.limit.toString());
      p.append('offset', offset.toString());

      const [actRes, statsRes] = await Promise.all([
        fetchWithAuthRetry(`/api/mentor-activity?${p.toString()}`),
        fetchWithAuthRetry(`/api/mentor-activity/stats${mentorId && !isAdmin ? `?mentorId=${mentorId}` : ''}`),
      ]);

      if (actRes.ok) {
        const d = await actRes.json();
        setActivities((prev) => loadMore ? [...prev, ...d.activities] : d.activities);
        setActivityPagination((prev) => ({ ...prev, offset, hasMore: d.pagination?.hasMore ?? false }));
      }
      if (statsRes.ok) {
        const d = await statsRes.json();
        setActivityStats(d?.data ?? d ?? null);
      }
    } catch (e) {
      console.error('[MentorMonitor] activity fetch', e);
    } finally {
      setActivityLoading(false);
    }
  }, [accessToken, isAdmin, mentorId, filters.startDate, filters.endDate, activityPagination.limit, activityPagination.offset]);

  // ── Fetch new tab data ────────────────────────────────────────────────────
  const fetchIdps = useCallback(async () => {
    if (!accessToken) return;
    try {
      setIdpLoading(true);
      const qs = buildQS(filters);
      const res = await fetchWithAuthRetry(
        `/api/mentor-monitor/idp-summary${qs ? `?${qs}` : ''}`,
        { headers: { Authorization: `Bearer ${accessToken}` }, credentials: 'include' },
      );
      if (res.ok) { const d = await res.json(); setIdpData(d?.data ?? []); }
    } catch (e) {
      console.error('[MentorMonitor] idp fetch', e);
    } finally {
      setIdpLoading(false);
    }
  }, [accessToken, filters]);

  const fetchFeedback = useCallback(async () => {
    if (!accessToken) return;
    try {
      setFeedbackLoading(true);
      const qs = buildQS(filters);
      const res = await fetchWithAuthRetry(
        `/api/mentor-monitor/feedback-summary${qs ? `?${qs}` : ''}`,
        { headers: { Authorization: `Bearer ${accessToken}` }, credentials: 'include' },
      );
      if (res.ok) { const d = await res.json(); setFeedbackData(d?.data ?? []); }
    } catch (e) {
      console.error('[MentorMonitor] feedback fetch', e);
    } finally {
      setFeedbackLoading(false);
    }
  }, [accessToken, filters]);

  const fetchCounseling = useCallback(async () => {
    if (!accessToken) return;
    try {
      setCounselingLoading(true);
      const qs = buildQS(filters);
      const res = await fetchWithAuthRetry(
        `/api/mentor-monitor/counseling-summary${qs ? `?${qs}` : ''}`,
        { headers: { Authorization: `Bearer ${accessToken}` }, credentials: 'include' },
      );
      if (res.ok) { const d = await res.json(); setCounselingData(d?.data ?? []); }
    } catch (e) {
      console.error('[MentorMonitor] counseling fetch', e);
    } finally {
      setCounselingLoading(false);
    }
  }, [accessToken, filters]);

  // ── Initial + filter-driven fetch ─────────────────────────────────────────
  useEffect(() => {
    if (authLoading || accessLoading || !user || !accessToken) return;
    fetchAnalytics();
    fetchActivity();
    fetchIdps();
    fetchFeedback();
    fetchCounseling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, accessToken, authLoading, accessLoading, filterKey, mentorId]);

  // ── Real-time subscriptions (debounced 1000ms) ────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchAnalytics();
      fetchActivity();
      fetchIdps();
      fetchFeedback();
      fetchCounseling();
    }, 1000);
  }, [fetchAnalytics, fetchActivity, fetchIdps, fetchFeedback, fetchCounseling]);

  useEffect(() => {
    if (!user) return;
    const channels = REALTIME_TABLES.map((table) =>
      supabase
        .channel(`mentor-monitor-${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, refresh)
        .subscribe(),
    );
    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [user, refresh]);

  // ── Loading guard ─────────────────────────────────────────────────────────
  if (authLoading || accessLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b6d41]" />
      </div>
    );
  }

  // ── Tab content ───────────────────────────────────────────────────────────
  function renderTab() {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-4 p-4 lg:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CoverageFunnelCard summary={summary} loading={analyticsLoading} />
              <CompletionDonutChart summary={summary} loading={analyticsLoading} />
            </div>
            <DepartmentProgressCard perMentor={perMentor} />
            {isSuperAdmin && byInstitution.length > 0 && (
              <InstitutionReportTable rows={byInstitution} loading={analyticsLoading} />
            )}
          </div>
        );

      case 'leaderboard':
        return (
          <div className="p-4 lg:p-6">
            <MentorCompletionTable rows={perMentor} loading={analyticsLoading} />
          </div>
        );

      case 'coverage':
        return (
          <div className="p-4 lg:p-6">
            <MenteeCoverageGrid rows={pairing} loading={analyticsLoading} />
          </div>
        );

      case 'activity':
        return (
          <div className="space-y-4 p-4 lg:p-6">
            <ActivityStatsGrid stats={activityStats} loading={activityLoading} />
            {isAdmin && <MentorPerformanceTable />}
            <ActivityTimeline
              activities={activities}
              loading={activityLoading}
              hasMore={activityPagination.hasMore}
              onLoadMore={() => fetchActivity(true)}
            />
          </div>
        );

      case 'idps':
        return (
          <div className="p-4 lg:p-6">
            <IdpTrackerTab data={idpData} loading={idpLoading} />
          </div>
        );

      case 'feedback':
        return (
          <div className="p-4 lg:p-6">
            <FeedbackTab data={feedbackData} loading={feedbackLoading} />
          </div>
        );

      case 'counseling':
        return (
          <div className="p-4 lg:p-6">
            <CounselingActionsTab data={counselingData} loading={counselingLoading} />
          </div>
        );
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50/50">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-neutral-200 px-4 lg:px-6 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <div className="flex items-center gap-2 text-[#0b6d41] mb-1">
              <Monitor className="w-5 h-5" />
              <span className="text-xs font-semibold uppercase tracking-widest">Monitor</span>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Mentor Monitor</h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              Complete mentor oversight — sessions, activity, IDPs, feedback, and counseling
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                showFilters
                  ? 'bg-[#0b6d41] text-white border-[#0b6d41]'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              Filters
            </button>
            <ExportBar filters={filters} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mb-4">
            <AnalyticsFilters filters={filters} onChange={setFilters} isAdmin={isAdmin} />
          </div>
        )}

        {/* KPI strip */}
        <KPIStrip summary={summary} loading={analyticsLoading} />
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <MonitorTabs activeTab={activeTab} onChange={setTab} />

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div className="min-h-[400px] pb-20 lg:pb-6">{renderTab()}</div>
    </div>
  );
}
