'use client';

import React, { useState, useEffect } from 'react';
import { Download, Calendar, Loader2, FileText, Trash2, Clock, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/components/providers/AuthProvider';

interface ReportsTabProps {
  mentorId: string;
}

interface GeneratedReport {
  id: string;
  filename: string;
  reportType: string;
  period: string;
  startDate: string;
  endDate: string;
  sessionCount: number;
  createdAt: string;
  mentorName: string;
}

export default function ReportsTab({ mentorId }: ReportsTabProps) {
  const { accessToken } = useAuth();
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [deletingReport, setDeletingReport] = useState<string | null>(null);

  // Fetch generated reports on mount
  useEffect(() => {
    fetchReports();
  }, [mentorId]);

  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      const response = await fetch(`/api/reports/mentor/${mentorId}/list`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      if (data.success) {
        setReports(data.reports || []);
      }
    } catch (error: any) {
      console.error('[Reports] Error fetching reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setError('');

    try {
      const params = new URLSearchParams({
        period,
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      });

      console.log(`[Reports] Generating ${period} report for mentor ${mentorId}`);

      const response = await fetch(
        `/api/reports/mentor/${mentorId}/counseling?${params}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate report' }));
        throw new Error(errorData.error || 'Failed to generate report');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `counseling-report-${period}-${dateStr}.xlsx`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('[Reports] Report downloaded successfully');

      // Refresh the reports list
      await fetchReports();
    } catch (error: any) {
      console.error('[Reports] Error generating report:', error);
      setError(error.message || 'Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = async (reportId: string, filename: string) => {
    try {
      // Re-generate the report with the same parameters
      const report = reports.find(r => r.id === reportId);
      if (!report) return;

      const params = new URLSearchParams({
        period: report.period,
        start_date: report.startDate.split('T')[0],
        end_date: report.endDate.split('T')[0],
      });

      const response = await fetch(
        `/api/reports/mentor/${mentorId}/counseling?${params}`,
        {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('[Reports] Error downloading report:', error);
      setError(error.message || 'Failed to download report');
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      setDeletingReport(reportId);
      const response = await fetch(
        `/api/reports/mentor/${mentorId}/list?reportId=${reportId}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete report');
      }

      // Refresh the reports list
      await fetchReports();
    } catch (error: any) {
      console.error('[Reports] Error deleting report:', error);
      setError(error.message || 'Failed to delete report');
    } finally {
      setDeletingReport(null);
    }
  };

  const formatDateRange = (startDate: string, endDate: string, period: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (period === 'weekly') {
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    } else if (period === 'monthly') {
      return format(start, 'MMMM yyyy');
    } else if (period === 'yearly') {
      return `${format(start, 'MMM yyyy')} - ${format(end, 'MMM yyyy')}`;
    }
    return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
  };

  return (
    <div className="space-y-6">
      {/* Generate New Report Section */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 lg:p-6">
        <h2 className="text-[17px] font-medium text-neutral-900 mb-4 lg:mb-6 flex items-center gap-2">
          <FileText className="h-4 w-4 text-neutral-700" />
          Generate New Report
        </h2>

        <div className="space-y-4">
          {/* Period Selection */}
          <div>
            <label className="block text-[13px] font-medium text-neutral-900 mb-2">
              Report Period
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPeriod('weekly')}
                className={`px-3 py-2 rounded-lg border transition-all text-[13px] font-medium ${
                  period === 'weekly'
                    ? 'bg-brand-green text-white border-brand-green'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-brand-green/40 hover:bg-neutral-50'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={`px-3 py-2 rounded-lg border transition-all text-[13px] font-medium ${
                  period === 'monthly'
                    ? 'bg-brand-green text-white border-brand-green'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-brand-green/40 hover:bg-neutral-50'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setPeriod('yearly')}
                className={`px-3 py-2 rounded-lg border transition-all text-[13px] font-medium ${
                  period === 'yearly'
                    ? 'bg-brand-green text-white border-brand-green'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-brand-green/40 hover:bg-neutral-50'
                }`}
              >
                Yearly
              </button>
            </div>
            <p className="text-[12px] text-neutral-600 mt-2">
              {period === 'weekly' && 'Last 7 days'}
              {period === 'monthly' && 'Current month'}
              {period === 'yearly' && 'Current academic year'}
            </p>
          </div>

          {/* Custom Date Range */}
          <div>
            <label className="block text-[13px] font-medium text-neutral-900 mb-2">
              Custom Date Range (Optional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] text-neutral-600 mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition-all"
                />
              </div>
              <div>
                <label className="block text-[12px] text-neutral-600 mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition-all"
                />
              </div>
            </div>
            <p className="text-[12px] text-neutral-600 mt-2">
              Leave empty to use the selected period's default date range
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-[14px] text-red-800">{error}</p>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="w-full px-4 py-2.5 bg-brand-green hover:bg-brand-green/90 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-[14px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating Report...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Generate Excel Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Reports History */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 lg:p-6">
        <h2 className="text-[17px] font-medium text-neutral-900 mb-4 lg:mb-6 flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-neutral-700" />
          Generated Reports History
        </h2>

        {loadingReports ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-green mb-3" />
            <p className="text-[14px] text-neutral-600">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-brand-green/10 rounded-full blur-xl" />
              <div className="relative bg-gradient-to-br from-brand-green/10 to-brand-yellow/10 rounded-full p-4">
                <FileSpreadsheet className="w-12 h-12 text-brand-green/60" />
              </div>
            </div>
            <h4 className="text-[16px] font-medium text-neutral-900 mb-2">No reports generated yet</h4>
            <p className="text-[14px] text-neutral-500 text-center max-w-sm leading-relaxed">
              Generate your first counseling report using the form above. All generated reports will appear here for easy access and download.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="group relative bg-neutral-50 hover:bg-neutral-100/60 border border-neutral-200 hover:border-brand-green/30 rounded-lg p-4 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-brand-green flex-shrink-0" />
                      <h4 className="text-[14px] font-medium text-neutral-900 truncate">
                        {report.filename}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-neutral-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDateRange(report.startDate, report.endDate, report.period)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{report.sessionCount} sessions</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Generated {format(new Date(report.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                    </div>

                    <div className="mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-brand-yellow/20 text-brand-green text-[12px] font-medium capitalize">
                        {report.period}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadReport(report.id, report.filename)}
                      className="p-2 text-brand-green hover:bg-brand-green/10 rounded-lg transition-all"
                      title="Download report"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteReport(report.id)}
                      disabled={deletingReport === report.id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                      title="Delete report"
                    >
                      {deletingReport === report.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Description */}
      <div className="bg-brand-yellow/10 border border-brand-yellow rounded-lg p-4 lg:p-5">
        <h3 className="text-[15px] font-medium text-neutral-900 mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-neutral-700" />
          Report Format
        </h3>
        <p className="text-[14px] text-neutral-700 leading-relaxed mb-3">
          The generated report will include all counseling sessions within the selected date range with the following information:
        </p>
        <ul className="text-[13px] text-neutral-700 space-y-1.5">
          <li className="flex items-start gap-2">
            <div className="flex-shrink-0 w-1 h-1 rounded-full bg-brand-green mt-1.5"></div>
            <span>Session details (name, date, time)</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="flex-shrink-0 w-1 h-1 rounded-full bg-brand-green mt-1.5"></div>
            <span>Student information (name, registration number, course, semester)</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="flex-shrink-0 w-1 h-1 rounded-full bg-brand-green mt-1.5"></div>
            <span>Student queries and concerns</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="flex-shrink-0 w-1 h-1 rounded-full bg-brand-green mt-1.5"></div>
            <span>Mentor responses and action taken</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="flex-shrink-0 w-1 h-1 rounded-full bg-brand-green mt-1.5"></div>
            <span>Submission dates for queries and responses</span>
          </li>
        </ul>
        <div className="mt-3 pt-3 border-t border-brand-yellow/30">
          <p className="text-[13px] text-neutral-700 leading-relaxed">
            The report will be downloaded as an Excel file (.xlsx) that matches the institutional format. All generated reports are saved and can be downloaded again from the history above.
          </p>
        </div>
      </div>
    </div>
  );
}
