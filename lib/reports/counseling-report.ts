import { createAdminClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';
import type { ReportDateRange, CounselingReportRow } from '@/lib/types/reports';

// JKKN API interfaces
interface JKKNStudent {
  id: string;
  first_name: string;
  last_name: string;
  roll_number: string;
  year?: string;
  semester?: string;
  department?: {
    id: string;
    name: string;
  } | string;
  program?: {
    id: string;
    name: string;
  } | string;
}

/**
 * Fetch department name from JKKN API
 */
async function fetchDepartmentFromJKKN(departmentId: string): Promise<string> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

    if (!apiKey) {
      console.warn('[JKKN API] API key not configured, cannot fetch department');
      return '';
    }

    const url = `${baseUrl}/api-management/departments/${departmentId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`[JKKN API] Failed to fetch department ${departmentId}:`, response.statusText);
      return '';
    }

    const result = await response.json();
    const department = result.data;

    if (!department) {
      return '';
    }

    return department.name || department.department_name || '';
  } catch (error) {
    console.error('[JKKN API] Error fetching department:', error);
    return '';
  }
}

/**
 * Fetch all students from JKKN API and create a map by roll number
 */
async function fetchAllStudentsFromJKKN(): Promise<Map<string, JKKNStudent>> {
  const studentMap = new Map<string, JKKNStudent>();

  try {
    const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

    if (!apiKey) {
      console.warn('[JKKN API] API key not configured, skipping JKKN data enrichment');
      return studentMap;
    }

    console.log('[JKKN API] Fetching all students for data enrichment...');

    // Fetch all students (multiple pages if needed)
    let allStudents: any[] = [];
    let currentPage = 1;
    const maxLimit = 1000;
    let hasMore = true;
    const maxPages = 15;

    while (hasMore && currentPage <= maxPages) {
      const url = `${baseUrl}/api-management/students?page=${currentPage}&limit=${maxLimit}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        console.error(`[JKKN API] Failed to fetch students page ${currentPage}:`, response.statusText);
        break;
      }

      const pageData = await response.json();
      const students = pageData.data || [];

      console.log(`[JKKN API] Fetched page ${currentPage}: ${students.length} students`);

      allStudents = [...allStudents, ...students];

      // Check if there are more pages
      hasMore = students.length === maxLimit;

      const paginationInfo = pageData.pagination || pageData.metadata;
      if (paginationInfo) {
        const totalPages = paginationInfo.totalPages || paginationInfo.total_pages;
        if (totalPages && currentPage >= totalPages) {
          hasMore = false;
        }
      }

      currentPage++;
    }

    console.log(`[JKKN API] Total students fetched: ${allStudents.length}`);

    // DEBUG: Log first student to see all available fields
    if (allStudents.length > 0) {
      console.log('[JKKN API] Sample student fields:', Object.keys(allStudents[0]));
      console.log('[JKKN API] Sample student data:', JSON.stringify(allStudents[0], null, 2));
    }

    // Build map with roll_number as key
    allStudents.forEach((student: any) => {
      const rollNumber = (student.roll_number || student.rollNumber || student.roll_no || '').toLowerCase();

      if (rollNumber) {
        // Try to extract year/semester from various possible fields
        const yearValue = student.year ||
                         student.current_year ||
                         student.semester ||
                         student.current_semester ||
                         student.batch ||
                         student.academic_year ||
                         '';

        studentMap.set(rollNumber, {
          id: student.id || student.student_id,
          first_name: student.first_name || student.firstName || '',
          last_name: student.last_name || student.lastName || '',
          roll_number: student.roll_number || student.rollNumber || student.roll_no || '',
          year: yearValue,
          semester: yearValue,
          department: student.department
            ? (typeof student.department === 'object'
                ? {
                    id: student.department.id || student.department.department_id,
                    name: student.department.name || student.department.department_name || ''
                  }
                : student.department)
            : (student.department_name || ''),
          program: student.program
            ? (typeof student.program === 'object'
                ? {
                    id: student.program.id || student.program.program_id,
                    name: student.program.name || student.program.program_name || ''
                  }
                : student.program)
            : (student.program_name || ''),
        });
      }
    });

    console.log(`[JKKN API] Built student map with ${studentMap.size} entries`);

    return studentMap;
  } catch (error) {
    console.error('[JKKN API] Error fetching students:', error);
    return studentMap;
  }
}

