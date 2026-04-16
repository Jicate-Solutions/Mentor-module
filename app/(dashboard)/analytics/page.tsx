'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, BarChart3, Users, TrendingUp, CheckCircle2, CalendarClock } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useUserAccess } from '@/hooks/useUserAccess';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';
import PageContainer from '@/components/ui/PageContainer';
import type {
  SessionCompletionSummary,
  PerMentorRow,
  PairingRow,
  InstitutionSummaryRow,
} from '@/lib/types/session-analytics';
import AnalyticsFilters, {
  type FilterState,
  getAnalyticsDateRange,
} from './components/AnalyticsFilters';
import CoverageFunnelCard from './components/CoverageFunnelCard';
import CompletionDonutChart from './components/CompletionDonutChart';
import MentorCompletionTable from './components/MentorCompletionTable';
import MenteeCoverageGrid from './components/MenteeCoverageGrid';
import ExportBar from './components/ExportBar';
import InstitutionReportTable from './components/InstitutionReportTable';

function buildQueryString(filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('dateFrom', filters.startDate);
  if (filters.endDate) params.append('dateTo', filters.endDate);
  if (filters.departmentId) params.append('departmentId', filters.departmentId);
  if (filters.institutionId) params.append('institutionId', filters.institutionId);
  return params.toString();
}

function buildDateQueryString(filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('dateFrom', filters.startDate);
  if (filters.endDate) params.append('dateTo', filters.endDate);
  return params.toString();
}

function initialFilters(): FilterState {
  const range = getAnalyticsDateRange('month');
  return {
    timePeriod: 'month',
    startDate: range?.startDate.toISOString(),
    endDate: range?.endDate.toISOString(),
  };
}

// ── Inline KPI strip ─────────────────────────────────────────────────────────

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
      label: 'Mentors Started',
      value: s ? `${s.mentorsWithFirstSession} / ${s.totalMentors}` : '— / —',
      sub: s ? `${s.mentorFirstSessionRate}% active` : '—',
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
      sub: s ? `${s.totalCancelledSessions} cancelled` : 'of resolved sessions',
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

// ── Section divider ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-end gap-3 pt-2">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">{title}</h2>
        {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex-1 h-px bg-neutral-200 mb-1" />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { user, loading: authLoading, accessToken } = useAuth();
  const { accessInfo, loading: accessLoading } = useUserAccess();

  const [filters, setFilters] = useState<FilterState>(() => initialFilters());
  const [summary, setSummary] = useState<SessionCompletionSummary | null>(null);
  const [perMentor, setPerMentor] = useState<PerMentorRow[]>([]);
  const [pairing, setPairing] = useState<PairingRow[]>([]);
  const [byInstitution, setByInstitution] = useState<InstitutionSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        startDate: filters.startDate,
        endDate: filters.endDate,
        departmentId: filters.departmentId,
        institutionId: filters.institutionId,
      }),
    [filters.startDate, filters.endDate, filters.departmentId, filters.institutionId],
  );

  const fetchAll = useCallback(async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError(null);

      const qs = buildQueryString(filters);
      const suffix = qs ? `?${qs}` : '';

      const headers = {
        Authorization: `Bearer ${accessToken}`,
      } as const;
      const init: RequestInit = { headers, credentials: 'include' };

      const fetches: Promise<Response>[] = [
        fetchWithAuthRetry(`/api/mentor/session-analytics/summary${suffix}`, init),
        fetchWithAuthRetry(`/api/mentor/session-analytics/per-mentor${suffix}`, init),
        fetchWithAuthRetry(`/api/mentor/session-analytics/pairing-coverage${suffix}`, init),
      ];

      if (isSuperAdmin) {
        const dateQs = buildDateQueryString(filters);
        fetches.push(
          fetchWithAuthRetry(
            `/api/mentor/session-analytics/by-institution${dateQs ? `?${dateQs}` : ''}`,
            init,
          ),
        );
      }

      const results = await Promise.all(fetches);
      const [summaryRes, perMentorRes, pairingRes, byInstRes] = results;

      if (!summaryRes.ok || !perMentorRes.ok || !pairingRes.ok) {
        const code = summaryRes.status || perMentorRes.status || pairingRes.status;
        if (code === 401) {
          setError('Authentication failed. Please refresh the page or log in again.');
        } else {
          setError(`Failed to load analytics data (status ${code}).`);
        }
        return;
      }

      const [summaryJson, perMentorJson, pairingJson] = await Promise.all([
        summaryRes.json(),
        perMentorRes.json(),
        pairingRes.json(),
      ]);

      setSummary((summaryJson?.data as SessionCompletionSummary) ?? null);
      setPerMentor((perMentorJson?.data as PerMentorRow[]) ?? []);
      setPairing((pairingJson?.data as PairingRow[]) ?? []);

      if (byInstRes?.ok) {
        const byInstJson = await byInstRes.json();
        setByInstitution((byInstJson?.data as InstitutionSummaryRow[]) ?? []);
      }
    } catch (err) {
      console.error('[AnalyticsPage] fetch error', err);
      setError('An unexpected error occurred while loading analytics.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, filters, isSuperAdmin]);

  useEffect(() => {
    if (authLoading || accessLoading) return;
    if (!user || !accessToken) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, accessToken, authLoading, accessLoading, filterKey]);

  if (authLoading || accessLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b6d41]" />
      </div>
    );
  }

  return (
    <PageContainer>

      {/* ── Header + Export ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[#0b6d41] mb-1">
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase tracking-widest">Analytics</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Session Report</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Mentor–mentee session completion across all colleges</p>
        </div>
        <div className="flex-shrink-0">
          <ExportBar filters={filters} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <div className="p-1 bg-red-100 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-red-700 font-medium text-sm">{error}</p>
            <button
              onClick={() => fetchAll()}
              className="mt-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <AnalyticsFilters filters={filters} onChange={setFilters} isAdmin={isAdmin} />

      {/* ── KPI strip ───────────────────────────────────────────────────── */}
      <KPIStrip summary={summary} loading={loading} />

      {/* ── Overview: Funnel + Donut ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CoverageFunnelCard summary={summary} loading={loading} />
        </div>
        <div>
          <CompletionDonutChart summary={summary} loading={loading} />
        </div>
      </div>

      {/* ── Cross-College Report (super_admin) ───────────────────────────── */}
      {isSuperAdmin && (
        <div className="space-y-3">
          <SectionHeader
            title="Cross-College Report"
            subtitle="All institutions — mentor engagement & first-cycle coverage"
          />
          <InstitutionReportTable rows={byInstitution} loading={loading} />
        </div>
      )}

      {/* ── Per-Mentor Breakdown ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader
          title="Per-Mentor Breakdown"
          subtitle="Session completion status grouped by college"
        />
        <MentorCompletionTable rows={perMentor} loading={loading} />
      </div>

      {/* ── Mentee Coverage Detail ───────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader
          title="Mentee Coverage Detail"
          subtitle="Expand each mentor to see which mentees have been met"
        />
        <MenteeCoverageGrid rows={pairing} loading={loading} />
      </div>

    </PageContainer>
  );
}
