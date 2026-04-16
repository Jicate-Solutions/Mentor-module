/**
 * Session Completion Analytics Service
 *
 * Produces engagement reports answering: "Which mentor–mentee pairs are actually
 * active vs. just assigned on paper?". Pure read service — no writes.
 *
 * All functions use createAdminClient() and throw on failure (API routes are
 * expected to catch and convert to HTTP responses).
 *
 * Scoping rules (enforced on EVERY query):
 *   - `scopedMentorId` → hard filter on mentor_students.mentor_id AND
 *     counseling_sessions.mentor_id
 *   - `institutionId` / `departmentId` → filter via the mentors table join
 *   - `dateFrom` / `dateTo` → applied to counseling_sessions.date
 */

import { createAdminClient } from '@/lib/supabase/server';
import type {
  AnalyticsFilters,
  InstitutionSummaryRow,
  PairingRow,
  PerMentorRow,
  SessionCompletionSummary,
} from '@/lib/types/session-analytics';

// ── Internal shapes ──────────────────────────────────────────────────────────

interface MentorStudentRow {
  mentor_id: string;
  student_id: string;
  assigned_at: string;
  mentor: {
    id: string;
    department_id: string | null;
    institution_id: string | null;
    user: { full_name: string | null } | null;
  } | null;
  student: {
    id: string;
    name: string | null;
    roll_number: string | null;
  } | null;
}

interface SessionRow {
  mentor_id: string;
  student_id: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | string;
  date: string | null;
  created_at: string | null;
}

// ── Shared fetch helpers ─────────────────────────────────────────────────────

/**
 * Fetches mentor_students rows joined with mentor + user + student info,
 * applying all relevant filters (scope mentor, department, institution).
 */