export async function generateCounselingReport(
  mentorId: string,
  dateRange: ReportDateRange,
  userId?: string // Optional: Supabase user ID for fallback lookup when JKKN ID changes
): Promise<{ buffer: Buffer; mentorName: string; sessionCount: number }> {
  console.log(`[Report] Starting report generation for mentor ${mentorId}`);
  console.log(`[Report] Date range: ${dateRange.start.toISOString()} to ${dateRange.end.toISOString()}`);

  const supabase = createAdminClient();

  // Convert JKKN mentor ID to Supabase mentor ID
  // First get the user, then get their mentor record
  // Try by jkkn_user_id first, then fallback to user ID lookup (handles JKKN ID changes)
  let { data: mentorUser, error: mentorError } = await supabase
    .from('users')
    .select(`
      id,
      full_name,
      jkkn_user_id,
      department_id
    `)
    .eq('jkkn_user_id', mentorId)
    .maybeSingle();

  // If not found by JKKN ID and we have a userId, use that instead
  if (!mentorUser && userId) {
    console.log(`[Report] User not found by jkkn_user_id, trying userId: ${userId}`);
    const { data: userById } = await supabase
      .from('users')
      .select('id, full_name, jkkn_user_id, department_id')
      .eq('id', userId)
      .single();

    if (userById) {
      mentorUser = userById;
      console.log(`[Report] Found user by userId: ${mentorUser.full_name}`);
    }
  }

  if (!mentorUser) {
    console.error('[Report] Mentor user not found:', { mentorId, userId, error: mentorError });
    throw new Error('Mentor not found');
  }

  console.log(`[Report] Found mentor user: ${mentorUser.full_name} (User ID: ${mentorUser.id})`);

  // Get the mentor record (counseling_sessions uses mentors.id, not users.id)
  const { data: mentor, error: mentorRecordError } = await supabase
    .from('mentors')
    .select('id')
    .eq('user_id', mentorUser.id)
    .single();

  if (mentorRecordError || !mentor) {
    console.error('[Report] Mentor record not found:', { userId: mentorUser.id, error: mentorRecordError });
    throw new Error('Mentor record not found');
  }

  const actualMentorId = mentor.id;
  console.log(`[Report] Found mentor record (Mentor ID: ${actualMentorId})`);

  // Fetch mentor's department name from JKKN API
  let departmentName = '';
  if (mentorUser.department_id) {
    console.log(`[Report] Fetching mentor department from JKKN API: ${mentorUser.department_id}`);
    departmentName = await fetchDepartmentFromJKKN(mentorUser.department_id);
    console.log(`[Report] Mentor department from JKKN: ${departmentName || 'Not found'}`);
  } else {
    console.warn('[Report] Mentor has no department_id');
  }

  // Fetch mentor's institution name
  const { data: institution } = await supabase
    .from('institutions')
    .select('name')
    .limit(1)
    .single();

  const institutionName = institution?.name || 'JKKN Institution';

  // DEBUG: Check if ANY sessions exist for this mentor (ignore date range)
  const { count: totalSessionCount } = await supabase
    .from('counseling_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('mentor_id', actualMentorId);

  console.log(`[Report] Total sessions for this mentor (all time): ${totalSessionCount || 0}`);

  // Log query parameters
  console.log('[Report] Query parameters:', {
    mentor_id: actualMentorId,
    start_date: dateRange.start.toISOString().split('T')[0],
    end_date: dateRange.end.toISOString().split('T')[0]
  });

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
        department_id
      ),
      feedback:session_feedback (
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
    console.error('[Report] Error fetching sessions:', {
      code: error.code,
      details: error.details,
      message: error.message,
      hint: error.hint
    });
    throw new Error('Failed to fetch counseling sessions');
  }

  console.log(`[Report] Found ${sessions?.length || 0} sessions for mentor ${mentorId}`);

  // DEBUG: Log first session to see structure
  if (sessions && sessions.length > 0) {
    console.log('[Report] First session sample:', JSON.stringify(sessions[0], null, 2));
  } else {
    console.warn('[Report] WARNING: No sessions found! Check if:');
    console.warn('  1. Sessions exist in the database for this mentor');
    console.warn('  2. Date range is correct');
    console.warn('  3. mentor_id matches');
  }

  // Fetch student data from JKKN API for enrichment
  console.log('[Report] Fetching student data from JKKN API...');
  const jkknStudentMap = await fetchAllStudentsFromJKKN();
  console.log(`[Report] JKKN student map loaded with ${jkknStudentMap.size} students`);

  // Fetch department names for all unique department_ids from students
  const departmentIds = [...new Set(
    sessions
      ?.map((s: any) => s.student?.department_id)
      .filter(Boolean) || []
  )];

  console.log(`[Report] Fetching ${departmentIds.length} unique departments for students`);

  const departmentMap: Record<string, string> = {};

  if (departmentIds.length > 0) {
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('id, department_name')
      .in('id', departmentIds);

    if (deptError) {
      console.error('[Report] Error fetching departments:', deptError);
      // Don't throw, just continue with empty department names
    } else if (departments) {
      departments.forEach(d => {
        departmentMap[d.id] = d.department_name;
      });
      console.log(`[Report] Loaded ${departments.length} department names`);
    }
  }

  // Transform data to report format
  console.log(`[Report] Transforming ${sessions?.length || 0} sessions to report rows...`);
  const reportData: CounselingReportRow[] = (sessions || []).map((session: any, index) => {
    // Feedback might be an array or a single object, handle both cases
    const feedback = Array.isArray(session.feedback)
      ? session.feedback[0]  // Take first feedback if array
      : session.feedback;      // Use as-is if single object

    console.log(`[Report] Session ${index + 1}: ${session.session_name}, has feedback: ${!!feedback}`);

    // Try to get enriched student data from JKKN API
    const rollNumber = session.student?.roll_number || '';
    const jkknStudent = rollNumber ? jkknStudentMap.get(rollNumber.toLowerCase()) : null;

    // Use JKKN data if available, fallback to Supabase data
    let studentCourse = '';
    let studentSemester = '';

    if (jkknStudent) {
      // Extract department/program name from JKKN data
      if (typeof jkknStudent.program === 'object' && jkknStudent.program.name) {
        studentCourse = jkknStudent.program.name;
      } else if (typeof jkknStudent.program === 'string') {
        studentCourse = jkknStudent.program;
      } else if (typeof jkknStudent.department === 'object' && jkknStudent.department.name) {
        studentCourse = jkknStudent.department.name;
      } else if (typeof jkknStudent.department === 'string') {
        studentCourse = jkknStudent.department;
      }

      studentSemester = jkknStudent.year || jkknStudent.semester || '';

      console.log(`[Report] Enriched student ${rollNumber} with JKKN data: course=${studentCourse}, semester=${studentSemester}`);
    } else {
      // Fallback to Supabase data
      studentCourse = session.student?.department_id ? (departmentMap[session.student.department_id] || '') : '';
      studentSemester = session.student?.year || '';

      if (rollNumber) {
        console.warn(`[Report] No JKKN data found for student ${rollNumber}, using Supabase data`);
      }
    }

    const row = {
      serialNo: index + 1,
      sessionName: session.session_name,
      date: formatDate(session.date),
      time: session.time,
      staffCodeAndName: `${mentorUser.jkkn_user_id} - ${mentorUser.full_name}`,
      department: departmentName,
      studentRegnNo: rollNumber,
      studentName: session.student?.name || 'Unknown Student',
      studentCourse: studentCourse,
      studentSemester: studentSemester,
      academicYear: getCurrentAcademicYear(),
      studentQuery: feedback?.counseling_queries || '',
      queryDate: feedback?.submitted_at ? formatDate(feedback.submitted_at) : '',
      mentorResponse: feedback?.action_taken || '',
      responseDate: feedback?.submitted_at ? formatDate(feedback.submitted_at) : '',
    };

    // DEBUG: Log first transformed row
    if (index === 0) {
      console.log('[Report] First transformed row:', JSON.stringify(row, null, 2));
    }

    return row;
  });

  console.log(`[Report] Transformed ${reportData.length} rows for Excel`);

  // Generate Excel file
  console.log(`[Report] Generating Excel file with ${reportData.length} rows`);
  const buffer = generateExcelFile(institutionName, mentorUser.full_name, reportData);
  console.log(`[Report] Excel file generated successfully, size: ${buffer.length} bytes`);
  return { buffer, mentorName: mentorUser.full_name, sessionCount: sessions?.length || 0 };
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

function generateExcelFile(institutionName: string, mentorName: string, data: CounselingReportRow[]): Buffer {
  console.log(`[Excel] generateExcelFile called with ${data.length} data rows for mentor: ${mentorName}`);

  // DEBUG: Log first data row
  if (data.length > 0) {
    console.log('[Excel] First data row:', JSON.stringify(data[0], null, 2));
  } else {
    console.warn('[Excel] WARNING: No data rows to generate!');
  }

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
    { s: { r: 2, c: 0 }, e: { r: 2, c: 14 } }, // A3:O3
  ];

  // Title row 2 - Report title with mentor name
  ws['A2'] = { v: `Counselling Report - ${mentorName}`, t: 's' };

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
  console.log(`[Excel] Writing ${data.length} data rows to worksheet`);
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

    // DEBUG: Log first data row being written
    if (rowIdx === 0) {
      console.log('[Excel] First data row values:', dataRow);
    }

    dataRow.forEach((value, colIdx) => {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIdx + 4, c: colIdx });
      // Ensure proper string handling for UTF-8 characters
      const cellValue = value === null || value === undefined ? '' : value;
      ws[cellAddress] = {
        v: cellValue,
        t: typeof cellValue === 'number' ? 'n' : 's',
        z: typeof cellValue === 'string' ? '@' : undefined  // Text format for strings
      };

      // DEBUG: Log first cell being written
      if (rowIdx === 0 && colIdx === 0) {
        console.log(`[Excel] First cell at ${cellAddress}:`, ws[cellAddress]);
      }
    });
  });

  console.log(`[Excel] Finished writing ${data.length} rows`);

  // Set worksheet range
  const lastRow = data.length + 4; // 3 title rows + 1 header row + data rows
  ws['!ref'] = `A1:O${lastRow}`;
  console.log(`[Excel] Worksheet range set to: ${ws['!ref']}`);
  console.log(`[Excel] Total cells in worksheet: ${Object.keys(ws).filter(k => !k.startsWith('!')).length}`);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Counseling Report');

  // Generate buffer with proper encoding options
  const buffer = XLSX.write(wb, {
    type: 'buffer',
    bookType: 'xlsx',
    bookSST: false,  // Don't use shared strings (better for special characters)
    compression: true  // Enable compression
  });
  return buffer;
}
