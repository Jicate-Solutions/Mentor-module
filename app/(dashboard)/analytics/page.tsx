'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, BarChart3 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useUserAccess } from '@/hooks/useUserAccess';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';
import PageContainer from '@/components/ui/PageContainer';
import PageHeader from '@/components/ui/PageHeader';
import type {
  SessionCompletionSummary,
  PerMentorRow,
  PairingRow,
} from '@/lib/types/session-analytics';
import AnalyticsFilters, {
  type FilterState,
  getAnalyticsDateRange,
} from './components/AnalyticsFilters';
import CoverageFunnelCard from './components/CoverageFunnelCard';
import SecondaryKPIRow from './components/SecondaryKPIRow';
import CompletionDonutChart from './components/CompletionDonutChart';
import MentorCompletionTable from './components/MentorCompletionTable';
import MenteeCoverageGrid from './components/MenteeCoverageGrid';
import ExportBar from './components/ExportBar';

function buildQueryString(filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('dateFrom', filters.startDate);
  if (filters.endDate) params.append('dateTo', filters.endDate);
  if (filters.departmentId) params.append('departmentId', filters.departmentId);
  if (filters.institutionId) params.append('institutionId', filters.institutionId);
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

export default function AnalyticsPage() {
  const { user, loading: authLoading, accessToken } = useAuth();
  const { accessInfo, loading: accessLoading } = useUserAccess();

  const [filters, setFilters] = useState<FilterState>(() => initialFilters());
  const [summary, setSummary] = useState<SessionCompletionSummary | null>(null);
  const [perMentor, setPerMentor] = useState<PerMentorRow[]>([]);
  const [pairing, setPairing] = useState<PairingRow[]>([]);
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

  // Stable key for triggering refetch on filter change.
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
      const init: RequestInit = {
        headers,
        credentials: 'include',
      };

      const [summaryRes, perMentorRes, pairingRes] = await Promise.all([
        fetchWithAuthRetry(`/api/mentor/session-analytics/summary${suffix}`, init),
        fetchWithAuthRetry(`/api/mentor/session-analytics/per-mentor${suffix}`, init),
        fetchWithAuthRetry(
          `/api/mentor/session-analytics/pairing-coverage${suffix}`,
          init,
        ),
      ]);

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
    } catch (err) {
      console.error('[AnalyticsPage] fetch error', err);
      setError('An unexpected error occurred while loading analytics.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, filters]);

  useEffect(() => {
    if (authLoading || accessLoading) return;
    if (!user || !accessToken) return;
    fetchAll();
    // fetchAll depends on accessToken + filters; filterKey is used to re-run on filter change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, accessToken, authLoading, accessLoading, filterKey]);

  if (authLoading || accessLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b6d41]"></div>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Session Analytics"
        description="Mentor–mentee session completion report"
        icon={<BarChart3 className="w-5 h-5" />}
      />

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <div className="p-1 bg-red-100 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-red-700 font-medium">{error}</p>
            <button
              onClick={() => fetchAll()}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Export bar */}
      <ExportBar filters={filters} isAdmin={isAdmin} />

      {/* Filters */}
      <AnalyticsFilters
        filters={filters}
        onChange={setFilters}
        isAdmin={isAdmin}
      />

      {/* Coverage funnel (hero) + secondary KPIs */}
      <CoverageFunnelCard summary={summary} loading={loading} />
      <SecondaryKPIRow summary={summary} loading={loading} />

      {/* Donut chart + Mentor table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        <CompletionDonutChart summary={summary} loading={loading} />
        <MentorCompletionTable rows={perMentor} loading={loading} />
      </div>

      {/* Mentee coverage */}
      <MenteeCoverageGrid rows={pairing} loading={loading} />
    </PageContainer>
  );
}