async function fetchAssignments(filters: AnalyticsFilters): Promise<MentorStudentRow[]> {
  const supabase = createAdminClient();

  // Use `!inner` on the mentors join so department/institution filters actually prune rows.
  let query = supabase
    .from('mentor_students')
    .select(
      `
      mentor_id,
      student_id,
      assigned_at,
      mentor:mentors!inner (
        id,
        department_id,
        institution_id,
        user:users!inner ( full_name )
      ),
      student:students ( id, name, roll_number )
    `
    );

  if (filters.scopedMentorId) {
    query = query.eq('mentor_id', filters.scopedMentorId);
  }
  if (filters.departmentId) {
    query = query.eq('mentor.department_id', filters.departmentId);
  }
  if (filters.institutionId) {
    query = query.eq('mentor.institution_id', filters.institutionId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch mentor_students: ${error.message}`);

  // Supabase's select-embed returns `mentor` / `user` as arrays when the relationship
  // is ambiguous; the runtime shape is object-or-null for !inner joins on FK columns.
  // We coerce to our internal shape defensively.
  return (data || []).map((row: any): MentorStudentRow => {
    const mentorObj = Array.isArray(row.mentor) ? row.mentor[0] : row.mentor;
    const userObj = mentorObj
      ? Array.isArray(mentorObj.user)
        ? mentorObj.user[0]
        : mentorObj.user
      : null;
    const studentObj = Array.isArray(row.student) ? row.student[0] : row.student;

    return {
      mentor_id: row.mentor_id,
      student_id: row.student_id,
      assigned_at: row.assigned_at,
      mentor: mentorObj
        ? {
            id: mentorObj.id,
            department_id: mentorObj.department_id ?? null,
            institution_id: mentorObj.institution_id ?? null,
            user: userObj ? { full_name: userObj.full_name ?? null } : null,
          }
        : null,
      student: studentObj
        ? {
            id: studentObj.id,
            name: studentObj.name ?? null,
            roll_number: studentObj.roll_number ?? null,
          }
        : null,
    };
  });
}

/**
 * Fetches counseling_sessions rows scoped by the same filters used for assignments.
 * For department/institution filters we reuse the mentors join; we do NOT project
 * those columns back — they're only used to prune rows.
 */
async function fetchSessions(filters: AnalyticsFilters): Promise<SessionRow[]> {
  const supabase = createAdminClient();

  const needsMentorJoin = Boolean(filters.departmentId || filters.institutionId);

  const selectClause = needsMentorJoin
    ? `mentor_id, student_id, status, date, created_at, mentor:mentors!inner ( department_id, institution_id )`
    : `mentor_id, student_id, status, date, created_at`;

  let query = supabase.from('counseling_sessions').select(selectClause);

  if (filters.scopedMentorId) {
    query = query.eq('mentor_id', filters.scopedMentorId);
  }
  if (filters.departmentId) {
    query = query.eq('mentor.department_id', filters.departmentId);
  }
  if (filters.institutionId) {
    query = query.eq('mentor.institution_id', filters.institutionId);
  }
  if (filters.dateFrom) {
    query = query.gte('date', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('date', filters.dateTo);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch counseling_sessions: ${error.message}`);

  return (data || []).map((row: any): SessionRow => ({
    mentor_id: row.mentor_id,
    student_id: row.student_id ?? null,
    status: row.status,
    date: row.date ?? null,
    created_at: row.created_at ?? null,
  }));
}

// ── Shared fetch helpers (continued) ────────────────────────────────────────

/**
 * Fetches ALL active mentors for the given scope directly from the `mentors`
 * table (joined with users for the name). Used to surface mentors who have
 * NO student assignments — they never appear in `fetchAssignments` because
 * that query starts from `mentor_students`.
 */
async function fetchAllMentorsInScope(
  filters: AnalyticsFilters
): Promise<Array<{ id: string; name: string | null; departmentId: string | null; institutionId: string | null }>> {
  const supabase = createAdminClient();

  let query = supabase
    .from('mentors')
    .select(
      `
      id,
      department_id,
      institution_id,
      user:users!inner ( full_name )
    `
    )
    .eq('is_active', true);

  if (filters.scopedMentorId) {
    query = query.eq('id', filters.scopedMentorId);
  }
  if (filters.departmentId) {
    query = query.eq('department_id', filters.departmentId);
  }
  if (filters.institutionId) {
    query = query.eq('institution_id', filters.institutionId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch mentors in scope: ${error.message}`);

  return (data || []).map((row: any) => {
    const userObj = Array.isArray(row.user) ? row.user[0] : row.user;
    return {
      id: row.id,
      name: userObj?.full_name ?? null,
      departmentId: row.department_id ?? null,
      institutionId: row.institution_id ?? null,
    };
  });
}

// ── Public: Summary ──────────────────────────────────────────────────────────

/**
 * Returns global KPIs for the Session Completion report: how many mentors have
 * actually started mentoring, how many assigned mentees have had their first
 * session, and overall completion rate.
 */
/**
 * Counts active enrolled students from jkkn_students cache, respecting
 * institution/department filters. Returns 0 when scopedMentorId is set
 * (a single mentor's "enrolled" universe isn't meaningful — caller should hide).
 */
async function fetchEnrolledStudentCount(filters: AnalyticsFilters): Promise<number> {
  if (filters.scopedMentorId) return 0;
  const supabase = createAdminClient();
  let q = supabase
    .from('jkkn_students')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);
  if (filters.institutionId) q = q.eq('institution_id', filters.institutionId);
  if (filters.departmentId) q = q.eq('department_id', filters.departmentId);
  const { count, error } = await q;
  if (error) throw new Error(`Failed to count enrolled students: ${error.message}`);
  return count ?? 0;
}

export async function getSessionCompletionSummary(
  filters: AnalyticsFilters
): Promise<SessionCompletionSummary> {
  // Coverage (who-started, who-was-met) must be all-time so mentors who completed
  // sessions BEFORE the current date filter aren't wrongly shown as "Not Started".
  const hasDates = !!(filters.dateFrom || filters.dateTo);
  const coverageFilters: AnalyticsFilters = hasDates
    ? { ...filters, dateFrom: undefined, dateTo: undefined }
    : filters;

  const [assignments, allSessions, filteredSessions, totalEnrolledStudents, allMentorsInScope] =
    await Promise.all([
      fetchAssignments(filters),
      fetchSessions(coverageFilters),
      hasDates ? fetchSessions(filters) : Promise.resolve<SessionRow[]>([]),
      fetchEnrolledStudentCount(filters),
      // Fetch ALL active mentors in scope so unassigned mentors are counted in totalMentors.
      fetchAllMentorsInScope(filters),
    ]);

  const countSessions = hasDates ? filteredSessions : allSessions;

  // All active mentors in scope (includes those with no student assignments).
  const allMentorIds = new Set<string>(allMentorsInScope.map((m) => m.id));

  // Mentors present in the scoped universe (from assignments).
  const assignedStudentIds = new Set<string>(); // unique students (a student may have >1 mentor)
  for (const a of assignments) {
    assignedStudentIds.add(a.student_id);
  }

  // All-time: who has started, who has been met (cumulative status — unaffected by date filter).
  const mentorsWithCompleted = new Set<string>();
  const studentsWithCompleted = new Set<string>();
  for (const s of allSessions) {
    if (s.status === 'completed') {
      mentorsWithCompleted.add(s.mentor_id);
      if (s.student_id && assignedStudentIds.has(s.student_id)) {
        studentsWithCompleted.add(s.student_id);
      }
    }
  }

  // Date-filtered: session counts for the selected period.
  let totalCompletedSessions = 0;
  let totalScheduledSessions = 0;
  let totalCancelledSessions = 0;

  for (const s of countSessions) {
    if (s.status === 'completed') {
      totalCompletedSessions++;
    } else if (s.status === 'scheduled') {
      totalScheduledSessions++;
    } else if (s.status === 'cancelled') {
      totalCancelledSessions++;
    }
  }

  // Use the full mentor count from the mentors table (not just those with assignments).
  const totalMentors = allMentorIds.size;
  const totalAssignedMentees = assignedStudentIds.size; // unique students, not pairs
  const mentorsWithFirstSession = mentorsWithCompleted.size;
  const menteesWithFirstSession = studentsWithCompleted.size;

  // Completion rate is meaningful only for sessions that REACHED AN OUTCOME.
  // Scheduled sessions are in the future — they haven't failed or succeeded yet,
  // so excluding them lets 100% = "no cancellations" when everything that was
  // supposed to happen did happen.
  const totalResolvedSessions = totalCompletedSessions + totalCancelledSessions;

  const pct = (num: number, denom: number): number =>
    denom === 0 ? 0 : Math.round((num / denom) * 1000) / 10;

  return {
    totalMentors,
    mentorsWithFirstSession,
    mentorsWithZeroSessions: Math.max(0, totalMentors - mentorsWithFirstSession),
    totalAssignedMentees,
    menteesWithFirstSession,
    menteesNotYetMet: Math.max(0, totalAssignedMentees - menteesWithFirstSession),
    totalEnrolledStudents,
    studentsNotAssigned: Math.max(0, totalEnrolledStudents - totalAssignedMentees),
    assignmentCoverageRate: pct(totalAssignedMentees, totalEnrolledStudents),
    totalCompletedSessions,
    totalScheduledSessions,
    totalCancelledSessions,
    completionRate: pct(totalCompletedSessions, totalResolvedSessions),
    mentorFirstSessionRate: pct(mentorsWithFirstSession, totalMentors),
    menteeMetRate: pct(menteesWithFirstSession, totalAssignedMentees),
  };
}

// ── Public: Per-Mentor Breakdown ─────────────────────────────────────────────

/**
 * Returns one row per mentor in the scoped universe with their assignment and
 * session counts. Mentors with zero assigned mentees are still included if they
 * have sessions inside the filter window (edge case: ad-hoc sessions).
 */
export async function getPerMentorBreakdown(
  filters: AnalyticsFilters
): Promise<PerMentorRow[]> {
  const hasDates = !!(filters.dateFrom || filters.dateTo);
  const coverageFilters: AnalyticsFilters = hasDates
    ? { ...filters, dateFrom: undefined, dateTo: undefined }
    : filters;

  const [assignments, allSessions, filteredSessions, allMentorsInScope] = await Promise.all([
    fetchAssignments(filters),
    fetchSessions(coverageFilters),
    hasDates ? fetchSessions(filters) : Promise.resolve<SessionRow[]>([]),
    // Fetch ALL active mentors so those with no assignments still appear in the table.
    fetchAllMentorsInScope(filters),
  ]);

  const countSessions = hasDates ? filteredSessions : allSessions;

  interface Accum {
    mentorId: string;
    mentorName: string | null;
    departmentId: string | null;
    institutionId: string | null;
    assignedMenteeSet: Set<string>;
    uniqueMenteesMetSet: Set<string>;
    completedSessions: number;
    scheduledSessions: number;
    cancelledSessions: number;
    firstSessionDate: string | null;
    lastSessionDate: string | null;
  }

  const byMentor = new Map<string, Accum>();

  const ensure = (
    mentorId: string,
    seed?: { name: string | null; departmentId: string | null; institutionId: string | null }
  ): Accum => {
    let acc = byMentor.get(mentorId);
    if (!acc) {
      acc = {
        mentorId,
        mentorName: seed?.name ?? null,
        departmentId: seed?.departmentId ?? null,
        institutionId: seed?.institutionId ?? null,
        assignedMenteeSet: new Set<string>(),
        uniqueMenteesMetSet: new Set<string>(),
        completedSessions: 0,
        scheduledSessions: 0,
        cancelledSessions: 0,
        firstSessionDate: null,
        lastSessionDate: null,
      };
      byMentor.set(mentorId, acc);
    } else if (seed) {
      // Back-fill metadata if we first saw this mentor via the sessions feed.
      if (!acc.mentorName && seed.name) acc.mentorName = seed.name;
      if (!acc.departmentId && seed.departmentId) acc.departmentId = seed.departmentId;
      if (!acc.institutionId && seed.institutionId) acc.institutionId = seed.institutionId;
    }
    return acc;
  };

  for (const a of assignments) {
    const acc = ensure(a.mentor_id, {
      name: a.mentor?.user?.full_name ?? null,
      departmentId: a.mentor?.department_id ?? null,
      institutionId: a.mentor?.institution_id ?? null,
    });
    acc.assignedMenteeSet.add(a.student_id);
  }

  // All-time: who was met, first/last session dates (cumulative coverage — unaffected by date filter).
  for (const s of allSessions) {
    const acc = ensure(s.mentor_id);
    if (s.status === 'completed') {
      if (s.student_id) acc.uniqueMenteesMetSet.add(s.student_id);
      if (s.date) {
        if (!acc.firstSessionDate || s.date < acc.firstSessionDate) acc.firstSessionDate = s.date;
        if (!acc.lastSessionDate || s.date > acc.lastSessionDate) acc.lastSessionDate = s.date;
      }
    }
  }

  // Date-filtered: session counts for the selected period.
  for (const s of countSessions) {
    const acc = byMentor.get(s.mentor_id);
    if (!acc) continue;
    if (s.status === 'completed') acc.completedSessions++;
    else if (s.status === 'scheduled') acc.scheduledSessions++;
    else if (s.status === 'cancelled') acc.cancelledSessions++;
  }

  // Ensure ALL active mentors in scope appear, even those with zero assignments.
  // Mentors not yet in byMentor (no assignments, no sessions) are added via ensure()
  // and will show as "No Assignment" in the UI.
  for (const m of allMentorsInScope) {
    ensure(m.id, { name: m.name, departmentId: m.departmentId, institutionId: m.institutionId });
  }

  const rows: PerMentorRow[] = [];
  for (const acc of byMentor.values()) {
    rows.push({
      mentorId: acc.mentorId,
      mentorName: acc.mentorName,
      departmentId: acc.departmentId,
      institutionId: acc.institutionId,
      assignedMentees: acc.assignedMenteeSet.size,
      uniqueMenteesMet: acc.uniqueMenteesMetSet.size,
      completedSessions: acc.completedSessions,
      scheduledSessions: acc.scheduledSessions,
      cancelledSessions: acc.cancelledSessions,
      firstSessionCompleted: acc.completedSessions > 0,
      firstSessionDate: acc.firstSessionDate,
      lastSessionDate: acc.lastSessionDate,
    });
  }

  // Stable order: mentors with the most assigned mentees first, then by name.
  rows.sort((a, b) => {
    if (b.assignedMentees !== a.assignedMentees) return b.assignedMentees - a.assignedMentees;
    return (a.mentorName || '').localeCompare(b.mentorName || '');
  });

  // TODO(user-contribution): engagement level thresholds
  // The team hasn't agreed on what counts as "active" yet. Candidates:
  //   (a) >=2 completed sessions in the last 30 days = active, 1 = low, 0 = inactive
  //   (b) >=1 completed session per assigned mentee = active (coverage-based)
  // Until that's decided we return the raw PerMentorRow without an engagementLevel
  // field. Add the enum + classifier here once the threshold is picked.

  return rows;
}

// ── Public: Pairing Coverage ─────────────────────────────────────────────────

/**
 * Returns one row per (mentor, mentee) assignment pair — the left-join of
 * mentor_students with completed counseling_sessions. Rows where
 * `hasCompletedSession = false` surface the "assigned but never met" gap.
 */
export async function getPairingCoverage(
  filters: AnalyticsFilters
): Promise<PairingRow[]> {
  const [assignments, sessions] = await Promise.all([
    fetchAssignments(filters),
    fetchSessions(filters),
  ]);

  interface PairAccum {
    completedCount: number;
    lastSessionDate: string | null;
  }

  const pairStats = new Map<string, PairAccum>();
  const keyOf = (mentorId: string, studentId: string): string => `${mentorId}:${studentId}`;

  for (const s of sessions) {
    if (s.status !== 'completed' || !s.student_id) continue;
    const k = keyOf(s.mentor_id, s.student_id);
    let acc = pairStats.get(k);
    if (!acc) {
      acc = { completedCount: 0, lastSessionDate: null };
      pairStats.set(k, acc);
    }
    acc.completedCount++;
    if (s.date && (!acc.lastSessionDate || s.date > acc.lastSessionDate)) {
      acc.lastSessionDate = s.date;
    }
  }

  const rows: PairingRow[] = assignments.map((a) => {
    const stats = pairStats.get(keyOf(a.mentor_id, a.student_id));
    return {
      mentorId: a.mentor_id,
      menteeId: a.student_id,
      mentorName: a.mentor?.user?.full_name ?? null,
      menteeName: a.student?.name ?? null,
      menteeRollNo: a.student?.roll_number ?? null,
      departmentId: a.mentor?.department_id ?? null,
      assignedAt: a.assigned_at,
      hasCompletedSession: !!stats && stats.completedCount > 0,
      completedCount: stats?.completedCount ?? 0,
      lastSessionDate: stats?.lastSessionDate ?? null,
    };
  });

  // "Assigned but never met" first — highest-priority gap — then by mentor name.
  rows.sort((a, b) => {
    if (a.hasCompletedSession !== b.hasCompletedSession) {
      return a.hasCompletedSession ? 1 : -1;
    }
    return (a.mentorName || '').localeCompare(b.mentorName || '');
  });

  return rows;
}

// ── Public: By-Institution Breakdown (super_admin only) ──────────────────────

/**
 * Aggregates session analytics across ALL institutions.
 * Intended for super_admin cross-college reporting.
 *
 * Strategy:
 *  1. Fetch all assignments (no institution filter) — each row carries institution_id
 *     via the mentors join.
 *  2. Fetch all sessions (no institution filter).
 *  3. Fetch institution names from the jkkn_institutions cache table.
 *  4. Fetch enrolled student counts per institution from jkkn_students.
 *  5. Group everything by institution_id in TypeScript.
 */
export async function getByInstitutionBreakdown(
  filters: Pick<AnalyticsFilters, 'dateFrom' | 'dateTo'>
): Promise<InstitutionSummaryRow[]> {
  const supabase = createAdminClient();

  // Pass date filters only; institution/department intentionally omitted (we want ALL).
  const hasDates = !!(filters.dateFrom || filters.dateTo);
  const broadFilters: AnalyticsFilters = {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };
  // Coverage always all-time — mentors who completed sessions before the filter window
  // should still count as "started" in the Cross-College Report.
  const coverageFilters: AnalyticsFilters = {};

  const [assignments, allSessions, filteredSessions, institutionRows, enrolledRows] = await Promise.all([
    fetchAssignments(broadFilters),
    fetchSessions(coverageFilters),
    hasDates ? fetchSessions(broadFilters) : Promise.resolve<SessionRow[]>([]),
    // institution name lookup
    supabase
      .from('jkkn_institutions')
      .select('id, name')
      .eq('is_active', true)
      .then(({ data }) => (data || []) as { id: string; name: string }[]),
    // enrolled counts per institution
    supabase
      .from('jkkn_students')
      .select('institution_id')
      .eq('is_active', true)
      .then(({ data }) => (data || []) as { institution_id: string }[]),
  ]);

  // Build name map from the live jkkn_institutions cache.
  const nameMap = new Map<string, string>(institutionRows.map((r) => [r.id, r.name]));

  // Fallback: resolve by UUID prefix when the cache table is empty.
  const INST_PREFIX_NAMES: Record<string, string> = {
    e8fbe8aa: 'JKKN Dental College and Hospital',
    '70e54e51': 'JKKN College of Nursing and Research',
    '5736d86f': 'JKKN College of Pharmacy',
    '5de4fba1': 'JKKN College of Engineering and Technology',
    b0b8a724: 'JKKN College of Arts and Science (Self)',
    a33138b6: 'JKKN College of Arts and Science (Aided)',
    '9c1554e8': 'JKKN College of Allied Health Sciences',
  };
  function resolveInstName(id: string): string {
    if (nameMap.has(id)) return nameMap.get(id)!;
    const prefix = id.replace(/-/g, '').slice(0, 8).toLowerCase();
    return INST_PREFIX_NAMES[prefix] ?? id;
  }

  // Build enrolled count map: institution_id → count
  const enrolledByInst = new Map<string, number>();
  for (const r of enrolledRows) {
    if (!r.institution_id) continue;
    enrolledByInst.set(r.institution_id, (enrolledByInst.get(r.institution_id) ?? 0) + 1);
  }

  // Accumulator shape per institution.
  interface InstAccum {
    mentorIds: Set<string>;
    mentorsWithCompleted: Set<string>;
    assignedStudentIds: Set<string>;
    studentsWithCompleted: Set<string>;
    completed: number;
    scheduled: number;
    cancelled: number;
  }

  const byInst = new Map<string, InstAccum>();

  const ensureInst = (id: string): InstAccum => {
    let acc = byInst.get(id);
    if (!acc) {
      acc = {
        mentorIds: new Set(),
        mentorsWithCompleted: new Set(),
        assignedStudentIds: new Set(),
        studentsWithCompleted: new Set(),
        completed: 0,
        scheduled: 0,
        cancelled: 0,
      };
      byInst.set(id, acc);
    }
    return acc;
  };

  // Accumulate assignments (gives us mentor list + assigned student list per inst).
  for (const a of assignments) {
    const instId = a.mentor?.institution_id;
    if (!instId) continue;
    const acc = ensureInst(instId);
    acc.mentorIds.add(a.mentor_id);
    acc.assignedStudentIds.add(a.student_id);
  }

  // Accumulate sessions (gives us completed counts + "who was met" per inst).
  // We need to know which institution a mentor belongs to for the session.
  // Build a mentor→institution map from the assignments we already have.
  const mentorToInst = new Map<string, string>();
  for (const a of assignments) {
    if (a.mentor?.institution_id) mentorToInst.set(a.mentor_id, a.mentor.institution_id);
  }

  const countSessions = hasDates ? filteredSessions : allSessions;

  // All-time: who started, who was met (cumulative status — unaffected by date filter).
  for (const s of allSessions) {
    const instId = mentorToInst.get(s.mentor_id);
    if (!instId) continue;
    const acc = ensureInst(instId);
    if (s.status === 'completed') {
      acc.mentorsWithCompleted.add(s.mentor_id);
      if (s.student_id && acc.assignedStudentIds.has(s.student_id)) {
        acc.studentsWithCompleted.add(s.student_id);
      }
    }
  }

  // Date-filtered: session counts for the selected period.
  for (const s of countSessions) {
    const instId = mentorToInst.get(s.mentor_id);
    if (!instId) continue;
    const acc = ensureInst(instId);
    if (s.status === 'completed') acc.completed++;
    else if (s.status === 'scheduled') acc.scheduled++;
    else if (s.status === 'cancelled') acc.cancelled++;
  }

  const pct = (num: number, denom: number): number =>
    denom === 0 ? 0 : Math.round((num / denom) * 1000) / 10;

  const rows: InstitutionSummaryRow[] = [];
  for (const [instId, acc] of byInst.entries()) {
    const totalSessions = acc.completed + acc.scheduled + acc.cancelled;
    rows.push({
      institutionId: instId,
      institutionName: resolveInstName(instId),
      totalMentors: acc.mentorIds.size,
      mentorsWithFirstSession: acc.mentorsWithCompleted.size,
      totalAssignedMentees: acc.assignedStudentIds.size,
      menteesWithFirstSession: acc.studentsWithCompleted.size,
      totalEnrolledStudents: enrolledByInst.get(instId) ?? 0,
      totalCompletedSessions: acc.completed,
      totalScheduledSessions: acc.scheduled,
      totalCancelledSessions: acc.cancelled,
      mentorStartRate: pct(acc.mentorsWithCompleted.size, acc.mentorIds.size),
      menteeMetRate: pct(acc.studentsWithCompleted.size, acc.assignedStudentIds.size),
      completionRate: pct(acc.completed, totalSessions),
    });
  }

  // Sort by most assigned mentees (largest institutions) first.
  rows.sort((a, b) => b.totalAssignedMentees - a.totalAssignedMentees);

  return rows;
}
