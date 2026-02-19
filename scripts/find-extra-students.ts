import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.NEXT_PUBLIC_MYJKKN_API_KEY!;
const BASE = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';
const DENTAL = 'e8fbe8aa-c44e-41aa-a44b-39dab2c8b9a5';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // Get all dental students from Supabase
  const { data: localStudents, error } = await supabase
    .from('students')
    .select('id, name, roll_number, email, department_id')
    .eq('institution_id', DENTAL);

  if (error) { console.error('Supabase error:', error); return; }
  console.log(`Supabase dental students: ${localStudents?.length}`);

  // Get all dental students from JKKN API
  let apiStudents: any[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore && page <= 50) {
    const url = `${BASE}/api-management/learners/profiles?page=${page}&limit=200&lifecycle_status=active,alumni,exited,graduated,inactive`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` } });
    if (!res.ok) break;
    const data = await res.json();
    const students = data.data || [];
    const dental = students.filter((s: any) => s.institution_id === DENTAL);
    apiStudents = [...apiStudents, ...dental];
    hasMore = students.length === 200;
    if (data.pagination?.totalPages && page >= data.pagination.totalPages) hasMore = false;
    page++;
  }
  console.log(`JKKN API dental students: ${apiStudents.length}`);

  // Find students in Supabase but NOT in API
  const apiIds = new Set(apiStudents.map((s: any) => s.id));
  const extraInSupabase = localStudents?.filter(s => !apiIds.has(s.id)) || [];

  console.log(`\nStudents in Supabase but NOT in JKKN API: ${extraInSupabase.length}`);
  console.log('─'.repeat(80));

  // Show first 20
  extraInSupabase.slice(0, 30).forEach((s, i) => {
    console.log(`${i+1}. ${s.name} | Roll: ${s.roll_number} | Email: ${s.email}`);
  });

  if (extraInSupabase.length > 30) {
    console.log(`  ... and ${extraInSupabase.length - 30} more`);
  }

  // Check if KAVYA SRI is among them
  const kavya = extraInSupabase.filter(s => s.name?.toUpperCase().includes('KAVYA'));
  console.log(`\nKAVYA matches in extra Supabase students: ${kavya.length}`);
  kavya.forEach(s => console.log(`  ${s.name} | Roll: ${s.roll_number} | Email: ${s.email} | ID: ${s.id}`));

  // Find students in API but NOT in Supabase
  const localIds = new Set(localStudents?.map(s => s.id) || []);
  const extraInApi = apiStudents.filter((s: any) => !localIds.has(s.id));
  console.log(`\nStudents in JKKN API but NOT in Supabase: ${extraInApi.length}`);
}

main().catch(console.error);
