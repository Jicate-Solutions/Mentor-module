import { createAdminClient } from './server';
import type { JKKNUser } from '../auth/token-validation';
import { fetchAndBackfillInstitutionDepartment } from '@/lib/services/mentor/resolve';

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
  const supabaseAdmin = createAdminClient();
  const dbRole = mapJkknRoleToDbRole(jkknUser.role);

  // Normalize email to lowercase to prevent case-sensitive duplicates
  const normalizedEmail = jkknUser.email.toLowerCase();

  const userData = {
    jkkn_user_id: jkknUser.id,
    email: normalizedEmail,
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
  };

  // Try upsert by jkkn_user_id first (fast path for 99% of logins)
  let { data, error } = await supabaseAdmin
    .from('users')
    .upsert(userData, { onConflict: 'jkkn_user_id' })
    .select()
    .single();

  // If JKKN ID changed but email exists, update jkkn_user_id then retry
  // Use case-insensitive email match to handle mixed-case duplicates
  if (error && error.code === '23505') {
    await supabaseAdmin
      .from('users')
      .update({ jkkn_user_id: jkknUser.id, email: normalizedEmail })
      .ilike('email', normalizedEmail);

    const retry = await supabaseAdmin
      .from('users')
      .upsert(userData, { onConflict: 'jkkn_user_id' })
      .select()
      .single();

    data = retry.data;
    error = retry.error;
  }

  if (error || !data) {
    throw error || new Error('Failed to upsert user');
  }

  // Ensure mentor record for faculty — wrapped in try/catch so login never fails
  // just because mentor record creation has an issue
  const primaryRole = resolvePrimaryRole(jkknUser.role);
  if (primaryRole === 'faculty' || primaryRole === 'hod') {
    try {
      let deptId = jkknUser.department_id;
      let instId = jkknUser.institution_id;

      // If OAuth didn't include institution/department, run the multi-tier
      // JKKN lookup. Passing email lets the Tier 2 fallback find arts college
      // staff that the single-staff endpoint doesn't return.
      if (!deptId || !instId) {
        const enriched = await fetchAndBackfillInstitutionDepartment(
          data.id,
          jkknUser.id,
          jkknUser.email
        );
        if (enriched) {
          deptId = deptId || enriched.department_id;
          instId = instId || enriched.institution_id;
        }
      }

      // Always create the mentor record, even with empty strings. A hollow row
      // lets Tier 4 lookups succeed and lets later self-heal (on every mentor
      // API hit) backfill institution/department as data becomes available.
      // Previously we skipped creation if either was missing, which permanently
      // locked out arts college faculty whose staff-API record is unavailable.
      await ensureMentorRecord(
        data.id,
        deptId || '',
        instId || '',
        jkknUser.designation
      );
    } catch (mentorErr) {
      // Log but don't block login — mentor record can be created later via self-heal
      console.warn('Non-blocking: failed to ensure mentor record during login:', mentorErr);
    }
  }

  return data;
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
 * Get user by JKKN user ID
 */
