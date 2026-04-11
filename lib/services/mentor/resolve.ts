import { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/server';

export interface ResolvedMentor {
  user: { id: string; email: string; full_name: string | null };
  mentor: { id: string; institution_id: string | null; department_id: string | null };
}

/**
 * Extract institution_id from a JKKN staff record in any of the several shapes
 * the API returns it (nested object, string id, or flat institution_id field).
 */
function extractInstitutionIdFromStaff(staff: any): string {
  if (typeof staff.institution === 'object' && staff.institution !== null) {
    return staff.institution.id || staff.institution.institution_id || '';
  }
  if (typeof staff.institution === 'string') return staff.institution;
  if (staff.institution_id) return staff.institution_id;
  return '';
}

/**
 * Extract department_id from a JKKN staff record (mirrors institution extraction).
 */
function extractDepartmentIdFromStaff(staff: any): string {
  if (typeof staff.department === 'object' && staff.department !== null) {
    return staff.department.id || staff.department.department_id || '';
  }
  if (typeof staff.department === 'string') return staff.department;
  if (staff.department_id) return staff.department_id;
  return '';
}

/**
 * Fetches institution_id and department_id for a user whose local records are
 * missing this data and backfills both `users` and `mentors` tables as a
 * side-effect.
 *
 * Tries multiple sources in order because JKKN's `/api-management/staff/{id}`
 * endpoint is NOT reliable for every institution (notably arts college staff
 * are frequently missing — see scripts/sync-arts-college-students.ts):
 *   Tier 1 — JKKN staff by JKKN user id (fastest, works for most staff)
 *   Tier 2 — JKKN staff list, filter by email (slower but covers arts college)
 *   Tier 3 — local `jkkn_institutions` + `jkkn_departments` cache scan by email
 *            domain heuristic (last-resort; only runs when Tiers 1 & 2 failed)
 *
 * Returns the enriched IDs or null if nothing could be resolved.
 */
export async function fetchAndBackfillInstitutionDepartment(
  userId: string,
  jkknUserId: string | null,
  userEmail?: string | null
): Promise<{ institution_id: string; department_id: string } | null> {
  const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';
  const adminClient = createAdminClient();

  let institution_id = '';
  let department_id = '';
  let source = '';

  // ── Tier 1: JKKN staff by id ────────────────────────────────────────────
  if (apiKey && jkknUserId) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${baseUrl}/api-management/staff/${jkknUserId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        const staff = json.data || json;
        institution_id = extractInstitutionIdFromStaff(staff);
        department_id = extractDepartmentIdFromStaff(staff);
        if (institution_id || department_id) source = 'jkkn_staff_by_id';
      }
    } catch (e) {
      console.warn('[Self-Heal] Tier 1 (staff-by-id) failed:', e instanceof Error ? e.message : e);
    }
  }

  // ── Tier 2: JKKN staff list, filter by email ────────────────────────────
  // Arts college staff aren't returned by the single-staff endpoint but DO
  // appear in the paginated list. We walk up to 10 pages (≈1000 staff) which
  // is enough for JKKN's current directory.
  if (apiKey && userEmail && (!institution_id || !department_id)) {
    try {
      const email = userEmail.toLowerCase();
      const maxPages = 10;
      const perPage = 100;
      for (let page = 1; page <= maxPages; page++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(
          `${baseUrl}/api-management/staff?page=${page}&limit=${perPage}`,
          { headers: { 'Authorization': `Bearer ${apiKey}` }, signal: controller.signal }
        );
        clearTimeout(timeout);
        if (!res.ok) break;

        const json = await res.json();
        const list: any[] = json.data || [];
        if (list.length === 0) break;

        const match = list.find((s: any) => {
          const candidates = [s.email, s.institution_email, s.personal_email]
            .filter(Boolean)
            .map((v: string) => v.toLowerCase());
          return candidates.includes(email);
        });

        if (match) {
          const mInst = extractInstitutionIdFromStaff(match);
          const mDept = extractDepartmentIdFromStaff(match);
          if (mInst && !institution_id) institution_id = mInst;
          if (mDept && !department_id) department_id = mDept;
          if (institution_id || department_id) source = source || 'jkkn_staff_by_email';
          break;
        }

        // If this page was shorter than perPage, we've reached the end.
        if (list.length < perPage) break;
      }
    } catch (e) {
      console.warn('[Self-Heal] Tier 2 (staff-by-email) failed:', e instanceof Error ? e.message : e);
    }
  }

  // ── Tier 3: local jkkn cache scan by email domain ──────────────────────
  // Arts college / pharmacy / etc. staff often share an email domain with
  // an institution that already has students synced into `jkkn_students`.
  // Borrowing the majority institution for that domain is a last-resort hint.
  if (userEmail && !institution_id) {
    try {
      const domain = userEmail.split('@')[1]?.toLowerCase();
      if (domain) {
        // Try matching an institution name/email pattern in the cached list
        const { data: instMatch } = await adminClient
          .from('jkkn_institutions')
          .select('id, name')
          .ilike('name', `%${domain.split('.')[0]}%`)
          .limit(1)
          .maybeSingle();
        if (instMatch?.id) {
          institution_id = instMatch.id;
          source = source || 'jkkn_institutions_cache';
          console.log(`[Self-Heal] Tier 3 matched institution "${instMatch.name}" for domain ${domain}`);
        }
      }
    } catch (e) {
      console.warn('[Self-Heal] Tier 3 (cache scan) failed:', e instanceof Error ? e.message : e);
    }
  }

  if (!institution_id && !department_id) {
    console.warn(
      `[Self-Heal] ALL tiers failed for user=${userId} jkkn=${jkknUserId} email=${userEmail ?? '(none)'}. ` +
      `This is the arts-college / missing-staff scenario — user will need manual institution sync.`
    );
    return null;
  }

  // Backfill users table
  const userUpdates: Record<string, string> = {};
  if (institution_id) userUpdates.institution_id = institution_id;
  if (department_id) userUpdates.department_id = department_id;
  if (Object.keys(userUpdates).length > 0) {
    await adminClient.from('users').update(userUpdates).eq('id', userId);
  }

  // Backfill mentors table (if row exists)
  const mentorUpdates: Record<string, string> = {};
  if (institution_id) mentorUpdates.institution_id = institution_id;
  if (department_id) mentorUpdates.department_id = department_id;
  if (Object.keys(mentorUpdates).length > 0) {
    await adminClient.from('mentors').update(mentorUpdates).eq('user_id', userId);
  }

  console.log(
    `[Self-Heal] Backfilled inst/dept for user ${userId} via ${source}: ` +
    `inst=${institution_id || '(none)'}, dept=${department_id || '(none)'}`
  );
  return { institution_id, department_id };
}

