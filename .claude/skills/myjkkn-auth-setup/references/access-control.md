# Role-Based Access Control (RBAC)

## Overview

This document details the 3-level access control system and Mentor In-Charge assignments.

## Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    LEVEL 1: SUPER ADMIN                         │
│  - super_admin, administrator                                    │
│  - Full access to ALL institutions, departments, users          │
│  - Can manage system settings                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 LEVEL 2: INSTITUTION ADMIN                       │
│  - principal, digital_coordinator                                │
│  - Access to THEIR institution only                              │
│  - Can manage all departments in their institution              │
│  - Can assign Mentor In-Charge                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LEVEL 3: MENTOR                               │
│  - faculty, hod                                                  │
│  - Access to their assigned students                            │
│  - Can create/manage counseling sessions                        │
│  - HOD has department-level view                                │
│  * Mentor In-Charge has elevated permissions                    │
└─────────────────────────────────────────────────────────────────┘
```

## Role Mapping

MyJKKN roles are mapped to internal database roles:

```typescript
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
```

## Allowed vs Blocked Roles

```typescript
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
```

**Blocked Roles**:
- `staff` - Staff members don't have mentor access
- `student` - Students access different portal

## UserAccess Interface

```typescript
export interface UserAccess {
  userId: string;
  role: AccessLevel;
  institutionId: string | null;
  departmentId: string | null;
  isSuperAdmin: boolean;
  isMentorIncharge: boolean;
  mentorInchargeInstitutionId: string | null;
}

export type AccessLevel = 
  | 'super_admin' 
  | 'institution_admin' 
  | 'mentor' 
  | 'student' 
  | 'faculty' 
  | 'hod';
