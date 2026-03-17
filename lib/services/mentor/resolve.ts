import { SupabaseClient } from '@supabase/supabase-js';

export interface ResolvedMentor {
  user: { id: string; email: string; full_name: string | null };
  mentor: { id: string; institution_id: string | null; department_id: string | null };
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
      const staffResponse = await fetch(`${baseUrl}/api-management/staff/${jkknUserId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

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
    console.log(`[resolveMentorByJkknId] No mentor record found for user ${user.id}`);
    return null;
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
