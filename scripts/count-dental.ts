import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.NEXT_PUBLIC_MYJKKN_API_KEY!;
const BASE = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';
const DENTAL = 'e8fbe8aa-c44e-41aa-a44b-39dab2c8b9a5';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // Check 1: JKKN API with NO filters (what dashboard super admin uses)
  console.log('=== JKKN API: No filters (just page=1&limit=1) ===');
  const r1 = await fetch(`${BASE}/api-management/learners/profiles?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${API_KEY}` }
  });
  const d1 = await r1.json();
  console.log('  Total from pagination:', d1.pagination?.total || d1.metadata?.total || d1.count || 'N/A');
  console.log('  Pagination:', JSON.stringify(d1.pagination || d1.metadata || {}));

  // Check 2: JKKN API with lifecycle filter
  console.log('\n=== JKKN API: With lifecycle filter ===');
  const r2 = await fetch(`${BASE}/api-management/learners/profiles?page=1&limit=1&lifecycle_status=active,alumni,exited,graduated,inactive`, {
    headers: { Authorization: `Bearer ${API_KEY}` }
  });
  const d2 = await r2.json();
  console.log('  Total from pagination:', d2.pagination?.total || d2.metadata?.total || d2.count || 'N/A');

  // Check 3: JKKN API with institution_id filter
  console.log('\n=== JKKN API: Dental institution filter ===');
  const r3 = await fetch(`${BASE}/api-management/learners/profiles?page=1&limit=1&institution_id=${DENTAL}`, {
    headers: { Authorization: `Bearer ${API_KEY}` }
  });
  const d3 = await r3.json();
  console.log('  Total from pagination:', d3.pagination?.total || d3.metadata?.total || d3.count || 'N/A');
  console.log('  Pagination:', JSON.stringify(d3.pagination || d3.metadata || {}));

  // Check 4: JKKN API dental + lifecycle
  console.log('\n=== JKKN API: Dental + lifecycle filter ===');
  const r4 = await fetch(`${BASE}/api-management/learners/profiles?page=1&limit=1&institution_id=${DENTAL}&lifecycle_status=active,alumni,exited,graduated,inactive`, {
    headers: { Authorization: `Bearer ${API_KEY}` }
  });
  const d4 = await r4.json();
  console.log('  Total from pagination:', d4.pagination?.total || d4.metadata?.total || d4.count || 'N/A');

  // Check 5: Local Supabase count
  console.log('\n=== Local Supabase: Dental students ===');
  const { count: totalLocal } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('institution_id', DENTAL);
  console.log('  Total dental in Supabase:', totalLocal);

  const { count: activeLocal } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('institution_id', DENTAL)
    .eq('is_active', true);
  console.log('  Active dental in Supabase:', activeLocal);

  // Check 6: Full paginated scan of dental students from API
  console.log('\n=== Full API scan: Dental students (paginated) ===');
  let allDental = 0;
  let page = 1;
  let hasMore = true;
  while (hasMore && page <= 50) {
    const url = `${BASE}/api-management/learners/profiles?page=${page}&limit=200&lifecycle_status=active,alumni,exited,graduated,inactive`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` } });
    if (!res.ok) break;
    const data = await res.json();
    const students = data.data || [];
    const dental = students.filter((s: any) => s.institution_id === DENTAL);
    allDental += dental.length;
    console.log(`  Page ${page}: ${dental.length} dental (of ${students.length} total)`);
    hasMore = students.length === 200;
    if (data.pagination?.totalPages && page >= data.pagination.totalPages) hasMore = false;
    page++;
  }
  console.log(`  TOTAL dental from full scan: ${allDental}`);

  // Check 7: What about students WITHOUT institution_id matching dental?
  // The dashboard uses local Supabase for non-super-admin
  console.log('\n=== Dashboard logic ===');
  console.log('  For non-super-admin (institution_admin/mentor):');
  console.log('  Dashboard reads from LOCAL Supabase students table filtered by institution_id');
  console.log(`  Local Supabase dental count: ${totalLocal} (active: ${activeLocal})`);
  console.log('\n  For super-admin:');
  console.log('  Dashboard reads from JKKN API (no lifecycle filter, just page=1&limit=1)');
  const totalFromApi = d1.pagination?.total || d1.metadata?.total || d1.count || 0;
  console.log(`  JKKN API total: ${totalFromApi}`);
}

main().catch(console.error);
