'use client';

import React, { useState } from 'react';
import { Download, Calendar, Loader2, FileText } from 'lucide-react';

interface ReportsTabProps {
  mentorId: string;
}

export default function ReportsTab({ mentorId }: ReportsTabProps) {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

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
    } catch (error: any) {
      console.error('[Reports] Error generating report:', error);
      setError(error.message || 'Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <div className="bg-white rounded-xl border border-neutral-200 p-4 lg:p-6">
        <h2 className="text-[17px] font-medium text-neutral-900 mb-4 lg:mb-6 flex items-center gap-2">
          <FileText className="h-4 w-4 text-neutral-700" />
          Counseling Reports
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

      {/* Report Description */}
      <div className="bg-brand-yellow/10 border border-brand-yellow rounded-lg p-4 lg:p-5 mt-4">
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
            The report will be downloaded as an Excel file (.xlsx) that matches the institutional format.
          </p>
        </div>
      </div>
    </div>
  );
}
