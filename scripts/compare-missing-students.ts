/**
 * Compare Missing Students List (from docx) against JKKN API
 *
 * Parses the extracted missing students text, fetches dental students
 * from JKKN API, and generates an Excel comparison report.
 *
 * Run: DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/compare-missing-students.ts
 */

import 'dotenv/config';
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

const API_KEY = process.env.NEXT_PUBLIC_MYJKKN_API_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';
const DENTAL_INSTITUTION_ID = 'e8fbe8aa-c44e-41aa-a44b-39dab2c8b9a5';

interface MissingStudent {
  sno: number;
  name: string;
  yearOfStudy: string;
  mentorName: string;
  category: string; // BDS 1st Year, BDS Intern, PG Prosthodontics, etc.
}

interface APIStudent {
  id: string;
  first_name?: string;
  last_name?: string;
  roll_number?: string;
  register_number?: string;
  college_email?: string;
  student_email?: string;
  email?: string;
  lifecycle_status?: string;
  department_id?: string;
  institution_id?: string;
}

// ─── Parse the missing students from extracted text ───────────────────────────

function parseMissingStudents(): MissingStudent[] {
  const text = readFileSync('missing_students_text.txt', 'utf-8');
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const students: MissingStudent[] = [];
  let currentCategory = '';
  let snoCounter = 0;

  // State machine to parse the structured text
  let i = 0;

  // Skip header row
  while (i < lines.length && !lines[i].match(/^1$/)) {
    i++;
  }

  // Parse BDS students (numbered 1-59)
  while (i < lines.length) {
    const line = lines[i];

    // Check for section breaks
    if (line === 'ALLOTMENT OF STUDENTS TO MENTORS') break;
    if (line.startsWith('S.NO') || line.startsWith('MENTEE')) {
      i++;
      continue;
    }

    // Check if this is a number (serial number)
    const snoMatch = line.match(/^(\d+)$/);
    if (snoMatch) {
      const sno = parseInt(snoMatch[1]);
      // Look ahead for name, year, mentor
      if (i + 1 < lines.length) {
        const name = lines[i + 1];
        let year = '';
        let mentor = '';

        // Find year and mentor in next lines
        let j = i + 2;
        while (j < lines.length && !lines[j].match(/^(\d+)$/) && lines[j] !== 'ALLOTMENT OF STUDENTS TO MENTORS') {
          if (lines[j].match(/YEAR|BDS|INTERN|FINAL/i)) {
            year = lines[j];
          } else if (lines[j].match(/^(DR\.|MRS\.|MR\.)/i)) {
            mentor = lines[j];
          }
          j++;
        }

        // Determine category from year
        let category = year;
        if (year.includes('1ST YEAR BDS')) category = 'BDS 1st Year';
        else if (year.includes('2ND YEAR BDS')) category = 'BDS 2nd Year';
        else if (year.includes('3RD YEAR BDS FEB')) category = 'BDS 3rd Year Feb Batch';
        else if (year.includes('3RD YEAR BDS')) category = 'BDS 3rd Year';
        else if (year.includes('FINAL YEAR BDS FEB')) category = 'BDS Final Year Feb Batch';
        else if (year.includes('FINAL YEAR BDS')) category = 'BDS Final Year';

        students.push({
          sno: sno,
          name: name,
          yearOfStudy: year,
          mentorName: mentor,
          category: category,
        });

        i = j;
        continue;
      }
    }
    i++;
  }

  // Parse INTERN section from the raw text file (not the filtered lines)
  // The pattern is: NAME\n\nINTERN\n\nMENTOR (with blank lines)
  const rawText = readFileSync('missing_students_text.txt', 'utf-8');
  const rawLines = rawText.split('\n').map(l => l.trim());

  // Find the intern section start (after "MENTEE'S NAME MISSING" and "MENTORS NAME" headers)
  let internStart = -1;
  for (let idx = 0; idx < rawLines.length; idx++) {
    if (rawLines[idx] === "MENTEE'S NAME MISSING" || rawLines[idx] === "MENTEE\u2019S NAME MISSING") {
      // Check this is the intern section (after line ~490)
      if (idx > 200) {
        internStart = idx;
        break;
      }
    }
  }
  // If we didn't find it by header, look for the first INTERN after line 490
  if (internStart === -1) {
    for (let idx = 490; idx < rawLines.length; idx++) {
      if (rawLines[idx] === 'INTERN') {
        // Go back to find the name before this
        internStart = idx - 3; // approximate
        break;
      }
    }
  }

  if (internStart !== -1) {
    // Find intern section end
    let internEnd = rawLines.length;
    for (let idx = internStart; idx < rawLines.length; idx++) {
      if (rawLines[idx] === 'ALLOTMENT OF STUDENTS TO MENTORS') {
        internEnd = idx;
        break;
      }
    }

    // Parse interns: scan for lines that are followed (within 3 lines) by "INTERN"
    let internCounter = 0;
    for (let idx = internStart; idx < internEnd; idx++) {
      const line = rawLines[idx];
      if (!line || line === 'INTERN' || line.startsWith('S.NO') || line.startsWith('MENTEE') ||
          line === 'MENTORS NAME' || line === 'YEAR OF STUDY') continue;

      // Check if "INTERN" appears within the next few lines
      let foundIntern = false;
      for (let k = idx + 1; k < Math.min(idx + 4, internEnd); k++) {
        if (rawLines[k] === 'INTERN') {
          foundIntern = true;
          break;
        }
      }

      if (foundIntern) {
        // This line is a student name — find their mentor
        let mentor = '';
        for (let k = idx + 1; k < Math.min(idx + 8, internEnd); k++) {
          if (rawLines[k].match(/^DR[\s.]/i)) {
            mentor = rawLines[k];
            break;
          }
        }

        // Skip if this looks like a number or header
        if (line.match(/^\d+$/) || line.match(/^S\.NO$/i)) continue;

        internCounter++;
        students.push({
          sno: 59 + internCounter,
          name: line,
          yearOfStudy: 'INTERN',
          mentorName: mentor,
          category: 'BDS Intern',
        });
      }
    }
    console.log(`  (Parsed ${internCounter} interns from raw text)`);
  }

  // Parse PG sections
  const pgSections = [
    { marker: 'DEPARTMENT OF PROSTHODONTICS', category: 'PG Prosthodontics' },
    { marker: 'DEPARTMENT OF PERIODONTOLOGY', category: 'PG Periodontology' },
    { marker: 'DEPARTMENT OF ENDODONTICS', category: 'PG Endodontics' },
    { marker: 'DEPARTMENT OF ORTHODONTICS', category: 'PG Orthodontics' },
    { marker: 'DEPARTMENT OF ORAL MEDICINE', category: 'PG Oral Medicine' },
  ];

  for (const section of pgSections) {
    let sectionStart = -1;
    for (let idx = 0; idx < lines.length; idx++) {
      if (lines[idx].includes(section.marker)) {
        sectionStart = idx;
        break;
      }
    }
    if (sectionStart === -1) continue;

    // Find the end (next DEPARTMENT or end of file)
    let sectionEnd = lines.length;
    for (let idx = sectionStart + 1; idx < lines.length; idx++) {
      if (lines[idx].startsWith('DEPARTMENT OF') && idx !== sectionStart) {
        sectionEnd = idx;
        break;
      }
    }

    // Parse students in this section
    let pgCounter = 0;
    for (let idx = sectionStart; idx < sectionEnd; idx++) {
      const numMatch = lines[idx].match(/^(\d+)\.\s*$/) || lines[idx].match(/^([A-E])\.\s*$/);
      if (numMatch || lines[idx].match(/^\d+\.?\s*$/)) {
        // Next non-empty line is the name
        let nameIdx = idx + 1;
        while (nameIdx < sectionEnd && lines[nameIdx] === '') nameIdx++;

        if (nameIdx < sectionEnd) {
          let name = lines[nameIdx];
          // Skip if it's a header
          if (name.startsWith('MENTEE') || name.startsWith('SL.NO') || name === 'MISSING') continue;

          let year = '';
          let mentor = '';
          for (let k = nameIdx + 1; k < Math.min(nameIdx + 5, sectionEnd); k++) {
            if (lines[k].match(/YEAR/i)) year = lines[k];
            if (lines[k].match(/^DR\./i)) mentor = lines[k];
          }

          pgCounter++;
          students.push({
            sno: students.length + 1,
            name: name,
            yearOfStudy: year || '1ST YEAR',
            mentorName: mentor,
            category: section.category,
          });
        }
      }
      // Handle tab-prefixed numbers like "	3." or " 	6"
      const tabNumMatch = lines[idx].match(/^\s*(\d+)\.?\s*$/);
      if (tabNumMatch && !lines[idx].match(/^(\d+)\.?\s*$/)) {
        let nameIdx = idx + 1;
        while (nameIdx < sectionEnd && lines[nameIdx] === '') nameIdx++;
        if (nameIdx < sectionEnd) {
          const name = lines[nameIdx];
          if (name.startsWith('MENTEE') || name.startsWith('SL.NO') || name === 'MISSING') continue;

          let year = '';
          let mentor = '';
          for (let k = nameIdx + 1; k < Math.min(nameIdx + 5, sectionEnd); k++) {
            if (lines[k].match(/YEAR/i)) year = lines[k];
            if (lines[k].match(/^DR\./i)) mentor = lines[k];
          }

          students.push({
            sno: students.length + 1,
            name: name,
            yearOfStudy: year || '1ST YEAR',
            mentorName: mentor,
            category: section.category,
          });
        }
      }
    }
  }

  // De-duplicate by name (in case parsing picked up the same student twice)
  const seen = new Set<string>();
  const unique: MissingStudent[] = [];
  for (const s of students) {
    const key = normalize(s.name);
    if (!seen.has(key) && key.length > 1) {
      seen.add(key);
      unique.push(s);
    }
  }

  return unique;
}

