/**
 * Access Control Middleware
 * Implements 3-level access control:
 * - Level 1: Super Admin (all access)
 * - Level 2: Institution Admin (institution-wide access)
 * - Level 3: Mentor (with optional Mentor In-charge assignment for elevated permissions)
 *
 * Mentor In-charge is an assignment, not a separate role.
 * It gives mentors elevated permissions within their institution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
import type { InchargeScope } from '@/lib/types/mentor-incharge';

export type AccessLevel = 'super_admin' | 'institution_admin' | 'mentor' | 'student' | 'faculty' | 'hod';

export interface UserAccess {
  userId: string;
  jkknUserId: string | null; // JKKN platform user ID (used to match against JKKN API staff records)
  email: string | null; // User email — the only reliable cross-system key between auth and HR APIs
  role: AccessLevel;
  institutionId: string | null;
  departmentId: string | null;
  isSuperAdmin: boolean;
  isMentorIncharge: boolean; // Whether user has mentor in-charge assignment
  mentorInchargeInstitutionId: string | null; // Institution where user is mentor in-charge
}

/**
 * Get current user's access level
 * Includes mentor in-charge status check
 */
export async function getUserAccess(): Promise<UserAccess | null> {
  try {
    // Get current authenticated user from MyJKKN token
    const user = await getCurrentUser();

    if (!user) {
      console.error('[Access Control] No authenticated user found');
      return null;
    }

    // Check if user has mentor in-charge assignment
    const supabase = createAdminClient();
    const { data: inchargeAssignment, error: inchargeError } = await supabase
      .from('mentor_incharge_assignments')
      .select('institution_id')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('[Access Control] Mentor incharge check:', {
      userId: user.id,
      email: user.email,
      inchargeAssignment,
      inchargeError,
      isMentorIncharge: !!inchargeAssignment,
    });

    return {
      userId: user.id,
      jkknUserId: user.jkkn_user_id || null,
      email: user.email || null,
      role: user.role as AccessLevel,
      institutionId: user.institution_id,
      departmentId: user.department_id,
      isSuperAdmin: user.is_super_admin || user.role === 'super_admin',
      isMentorIncharge: !!inchargeAssignment,
      mentorInchargeInstitutionId: inchargeAssignment?.institution_id || null,
    };
  } catch (error) {
    console.error('[Access Control] Error getting user access:', error);
    return null;
  }
}

/**
 * Get mentor IDs for a given institution filter.
 * Used by dashboard routes to filter counseling_sessions (which lack institution_id).
 * Returns null for super admin (no filtering needed).
 * Returns a sentinel UUID when institution has 0 mentors to avoid empty .in() returning all rows.
 */