/**
 * Ensures a `mentors` row exists for the given user. If no mentors row is found,
 * auto-creates one using the user's department_id and institution_id.
 * Returns the mentor record (existing or newly created), or null on insert failure.
 */
export async function ensureMentorRecord(
  userId: string,
  supabase: SupabaseClient
): Promise<{ id: string; institution_id: string | null; department_id: string | null } | null> {
  const { data: existingMentor } = await supabase
    .from('mentors')
    .select('id, institution_id, department_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingMentor) {
    // Self-heal: if mentor exists but has empty institution/department, run
    // the multi-tier backfill. This is idempotent — safe to run on every call.
    if (!existingMentor.institution_id || !existingMentor.department_id) {
      const { data: userForBackfill } = await supabase
        .from('users')
        .select('jkkn_user_id, email')
        .eq('id', userId)
        .maybeSingle();
      const enriched = await fetchAndBackfillInstitutionDepartment(
        userId,
        userForBackfill?.jkkn_user_id ?? null,
        userForBackfill?.email ?? null
      );
      if (enriched) {
        return {
          id: existingMentor.id,
          institution_id: enriched.institution_id || existingMentor.institution_id,
          department_id: enriched.department_id || existingMentor.department_id,
        };
      }
    }
    return existingMentor;
  }

  // No mentors row — fetch user's department/institution for the insert
  const { data: userRecord } = await supabase
    .from('users')
    .select('department_id, institution_id, designation, jkkn_user_id, email')
    .eq('id', userId)
    .single();

  if (!userRecord) {
    console.error(`[ensureMentorRecord] User ${userId} not found — cannot auto-create mentor row`);
    return null;
  }

  // mentors.department_id and institution_id are NOT NULL text columns
  let departmentId = userRecord.department_id || '';
  let institutionId = userRecord.institution_id || '';

  // Self-heal via multi-tier backfill when either is missing
  if (!departmentId || !institutionId) {
    const enriched = await fetchAndBackfillInstitutionDepartment(
      userId,
      userRecord.jkkn_user_id ?? null,
      userRecord.email ?? null
    );
    if (enriched) {
      departmentId = enriched.department_id || departmentId;
      institutionId = enriched.institution_id || institutionId;
    }
  }

  console.log(
    `[Self-Heal] Auto-creating mentors row for user ${userId} ` +
    `(dept=${departmentId || '(empty)'}, inst=${institutionId || '(empty)'})`
  );

  const adminClient = createAdminClient();
  const { data: newMentor, error: insertError } = await adminClient
    .from('mentors')
    .insert({
      user_id: userId,
      department_id: departmentId,
      institution_id: institutionId,
      designation: userRecord.designation || null,
      is_active: true,
    })
    .select('id, institution_id, department_id')
    .single();

  if (insertError) {
    // Handle race condition: concurrent request may have created the row
    if (insertError.code === '23505') {
      console.log(`[Self-Heal] Concurrent insert detected for user ${userId}, re-fetching...`);
      const { data: raceMentor } = await supabase
        .from('mentors')
        .select('id, institution_id, department_id')
        .eq('user_id', userId)
        .maybeSingle();
      return raceMentor;
    }
    console.error(`[Self-Heal] Failed to auto-create mentor row for user ${userId}:`, insertError);
    return null;
  }

  console.log(`[Self-Heal] Successfully created mentors row ${newMentor.id} for user ${userId}`);
  return newMentor;
}

