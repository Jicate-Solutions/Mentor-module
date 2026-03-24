import { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/server';

export interface ResolvedMentor {
  user: { id: string; email: string; full_name: string | null };
  mentor: { id: string; institution_id: string | null; department_id: string | null };
}

/**
 * Fetches institution_id and department_id from the JKKN Staff API for a user
 * whose local records are missing this data. Updates both `users` and `mentors`
 * tables as a side-effect. Returns the enriched IDs or null on failure.
 */
export async function fetchAndBackfillInstitutionDepartment(
  userId: string,
  jkknUserId: string | null
): Promise<{ institution_id: string; department_id: string } | null> {
  if (!jkknUserId) return null;

  const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s max
    const res = await fetch(`${baseUrl}/api-management/staff/${jkknUserId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const json = await res.json();
    const staff = json.data || json;

    // Extract institution_id (same pattern as app/api/jkkn/staff/route.ts)
    let institution_id = '';
    if (typeof staff.institution === 'object' && staff.institution !== null) {
      institution_id = staff.institution.id || staff.institution.institution_id || '';
    } else if (typeof staff.institution === 'string') {
      institution_id = staff.institution;
    } else if (staff.institution_id) {
      institution_id = staff.institution_id;
    }

    // Extract department_id
    let department_id = '';
    if (typeof staff.department === 'object' && staff.department !== null) {
      department_id = staff.department.id || staff.department.department_id || '';
    } else if (typeof staff.department === 'string') {
      department_id = staff.department;
    } else if (staff.department_id) {
      department_id = staff.department_id;
    }

    if (!institution_id && !department_id) return null;

    const adminClient = createAdminClient();

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

    console.log(`[Self-Heal] Backfilled inst/dept for user ${userId}: inst=${institution_id}, dept=${department_id}`);
    return { institution_id, department_id };
  } catch (e) {
    console.error('[Self-Heal] Failed to backfill institution/department:', e);
    return null;
  }
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
    // Self-heal: if mentor exists but has empty institution/department, try JKKN API
    if (!existingMentor.institution_id || !existingMentor.department_id) {
      const { data: userForBackfill } = await supabase
        .from('users')
        .select('jkkn_user_id')
        .eq('id', userId)
        .maybeSingle();
      if (userForBackfill?.jkkn_user_id) {
        const enriched = await fetchAndBackfillInstitutionDepartment(userId, userForBackfill.jkkn_user_id);
        if (enriched) {
          return {
            id: existingMentor.id,
            institution_id: enriched.institution_id || existingMentor.institution_id,
            department_id: enriched.department_id || existingMentor.department_id,
          };
        }
      }
    }
    return existingMentor;
  }

  // No mentors row — fetch user's department/institution for the insert
  const { data: userRecord } = await supabase
    .from('users')
    .select('department_id, institution_id, designation')
    .eq('id', userId)
    .single();

  if (!userRecord) {
    console.error(`[ensureMentorRecord] User ${userId} not found — cannot auto-create mentor row`);
    return null;
  }

  // mentors.department_id and institution_id are NOT NULL text columns
  let departmentId = userRecord.department_id || '';
  let institutionId = userRecord.institution_id || '';

  // Self-heal: if user has no institution/department, try JKKN Staff API
  if (!departmentId || !institutionId) {
    const { data: userJkkn } = await supabase
      .from('users')
      .select('jkkn_user_id')
      .eq('id', userId)
      .maybeSingle();
    if (userJkkn?.jkkn_user_id) {
      const enriched = await fetchAndBackfillInstitutionDepartment(userId, userJkkn.jkkn_user_id);
      if (enriched) {
        departmentId = enriched.department_id || departmentId;
        institutionId = enriched.institution_id || institutionId;
      }
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
            .eq('email', email)
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
