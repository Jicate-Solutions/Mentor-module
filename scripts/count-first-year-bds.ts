import 'dotenv/config';

const API_KEY = process.env.NEXT_PUBLIC_MYJKKN_API_KEY!;
const BASE = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';
const DENTAL = 'e8fbe8aa-c44e-41aa-a44b-39dab2c8b9a5';

async function main() {
  let allDental: any[] = [];
  let page = 1;
  let hasMore = true;

  console.log('Fetching all dental students from JKKN API...');
  while (hasMore && page <= 50) {
    const url = `${BASE}/api-management/learners/profiles?lifecycle_status=active,alumni,exited,graduated,inactive&page=${page}&limit=200`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` } });
    if (!res.ok) { console.log('API error:', res.status); break; }
    const data = await res.json();
    const students = data.data || [];
    const dental = students.filter((s: any) => (s.institution_id || s.institution?.id) === DENTAL);
    allDental = [...allDental, ...dental];
    hasMore = students.length === 200;
    if (data.pagination?.totalPages && page >= data.pagination.totalPages) hasMore = false;
    page++;
  }

  console.log(`\nTotal dental students: ${allDental.length}\n`);

  // Show sample fields
  const s = allDental[0];
  if (s) {
    console.log('Sample student fields:');
    console.log('  admission_year:', s.admission_year);
    console.log('  program_id:', s.program_id);
    console.log('  batch_id:', s.batch_id);
    console.log('  semester_id:', s.semester_id);
    console.log('  degree_id:', s.degree_id);
    console.log('  department_id:', s.department_id);
    console.log('  roll_number:', s.roll_number);
    console.log('  name:', s.first_name, s.last_name);
    console.log();
  }

  // Group by admission_year
  const years: Record<string, number> = {};
  allDental.forEach((st: any) => {
    const y = st.admission_year || 'unknown';
    years[y] = (years[y] || 0) + 1;
  });
  console.log('=== By admission_year ===');
  Object.entries(years).sort().forEach(([y, c]) => console.log(`  ${y}: ${c} students`));

  // Group by program_id
  const programs: Record<string, number> = {};
  allDental.forEach((st: any) => {
    const p = st.program_id || 'unknown';
    programs[p] = (programs[p] || 0) + 1;
  });
  console.log('\n=== By program_id ===');
  Object.entries(programs).sort((a, b) => b[1] - a[1]).forEach(([p, c]) => console.log(`  ${p}: ${c}`));

  // Group by degree_id
  const degrees: Record<string, number> = {};
  allDental.forEach((st: any) => {
    const d = st.degree_id || 'unknown';
    degrees[d] = (degrees[d] || 0) + 1;
  });
  console.log('\n=== By degree_id ===');
  Object.entries(degrees).sort((a, b) => b[1] - a[1]).forEach(([d, c]) => console.log(`  ${d}: ${c}`));

  // Group by department_id
  const depts: Record<string, number> = {};
  allDental.forEach((st: any) => {
    const d = st.department_id || 'unknown';
    depts[d] = (depts[d] || 0) + 1;
  });
  console.log('\n=== By department_id ===');
  Object.entries(depts).sort((a, b) => b[1] - a[1]).forEach(([d, c]) => console.log(`  ${d}: ${c}`));

  // Roll number prefix patterns
  console.log('\n=== Roll number patterns ===');
  const rollGroups: Record<string, { count: number; samples: string[] }> = {};
  allDental.forEach((st: any) => {
    const roll = st.roll_number || 'no-roll';
    // Extract prefix like "DB23A", "DB24A", "DB20", etc.
    const match = roll.match(/^([A-Za-z]+\d{2}[A-Za-z]?)/);
    const prefix = match ? match[1] : roll.substring(0, 4) || 'no-roll';
    if (!rollGroups[prefix]) rollGroups[prefix] = { count: 0, samples: [] };
    rollGroups[prefix].count++;
    if (rollGroups[prefix].samples.length < 2) {
      rollGroups[prefix].samples.push(`${st.first_name} ${st.last_name} (${roll})`);
    }
  });
  Object.entries(rollGroups).sort().forEach(([prefix, info]) => {
    console.log(`  "${prefix}" : ${info.count} students — e.g. ${info.samples.join(', ')}`);
  });

  // Try to identify 1st year BDS by most recent admission_year
  const maxYear = Object.keys(years).filter(y => y !== 'unknown').sort().pop();
  if (maxYear) {
    const firstYear = allDental.filter((st: any) => st.admission_year === maxYear);
    console.log(`\n=== Likely 1st Year BDS (admission_year = ${maxYear}) ===`);
    console.log(`Count: ${firstYear.length}`);
    console.log('First 5:');
    firstYear.slice(0, 5).forEach((st: any) => {
      console.log(`  ${st.first_name} ${st.last_name} | Roll: ${st.roll_number || 'N/A'} | Status: ${st.lifecycle_status}`);
    });
  }
}

main().catch(console.error);
