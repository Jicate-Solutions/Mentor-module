/**
 * Access Control Types
 * TypeScript definitions for role-based access control
 */

/**
 * Access levels in the system (2 levels implemented)
 */
export type AccessLevel = 'super_admin' | 'institution_admin' | 'mentor' | 'student';

/**
 * User access information
 */
export interface UserAccess {
  userId: string;
  role: AccessLevel;
  institutionId: string | null;
  departmentId: string | null;
  isSuperAdmin: boolean;
}

/**
 * Access scope for filtering data
 */
export interface AccessScope {
  institutionIds: string[] | null; // null means all institutions
  departmentIds: string[] | null; // null means all departments
}

/**
 * Permission check result
 */
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Access level metadata
 */
export interface AccessLevelMeta {
  level: number; // 1 = highest, 5 = lowest
  label: string;
  description: string;
  canAccessAllInstitutions: boolean;
  canAccessAllDepartments: boolean;
}

/**
 * Access level hierarchy (for permission checks)
 */
export const ACCESS_LEVEL_HIERARCHY: Record<AccessLevel, number> = {
  super_admin: 1,
  institution_admin: 2,
  mentor: 3,
  student: 4,
};

/**
 * Access level metadata map
 */
export const ACCESS_LEVEL_META: Record<AccessLevel, AccessLevelMeta> = {
  super_admin: {
    level: 1,
    label: 'Super Admin',
    description: 'Full system access across all institutions and departments',
    canAccessAllInstitutions: true,
    canAccessAllDepartments: true,
  },
  institution_admin: {
    level: 2,
    label: 'Institution Admin',
    description: 'Access to all data within their institution',
    canAccessAllInstitutions: false,
    canAccessAllDepartments: true, // Within their institution
  },
  mentor: {
    level: 3,
    label: 'Mentor',
    description: 'Access to assigned students only (Level 3 - Not Implemented)',
    canAccessAllInstitutions: false,
    canAccessAllDepartments: false,
  },
  student: {
    level: 4,
    label: 'Student',
    description: 'Access to own data only (Level 4 - Not Implemented)',
    canAccessAllInstitutions: false,
    canAccessAllDepartments: false,
  },
};

/**
 * Resource types that can be access-controlled
 */
export type ResourceType =
  | 'institution'
  | 'department'
  | 'student'
  | 'staff'
  | 'mentor'
  | 'program'
  | 'course'
  | 'counseling_session';

/**
 * Action types that can be permission-checked
 */
export type ActionType = 'view' | 'create' | 'update' | 'delete' | 'manage';

/**
 * Permission check parameters
 */
export interface PermissionCheck {
  userAccess: UserAccess;
  resource: ResourceType;
  action: ActionType;
  targetInstitutionId?: string;
  targetDepartmentId?: string;
}