export async function getMentorIdsForInstitution(institutionFilter: string | null): Promise<string[] | null> {
  if (institutionFilter === null) return null; // super admin sees everything
  const supabase = createAdminClient();
  const { data } = await supabase.from('mentors').select('id').eq('institution_id', institutionFilter);
  const ids = data?.map(m => m.id) || [];
  // Sentinel to prevent empty .in() from matching all rows
  return ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'];
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

  // Level 3: Mentor in-charge can access their assigned institution
  if (userAccess.isMentorIncharge && userAccess.mentorInchargeInstitutionId === targetInstitutionId) {
    return true;
  }

  // Faculty, HOD, regular mentor, and student can access their own institution
  if (userAccess.institutionId === targetInstitutionId) {
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

  // Level 3: Mentor in-charge can access all departments in their assigned institution
  if (
    userAccess.isMentorIncharge &&
    targetInstitutionId &&
    userAccess.mentorInchargeInstitutionId === targetInstitutionId
  ) {
    return true;
  }

  return false;
}

/**
 * Get institution filter for queries based on user access
 * Returns null for super admin and administrator (no filter needed - see all institutions)
 * Returns institution_id for mentors and other roles
 * IMPORTANT: Mentor in-charge users are filtered by their mentorInchargeInstitutionId, NOT their personal institutionId
 */
export function getInstitutionFilter(userAccess: UserAccess): string | null {
  // Super admin sees all institutions
  if (userAccess.isSuperAdmin || userAccess.role === 'super_admin') {
    console.log('[Access Control] Super Admin - No institution filter applied');
    return null;
  }

  // Institution admin sees only their institution
  if (userAccess.role === 'institution_admin') {
    console.log(`[Access Control] Institution Admin - Filtering by institution: ${userAccess.institutionId}`);
    return userAccess.institutionId;
  }

  // Mentor in-charge users see their assigned institution (takes priority over their personal institution)
  if (userAccess.isMentorIncharge && userAccess.mentorInchargeInstitutionId) {
    console.log(`[Access Control] Mentor In-Charge - Filtering by assigned institution: ${userAccess.mentorInchargeInstitutionId}`);
    return userAccess.mentorInchargeInstitutionId;
  }

  // Faculty, HOD, regular Mentors and other roles are filtered by their personal institution
  console.log(`[Access Control] Non-admin user (${userAccess.role}) - Filtering by personal institution: ${userAccess.institutionId}`);
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
    hod: 3, // Head of Department - elevated permissions
    faculty: 3, // Faculty - same level as mentor
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
    institution_admin: 'Institution Admin (Director)',
    hod: 'Head of Department',
    faculty: 'Faculty',
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
    hod: 'warning',
    faculty: 'default',
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
      .eq('user_id', userId)
      .maybeSingle();

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
      .select('institution_id, department_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      console.error('[Access Control] No active incharge assignment found for user:', userId);
      return null;
    }

    // If department_id is null, it's institution-wide scope
    return {
      scopeType: data.department_id ? 'department' : 'institution',
      institutionId: data.institution_id,
      departmentIds: data.department_id ? [data.department_id] : [],
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

/**
 * Check if user can manage (CRUD) a specific mentor's data
 * Used for counseling sessions, student assignments, etc.
 */
export async function canManageMentor(
  userAccess: UserAccess,
  targetMentorId: string,
  targetMentorInstitutionId: string
): Promise<boolean> {
  // Super admin / legacy 'administrator' role can manage anyone
  if (userAccess.isSuperAdmin || (userAccess.role as string) === 'administrator') {
    return true;
  }

  // Institution-level roles: institution_admin, admin, principal, digital_coordinator
  // Also handles the case where the mentor's institution_id is null (data gap) by
  // falling back to the caller-supplied institution so admins aren't locked out.
  const isInstitutionLevelRole = ['institution_admin', 'admin', 'principal', 'digital_coordinator'].includes(userAccess.role);
  if (isInstitutionLevelRole) {
    // Allow when institutions match, OR when target institution is unknown (null/empty)
    // and we're within the same institution context (avoids locking out admins on
    // mentors whose institution_id was not yet populated).
    const institutionMatches =
      !targetMentorInstitutionId ||
      userAccess.institutionId === targetMentorInstitutionId;
    if (institutionMatches) return true;
  }

  // Mentor in-charge can manage mentors in their assigned institution
  if (userAccess.isMentorIncharge && (
    userAccess.mentorInchargeInstitutionId === targetMentorInstitutionId ||
    !targetMentorInstitutionId
  )) {
    return true;
  }

  // Fetch target mentor's department and owner in a single query
  const supabase = createAdminClient();
  const { data: targetMentor } = await supabase
    .from('mentors')
    .select('user_id, department_id')
    .eq('id', targetMentorId)
    .maybeSingle();

  // HOD can manage mentors in their department within their institution
  if (
    userAccess.role === 'hod' &&
    userAccess.institutionId === targetMentorInstitutionId &&
    targetMentor?.department_id === userAccess.departmentId
  ) {
    return true;
  }

  // Mentors can manage their own data (sessions, etc.)
  if (targetMentor?.user_id === userAccess.userId) {
    return true;
  }

  return false;
}

/**
 * Check if user can assign students
 */
export async function canAssignStudents(
  userAccess: UserAccess,
  targetMentorId: string,
  targetMentorInstitutionId: string
): Promise<boolean> {
  // Super admin / legacy 'administrator' role can assign to anyone
  if (userAccess.isSuperAdmin || (userAccess.role as string) === 'administrator') {
    return true;
  }

  // Institution-level roles
  const isInstitutionLevelRole = ['institution_admin', 'admin', 'principal', 'digital_coordinator'].includes(userAccess.role);
  if (isInstitutionLevelRole) {
    const institutionMatches =
      !targetMentorInstitutionId ||
      userAccess.institutionId === targetMentorInstitutionId;
    if (institutionMatches) return true;
  }

  // Mentor in-charge can assign students to mentors in their institution
  if (userAccess.isMentorIncharge && (
    userAccess.mentorInchargeInstitutionId === targetMentorInstitutionId ||
    !targetMentorInstitutionId
  )) {
    return true;
  }

  // Fetch target mentor's department and owner in a single query
  const supabase = createAdminClient();
  const { data: targetMentor } = await supabase
    .from('mentors')
    .select('user_id, department_id')
    .eq('id', targetMentorId)
    .maybeSingle();

  // HOD can assign students to mentors in their department within their institution
  if (
    userAccess.role === 'hod' &&
    userAccess.institutionId === targetMentorInstitutionId &&
    targetMentor?.department_id === userAccess.departmentId
  ) {
    return true;
  }

  // Regular mentors and faculty can only assign students to themselves
  if (targetMentor?.user_id === userAccess.userId) {
    return true;
  }

  return false;
}

/**
 * Check if user should only see their assigned students
 * Returns true for regular mentors (not super admin, not institution admin, not mentor in-charge)
 */
export function shouldFilterByAssignedStudents(userAccess: UserAccess): boolean {
  // Super admin sees all students
  if (userAccess.isSuperAdmin || userAccess.role === 'super_admin') {
    return false;
  }

  // Institution admin sees all students in their institution
  if (userAccess.role === 'institution_admin') {
    return false;
  }

  // Mentor in-charge sees all students in their assigned institution
  if (userAccess.isMentorIncharge) {
    return false;
  }

  // HOD and Faculty see all students in their institution (for now)
  if (userAccess.role === 'hod' || userAccess.role === 'faculty') {
    return false;
  }

  // Regular mentors should only see their assigned students
  if (userAccess.role === 'mentor') {
    return true;
  }

  return false;
}

/**
 * Get the list of student IDs assigned to a mentor
 * Returns null if user is not a mentor or has no assignments
 */
export async function getMentorAssignedStudentIds(userId: string): Promise<string[] | null> {
  try {
    const supabase = createAdminClient();

    // First get the mentor record for this user
    const { data: mentor } = await supabase
      .from('mentors')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!mentor) {
      console.log(`[Access Control] No mentor record found for user ${userId}`);
      return null;
    }

    // Get all student IDs assigned to this mentor
    const { data: assignments, error } = await supabase
      .from('mentor_students')
      .select('student_id')
      .eq('mentor_id', mentor.id);

    if (error) {
      console.error('[Access Control] Error fetching mentor student assignments:', error);
      return null;
    }

    const studentIds = (assignments || []).map((a: { student_id: string }) => a.student_id);
    console.log(`[Access Control] Mentor ${mentor.id} has ${studentIds.length} assigned students`);

    return studentIds;
  } catch (error) {
    console.error('[Access Control] Error getting mentor assigned students:', error);
    return null;
  }
}

/**
 * FACULTY PROFILE ACCESS CONTROL
 * Implements role-based access for viewing/managing faculty profiles
 */

// Profile access level type
export type ProfileAccessLevel = 'own_only' | 'department' | 'institution' | 'all';

/**
 * Get what scope of faculty profiles user can access
 * - own_only: Can only view/manage their own profile (faculty, mentor)
 * - department: Can view/manage profiles in their department (HOD)
 * - institution: Can view/manage profiles in their institution (Principal, Mentor Incharge)
 * - all: Can view/manage all profiles (Super Admin)
 */
export function getProfileAccessLevel(userAccess: UserAccess): ProfileAccessLevel {
  // Super admin can access all profiles
  if (userAccess.isSuperAdmin || userAccess.role === 'super_admin') {
    return 'all';
  }

  // Institution-level roles
  if (['administrator', 'institution_admin', 'digital_coordinator', 'principal'].includes(userAccess.role)) {
    return 'institution';
  }

  // Mentor in-charge has institution-level access within their assigned institution
  if (userAccess.isMentorIncharge) {
    return 'institution';
  }

  // HOD has department-level access
  if (userAccess.role === 'hod') {
    return 'department';
  }

  // Faculty and regular mentors can only access their own profile
  return 'own_only';
}

/**
 * Check if user can access a specific faculty/mentor profile
 * @param userAccess - Current user's access info
 * @param targetUserId - The user_id of the profile being accessed
 * @param targetDepartmentId - Department ID of the target profile
 * @param targetInstitutionId - Institution ID of the target profile
 */
export async function canAccessFacultyProfile(
  userAccess: UserAccess,
  targetUserId: string,
  targetDepartmentId: string | null,
  targetInstitutionId: string | null
): Promise<boolean> {
  const level = getProfileAccessLevel(userAccess);

  switch (level) {
    case 'all':
      return true;

    case 'institution':
      // For mentor in-charge, check against assigned institution OR their own institution
      if (userAccess.isMentorIncharge) {
        return (
          targetInstitutionId === userAccess.mentorInchargeInstitutionId ||
          targetInstitutionId === userAccess.institutionId
        );
      }
      // For other institution-level roles, check against user's institution
      return targetInstitutionId === userAccess.institutionId;

    case 'department':
      // HOD can access profiles in their department within their institution
      return (
        targetDepartmentId === userAccess.departmentId &&
        targetInstitutionId === userAccess.institutionId
      );

    case 'own_only':
      // Faculty can only access their own profile
      return targetUserId === userAccess.userId;

    default:
      return false;
  }
}

/**
 * Get filter criteria for mentor list queries based on user access level
 * Returns filter type and relevant IDs for filtering
 */
export function getMentorListFilter(userAccess: UserAccess): {
  type: 'all' | 'institution' | 'department' | 'own';
  institutionId?: string | null;
  departmentId?: string | null;
  userId?: string;
  jkknUserId?: string | null;
} {
  const level = getProfileAccessLevel(userAccess);

  switch (level) {
    case 'all':
      return { type: 'all' };

    case 'institution':
      return {
        type: 'institution',
        institutionId: userAccess.isMentorIncharge
          ? userAccess.mentorInchargeInstitutionId
          : userAccess.institutionId,
      };

    case 'department':
      return {
        type: 'department',
        institutionId: userAccess.institutionId,
        departmentId: userAccess.departmentId,
      };

    default:
      return {
        type: 'own',
        userId: userAccess.userId,
        jkknUserId: userAccess.jkknUserId,
      };
  }
}
