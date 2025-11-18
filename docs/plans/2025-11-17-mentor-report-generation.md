# Mentor Report Generation System - Implementation Plan

**Date**: 2025-11-17
**Feature**: Generate weekly, monthly, and yearly counseling reports for mentors in Excel format

## Overview

This system will generate counseling reports for each mentor that match the exact format from `DEEPAK ER.xlsx`. Reports will aggregate counseling session data and export to Excel with proper formatting.

## Report Format Analysis

**File Structure**: `DEEPAK ER.xlsx`
- **Sheet Name**: "Counseling Report"
- **Title Rows**:
  - Row 1: Institution name (merged across all columns)
  - Row 2: "Counselling Report" (merged across all columns)
  - Row 3: Empty (spacing)
  - Row 4: Column headers
  - Row 5+: Data rows

**Columns** (15 total):
1. **S. No.** - Serial number
2. **Session Name** - Name of counseling session
3. **Date** - Session date (format: DD-MMM-YYYY)
4. **Time** - Session time (format: HH:MM AM/PM)
5. **Staff Code & Name** - Mentor's JKKN code and name
6. **Home Department** - Mentor's department
7. **Student Regn. No.** - Student roll/registration number
8. **Student Name** - Student full name
9. **Student Course** - Course/program name
10. **Student Semester** - Current semester
11. **Student Academic Year** - Academic year
12. **Student Query** - Counseling queries/concerns
13. **Query Date** - Date query was submitted
14. **Mentor Response** - Action taken/response
15. **Mentor Response Date** - Date of response

## Database Schema Requirements

Current tables being used:
- `counseling_sessions` - Contains session basic info
- `session_feedback` - Contains queries and responses
- `students` - Student information
- `users` - Mentor information
- `departments` - Department information
- `programs` - Course/program information

## Implementation Tasks

### Task 1: Create Report Generation API Endpoint
**File**: `app/api/reports/mentor/[mentorId]/counseling/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { generateCounselingReport } from '@/lib/reports/counseling-report';
import { getCurrentUser } from '@/lib/auth/get-current-user';

/**
 * GET /api/reports/mentor/[mentorId]/counseling?period=weekly&start_date=2025-01-01
 * Generate counseling report for a mentor
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mentorId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mentorId } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly'; // weekly, monthly, yearly
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Generate date range based on period
    const dateRange = calculateDateRange(period, startDate, endDate);

    // Generate report
    const reportBuffer = await generateCounselingReport(mentorId, dateRange);

    // Return Excel file
    return new NextResponse(reportBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="counseling-report-${mentorId}-${period}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('[Report API] Error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

function calculateDateRange(period: string, startDate?: string | null, endDate?: string | null) {
  const now = new Date();
  let start: Date;
  let end: Date = endDate ? new Date(endDate) : now;

  if (startDate) {
    start = new Date(startDate);
  } else {
    switch (period) {
      case 'weekly':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'yearly':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'monthly':
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }
  }

  return { start, end };
}
```

### Task 2: Create Report Generation Service
**File**: `lib/reports/counseling-report.ts`