```

## Getting User Access

```typescript
export async function getUserAccess(): Promise<UserAccess | null> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return null;
    }

    // Check for Mentor In-Charge assignment
    const supabase = createAdminClient();
    const { data: inchargeAssignment } = await supabase
      .from('mentor_incharge_assignments')
      .select('institution_id')
      .eq('user_id', user.id)
      .maybeSingle();

    return {
      userId: user.id,
      role: user.role as AccessLevel,
      institutionId: user.institution_id,
      departmentId: user.department_id,
      isSuperAdmin: user.is_super_admin || user.role === 'super_admin',
      isMentorIncharge: !!inchargeAssignment,
      mentorInchargeInstitutionId: inchargeAssignment?.institution_id || null,
    };
  } catch (error) {
    return null;
  }
}
```

## Access Control Functions

### canAccessInstitution

```typescript
export function canAccessInstitution(
  userAccess: UserAccess,
  targetInstitutionId: string
): boolean {
  // Level 1: Super admin can access everything
  if (userAccess.isSuperAdmin || userAccess.role === 'super_admin') {
    return true;
  }

  // Level 2: Institution admin can access their institution
  if (userAccess.role === 'institution_admin' && 
      userAccess.institutionId === targetInstitutionId) {
    return true;
  }

  // Level 3: Mentor in-charge can access assigned institution
  if (userAccess.isMentorIncharge && 
      userAccess.mentorInchargeInstitutionId === targetInstitutionId) {
    return true;
  }

  // Others can access their own institution
  return userAccess.institutionId === targetInstitutionId;
}
```

### canAccessDepartment

```typescript
export function canAccessDepartment(
  userAccess: UserAccess,
  targetDepartmentId: string,
  targetInstitutionId?: string
): boolean {
  // Super admin: full access
  if (userAccess.isSuperAdmin || userAccess.role === 'super_admin') {
    return true;
  }

  // Institution admin: all departments in their institution
  if (userAccess.role === 'institution_admin' &&
      targetInstitutionId &&
      userAccess.institutionId === targetInstitutionId) {
    return true;
  }

  // Mentor in-charge: all departments in assigned institution
  if (userAccess.isMentorIncharge &&
      targetInstitutionId &&
      userAccess.mentorInchargeInstitutionId === targetInstitutionId) {
    return true;
  }

  return false;
}
```

### getInstitutionFilter

Returns the institution ID to filter queries by, or null for no filtering:

```typescript
export function getInstitutionFilter(userAccess: UserAccess): string | null {
  // Super admin: no filter (sees all institutions)
  if (userAccess.isSuperAdmin || userAccess.role === 'super_admin') {
    return null;
  }

  // Institution admin: filter by their institution
  if (userAccess.role === 'institution_admin') {
    return userAccess.institutionId;
  }

  // Mentor in-charge: filter by ASSIGNED institution (not personal)
  if (userAccess.isMentorIncharge && userAccess.mentorInchargeInstitutionId) {
    return userAccess.mentorInchargeInstitutionId;
  }

  // Others: filter by personal institution
  return userAccess.institutionId;
}
```

## Mentor In-Charge System

### What is Mentor In-Charge?

Mentor In-Charge is an **assignment**, not a role change. It gives selected mentors elevated permissions within their institution:

- View all mentors in the institution
- View all students in the institution
- Generate institution-wide reports
- Manage mentor assignments

### Assignment Structure

```typescript
interface InchargeScope {
  scopeType: 'institution' | 'department';
  institutionId: string;
  departmentIds: string[];  // Empty for institution-wide
}
```

### Database Table

```sql
CREATE TABLE mentor_incharge_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) UNIQUE,
  institution_id UUID NOT NULL REFERENCES institutions(id),
  department_id UUID REFERENCES departments(id),  -- NULL = institution-wide
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, institution_id)
);
```

### Checking In-Charge Status

```typescript
export async function isMentorIncharge(userId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    const { data } = await supabase
      .from('mentor_incharge_assignments')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    return !!data;
  } catch (error) {
    return false;
  }
}
```

### Getting In-Charge Scope

```typescript
export async function getMentorInchargeScope(userId: string): Promise<InchargeScope | null> {
  try {
    const supabase = createAdminClient();

    const { data } = await supabase
      .from('mentor_incharge_assignments')
      .select('institution_id, department_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data) return null;

    return {
      scopeType: data.department_id ? 'department' : 'institution',
      institutionId: data.institution_id,
      departmentIds: data.department_id ? [data.department_id] : [],
    };
  } catch (error) {
    return null;
  }
}
```

## Protected Routes

### Require Authentication

```typescript
export async function requireAccess(request: NextRequest): Promise<UserAccess> {
  const userAccess = await getUserAccess();

  if (!userAccess) {
    throw new Error('Unauthorized: No valid user session');
  }

  return userAccess;
}
```

### Require Minimum Level

```typescript
export async function requireMinimumLevel(
  request: NextRequest,
  minimumLevel: AccessLevel
): Promise<UserAccess> {
  const userAccess = await requireAccess(request);

  const levelHierarchy: Record<AccessLevel, number> = {
    super_admin: 1,
    institution_admin: 2,
    hod: 3,
    faculty: 3,
    mentor: 3,
    student: 4,
  };

  const userLevel = levelHierarchy[userAccess.role];
  const requiredLevel = levelHierarchy[minimumLevel];

  if (userLevel > requiredLevel) {
    throw new Error(
      `Forbidden: Requires ${minimumLevel} access level or higher`
    );
  }

  return userAccess;
}
```

## Usage Examples

### Protected API Route

```typescript
// app/api/mentors/route.ts
import { getUserAccess, getInstitutionFilter } from '@/lib/middleware/access-control';

export async function GET(request: NextRequest) {
  const userAccess = await getUserAccess();
  
  if (!userAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const institutionFilter = getInstitutionFilter(userAccess);
  
  let query = supabase.from('mentors').select('*');
  
  if (institutionFilter) {
    query = query.eq('institution_id', institutionFilter);
  }

  const { data, error } = await query;
  
  return NextResponse.json(data);
}
```

### Role-Based UI

```typescript
// components/Dashboard.tsx
function Dashboard() {
  const { user } = useAuth();
  
  const canViewAllInstitutions = user?.is_super_admin;
  const canManageMentors = ['super_admin', 'institution_admin', 'principal']
    .includes(user?.role);
  
  return (
    <div>
      {canViewAllInstitutions && <InstitutionSelector />}
      {canManageMentors && <MentorManagement />}
      <MyStudents />
    </div>
  );
}
```

### Conditional Actions

```typescript
// Check if user can assign students to a specific mentor
const canAssign = await canAssignStudents(
  userAccess,
  targetMentorId,
  targetMentorInstitutionId
);

if (!canAssign) {
  return NextResponse.json(
    { error: 'You cannot assign students to this mentor' },
    { status: 403 }
  );
}
```

## Display Labels

```typescript
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

export function getAccessLevelVariant(
  role: AccessLevel
): 'default' | 'success' | 'warning' | 'error' {
  const variants = {
    super_admin: 'error',
    institution_admin: 'success',
    hod: 'warning',
    faculty: 'default',
    mentor: 'default',
    student: 'default',
  };

  return variants[role] || 'default';
}
```

## Default Routes by Role

```typescript
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
```

## Route Permissions

```typescript
export function canAccessRoute(role: string, route: string): boolean {
  // Super admin can access everything
  if (role === 'super_admin' || role === 'administrator') {
    return true;
  }

  const routePermissions: Record<string, string[]> = {
    '/admin': ['super_admin', 'administrator', 'digital_coordinator'],
    '/mentor': ['faculty', 'hod', 'principal', 'administrator', 'digital_coordinator', 'super_admin'],
    '/dashboard': ['hod', 'principal', 'administrator', 'digital_coordinator', 'super_admin'],
  };

  const allowedRoles = routePermissions[route];
  if (!allowedRoles) {
    return true; // Public route
  }

  return allowedRoles.includes(role);
}
```