/**
 * Resolves a JKKN staff ID to a Supabase user + mentor record.
 * Returns null if the user or mentor record does not exist locally.
 * Used as a shared helper by all mentor service methods.
 *
 * Resolution strategy:
 * 1. Query `users` WHERE jkkn_user_id = jkknUserId
 * 2. If not found, call JKKN staff API, extract email, query users WHERE email = staff.email
 *    and back-fill jkkn_user_id on that row
 * 3. Query `mentors` WHERE user_id = user.id
 */
export async function resolveMentorByJkknId(
  jkknUserId: string,
  supabase: SupabaseClient
): Promise<ResolvedMentor | null> {
  const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

  // Step 1: Look up user by jkkn_user_id
  let { data: user } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('jkkn_user_id', jkknUserId)
    .maybeSingle();

  // Step 1b: Fallback — try jkknUserId as a Supabase users.id directly.
  // getMentorList Tier 4/4b uses userAccess.userId (Supabase UUID) as mentor.id,
  // so the URL param may be a Supabase users.id rather than a JKKN staff UUID.
  if (!user) {
    const { data: userById } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', jkknUserId)
      .maybeSingle();
    if (userById) {
      console.log(`[resolveMentorByJkknId] Found by users.id fallback for: ${jkknUserId}`);
      user = userById;
    }
  }

  // Step 1c: Fallback — resolve via mentors.id → users.
  // getMentorById fallback 2 can match on mentors.id directly; mirror that here
  // so the authorization check can succeed when the URL contains a mentors.id UUID.
  if (!user) {
    const { data: mentorRow } = await supabase
      .from('mentors')
      .select('users!inner(id, email, full_name)')
      .eq('id', jkknUserId)
      .maybeSingle();
    const mentorUser = (mentorRow?.users as unknown) as { id: string; email: string; full_name: string | null } | null;
    if (mentorUser) {
      console.log(`[resolveMentorByJkknId] Found by mentors.id fallback for: ${jkknUserId}`);
      user = mentorUser;
    }
  }

  // Step 2: If not found, try JKKN API + email fallback
  if (!user && apiKey) {
    console.log(`[resolveMentorByJkknId] No user found by jkkn_user_id=${jkknUserId}, trying JKKN API + email lookup...`);
    try {
      const staffCtrl = new AbortController();
      const staffTimeout = setTimeout(() => staffCtrl.abort(), 5000);
      const staffResponse = await fetch(`${baseUrl}/api-management/staff/${jkknUserId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        signal: staffCtrl.signal,
      });
      clearTimeout(staffTimeout);

      if (staffResponse.ok) {
        const staffData = await staffResponse.json();
        const email: string | undefined = staffData.data?.email;

        if (email) {
          const { data: userByEmail } = await supabase
            .from('users')
            .select('id, email, full_name')
            .ilike('email', email.toLowerCase())
            .maybeSingle();

          if (userByEmail) {
            console.log(`[resolveMentorByJkknId] Found user by email ${email}, updating jkkn_user_id`);
            await supabase
              .from('users')
              .update({ jkkn_user_id: jkknUserId })
              .eq('id', userByEmail.id);
            user = userByEmail;
          }
        }
      }
    } catch (e) {
      console.error('[resolveMentorByJkknId] JKKN API lookup failed:', e);
    }
  }

  if (!user) {
    console.log(`[resolveMentorByJkknId] No user found for JKKN ID ${jkknUserId}`);
    return null;
  }

  // Step 3: Find mentor record by user_id
  const { data: mentor } = await supabase
    .from('mentors')
    .select('id, institution_id, department_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!mentor) {
    console.log(`[resolveMentorByJkknId] No mentor record found for user ${user.id} — attempting self-heal...`);
    const autoCreated = await ensureMentorRecord(user.id, supabase);
    if (!autoCreated) {
      console.error(`[resolveMentorByJkknId] Self-heal failed for user ${user.id}`);
      return null;
    }
    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name ?? null,
      },
      mentor: {
        id: autoCreated.id,
        institution_id: autoCreated.institution_id ?? null,
        department_id: autoCreated.department_id ?? null,
      },
    };
  } else if (!mentor.institution_id || !mentor.department_id) {
    // Self-heal: mentor exists but has empty institution/department
    console.log(`[resolveMentorByJkknId] Mentor ${mentor.id} has empty inst/dept — attempting self-heal...`);
    const enriched = await ensureMentorRecord(user.id, supabase);
    if (enriched && (enriched.institution_id || enriched.department_id)) {
      return {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name ?? null,
        },
        mentor: {
          id: enriched.id,
          institution_id: enriched.institution_id ?? null,
          department_id: enriched.department_id ?? null,
        },
      };
    }
    // Fall through — return stale mentor if backfill didn't improve anything
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name ?? null,
    },
    mentor: {
      id: mentor.id,
      institution_id: mentor.institution_id ?? null,
      department_id: mentor.department_id ?? null,
    },
  };
}