// ─── Normalize name for comparison ────────────────────────────────────────────

function normalize(name: string): string {
  return name
    .toUpperCase()
    .replace(/\./g, ' ')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getNameParts(name: string): string[] {
  return normalize(name).split(' ').filter(p => p.length > 0);
}

// ─── Fuzzy match: check if a missing student matches an API student ───────────

function fuzzyMatch(missingName: string, apiFirstName: string, apiLastName: string): { match: boolean; score: number; matchedName: string } {
  const missingNorm = normalize(missingName);
  const apiFullName = normalize(`${apiFirstName || ''} ${apiLastName || ''}`);

  // Exact match
  if (missingNorm === apiFullName) {
    return { match: true, score: 100, matchedName: apiFullName };
  }

  const missingParts = getNameParts(missingName);
  const apiParts = getNameParts(`${apiFirstName || ''} ${apiLastName || ''}`);

  // Check if all parts of missing name exist in API name (or vice versa)
  const allMissingInApi = missingParts.every(mp =>
    apiParts.some(ap => ap === mp || ap.startsWith(mp) || mp.startsWith(ap))
  );
  const allApiInMissing = apiParts.every(ap =>
    missingParts.some(mp => mp === ap || mp.startsWith(ap) || ap.startsWith(mp))
  );

  if (allMissingInApi && allApiInMissing) {
    return { match: true, score: 90, matchedName: apiFullName };
  }

  // Check first name match (strong indicator)
  if (missingParts.length > 0 && apiParts.length > 0) {
    const firstMatch = missingParts[0] === apiParts[0] ||
                       missingParts[0].startsWith(apiParts[0]) ||
                       apiParts[0].startsWith(missingParts[0]);

    if (firstMatch) {
      // Check if at least one more part matches
      const otherMatches = missingParts.slice(1).filter(mp =>
        apiParts.slice(1).some(ap => ap === mp || ap.startsWith(mp) || mp.startsWith(ap))
      ).length;

      if (otherMatches > 0 || missingParts.length === 1 || apiParts.length === 1) {
        return { match: true, score: 75 + otherMatches * 5, matchedName: apiFullName };
      }
    }
  }

  // Check if first name of missing appears anywhere in API full name
  if (missingParts.length > 0 && apiFullName.includes(missingParts[0]) && missingParts[0].length >= 4) {
    return { match: true, score: 60, matchedName: apiFullName };
  }

  return { match: false, score: 0, matchedName: apiFullName };
}

// ─── Fetch dental students from JKKN API ─────────────────────────────────────

async function fetchDentalStudents(): Promise<APIStudent[]> {
  console.log('Fetching dental students from JKKN API...');

  let allStudents: APIStudent[] = [];
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

  // Filter to dental institution only
  const dental = allStudents.filter(s =>
    s.institution_id === DENTAL_INSTITUTION_ID
  );

  console.log(`\nTotal fetched: ${allStudents.length}, Dental: ${dental.length}\n`);
  return dental;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error('NEXT_PUBLIC_MYJKKN_API_KEY not set');
    process.exit(1);
  }

  // Step 1: Parse missing students from docx text
  console.log('='.repeat(80));
  console.log('COMPARING MISSING STUDENTS LIST vs JKKN API');
  console.log('='.repeat(80));

  const missingList = parseMissingStudents();
  console.log(`\nParsed ${missingList.length} missing students from docx:\n`);

  // Print categories
  const categories: Record<string, number> = {};
  missingList.forEach(s => {
    categories[s.category] = (categories[s.category] || 0) + 1;
  });
  Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });

  // Step 2: Fetch dental students from JKKN API
  const apiStudents = await fetchDentalStudents();

  // Step 3: Compare each missing student against API
  console.log('\nComparing...\n');

  const results: {
    name: string;
    category: string;
    yearOfStudy: string;
    mentorName: string;
    status: 'FOUND IN API' | 'STILL MISSING';
    matchedApiName: string;
    matchScore: number;
    apiStudentId: string;
    apiEmail: string;
    apiRollNumber: string;
    apiLifecycleStatus: string;
  }[] = [];

  for (const missing of missingList) {
    let bestMatch = { match: false, score: 0, matchedName: '', student: null as APIStudent | null };

    for (const apiStudent of apiStudents) {
      const result = fuzzyMatch(
        missing.name,
        apiStudent.first_name || '',
        apiStudent.last_name || ''
      );

      if (result.match && result.score > bestMatch.score) {
        bestMatch = { ...result, student: apiStudent };
      }
    }

    results.push({
      name: missing.name,
      category: missing.category,
      yearOfStudy: missing.yearOfStudy,
      mentorName: missing.mentorName,
      status: bestMatch.match ? 'FOUND IN API' : 'STILL MISSING',
      matchedApiName: bestMatch.matchedName || '',
      matchScore: bestMatch.score,
      apiStudentId: bestMatch.student?.id || '',
      apiEmail: bestMatch.student?.college_email || bestMatch.student?.student_email || bestMatch.student?.email || '',
      apiRollNumber: bestMatch.student?.roll_number || bestMatch.student?.register_number || '',
      apiLifecycleStatus: bestMatch.student?.lifecycle_status || '',
    });
  }

  // Step 4: Generate Excel report
  const found = results.filter(r => r.status === 'FOUND IN API');
  const stillMissing = results.filter(r => r.status === 'STILL MISSING');

  console.log(`Results:`);
  console.log(`  Found in API: ${found.length}`);
  console.log(`  Still Missing: ${stillMissing.length}`);
  console.log();

  const wb = XLSX.utils.book_new();

  // Sheet 1: Still Missing
  const missingRows = stillMissing.map((r, i) => ({
    'S.No': i + 1,
    'Student Name': r.name,
    'Category': r.category,
    'Year of Study': r.yearOfStudy,
    'Mentor Name': r.mentorName,
    'Status': 'NOT FOUND IN JKKN API',
  }));

  const wsMissing = XLSX.utils.json_to_sheet(missingRows);
  wsMissing['!cols'] = [
    { wch: 6 }, { wch: 30 }, { wch: 25 }, { wch: 30 }, { wch: 30 }, { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, wsMissing, 'Still Missing');

  // Sheet 2: Found in API
  const foundRows = found.map((r, i) => ({
    'S.No': i + 1,
    'Student Name (Docx)': r.name,
    'Matched API Name': r.matchedApiName,
    'Match Score': r.matchScore,
    'Category': r.category,
    'Year of Study': r.yearOfStudy,
    'Mentor Name': r.mentorName,
    'API Student ID': r.apiStudentId,
    'API Email': r.apiEmail,
    'API Roll Number': r.apiRollNumber,
    'API Lifecycle Status': r.apiLifecycleStatus,
  }));

  const wsFound = XLSX.utils.json_to_sheet(foundRows);
  wsFound['!cols'] = [
    { wch: 6 }, { wch: 30 }, { wch: 30 }, { wch: 12 }, { wch: 25 },
    { wch: 30 }, { wch: 30 }, { wch: 38 }, { wch: 30 }, { wch: 15 }, { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, wsFound, 'Found in API');

  // Sheet 3: Full Comparison
  const fullRows = results.map((r, i) => ({
    'S.No': i + 1,
    'Student Name': r.name,
    'Status': r.status,
    'Category': r.category,
    'Year of Study': r.yearOfStudy,
    'Mentor Name': r.mentorName,
    'Matched API Name': r.matchedApiName,
    'Match Score': r.matchScore,
    'API Student ID': r.apiStudentId,
  }));

  const wsFull = XLSX.utils.json_to_sheet(fullRows);
  wsFull['!cols'] = [
    { wch: 6 }, { wch: 30 }, { wch: 18 }, { wch: 25 }, { wch: 30 },
    { wch: 30 }, { wch: 30 }, { wch: 12 }, { wch: 38 },
  ];
  XLSX.utils.book_append_sheet(wb, wsFull, 'Full Comparison');

  // Sheet 4: Summary by Category
  const catSummary: Record<string, { total: number; found: number; missing: number }> = {};
  results.forEach(r => {
    if (!catSummary[r.category]) catSummary[r.category] = { total: 0, found: 0, missing: 0 };
    catSummary[r.category].total++;
    if (r.status === 'FOUND IN API') catSummary[r.category].found++;
    else catSummary[r.category].missing++;
  });

  const summaryRows = Object.entries(catSummary).map(([cat, counts]) => ({
    'Category': cat,
    'Total Reported Missing': counts.total,
    'Found in API': counts.found,
    'Still Missing': counts.missing,
    'Found %': Math.round((counts.found / counts.total) * 100) + '%',
  }));

  // Grand total
  summaryRows.push({
    'Category': 'GRAND TOTAL',
    'Total Reported Missing': results.length,
    'Found in API': found.length,
    'Still Missing': stillMissing.length,
    'Found %': Math.round((found.length / results.length) * 100) + '%',
  });

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Write file
  const outputPath = 'JKKN_Missing_Students_Comparison.xlsx';
  XLSX.writeFile(wb, outputPath);

  console.log(`\nExcel file created: ${outputPath}`);
  console.log(`\nSheets:`);
  console.log(`  1. Still Missing: ${stillMissing.length} students`);
  console.log(`  2. Found in API: ${found.length} students`);
  console.log(`  3. Full Comparison: ${results.length} students`);
  console.log(`  4. Summary by Category`);

  // Print still missing names for quick review
  if (stillMissing.length > 0) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log('STILL MISSING FROM JKKN API:');
    console.log('─'.repeat(80));
    stillMissing.forEach(r => {
      console.log(`  ${r.name} (${r.category})`);
    });
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
