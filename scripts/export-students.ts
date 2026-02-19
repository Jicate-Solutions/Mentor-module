/**
 * Export ALL Students from JKKN API to Excel
 *
 * Fetches all students across all lifecycle statuses and institutions,
 * then exports to an Excel file with multiple sheets.
 *
 * Run: npx tsx scripts/export-students.ts
 */

import 'dotenv/config';
import * as XLSX from 'xlsx';

const API_KEY = process.env.NEXT_PUBLIC_MYJKKN_API_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

interface Student {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  student_email?: string;
  college_email?: string;
  student_mobile?: string;
  roll_number?: string;
  lifecycle_status?: string;
  institution?: { id?: string; name?: string } | string;
  department?: { id?: string; name?: string } | string;
  program?: { id?: string; name?: string } | string;
  [key: string]: any;
}

function extractName(s: Student): string {
  return `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown';
}

function extractField(obj: any): { id: string; name: string } {
  if (!obj) return { id: '', name: '' };
  if (typeof obj === 'object') return { id: obj.id || obj.institution_id || obj.department_id || '', name: obj.name || obj.institution_name || obj.department_name || '' };
  return { id: String(obj), name: '' };
}

async function fetchAllStudents(): Promise<Student[]> {
  console.log('Fetching ALL students from JKKN API...\n');

  let allStudents: Student[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 50) {
    const url = `${BASE_URL}/api-management/learners/profiles?page=${page}&limit=200&lifecycle_status=active,alumni,exited,graduated,inactive`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
    });

    if (!res.ok) {
      console.error(`Page ${page} failed: ${res.status}`);
      break;
    }

    const data = await res.json();
    const students = data.data || [];
    allStudents = [...allStudents, ...students];

    console.log(`  Page ${page}: ${students.length} students (total: ${allStudents.length})`);

    hasMore = students.length === 200;
    if (data.pagination?.totalPages && page >= data.pagination.totalPages) hasMore = false;
    page++;
  }

  console.log(`\nTotal fetched: ${allStudents.length}\n`);
  return allStudents;
}

async function fetchDepartments(): Promise<Map<string, string>> {
  try {
    const res = await fetch(`${BASE_URL}/api-management/organizations/departments?page=1&limit=500`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
    });
    if (!res.ok) return new Map();
    const data = await res.json();
    const map = new Map<string, string>();
    (data.data || []).forEach((d: any) => {
      if (d.id) map.set(d.id, d.name || d.department_name || 'Unknown');
    });
    return map;
  } catch { return new Map(); }
}

async function fetchInstitutions(): Promise<Map<string, string>> {
  try {
    const res = await fetch(`${BASE_URL}/api-management/organizations/institutions?page=1&limit=100`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
    });
    if (!res.ok) return new Map();
    const data = await res.json();
    const map = new Map<string, string>();
    (data.data || []).forEach((i: any) => {
      if (i.id) map.set(i.id, i.name || i.institution_name || 'Unknown');
    });
    return map;
  } catch { return new Map(); }
}

async function main() {
  if (!API_KEY) {
    console.error('NEXT_PUBLIC_MYJKKN_API_KEY not set');
    process.exit(1);
  }

  // Fetch data
  const [students, deptMap, instMap] = await Promise.all([
    fetchAllStudents(),
    fetchDepartments(),
    fetchInstitutions(),
  ]);

  console.log(`Departments loaded: ${deptMap.size}`);
  console.log(`Institutions loaded: ${instMap.size}\n`);

  // Transform to flat rows — API uses flat institution_id/department_id fields
  const rows = students.map(s => {
    const instId = s.institution_id || (typeof s.institution === 'object' ? s.institution?.id : '') || '';
    const deptId = s.department_id || (typeof s.department === 'object' ? s.department?.id : '') || '';

    return {
      'Name': extractName(s),
      'Roll Number': s.roll_number || '',
      'Register Number': s.register_number || '',
      'Email': s.college_email || s.student_email || s.email || '',
      'Mobile': s.student_mobile || '',
      'Lifecycle Status': s.lifecycle_status || '',
      'Institution': instMap.get(instId) || instId || '',
      'Institution ID': instId,
      'Department': deptMap.get(deptId) || deptId || '',
      'Department ID': deptId,
      'Gender': s.gender || '',
      'Date of Birth': s.date_of_birth || '',
      'Father Name': s.father_name || '',
      'Mother Name': s.mother_name || '',
      'Admission Year': s.admission_year || '',
      'Student ID': s.id,
    };
  });

  // Sort by Institution, then Department, then Name
  rows.sort((a, b) => {
    const instCmp = a['Institution'].localeCompare(b['Institution']);
    if (instCmp !== 0) return instCmp;
    const deptCmp = a['Department'].localeCompare(b['Department']);
    if (deptCmp !== 0) return deptCmp;
    return a['Name'].localeCompare(b['Name']);
  });

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: All Students
  const wsAll = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  wsAll['!cols'] = [
    { wch: 30 }, // Name
    { wch: 15 }, // Roll Number
    { wch: 15 }, // Register Number
    { wch: 30 }, // Email
    { wch: 15 }, // Mobile
    { wch: 15 }, // Lifecycle Status
    { wch: 40 }, // Institution
    { wch: 38 }, // Institution ID
    { wch: 40 }, // Department
    { wch: 38 }, // Department ID
    { wch: 10 }, // Gender
    { wch: 12 }, // DOB
    { wch: 25 }, // Father
    { wch: 25 }, // Mother
    { wch: 12 }, // Admission Year
    { wch: 38 }, // Student ID
  ];

  XLSX.utils.book_append_sheet(wb, wsAll, 'All Students');

  // Sheet 2: Dental Institution only
  const dentalRows = rows.filter(r => r['Institution ID'] === 'e8fbe8aa-c44e-41aa-a44b-39dab2c8b9a5');
  if (dentalRows.length > 0) {
    const wsDental = XLSX.utils.json_to_sheet(dentalRows);
    wsDental['!cols'] = wsAll['!cols'];
    XLSX.utils.book_append_sheet(wb, wsDental, 'Dental Students');
  }

  // Sheet 3: Summary by Institution
  const instSummary: Record<string, { total: number; active: number; graduated: number; inactive: number; exited: number }> = {};
  rows.forEach(r => {
    const inst = r['Institution'] || 'Unknown';
    if (!instSummary[inst]) instSummary[inst] = { total: 0, active: 0, graduated: 0, inactive: 0, exited: 0 };
    instSummary[inst].total++;
    const status = r['Lifecycle Status'] as keyof typeof instSummary[string];
    if (status in instSummary[inst]) (instSummary[inst] as any)[status]++;
  });

  const summaryRows = Object.entries(instSummary)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, counts]) => ({
      'Institution': name,
      'Total': counts.total,
      'Active': counts.active,
      'Graduated': counts.graduated,
      'Inactive': counts.inactive,
      'Exited': counts.exited,
    }));

  // Add grand total row
  summaryRows.push({
    'Institution': 'GRAND TOTAL',
    'Total': rows.length,
    'Active': rows.filter(r => r['Lifecycle Status'] === 'active').length,
    'Graduated': rows.filter(r => r['Lifecycle Status'] === 'graduated').length,
    'Inactive': rows.filter(r => r['Lifecycle Status'] === 'inactive').length,
    'Exited': rows.filter(r => r['Lifecycle Status'] === 'exited').length,
  });

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 45 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Write file
  const outputPath = 'JKKN_All_Students.xlsx';
  XLSX.writeFile(wb, outputPath);

  console.log(`Excel file created: ${outputPath}`);
  console.log(`\nSheets:`);
  console.log(`  1. All Students: ${rows.length} rows`);
  console.log(`  2. Dental Students: ${dentalRows.length} rows`);
  console.log(`  3. Summary: ${summaryRows.length} institutions`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
