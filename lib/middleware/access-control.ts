/**
 * Access Control Middleware
 * Implements 2-level access control:
 * - Level 1: Super Admin (all access)
 * - Level 2: Institution Admin (institution-wide access)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
import type { InchargeScope } from '@/lib/types/mentor-incharge';

export type AccessLevel = 'super_admin' | 'institution_admin' | 'mentor' | 'student';

export interface UserAccess {
  userId: string;
  role: AccessLevel;
  institutionId: string | null;
  departmentId: string | null;
  isSuperAdmin: boolean;
}

/**
 * Get current user's access level
 */
export async function getUserAccess(): Promise<UserAccess | null> {
  try {
    // Get current authenticated user from MyJKKN token
    const user = await getCurrentUser();

    if (!user) {
      console.error('[Access Control] No authenticated user found');
      return null;
    }

    return {
      userId: user.id,
      role: user.role as AccessLevel,
      institutionId: user.institution_id,
      departmentId: user.department_id,
      isSuperAdmin: user.is_super_admin || user.role === 'super_admin',
    };
  } catch (error) {
    console.error('[Access Control] Error getting user access:', error);
    return null;
  }
}

/**
 * Check if user can access institution data
 */
export function canAccessInstitution(
  userAccess: UserAccess,
  targetInstitutionId: string
): boolean {
  // Level 1: Super admin can access everything
  if (userAccess.isSuperAdmin || userAccess.role === 'super_admin') {
    return true;
  }

  // Level 2: Institution admin can access their institution
  if (userAccess.role === 'institution_admin' && userAccess.institutionId === targetInstitutionId) {
    return true;
  }

  return false;
}

/**
 * Check if user can access department data
 */
export function canAccessDepartment(
  userAccess: UserAccess,
  targetDepartmentId: string,
  targetInstitutionId?: string
): boolean {
  // Level 1: Super admin can access everything
  if (userAccess.isSuperAdmin || userAccess.role === 'super_admin') {
    return true;
  }

  // Level 2: Institution admin can access all departments in their institution
  if (
    userAccess.role === 'institution_admin' &&
    targetInstitutionId &&
    userAccess.institutionId === targetInstitutionId
  ) {
    return true;
  }

  return false;
}

/**
 * Get institution filter for queries based on user access
 * Returns null for super admin and administrator (no filter needed - see all institutions)
 * Returns institution_id for mentors and other roles
 */
export function getInstitutionFilter(userAccess: UserAccess): string | null {
  // Super admin and institution admin see everything (all institutions for super admin, their institution for institution admin)
  if (userAccess.isSuperAdmin || userAccess.role === 'super_admin') {
    console.log('[Access Control] Super Admin - No institution filter applied');
    return null;
  }

  // Institution admin sees only their institution
  if (userAccess.role === 'institution_admin') {
    console.log(`[Access Control] Institution Admin - Filtering by institution: ${userAccess.institutionId}`);
    return userAccess.institutionId;
  }

  // Mentors and other roles are filtered by their institution
  console.log(`[Access Control] Non-admin user (${userAccess.role}) - Filtering by institution: ${userAccess.institutionId}`);
  return userAccess.institutionId;
}

/**
 * Get department filter for queries based on user access
 * Returns null for super admin and institution admin (no department-level filtering)
 */
export function getDepartmentFilter(userAccess: UserAccess): string | null {
  // No department-level filtering for 2-level access control
  // Super admin and institution admin see all departments (within institution scope)
  return null;
}

/**
 * Middleware to enforce access control on API routes
 * Usage: const userAccess = await requireAccess(request);
 */
export async function requireAccess(request: NextRequest): Promise<UserAccess> {
  const userAccess = await getUserAccess();

  if (!userAccess) {
    throw new Error('Unauthorized: No valid user session');
  }

  return userAccess;
}

/**
 * Middleware to require minimum access level
 */
export async function requireMinimumLevel(
  request: NextRequest,
  minimumLevel: AccessLevel
): Promise<UserAccess> {
  const userAccess = await requireAccess(request);

  const levelHierarchy: Record<AccessLevel, number> = {
    super_admin: 1,
    institution_admin: 2,
    mentor: 3,
    student: 4,
  };

  const userLevel = levelHierarchy[userAccess.role];
  const requiredLevel = levelHierarchy[minimumLevel];

  if (userLevel > requiredLevel) {
    throw new Error(
      `Forbidden: Requires ${minimumLevel} access level or higher, but user has ${userAccess.role}`
    );
  }

  return userAccess;
}

/**
 * Get access level display name
 */
export function getAccessLevelLabel(role: AccessLevel): string {
  const labels: Record<AccessLevel, string> = {
    super_admin: 'Super Admin',
    institution_admin: 'Institution Admin',
    mentor: 'Mentor',
    student: 'Student',
  };

  return labels[role] || role;
}

/**
 * Get access level badge variant
 */
export function getAccessLevelVariant(
  role: AccessLevel
): 'default' | 'success' | 'warning' | 'error' {
  const variants: Record<AccessLevel, 'default' | 'success' | 'warning' | 'error'> = {
    super_admin: 'error',
    institution_admin: 'success',
    mentor: 'default',
    student: 'default',
  };

  return variants[role] || 'default';
}

/**
 * MENTOR INCHARGE FUNCTIONS
 * Separate from regular role-based access control
 * Mentor Incharge is an assignment, not a role change
 */

/**
 * Check if a user is currently assigned as Mentor Incharge
 */
export async function isMentorIncharge(userId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('mentor_incharge_assignments')
      .select('id')
      .eq('incharge_id', userId)
      .eq('is_active', true)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error('[Access Control] Error checking mentor incharge status:', error);
    return false;
  }
}

/**
 * Get Mentor Incharge scope from database
 */
export async function getMentorInchargeScope(userId: string): Promise<InchargeScope | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('mentor_incharge_assignments')
      .select('scope_type, institution_id, department_ids')
      .eq('incharge_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.error('[Access Control] No active incharge assignment found for user:', userId);
      return null;
    }

    return {
      scopeType: data.scope_type,
      institutionId: data.institution_id,
      departmentIds: data.department_ids || [],
    };
  } catch (error) {
    console.error('[Access Control] Error getting incharge scope:', error);
    return null;
  }
}

/**
 * Check if Mentor Incharge can access a specific mentor's data
 */
export function canAccessMentor(
  inchargeScope: InchargeScope,
  mentorInstitutionId: string | null,
  mentorDepartmentId: string | null
): boolean {
  // Institution-wide scope
  if (inchargeScope.scopeType === 'institution') {
    return inchargeScope.institutionId === mentorInstitutionId;
  }

  // Department or multi-department scope
  if (mentorDepartmentId && inchargeScope.departmentIds.length > 0) {
    return inchargeScope.departmentIds.includes(mentorDepartmentId);
  }

  return false;
}
