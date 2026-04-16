/**
 * JKKN First-Cycle Completion Report
 * Filters:
 *   1. MyJKKN API: is_active=true + category_name='Teaching' + role_key='faculty'
 *   2. Supabase: is_active=true
 *   3. Email: @jkkn.ac.in only
 * Session Rate = completed / (completed + scheduled + cancelled)
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://qcugpxmulslqrqrjycti.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdWdweG11bHNscXJxcmp5Y3RpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE5ODI1NCwiZXhwIjoyMDc2Nzc0MjU0fQ.---cpTNrBLxTe4FRPYB4upD0v5vPYDB5k5JU9r7ogxE';
const MYJKKN_KEY = 'jk_b4242a452ea00ad16c71fac8a654d4cc_mlc8ce3z';
const MYJKKN_BASE = 'https://www.jkkn.ai/api';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// All known JKKN institutions (prefix → name)
const INST_NAMES = {
  'e8fbe8aa': 'JKKN Dental College and Hospital',
  '70e54e51': 'JKKN College of Nursing and Research',
  '5736d86f': 'JKKN College of Pharmacy',
  '5de4fba1': 'JKKN College of Engineering and Technology',
  'b0b8a724': 'JKKN College of Arts and Science (Self)',
  'a33138b6': 'JKKN College of Arts and Science (Aided)',
  '9c1554e8': 'JKKN College of Allied Health Sciences',
};

// Display order for summary
const INST_ORDER = [
  'e8fbe8aa', // Dental
  '70e54e51', // Nursing
  '5736d86f', // Pharmacy
  '5de4fba1', // Engineering
  'b0b8a724', // Arts (Self)
  'a33138b6', // Arts (Aided)
  '9c1554e8', // Allied Health
];

// Institutions to exclude entirely (testing, main office, etc.)
const EXCLUDED_INST = new Set(['183847c5', 'b962527f']);

function instPrefix(id) {
  return id ? id.replace(/-/g, '').slice(0, 8).toLowerCase() : '';
}
function instName(id) {
  return INST_NAMES[instPrefix(id)] || id || 'Unknown';
}
function instOrder(id) {
  const idx = INST_ORDER.indexOf(instPrefix(id));
  return idx === -1 ? 99 : idx;
}
function isExcluded(id) {
  return EXCLUDED_INST.has(instPrefix(id));
}

// ── Supabase paginator ────────────────────────────────────────────────────────
async function fetchAll(table, sel, filters = []) {
  const PAGE = 1000;
  let from = 0;
  let all = [];
  while (true) {
    let q = supabase.from(table).select(sel).range(from, from + PAGE - 1);
    for (const [m, ...a] of filters) q = q[m](...a);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || !data.length) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// ── MyJKKN: fetch active Teaching faculty emails ─────────────────────────────
// Only includes: is_active=true + category_name='Teaching' + role_key='faculty'
// This excludes: Admission Team, Principals (in non-teaching category), test accounts
async function fetchMyJkknTeachingActiveEmails() {
  const activeEmails = new Set();
  let page = 1;
  const limit = 200;
  let totalFetched = 0;
  let totalTeachingActive = 0;

  while (true) {
    const url = `${MYJKKN_BASE}/api-management/staff?page=${page}&limit=${limit}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${MYJKKN_KEY}` } });
    if (!res.ok) { console.warn(`  MyJKKN page ${page} => ${res.status}`); break; }
    const json = await res.json();
    const records = json.data || [];
    if (!records.length) break;

    totalFetched += records.length;
    for (const s of records) {
      if (s.is_active !== true) continue;
      // Must be Teaching category (excludes Admission Team, etc.)
      const catName = s.category?.category_name || '';
      if (catName !== 'Teaching') continue;
      // Must be faculty role (excludes admission_staff)
      if (s.role_key !== 'faculty') continue;

      totalTeachingActive++;
      const email = (s.institution_email || s.email || '').toLowerCase().trim();
      if (email) activeEmails.add(email);
    }

    console.log(`  MyJKKN page ${page}: ${records.length} staff fetched | ${activeEmails.size} teaching+active emails so far`);
    if (records.length < limit) break;
    page++;
  }
  console.log(`  MyJKKN total: ${totalFetched} staff, ${totalTeachingActive} teaching+active, ${activeEmails.size} with emails`);
  return activeEmails;
}

// ── CSV helpers ───────────────────────────────────────────────────────────────
function esc(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Get Teaching+Active emails from MyJKKN
  console.log('Fetching active TEACHING faculty from MyJKKN API...');
  const activeEmails = await fetchMyJkknTeachingActiveEmails();

  // 2. Supabase mentors (is_active=true)
  console.log('\nFetching mentors from Supabase...');
  const mentors = await fetchAll('mentors', 'id,user_id,institution_id,is_active', [
    ['eq', 'is_active', true],
  ]);
  console.log(`  Supabase active mentors: ${mentors.length}`);

  // 3. Users
  console.log('Fetching users...');
  const allUsers = await fetchAll('users', 'id,full_name,email');
  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u]));

  // 4. Build mentor records with all three filters applied
  const mentorsByKey = new Map();
  const skipReasons = { noUser: 0, notJkkn: 0, notInMyJkkn: 0, excludedInst: 0 };

  for (const m of mentors) {
    // Skip excluded institutions (testing, main office)
    if (isExcluded(m.institution_id)) { skipReasons.excludedInst++; continue; }

    const u = userMap[m.user_id];
    if (!u || !u.email) { skipReasons.noUser++; continue; }
    const email = u.email.toLowerCase().trim();

    if (!email.endsWith('@jkkn.ac.in')) { skipReasons.notJkkn++; continue; }
    if (!activeEmails.has(email)) { skipReasons.notInMyJkkn++; continue; }

    const key = `${m.user_id}|${m.institution_id}`;
    if (!mentorsByKey.has(key)) {
      mentorsByKey.set(key, {
        userId: m.user_id,
        institutionId: m.institution_id,
        name: u.full_name || u.email,
        email: u.email,
        mentorIds: [],
      });
    }
    mentorsByKey.get(key).mentorIds.push(m.id);
  }

  const mentorRecords = Array.from(mentorsByKey.values());
  console.log(`\n  Final: ${mentorRecords.length} mentors`);
  console.log(`  Skipped: ${JSON.stringify(skipReasons)}`);

  // Show per-institution breakdown
  const instDebug = {};
  for (const r of mentorRecords) {
    const p = instPrefix(r.institutionId);
    instDebug[p] = (instDebug[p] || 0) + 1;
  }
  console.log('\n  Count by institution:');
  for (const p of [...INST_ORDER, 'other']) {
    if (p === 'other') {
      for (const [k, v] of Object.entries(instDebug)) {
        if (!INST_ORDER.includes(k)) console.log(`    ${k} (unmapped): ${v}`);
      }
    } else {
      const n = instDebug[p] || 0;
      if (n > 0) console.log(`    ${(INST_NAMES[p] || p).slice(0, 50)}: ${n}`);
    }
  }

  // 5. Assignments
  console.log('\nFetching mentor_students assignments...');
  const assignments = await fetchAll('mentor_students', 'mentor_id,student_id');
  console.log(`  Total assignments: ${assignments.length}`);
  const assignMap = new Map();
  for (const a of assignments) {
    if (!assignMap.has(a.mentor_id)) assignMap.set(a.mentor_id, new Set());
    assignMap.get(a.mentor_id).add(a.student_id);
  }

  // 6. Sessions
  console.log('Fetching counseling_sessions...');
  const sessions = await fetchAll('counseling_sessions', 'mentor_id,student_id,status');
  console.log(`  Total sessions: ${sessions.length}`);
  const sessionMap = new Map();
  for (const s of sessions) {
    if (!sessionMap.has(s.mentor_id)) {
      sessionMap.set(s.mentor_id, { byStudent: new Map(), scheduled: 0, cancelled: 0, completed: 0 });
    }
    const entry = sessionMap.get(s.mentor_id);
    if (s.status === 'completed') {
      entry.completed++;
      entry.byStudent.set(s.student_id, (entry.byStudent.get(s.student_id) || 0) + 1);
    } else if (s.status === 'scheduled') {
      entry.scheduled++;
    } else if (s.status === 'cancelled') {
      entry.cancelled++;
    }
  }

  // 7. Aggregate
  const rows = [];
  for (const rec of mentorRecords) {
    const assignedSet = new Set();
    const metSet = new Set();
    let totalCompleted = 0, totalScheduled = 0, totalCancelled = 0;

    for (const mid of rec.mentorIds) {
      const asgn = assignMap.get(mid);
      if (asgn) for (const sid of asgn) assignedSet.add(sid);
      const sess = sessionMap.get(mid);
      if (sess) {
        totalCompleted += sess.completed;
        totalScheduled += sess.scheduled;
        totalCancelled += sess.cancelled;
        for (const [sid] of sess.byStudent) metSet.add(sid);
      }
    }

    const assigned = assignedSet.size;
    const met = metSet.size;
    const remaining = Math.max(0, assigned - met);

    let status;
    if (assigned === 0) status = 'No Assignment';
    else if (met === 0 && totalCompleted === 0) status = 'Not Started';
    else if (met >= assigned) status = 'First Cycle Complete';
    else status = 'Partial';

    const totalSessions = totalCompleted + totalScheduled + totalCancelled;
    const sessionRate = totalSessions === 0 ? '0.00%' : ((totalCompleted / totalSessions) * 100).toFixed(2) + '%';

    rows.push({
      institutionId: rec.institutionId,
      institutionName: instName(rec.institutionId),
      name: rec.name,
      email: rec.email,
      status, assigned, met, remaining,
      completed: totalCompleted, scheduled: totalScheduled, cancelled: totalCancelled,
      sessionRate,
    });
  }

  // 8. Sort
  const statusRank = { 'First Cycle Complete': 0, Partial: 1, 'Not Started': 2, 'No Assignment': 3 };
  rows.sort((a, b) => {
    const io = instOrder(a.institutionId) - instOrder(b.institutionId);
    if (io !== 0) return io;
    const so = (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
    if (so !== 0) return so;
    return a.name.localeCompare(b.name);
  });

  // 9. Summary
  const instSummary = {};
  for (const r of rows) {
    const p = instPrefix(r.institutionId);
    if (!instSummary[p]) instSummary[p] = { name: r.institutionName, total: 0, complete: 0, partial: 0, notStarted: 0, noAssign: 0 };
    instSummary[p].total++;
    if (r.status === 'First Cycle Complete') instSummary[p].complete++;
    else if (r.status === 'Partial') instSummary[p].partial++;
    else if (r.status === 'Not Started') instSummary[p].notStarted++;
    else instSummary[p].noAssign++;
  }

  // 10. Build CSV
  const lines = [];
  lines.push('SUMMARY - Active Teaching Faculty (MyJKKN: is_active+Teaching+faculty role) | Session Rate = completed / all sessions,,,,,,,,,,');
  lines.push('College,Total Mentors,First Cycle Complete,Partial,Not Started,No Assignment,,,,,');

  const grand = { total: 0, complete: 0, partial: 0, notStarted: 0, noAssign: 0 };
  for (const p of INST_ORDER) {
    const s = instSummary[p];
    if (!s) continue;
    lines.push(`${esc(s.name)},${s.total},${s.complete},${s.partial},${s.notStarted},${s.noAssign},,,,,`);
    grand.total += s.total; grand.complete += s.complete; grand.partial += s.partial;
    grand.notStarted += s.notStarted; grand.noAssign += s.noAssign;
  }
  lines.push(`TOTAL,${grand.total},${grand.complete},${grand.partial},${grand.notStarted},${grand.noAssign},,,,,`);

  // Detail rows — one section per institution, no duplicates
  const seenInst = new Set();
  let currentPrefix = null;
  for (const r of rows) {
    const p = instPrefix(r.institutionId);
    if (p !== currentPrefix) {
      // Only show named institutions in detail
      if (!INST_NAMES[p]) continue; // skip unmapped
      lines.push('');
      lines.push('');
      lines.push(r.institutionName.toUpperCase() + ',,,,,,,,,,,');
      lines.push('Mentor Name,Email,Status,Assigned Mentees,Mentees Met,Mentees Remaining,Sessions Completed,Sessions Scheduled,Sessions Cancelled,Session Rate,');
      currentPrefix = p;
    }
    lines.push(
      [r.name, r.email, r.status, r.assigned, r.met, r.remaining, r.completed, r.scheduled, r.cancelled, r.sessionRate, '']
        .map(esc).join(',')
    );
  }

  const csvContent = lines.join('\r\n');
  const outPath = path.join('C:/Users/Admin/Desktop', `jkkn-report-${new Date().toISOString().slice(0, 10)}.csv`);
  fs.writeFileSync(outPath, '\uFEFF' + csvContent, 'utf8');
  console.log(`\nSaved: ${outPath}`);
  console.log(`Total mentors in report: ${rows.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
