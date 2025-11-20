/**
 * Permission Utilities
 * Helper functions to check user permissions for specific actions
 */

import { UserAccess, canAccessInstitution, canAccessDepartment } from '@/lib/middleware/access-control';

/**
 * Check if user can view institution data
 */
export function canViewInstitution(userAccess: UserAccess, institutionId: string): boolean {
  return canAccessInstitution(userAccess, institutionId);
}

/**
 * Check if user can view all institutions
 */
export function canViewAllInstitutions(userAccess: UserAccess): boolean {
  return userAccess.isSuperAdmin || userAccess.role === 'super_admin';
}

/**
 * Check if user can view department data
 */
export function canViewDepartment(
  userAccess: UserAccess,
  departmentId: string,
  institutionId?: string
): boolean {
  return canAccessDepartment(userAccess, departmentId, institutionId);
}

/**
 * Check if user can view all departments (within their institution)
 */
export function canViewAllDepartments(userAccess: UserAccess): boolean {
  // Super admin can see all departments across all institutions
  if (userAccess.isSuperAdmin || userAccess.role === 'super_admin') {
    return true;
  }

  // Institution admin can see all departments in their institution
  if (userAccess.role === 'institution_admin') {
    return true;
  }

  // Mentor in-charge can see all departments in their assigned institution
  if (userAccess.isMentorIncharge) {
    return true;
  }

  return false;
}

/**
 * Check if user can view student data
 */
export function canViewStudent(
  userAccess: UserAccess,
  studentInstitutionId: string,
  studentDepartmentId: string
): boolean {
  // Super admin can view all students
  if (userAccess.isSuperAdmin || userAccess.role === 'super_admin') {
    return true;
  }

  // Institution admin can view students in their institution
  if (userAccess.role === 'institution_admin' && userAccess.institutionId === studentInstitutionId) {
    return true;
  }

  // Mentor in-charge can view students in their assigned institution
  if (userAccess.isMentorIncharge && userAccess.mentorInchargeInstitutionId === studentInstitutionId) {
    return true;
  }

  return false;
}

/**
 * Check if user can view staff/mentor data
 */
export function canViewStaff(
  userAccess: UserAccess,
  staffInstitutionId: string,
  staffDepartmentId: string
): boolean {
  // Super admin can view all staff
  if (userAccess.isSuperAdmin || userAccess.role === 'super_admin') {
    return true;
  }

  // Institution admin can view staff in their institution
  if (userAccess.role === 'institution_admin' && userAccess.institutionId === staffInstitutionId) {
    return true;
  }

  // Mentor in-charge can view staff/mentors in their assigned institution
  if (userAccess.isMentorIncharge && userAccess.mentorInchargeInstitutionId === staffInstitutionId) {
    return true;
  }

  return false;
}

/**
 * Check if user can manage (create/update/delete) institution data
 * Only super admins can manage institutions
 */
export function canManageInstitutions(userAccess: UserAccess): boolean {
  return userAccess.isSuperAdmin || userAccess.role === 'super_admin';
}

/**
 * Check if user can manage departments
 * Super admin and institution admin can manage departments
 */
export function canManageDepartments(userAccess: UserAccess, institutionId?: string): boolean {
  // Super admin can manage all departments
  if (userAccess.isSuperAdmin || userAccess.role === 'super_admin') {
    return true;
  }

  // Institution admin can manage departments in their institution
  if (
    userAccess.role === 'institution_admin' &&
    institutionId &&
    userAccess.institutionId === institutionId
  ) {
    return true;
  }

  return false;
}

/**
 * Check if user can manage students
 * Super admin, institution admin, and mentor in-charge can manage students (within their scope)
 */
export function canManageStudents(
  userAccess: UserAccess,
  studentInstitutionId?: string,
  studentDepartmentId?: string
): boolean {
  // Super admin can manage all students
  if (userAccess.isSuperAdmin || userAccess.role === 'super_admin') {
    return true;
  }

  // Institution admin can manage students in their institution
  if (
    userAccess.role === 'institution_admin' &&
    studentInstitutionId &&
    userAccess.institutionId === studentInstitutionId
  ) {
    return true;
  }

  // Mentor in-charge can manage students in their assigned institution
  if (
    userAccess.isMentorIncharge &&
    studentInstitutionId &&
    userAccess.mentorInchargeInstitutionId === studentInstitutionId
  ) {
    return true;
  }

  return false;
}

/**
 * Check if user can manage staff/mentors
 * Super admin, institution admin, and mentor in-charge can manage staff (within their scope)
 */
export function canManageStaff(
  userAccess: UserAccess,
  staffInstitutionId?: string,
  staffDepartmentId?: string
): boolean {
  // Super admin can manage all staff
  if (userAccess.isSuperAdmin || userAccess.role === 'super_admin') {
    return true;
  }

  // Institution admin can manage staff in their institution
  if (
    userAccess.role === 'institution_admin' &&
    staffInstitutionId &&
    userAccess.institutionId === staffInstitutionId
  ) {
    return true;
  }

  // Mentor in-charge can manage staff/mentors in their assigned institution
  if (
    userAccess.isMentorIncharge &&
    staffInstitutionId &&
    userAccess.mentorInchargeInstitutionId === staffInstitutionId
  ) {
    return true;
  }

  return false;
}

/**
 * Get accessible institution IDs for user
 * Returns null for super admin (all institutions)
 * Returns array with single institution ID for institution admins
 */
export function getAccessibleInstitutionIds(userAccess: UserAccess): string[] | null {
  // Super admin can access all institutions
  if (userAccess.isSuperAdmin || userAccess.role === 'super_admin') {
    return null; // null means "all"
  }

  // Institution admins can only access their institution
  if (userAccess.institutionId) {
    return [userAccess.institutionId];
  }

  return [];
}

/**
 * Get accessible department IDs for user
 * Returns null for super admin, institution admin, and mentor in-charge (all departments)
 */
export function getAccessibleDepartmentIds(userAccess: UserAccess): string[] | null {
  // Super admin can access all departments
  if (userAccess.isSuperAdmin || userAccess.role === 'super_admin') {
    return null; // null means "all"
  }

  // Institution admin can access all departments in their institution
  if (userAccess.role === 'institution_admin') {
    return null; // Will be filtered by institution
  }

  // Mentor in-charge can access all departments in their assigned institution
  if (userAccess.isMentorIncharge) {
    return null; // Will be filtered by institution
  }

  return [];
}
