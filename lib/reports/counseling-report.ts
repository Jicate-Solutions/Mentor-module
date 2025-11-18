import { createAdminClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';
import type { ReportDateRange, CounselingReportRow } from '@/lib/types/reports';

export async function generateCounselingReport(
  mentorId: string,
  dateRange: ReportDateRange
): Promise<Buffer> {
  const supabase = createAdminClient();

  // Convert JKKN mentor ID to Supabase mentor ID if needed
  const { data: mentorUser, error: mentorError } = await supabase
    .from('users')
    .select(`
      id,
      name,
      jkkn_user_id,
      department_id,
      departments (
        name
      )
    `)
    .eq('jkkn_user_id', mentorId)
    .single();

  if (mentorError || !mentorUser) {
    console.error('[Report] Mentor not found:', mentorError);
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

  console.log(`[Report] Found ${sessions?.length || 0} sessions for mentor ${mentorId}`);

  // Transform data to report format
  const reportData: CounselingReportRow[] = (sessions || []).map((session: any, index) => ({
    serialNo: index + 1,
    sessionName: session.session_name,
    date: formatDate(session.date),
    time: session.time,
    staffCodeAndName: `${mentorUser.jkkn_user_id} - ${mentorUser.name}`,
    department: (mentorUser.departments as any)?.name || '',
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

function generateExcelFile(institutionName: string, data: CounselingReportRow[]): Buffer {
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
