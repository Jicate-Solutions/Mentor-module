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
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-brand-green/20 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-brand-green mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-brand-green" />
          Counseling Reports
        </h2>

        <div className="space-y-4">
          {/* Period Selection */}
          <div>
            <label className="block text-sm font-medium text-brand-green mb-2">
              Report Period
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setPeriod('weekly')}
                className={`px-4 py-2.5 rounded-lg border transition-all duration-200 font-medium ${
                  period === 'weekly'
                    ? 'bg-brand-green text-white border-brand-green shadow-sm'
                    : 'bg-white text-neutral-700 border-brand-green/20 hover:border-brand-green/40 hover:bg-brand-cream/30'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={`px-4 py-2.5 rounded-lg border transition-all duration-200 font-medium ${
                  period === 'monthly'
                    ? 'bg-brand-green text-white border-brand-green shadow-sm'
                    : 'bg-white text-neutral-700 border-brand-green/20 hover:border-brand-green/40 hover:bg-brand-cream/30'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setPeriod('yearly')}
                className={`px-4 py-2.5 rounded-lg border transition-all duration-200 font-medium ${
                  period === 'yearly'
                    ? 'bg-brand-green text-white border-brand-green shadow-sm'
                    : 'bg-white text-neutral-700 border-brand-green/20 hover:border-brand-green/40 hover:bg-brand-cream/30'
                }`}
              >
                Yearly
              </button>
            </div>
            <p className="text-xs text-neutral-600 mt-2">
              {period === 'weekly' && 'Last 7 days'}
              {period === 'monthly' && 'Current month'}
              {period === 'yearly' && 'Current academic year'}
            </p>
          </div>

          {/* Custom Date Range */}
          <div>
            <label className="block text-sm font-medium text-brand-green mb-2">
              Custom Date Range (Optional)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-600 mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-brand-green/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-brand-green/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition-all"
                />
              </div>
            </div>
            <p className="text-xs text-neutral-600 mt-2">
              Leave empty to use the selected period's default date range
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="group relative w-full px-6 py-3.5 bg-brand-green hover:bg-brand-green/90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center justify-center gap-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-brand-green via-brand-green/90 to-brand-green opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {isGenerating ? (
              <>
                <Loader2 className="relative z-10 h-5 w-5 animate-spin" />
                <span className="relative z-10">Generating Report...</span>
              </>
            ) : (
              <>
                <div className="relative z-10 w-6 h-6 bg-brand-yellow rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Download className="w-4 h-4 text-brand-green" />
                </div>
                <span className="relative z-10">Generate Excel Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Report Description */}
      <div className="bg-brand-cream/50 border border-brand-yellow/50 rounded-lg p-5">
        <h3 className="font-semibold text-brand-green mb-3 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Report Format
        </h3>
        <p className="text-sm text-neutral-700 mb-3">
          The generated report will include all counseling sessions within the selected date range with the following information:
        </p>
        <ul className="text-sm text-neutral-700 space-y-2">
          <li className="flex items-start gap-2">
            <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-brand-green mt-1.5"></div>
            <span>Session details (name, date, time)</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-brand-green mt-1.5"></div>
            <span>Student information (name, registration number, course, semester)</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-brand-green mt-1.5"></div>
            <span>Student queries and concerns</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-brand-green mt-1.5"></div>
            <span>Mentor responses and action taken</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-brand-green mt-1.5"></div>
            <span>Submission dates for queries and responses</span>
          </li>
        </ul>
        <div className="mt-3 pt-3 border-t border-brand-yellow/30">
          <p className="text-sm text-neutral-700">
            The report will be downloaded as an Excel file (.xlsx) that matches the institutional format.
          </p>
        </div>
      </div>
    </div>
  );
}
