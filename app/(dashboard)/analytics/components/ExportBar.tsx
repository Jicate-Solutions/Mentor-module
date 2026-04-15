'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';
import type { FilterState } from './AnalyticsFilters';

interface ExportBarProps {
  filters: FilterState;
  isAdmin: boolean;
}

type CsvView = 'summary' | 'per-mentor' | 'pairing';
type PdfView = 'summary' | 'full';

function buildQueryString(filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('dateFrom', filters.startDate);
  if (filters.endDate) params.append('dateTo', filters.endDate);
  if (filters.departmentId) params.append('departmentId', filters.departmentId);
  if (filters.institutionId) params.append('institutionId', filters.institutionId);
  return params.toString();
}

function filename(prefix: string, view: string, ext: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `${prefix}-${view}-${today}.${ext}`;
}

export default function ExportBar({ filters, isAdmin: _isAdmin }: ExportBarProps) {
  const { accessToken } = useAuth();
  const [csvOpen, setCsvOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const csvRef = useRef<HTMLDivElement | null>(null);
  const pdfRef = useRef<HTMLDivElement | null>(null);

  // Close menus on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (csvRef.current && !csvRef.current.contains(e.target as Node)) {
        setCsvOpen(false);
      }
      if (pdfRef.current && !pdfRef.current.contains(e.target as Node)) {
        setPdfOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function download(format: 'csv' | 'pdf', view: string) {
    if (!accessToken) return;
    const key = `${format}-${view}`;
    try {
      setBusy(key);
      const qs = buildQueryString(filters);
      const url = `/api/mentor/session-analytics/export?format=${format}&view=${view}${
        qs ? '&' + qs : ''
      }`;

      const res = await fetchWithAuthRetry(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include',
      });

      if (!res.ok) {
        console.error('[ExportBar] export failed', res.status);
        return;
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename('session-analytics', view, format);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('[ExportBar] download error', err);
    } finally {
      setBusy(null);
      setCsvOpen(false);
      setPdfOpen(false);
    }
  }

  const CsvItem = ({ value, label }: { value: CsvView; label: string }) => (
    <button
      onClick={() => download('csv', value)}
      disabled={busy === `csv-${value}`}
      className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
    >
      {busy === `csv-${value}` ? 'Exporting...' : label}
    </button>
  );

  const PdfItem = ({ value, label }: { value: PdfView; label: string }) => (
    <button
      onClick={() => download('pdf', value)}
      disabled={busy === `pdf-${value}`}
      className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
    >
      {busy === `pdf-${value}` ? 'Exporting...' : label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {/* CSV dropdown */}
      <div className="relative" ref={csvRef}>
        <button
          onClick={() => {
            setCsvOpen((v) => !v);
            setPdfOpen(false);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export CSV
          <ChevronDown className="w-4 h-4" />
        </button>
        {csvOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 overflow-hidden">
            <CsvItem value="summary" label="Summary" />
            <CsvItem value="per-mentor" label="Per-Mentor" />
            <CsvItem value="pairing" label="Pairing Coverage" />
          </div>
        )}
      </div>

      {/* PDF dropdown */}
      <div className="relative" ref={pdfRef}>
        <button
          onClick={() => {
            setPdfOpen((v) => !v);
            setCsvOpen(false);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b6d41] text-white rounded-lg text-sm font-medium hover:bg-[#0a5a36] transition-colors"
        >
          <FileText className="w-4 h-4" />
          Export PDF
          <ChevronDown className="w-4 h-4" />
        </button>
        {pdfOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 overflow-hidden">
            <PdfItem value="summary" label="Summary" />
            <PdfItem value="full" label="Full Report" />
          </div>
        )}
      </div>
    </div>
  );
}