```typescript
import { createAdminClient } from '@/lib/supabase/server';
import XLSX from 'xlsx';

interface DateRange {
  start: Date;
  end: Date;
}

interface ReportData {
  serialNo: number;
  sessionName: string;
  date: string;
  time: string;
  staffCodeAndName: string;
  department: string;
  studentRegnNo: string;
  studentName: string;
  studentCourse: string;
  studentSemester: string;
  academicYear: string;
  studentQuery: string;
  queryDate: string;
  mentorResponse: string;
  responseDate: string;
}

export async function generateCounselingReport(
  mentorId: string,
  dateRange: DateRange
): Promise<Buffer> {
  const supabase = createAdminClient();

  // Convert JKKN mentor ID to Supabase mentor ID if needed
  const { data: mentorUser } = await supabase
    .from('users')
    .select('id, name, jkkn_user_id, department_id, departments(name)')
    .eq('jkkn_user_id', mentorId)
    .single();

  if (!mentorUser) {
    throw new Error('Mentor not found');
  }

  const actualMentorId = mentorUser.id;

  // Fetch mentor's institution name
  const { data: institution } = await supabase
    .from('institutions')
    .select('name')
    .limit(1)
    .single();

  const institutionName = institution?.name || 'JKKN Institution';

  // Fetch all counseling sessions with feedback in date range
  const { data: sessions, error } = await supabase
    .from('counseling_sessions')
    .select(`
      id,
      session_name,
      date,
      time,
      status,
      created_at,
      student:students!student_id (
        id,
        name,
        roll_number,
        email,
        year,
        program_id,
        programs (
          name
        )
      ),
      feedback:session_feedback!session_id (
        counseling_queries,
        action_taken,
        submitted_at
      )
    `)
    .eq('mentor_id', actualMentorId)
    .gte('date', dateRange.start.toISOString().split('T')[0])
    .lte('date', dateRange.end.toISOString().split('T')[0])
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) {
    console.error('[Report] Error fetching sessions:', error);
    throw new Error('Failed to fetch counseling sessions');
  }

  // Transform data to report format
  const reportData: ReportData[] = (sessions || []).map((session, index) => ({
    serialNo: index + 1,
    sessionName: session.session_name,
    date: formatDate(session.date),
    time: session.time,
    staffCodeAndName: `${mentorUser.jkkn_user_id} - ${mentorUser.name}`,
    department: mentorUser.departments?.name || '',
    studentRegnNo: session.student?.roll_number || '',
    studentName: session.student?.name || 'Unknown Student',
    studentCourse: session.student?.programs?.name || '',
    studentSemester: session.student?.year || '',
    academicYear: getCurrentAcademicYear(),
    studentQuery: session.feedback?.counseling_queries || '',
    queryDate: session.feedback?.submitted_at ? formatDate(session.feedback.submitted_at) : '',
    mentorResponse: session.feedback?.action_taken || '',
    responseDate: session.feedback?.submitted_at ? formatDate(session.feedback.submitted_at) : '',
  }));

  // Generate Excel file
  return generateExcelFile(institutionName, reportData);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Academic year typically starts in June/July
  if (month >= 6) {
    return `${year}-${year + 1} A`;
  } else {
    return `${year - 1}-${year} B`;
  }
}

function generateExcelFile(institutionName: string, data: ReportData[]): Buffer {
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = {};

  // Set column widths
  ws['!cols'] = [
    { width: 8 },   // S. No.
    { width: 20 },  // Session Name
    { width: 15 },  // Date
    { width: 12 },  // Time
    { width: 25 },  // Staff Code & Name
    { width: 30 },  // Home Department
    { width: 18 },  // Student Regn. No.
    { width: 25 },  // Student Name
    { width: 30 },  // Student Course
    { width: 18 },  // Student Semester
    { width: 20 },  // Student Academic Year
    { width: 40 },  // Student Query
    { width: 15 },  // Query Date
    { width: 40 },  // Mentor Response
    { width: 18 },  // Mentor Response Date
  ];

  // Title row 1 - Institution name (merged)
  ws['A1'] = { v: institutionName, t: 's' };
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } }, // A1:O1
    { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } }, // A2:O2
  ];

  // Title row 2 - Report title
  ws['A2'] = { v: 'Counselling Report', t: 's' };

  // Row 3 - Empty (spacing)
  ws['A3'] = { v: '', t: 's' };

  // Row 4 - Headers
  const headers = [
    'S. No.',
    'Session Name',
    'Date',
    'Time',
    'Staff Code & Name',
    'Home Department',
    'Student Regn. No.',
    'Student Name',
    'Student Course',
    'Student Semester',
    'Student Academic Year',
    'Student Query',
    'Query Date',
    'Mentor Response',
    'Mentor Response Date'
  ];

  headers.forEach((header, idx) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 3, c: idx });
    ws[cellAddress] = { v: header, t: 's' };
  });

  // Data rows (starting from row 5, index 4)
  data.forEach((row, rowIdx) => {
    const dataRow = [
      row.serialNo,
      row.sessionName,
      row.date,
      row.time,
      row.staffCodeAndName,
      row.department,
      row.studentRegnNo,
      row.studentName,
      row.studentCourse,
      row.studentSemester,
      row.academicYear,
      row.studentQuery,
      row.queryDate,
      row.mentorResponse,
      row.responseDate,
    ];

    dataRow.forEach((value, colIdx) => {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIdx + 4, c: colIdx });
      ws[cellAddress] = {
        v: value,
        t: typeof value === 'number' ? 'n' : 's'
      };
    });
  });

  // Set worksheet range
  const lastRow = data.length + 4; // 3 title rows + 1 header row + data rows
  ws['!ref'] = `A1:O${lastRow}`;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Counseling Report');

  // Generate buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}
```

