import 'dotenv/config';

const API_KEY = process.env.NEXT_PUBLIC_MYJKKN_API_KEY!;
const BASE = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';
const DENTAL = 'e8fbe8aa-c44e-41aa-a44b-39dab2c8b9a5';

async function search(query: string) {
  const url = `${BASE}/api-management/learners/profiles?page=1&limit=200&lifecycle_status=active,alumni,exited,graduated,inactive&search=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` } });
  if (!res.ok) { console.log('API error:', res.status); return []; }
  const data = await res.json();
  return data.data || [];
}

async function main() {
  console.log('=== Search: KAVYA ===');
  const r1 = await search('KAVYA');
  console.log('Results:', r1.length);
  r1.forEach((s: any) => {
    const isDental = s.institution_id === DENTAL ? '[DENTAL]' : '[OTHER]';
    console.log(`  ${isDental} ${s.first_name || ''} ${s.last_name || ''} | Roll: ${s.roll_number || 'N/A'} | Status: ${s.lifecycle_status} | Dept: ${s.department_id}`);
  });

  console.log('\n=== Search: KAVYA SRI ===');
  const r2 = await search('KAVYA SRI');
  console.log('Results:', r2.length);
  r2.forEach((s: any) => {
    console.log(`  ${s.first_name || ''} ${s.last_name || ''} | Inst: ${s.institution_id}`);
  });

  console.log('\n=== Search: KAVYASRI ===');
  const r3 = await search('KAVYASRI');
  console.log('Results:', r3.length);
  r3.forEach((s: any) => {
    console.log(`  ${s.first_name || ''} ${s.last_name || ''} | Inst: ${s.institution_id}`);
  });

  // Scan ALL dental students for any name containing KAVYA or SRI
  console.log('\n=== Scanning ALL 519 dental students for KAVYA or SRI ===');
  let allDental: any[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore && page <= 50) {
    const url = `${BASE}/api-management/learners/profiles?page=${page}&limit=200&lifecycle_status=active,alumni,exited,graduated,inactive`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` } });
    if (!res.ok) break;
    const data = await res.json();
    const students = data.data || [];
    const dental = students.filter((s: any) => s.institution_id === DENTAL);
    allDental = [...allDental, ...dental];
    hasMore = students.length === 200;
    if (data.pagination?.totalPages && page >= data.pagination.totalPages) hasMore = false;
    page++;
  }

  const kavyaMatches = allDental.filter((s: any) => {
    const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toUpperCase();
    return fullName.includes('KAVYA');
  });

  console.log(`Total dental students scanned: ${allDental.length}`);
  console.log(`Dental students with 'KAVYA' in name: ${kavyaMatches.length}`);
  kavyaMatches.forEach((s: any) => {
    console.log(`  Name: ${s.first_name || ''} ${s.last_name || ''}`);
    console.log(`    Roll: ${s.roll_number || 'N/A'} | Email: ${s.college_email || s.student_email || 'N/A'}`);
    console.log(`    Dept: ${s.department_id} | Status: ${s.lifecycle_status}`);
    console.log(`    ID: ${s.id}`);
    console.log();
  });

  // Also search for students with last name starting with J in dental
  const jLastName = allDental.filter((s: any) => {
    const fn = (s.first_name || '').toUpperCase();
    const ln = (s.last_name || '').toUpperCase();
    return fn.includes('KAVYA') || (fn.includes('SRI') && ln.startsWith('J'));
  });

  console.log(`\nDental students with KAVYA in first name, or SRI+J last name: ${jLastName.length}`);
  jLastName.forEach((s: any) => {
    console.log(`  ${s.first_name || ''} ${s.last_name || ''} | Roll: ${s.roll_number || 'N/A'}`);
  });
}

main().catch(console.error);
