/**
 * Export pharmacy college student data to Excel
 * Run with: node scripts/export-pharmacy-students.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import XLSX from 'xlsx';

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const PHARMACY_INSTITUTION_ID = '5736d86f-5dab-4b7f-9aa1-b3bb1a2dd334';

/**
 * Classify a student into a semester/year group based on roll_number and email patterns
 */
function classifySemester(roll, email) {
  const r = (roll || '').toUpperCase().trim();
  const e = (email || '').toLowerCase();

  // B.Pharm batches
  if (r.startsWith('PB25') || e.includes('25pb@') || e.includes('25lpb@')) return 'B.Pharm 1st Year (2025)';
  if (r.startsWith('PB24') || e.includes('24pb@')) return 'B.Pharm 2nd Year (2024)';
  if (r.startsWith('PB23')) return 'B.Pharm 3rd Year (2023)';
  if (r.startsWith('PB22')) return 'B.Pharm 4th Year (2022)';
  if (r.startsWith('PB21') || r.startsWith('BP21')) return 'B.Pharm 5th Year (2021)';
  if (r.startsWith('PB20')) return 'B.Pharm Alumni (2020)';

  // Pharm.D batches
  if (r.startsWith('PD25') || e.includes('25pd@')) return 'Pharm.D 1st Year (2025)';
  if (r.startsWith('PD24') || e.includes('24pd@')) return 'Pharm.D 2nd Year (2024)';
  if (r.startsWith('PD23') || e.includes('23pd@')) return 'Pharm.D 3rd Year (2023)';
  if (r.startsWith('PD22')) return 'Pharm.D 4th Year (2022)';
  if (r.startsWith('PD21')) return 'Pharm.D 5th Year (2021)';
  if (r.startsWith('PD20')) return 'Pharm.D 6th Year (2020)';
  if (r.startsWith('PD19')) return 'Pharm.D Alumni (2019)';

  // M.Pharm
  if (r.startsWith('PG25')) return 'M.Pharm (2025)';

  // Numeric roll numbers — classify by email suffix
  if (/^\d+$/.test(r)) {
    if (e.includes('.bp@')) return 'B.Pharm 3rd Year (2023)';
    if (e.includes('.dp@')) return 'Pharm.D (Batch Unknown)';
  }

  // Fallback by email pattern
  if (e.includes('.bp@')) return 'B.Pharm (Batch Unknown)';
  if (e.includes('.dp@')) return 'Pharm.D (Batch Unknown)';

  return 'Other';
}

// Desired sheet ordering
const SEMESTER_ORDER = [
  'B.Pharm 1st Year (2025)',
  'B.Pharm 2nd Year (2024)',
  'B.Pharm 3rd Year (2023)',
  'B.Pharm 4th Year (2022)',
  'B.Pharm 5th Year (2021)',
  'B.Pharm Alumni (2020)',
  'B.Pharm (Batch Unknown)',
  'Pharm.D 1st Year (2025)',
  'Pharm.D 2nd Year (2024)',
  'Pharm.D 3rd Year (2023)',
  'Pharm.D 4th Year (2022)',
  'Pharm.D 5th Year (2021)',
  'Pharm.D 6th Year (2020)',
  'Pharm.D Alumni (2019)',
  'Pharm.D (Batch Unknown)',
  'M.Pharm (2025)',
  'Other',
];

async function exportStudents() {
  console.log('Fetching pharmacy students...');

  // Fetch all active pharmacy students
  const { data: students, error } = await supabase
    .from('students')
    .select('name, email, roll_number')
    .eq('is_active', true)
    .eq('institution_id', PHARMACY_INSTITUTION_ID)
    .order('name');

  if (error) throw new Error(`Query failed: ${error.message}`);
  console.log(`Fetched ${students.length} active pharmacy students`);

  // Classify each student
  const classified = students.map(s => ({
    name: s.name || '',
    email: s.email || '',
    semester: classifySemester(s.roll_number, s.email),
  }));

  // Group by semester
  const groups = {};
  for (const s of classified) {
    if (!groups[s.semester]) groups[s.semester] = [];
    groups[s.semester].push(s);
  }

  // Print summary
  console.log('\nSemester breakdown:');
  for (const sem of SEMESTER_ORDER) {
    if (groups[sem]) {
      console.log(`  ${sem}: ${groups[sem].length}`);
    }
  }

  // Build workbook
  const wb = XLSX.utils.book_new();

  // Sort all students by semester order, then by name
  const semIndex = {};
  SEMESTER_ORDER.forEach((s, i) => { semIndex[s] = i; });
  classified.sort((a, b) => {
    const si = (semIndex[a.semester] ?? 99) - (semIndex[b.semester] ?? 99);
    if (si !== 0) return si;
    return a.name.localeCompare(b.name);
  });

  // Sheet 1: All Students
  const allRows = classified.map((s, i) => ({
    'S.No': i + 1,
    'Student Name': s.name,
    'Semester / Year': s.semester,
    'Email': s.email,
  }));
  const wsAll = XLSX.utils.json_to_sheet(allRows);
  // Set column widths
  wsAll['!cols'] = [
    { wch: 6 },   // S.No
    { wch: 30 },  // Student Name
    { wch: 32 },  // Semester / Year
    { wch: 40 },  // Email
  ];
  XLSX.utils.book_append_sheet(wb, wsAll, 'All Students');

  // Per-semester sheets
  for (const sem of SEMESTER_ORDER) {
    const group = groups[sem];
    if (!group || group.length === 0) continue;

    group.sort((a, b) => a.name.localeCompare(b.name));

    const rows = group.map((s, i) => ({
      'S.No': i + 1,
      'Student Name': s.name,
      'Email': s.email,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },   // S.No
      { wch: 30 },  // Student Name
      { wch: 40 },  // Email
    ];

    // Sheet name max 31 chars for Excel
    const sheetName = sem.length > 31 ? sem.slice(0, 31) : sem;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  // Write file
  const outPath = resolve(process.cwd(), 'exports', 'pharmacy-students-2026.xlsx');
  XLSX.writeFile(wb, outPath);
  console.log(`\nExcel written to: ${outPath}`);
  console.log(`Total students: ${classified.length}`);
  console.log(`Sheets: ${wb.SheetNames.length} (1 "All Students" + ${wb.SheetNames.length - 1} per-semester)`);
}

exportStudents().catch(e => {
  console.error('Export failed:', e.message);
  process.exit(1);
});
