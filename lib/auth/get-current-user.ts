/**
 * Get current authenticated user from MyJKKN token
 */

import { cookies, headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import { validateToken } from './token-validation';

export interface CurrentUser {
  id: string; // Supabase users table ID
  jkkn_user_id: string;
  email: string;
  full_name: string;
  role: string;
  institution_id: string | null;
  department_id: string | null;
  is_super_admin: boolean;
}

/**
 * Get current user from MyJKKN access token
 * Supports both Authorization header and cookie-based authentication
 * This function validates the MyJKKN token and returns the user from our database
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    let accessToken: string | undefined;

    // Try to get token from Authorization header first (for API calls from client)
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }

    // Fallback to cookies if no Authorization header (for server-side rendering)
    if (!accessToken) {
      const cookieStore = await cookies();
      accessToken = cookieStore.get('access_token')?.value;
    }

    if (!accessToken) {
      console.error('[Auth] No access token found in headers or cookies');
      return null;
    }

    // Validate token with MyJKKN auth server
    const validation = await validateToken(accessToken);

    if (!validation.valid || !validation.user) {
      console.error('[Auth] Token validation failed:', validation.error);
      return null;
    }

    // Get user from our database
    const supabaseAdmin = createAdminClient();

    // Log the token data we're working with
    console.log('[Auth] Token user data:', {
      jkkn_user_id: validation.user.id,
      email: validation.user.email,
      full_name: validation.user.full_name,
      role: validation.user.role,
    });

    // First try to find by jkkn_user_id
    let { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('jkkn_user_id', validation.user.id)
      .single();

    // If not found by jkkn_user_id, try by email (handles JKKN ID changes)
    if (error || !user) {
      console.log('[Auth] User not found by jkkn_user_id, trying email lookup...', {
        searchingFor: validation.user.email,
        originalError: error?.message || error?.code,
      });

      const { data: userByEmail, error: emailError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', validation.user.email)
        .single();

      if (userByEmail) {
        // Update the jkkn_user_id to the new one
        console.log(`[Auth] Found user by email, updating jkkn_user_id: ${userByEmail.jkkn_user_id} → ${validation.user.id}`);
        await supabaseAdmin
          .from('users')
          .update({
            jkkn_user_id: validation.user.id,
            institution_id: validation.user.institution_id || userByEmail.institution_id,
            department_id: validation.user.department_id || userByEmail.department_id,
          })
          .eq('id', userByEmail.id);

        user = { ...userByEmail, jkkn_user_id: validation.user.id };
        error = null;
      } else {
        console.error('[Auth] Email lookup also failed:', {
          searchedEmail: validation.user.email,
          error: emailError?.message || emailError?.code || emailError,
        });
        error = emailError;
      }
    }

    if (error || !user) {
      console.error('[Auth] ❌ User not found in database. Token is valid but user does not exist in local users table.', {
        jkkn_user_id: validation.user.id,
        email: validation.user.email,
        error: error?.message || error?.code || 'User not found',
        suggestion: 'User may need to be synced from MyJKKN or log out and log back in',
      });
      return null;
    }

    // Prefer institution_id / department_id from the live auth token — they match
    // the same UUID namespace the JKKN HR API uses for staff filtering.
    // Fall back to the stored DB value when the token omits them.
    const resolvedInstitutionId = validation.user.institution_id || user.institution_id;
    const resolvedDepartmentId  = validation.user.department_id  || user.department_id;

    // Persist back to DB if the token gave us fresher values (fire-and-forget).
    if (
      (resolvedInstitutionId && resolvedInstitutionId !== user.institution_id) ||
      (resolvedDepartmentId  && resolvedDepartmentId  !== user.department_id)
    ) {
      void (async () => {
        const { error } = await supabaseAdmin
          .from('users')
          .update({ institution_id: resolvedInstitutionId, department_id: resolvedDepartmentId })
          .eq('id', user.id);
        if (error) console.error('[Auth] Failed to sync institution/department:', error);
        else console.log(`[Auth] Synced institution/department for user ${user.id}`);
      })();
    }

    return {
      id: user.id,
      jkkn_user_id: user.jkkn_user_id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      institution_id: resolvedInstitutionId,
      department_id: resolvedDepartmentId,
      is_super_admin: user.is_super_admin || false,
    };
  } catch (error) {
    console.error('[Auth] Error getting current user:', error);
    return null;
  }
}

/**
 * Get mentor record for current user (if they are a mentor)
 */
export async function getCurrentMentor() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'mentor') {
      return null;
    }

    const supabaseAdmin = createAdminClient();
    const { data: mentor, error } = await supabaseAdmin
      .from('mentors')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !mentor) {
      console.error('[Auth] Mentor not found:', error);
      return null;
    }

    return mentor;
  } catch (error) {
    console.error('[Auth] Error getting current mentor:', error);
    return null;
  }
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

/**
 * Require specific role - throws error if user doesn't have the role
 */
export async function requireRole(allowedRoles: string[]): Promise<CurrentUser> {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role) && !user.is_super_admin) {
    throw new Error('Forbidden: Insufficient permissions');
  }

  return user;
}
