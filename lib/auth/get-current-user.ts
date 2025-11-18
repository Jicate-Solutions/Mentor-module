/**
 * Get current authenticated user from MyJKKN token
 */

import { cookies } from 'next/headers';
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
 * Get current user from MyJKKN access token stored in cookies
 * This function validates the MyJKKN token and returns the user from our database
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      console.error('[Auth] No access token found in cookies');
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
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('jkkn_user_id', validation.user.id)
      .single();

    if (error || !user) {
      console.error('[Auth] User not found in database:', error);
      return null;
    }

    return {
      id: user.id,
      jkkn_user_id: user.jkkn_user_id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      institution_id: user.institution_id,
      department_id: user.department_id,
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