export async function getUserByJkknId(jkknUserId: string) {
  try {
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('jkkn_user_id', jkknUserId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error fetching user:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
}

/**
 * Get user session by access token
 */
export async function getUserSession(accessToken: string) {
  try {
    const supabaseAdmin = createAdminClient();

    const { data, error} = await supabaseAdmin
      .from('user_sessions')
      .select(`
        *,
        user:users(*)
      `)
      .eq('access_token', accessToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

/**
 * Delete expired sessions
 */
export async function cleanupExpiredSessions() {
  try {
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
      .from('user_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error cleaning up sessions:', error);
    }
  } catch (error) {
    console.error('Failed to cleanup sessions:', error);
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
 * Priority order for picking a primary role when a user has multiple.
 * Higher-privilege roles appear first so we promote to the most powerful
 * role the user holds.
 */
const ROLE_PRIORITY = [
  'super_admin',
  'administrator',
  'principal',
  'coe',
  'digital_coordinator',
  'hod',
  'faculty',
  'coe_office',
];

/**
 * Map unknown/alias JKKN roles to their internal equivalents.
 * Add new role aliases here as JKKN introduces them.
 */
const ROLE_ALIASES: Record<string, string> = {
  'coe_office': 'faculty',  // COE office staff — treated as faculty
};

/**
 * Merge the role and roles fields from a JKKN token into a single flat
 * string array. JKKN may send role as a string/array and additionally
 * include all assigned roles in a separate `roles` array field.
 */
export function mergeJkknRoles(
  role: string | string[],
  roles?: string[]
): string[] {
  const fromRole = Array.isArray(role)
    ? role.map(r => r.trim()).filter(Boolean)
    : role.split(',').map(r => r.trim()).filter(Boolean);

  const fromRoles = (roles ?? []).map(r => r.trim()).filter(Boolean);

  // Deduplicate, then expand any aliases to their canonical equivalents
  const merged = [...new Set([...fromRole, ...fromRoles])];
  return merged.flatMap(r => {
    const alias = ROLE_ALIASES[r];
    return alias ? [r, alias] : [r];
  });
}

/**
 * Resolve a single primary role from a merged role list.
 * Picks the highest-priority known role; if no known role found,
 * falls back to the first value.
 */
export function resolvePrimaryRole(role: string | string[], roles?: string[]): string {
  const all = mergeJkknRoles(role, roles);

  if (all.length === 0) return '';

  for (const priority of ROLE_PRIORITY) {
    if (all.includes(priority)) return priority;
  }
  return all[0];
}

/**
 * Map MyJKKN roles to our internal database roles.
 * Accepts role + optional roles array — resolves to the primary role first.
 * JKKN Roles: super_admin, administrator, digital_coordinator, principal, hod, faculty
 * Blocked: staff, student (handled by isRoleAllowed)
 */
export function mapJkknRoleToDbRole(jkknRole: string | string[], roles?: string[]): string {
  const primary = resolvePrimaryRole(jkknRole, roles);
  const roleMapping: Record<string, string> = {
    // Full admin access
    'super_admin': 'super_admin',
    'administrator': 'super_admin',
    // Institution level access
    'digital_coordinator': 'digital_coordinator',
    'principal': 'principal',
    'coe': 'principal', // Controller of Examinations — institution-level access
    // Mentor access (faculty and HOD)
    'hod': 'hod',
    'faculty': 'faculty',
    'coe_office': 'faculty', // COE office staff — treated as faculty
  };

  return roleMapping[primary] || primary;
}

/**
 * Check if a user's role(s) are allowed to access the system.
 * Accepts role + optional roles array — allows access if ANY resolved role
 * is in the allowed list (including alias expansion, e.g. coe_office → faculty).
 */
export function isRoleAllowed(role: string | string[], roles?: string[]): boolean {
  const allowedRoles = [
    'faculty',
    'hod',
    'principal',
    'coe',
    'coe_office',
    'administrator',
    'digital_coordinator',
    'super_admin',
  ];

  const all = mergeJkknRoles(role, roles);
  return all.some(r => allowedRoles.includes(r));
}

/**
 * Get default route for user role.
 * Resolves aliases first (e.g. coe_office → faculty) so unknown/alias roles
 * still land on the right page instead of falling back to '/'.
 */
export function getDefaultRouteForRole(role: string | string[], roles?: string[]): string {
  const primary = resolvePrimaryRole(role, roles);
  const roleRoutes: Record<string, string> = {
    faculty: '/mentor',
    coe_office: '/mentor',
    hod: '/dashboard',
    principal: '/dashboard',
    coe: '/dashboard',
    administrator: '/dashboard',
    digital_coordinator: '/dashboard',
    super_admin: '/dashboard',
  };

  return roleRoutes[primary] || '/mentor';
}

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(role: string, route: string): boolean {
  // Super admin can access everything
  if (role === 'super_admin' || role === 'administrator') {
    return true;
  }

  const routePermissions: Record<string, string[]> = {
    '/admin': ['super_admin', 'administrator', 'digital_coordinator'],
    '/mentor': ['faculty', 'coe_office', 'hod', 'principal', 'administrator', 'digital_coordinator', 'super_admin'],
    '/dashboard': ['hod', 'principal', 'administrator', 'digital_coordinator', 'super_admin'],
  };

  const allowedRoles = routePermissions[route];
  if (!allowedRoles) {
    return true; // Public route
  }

  return allowedRoles.includes(role);
}
