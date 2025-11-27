/**
 * Supabase Authentication Helpers
 * 
 * Functions for storing and managing users and sessions in Supabase.
 */

import { createAdminClient } from './server';
import type { JKKNUser } from '../auth/token-validation';

/**
 * Store or update user in Supabase after JKKN authentication
 */
export async function upsertUser(jkknUser: JKKNUser & {
  department_id?: string;
  phone_number?: string;
  gender?: string;
  designation?: string;
  avatar_url?: string;
  profile_completed?: boolean;
}) {
  try {
    const supabaseAdmin = createAdminClient();

    // Map JKKN role to our DB role
    const dbRole = mapJkknRoleToDbRole(jkknUser.role);

    console.log(`📋 Role Mapping: ${jkknUser.role} → ${dbRole}`);

    // First check if user exists by email (handles JKKN ID changes)
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, jkkn_user_id')
      .eq('email', jkknUser.email)
      .single();

    // If user exists with different JKKN ID, update the JKKN ID first
    if (existingUser && existingUser.jkkn_user_id !== jkknUser.id) {
      console.log(`🔄 Updating JKKN ID for ${jkknUser.email}`);
      await supabaseAdmin
        .from('users')
        .update({ jkkn_user_id: jkknUser.id })
        .eq('id', existingUser.id);
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          jkkn_user_id: jkknUser.id,
          email: jkknUser.email,
          full_name: jkknUser.full_name,
          role: dbRole,
          department_id: jkknUser.department_id || null,
          institution_id: jkknUser.institution_id || null,
          phone_number: jkknUser.phone_number || null,
          gender: jkknUser.gender || null,
          designation: jkknUser.designation || null,
          avatar_url: jkknUser.avatar_url || null,
          is_super_admin: dbRole === 'super_admin',
          profile_completed: jkknUser.profile_completed || false,
          last_login: new Date().toISOString(),
        },
        {
          onConflict: 'jkkn_user_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting user:', error);
      throw error;
    }

    // If user is faculty, ensure they exist in mentors table
    if (jkknUser.role === 'faculty' && jkknUser.department_id && jkknUser.institution_id) {
      await ensureMentorRecord(data.id, jkknUser.department_id, jkknUser.institution_id, jkknUser.designation);
    }

    return data;
  } catch (error) {
    console.error('Failed to upsert user:', error);
    throw error;
  }
}

/**
 * Ensure faculty user has a mentor record
 */
async function ensureMentorRecord(
  userId: string,
  departmentId: string,
  institutionId: string,
  designation?: string
) {
  try {
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
      .from('mentors')
      .upsert(
        {
          user_id: userId,
          department_id: departmentId,
          institution_id: institutionId,
          designation: designation || null,
          total_students: 0,
          is_active: true,
        },
        {
          onConflict: 'user_id',
        }
      );

    if (error && error.code !== '23505') {
      console.error('Error creating mentor record:', error);
    }
  } catch (error) {
    console.error('Failed to create mentor record:', error);
  }
}

/**
 * Create a user session in Supabase
 */
export async function createUserSession(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
) {
  try {
    const supabaseAdmin = createAdminClient();

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('user_sessions')
      .insert({
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to create session:', error);
    throw error;
  }
}

/**
 * Logout user - delete all their sessions
 */
export async function logoutUser(userId: string) {
  try {
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
      .from('user_sessions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error logging out user:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to logout user:', error);
    return false;
  }
}

/**
 * Map MyJKKN roles to our internal database roles
 */
export function mapJkknRoleToDbRole(jkknRole: string): string {
  const roleMapping: Record<string, string> = {
    // Full admin access
    'super_admin': 'super_admin',
    'administrator': 'super_admin',
    // Institution level access
    'digital_coordinator': 'digital_coordinator',
    'principal': 'principal',
    // Mentor access
    'hod': 'hod',
    'faculty': 'faculty',
  };

  return roleMapping[jkknRole] || jkknRole;
}

/**
 * Check if user role is allowed to access the system
 */
export function isRoleAllowed(role: string): boolean {
  const allowedRoles = [
    'faculty',
    'hod',
    'principal',
    'administrator',
    'digital_coordinator',
    'super_admin',
  ];

  return allowedRoles.includes(role);
}

/**
 * Get default route for user role
 */
export function getDefaultRouteForRole(role: string): string {
  const roleRoutes: Record<string, string> = {
    faculty: '/mentor',
    hod: '/dashboard',
    principal: '/dashboard',
    administrator: '/dashboard',
    digital_coordinator: '/dashboard',
    super_admin: '/dashboard',
  };

  return roleRoutes[role] || '/';
}