### Task 3: Add Report Download UI to Mentor Dashboard
**File**: `app/(dashboard)/mentor/[id]/components/ReportsTab.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { Download, Calendar, Loader2 } from 'lucide-react';

interface ReportsTabProps {
  mentorId: string;
}

export default function ReportsTab({ mentorId }: ReportsTabProps) {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    setIsGenerating(true);

    try {
      const params = new URLSearchParams({
        period,
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      });

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
        throw new Error('Failed to generate report');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `counseling-report-${period}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('[Reports] Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
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
                className={`px-4 py-2 rounded border ${
                  period === 'weekly'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={`px-4 py-2 rounded border ${
                  period === 'monthly'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setPeriod('yearly')}
                className={`px-4 py-2 rounded border ${
                  period === 'yearly'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date (Optional)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="w-full bg-green-600 text-white px-4 py-3 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        <h3 className="font-medium text-blue-900 mb-2">Report Format</h3>
        <p className="text-sm text-blue-800">
          The generated report will include all counseling sessions with the following information:
        </p>
        <ul className="text-sm text-blue-800 mt-2 list-disc list-inside space-y-1">
          <li>Session details (name, date, time)</li>
          <li>Student information (name, registration number, course, semester)</li>
          <li>Student queries and concerns</li>
          <li>Mentor responses and action taken</li>
        </ul>
      </div>
    </div>
  );
}
```

### Task 4: Integrate Reports Tab into Mentor Page
**File**: `app/(dashboard)/mentor/[id]/page.tsx`

Add the Reports tab alongside existing tabs (Counseling, IDP, etc.):

```typescript
import ReportsTab from './components/ReportsTab';

// Add to tabs array
const tabs = [
  { id: 'overview', label: 'Overview', icon: Users },
  { id: 'counseling', label: 'Counseling', icon: MessageSquare },
  { id: 'idp', label: 'IDP', icon: Target },
  { id: 'reports', label: 'Reports', icon: FileText }, // NEW
  // ... other tabs
];

// Add to tab rendering
{activeTab === 'reports' && (
  <ReportsTab mentorId={params.id} />
)}
```

### Task 5: Add TypeScript Types
**File**: `lib/types/reports.ts`

```typescript
export type ReportPeriod = 'weekly' | 'monthly' | 'yearly';

export interface ReportDateRange {
  start: Date;
  end: Date;
}

export interface CounselingReportRow {
  serialNo: number;
  sessionName: string;
  date: string;
  time: string;
  staffCodeAndName: string;
  department: string;
  studentRegnNo: string;
  studentName: string;
  studentCourse: string;
  studentSemester: string;
  academicYear: string;
  studentQuery: string;
  queryDate: string;
  mentorResponse: string;
  responseDate: string;
}

export interface ReportGenerationParams {
  mentorId: string;
  period: ReportPeriod;
  startDate?: string;
  endDate?: string;
}
```

### Task 6: Update Package Dependencies
**File**: `package.json`

Ensure `xlsx` package is installed:

```bash
npm install xlsx
npm install --save-dev @types/xlsx
```

### Task 7: Add Admin Reports View (Optional)
**File**: `app/(dashboard)/admin/reports/page.tsx`

Create an admin interface to generate reports for any mentor:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function AdminReportsPage() {
  const [mentors, setMentors] = useState([]);
  const [selectedMentor, setSelectedMentor] = useState('');
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    fetchMentors();
  }, []);

  const fetchMentors = async () => {
    const response = await fetch('/api/admin/mentors', {
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      setMentors(data.mentors);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedMentor) {
      alert('Please select a mentor');
      return;
    }

    const response = await fetch(
      `/api/reports/mentor/${selectedMentor}/counseling?period=${period}`,
      { credentials: 'include' }
    );

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `counseling-report-${selectedMentor}-${period}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Generate Mentor Reports</h1>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Mentor
            </label>
            <select
              value={selectedMentor}
              onChange={(e) => setSelectedMentor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="">-- Select Mentor --</option>
              {mentors.map((mentor: any) => (
                <option key={mentor.id} value={mentor.jkkn_user_id}>
                  {mentor.name} ({mentor.jkkn_user_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Period
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setPeriod('weekly')}
                className={`px-4 py-2 rounded border ${
                  period === 'weekly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={`px-4 py-2 rounded border ${
                  period === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setPeriod('yearly')}
                className={`px-4 py-2 rounded border ${
                  period === 'yearly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          <button
            onClick={handleGenerateReport}
            className="w-full bg-green-600 text-white px-4 py-3 rounded hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Download className="h-5 w-5" />
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Testing Plan

1. **Test Weekly Report**:
   - Create 3-4 counseling sessions with feedback in the last 7 days
   - Generate weekly report
   - Verify Excel format matches DEEPAK ER.xlsx
   - Verify all data is present and formatted correctly

2. **Test Monthly Report**:
   - Generate report for current month
   - Verify date range is correct (1st to last day of month)
   - Check multiple sessions with different students

3. **Test Yearly Report**:
   - Generate report for current academic year
   - Verify large dataset handling
   - Check performance with 100+ rows

4. **Test Custom Date Range**:
   - Specify custom start and end dates
   - Verify only sessions in that range are included

5. **Test Edge Cases**:
   - No sessions in date range (empty report)
   - Sessions without feedback
   - Very long queries/responses (text wrapping)
   - Special characters in names/queries

## Success Criteria

✅ Reports match exact format of DEEPAK ER.xlsx
✅ All 15 columns populated correctly
✅ Title rows properly merged
✅ Date formatting matches (DD-MMM-YYYY)
✅ Column widths appropriate for content
✅ Weekly, monthly, yearly periods work correctly
✅ Custom date ranges work
✅ Reports download as Excel files
✅ File naming includes mentor ID and period
✅ Admin can generate reports for any mentor
✅ Mentors can only generate their own reports

## Implementation Order

1. Install xlsx package (Task 6)
2. Create report service layer (Task 2)
3. Create API endpoint (Task 1)
4. Add TypeScript types (Task 5)
5. Create Reports UI tab (Task 3)
6. Integrate into mentor page (Task 4)
7. Add admin reports view (Task 7 - optional)
8. Test all scenarios

## Estimated Time

- Tasks 1-6: 2-3 hours
- Task 7: 30-45 minutes
- Testing: 1 hour
- **Total**: 3.5-4.5 hours
