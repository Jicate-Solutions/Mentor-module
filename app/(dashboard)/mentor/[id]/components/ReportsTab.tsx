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
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Counseling Reports
        </h2>

        <div className="space-y-4">
          {/* Period Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Period
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setPeriod('weekly')}
                className={`px-4 py-2 rounded border transition-colors ${
                  period === 'weekly'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={`px-4 py-2 rounded border transition-colors ${
                  period === 'monthly'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setPeriod('yearly')}
                className={`px-4 py-2 rounded border transition-colors ${
                  period === 'yearly'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Yearly
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {period === 'weekly' && 'Last 7 days'}
              {period === 'monthly' && 'Current month'}
              {period === 'yearly' && 'Current academic year'}
            </p>
          </div>

          {/* Custom Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Date Range (Optional)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
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
            className="w-full bg-green-600 text-white px-4 py-3 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Generate Excel Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Report Description */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Report Format
        </h3>
        <p className="text-sm text-blue-800 mb-2">
          The generated report will include all counseling sessions within the selected date range with the following information:
        </p>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Session details (name, date, time)</li>
          <li>Student information (name, registration number, course, semester)</li>
          <li>Student queries and concerns</li>
          <li>Mentor responses and action taken</li>
          <li>Submission dates for queries and responses</li>
        </ul>
        <p className="text-sm text-blue-800 mt-2">
          The report will be downloaded as an Excel file (.xlsx) that matches the institutional format.
        </p>
      </div>
    </div>
  );
}
