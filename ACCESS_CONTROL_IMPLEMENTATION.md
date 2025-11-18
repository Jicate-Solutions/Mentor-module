# Access Control Implementation - 2 Levels

## Overview
Implemented 2-level role-based access control for institution-wise data filtering.

## Access Levels Implemented

### ✅ Level 1: Super Admin
- **Access**: All institutions, all departments, all data
- **Can**: View and manage everything across the entire system
- **Database Role**: `super_admin`

### ✅ Level 2: Institution Admin
- **Access**: Own institution only, ALL departments within institution
- **Can**: View and manage all data within their institution (including all departments)
- **Database Role**: `institution_admin`

### ⏸️ Level 3: Mentor (NOT IMPLEMENTED)
- **Status**: Database structure ready, but filtering logic not active
- **Future**: Will only see assigned students

### ⏸️ Level 4: Student (NOT IMPLEMENTED)
- **Status**: Database structure ready, but filtering logic not active
- **Future**: Will only see own data

---

## Access Level Hierarchy

```
┌─────────────────────────────────────────────┐
│ Level 1: Super Admin                       │
│ - Access: ALL institutions, ALL data       │
└─────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────┐
│ Level 2: Institution Admin                 │
│ - Access: Own institution only             │
│ - Can see: ALL departments, ALL staff,     │
│   ALL students within their institution    │
└─────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────┐
│ Level 3: Mentor (Not Implemented)          │
│ - Future: Only assigned students           │
└─────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────┐
│ Level 4: Student (Not Implemented)         │
│ - Future: Own data only                    │
└─────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Database Migration

**Initial Migration (`add_access_control_roles_v2`):**
- Mapped existing roles to access control system:
  - `administrator` → `super_admin`
  - `principal` → `institution_admin`
  - `hod` → `institution_admin`
  - `faculty` → `mentor` (not filtered yet)

**Level 3 Removal Migration (`remove_department_admin_level`):**
- Removed department-level access control
- Migrated all `department_admin` users to `institution_admin`
- Updated role constraint to remove `department_admin`
- Simplified access control functions
- Updated RLS policies to support only 2 levels

**Database Functions Created:**
- `get_user_access_level(user_id)` - Get user's role and IDs
- `can_access_institution(user_id, institution_id)` - Check institution access (Levels 1-2)
- `can_access_department(user_id, department_id, institution_id)` - Check department access (Levels 1-2)

**RLS Policies:**
- Added for `students` table (institution-level filtering)
- Added for `mentors` table (institution-level filtering)
- Performance indexes on role, institution_id, department_id

---

### 2. Backend - Access Control Middleware

**Files Created:**

#### `lib/middleware/access-control.ts`
Core access control logic:
- `getUserAccess()` - Get current user's access level from Supabase
- `canAccessInstitution()` - Check if user can access institution data
- `canAccessDepartment()` - Check if user can access department data (institution admins can access all)
- `getInstitutionFilter()` - Get institution filter for queries (null for super admin)
- `getDepartmentFilter()` - Always returns null (no department-level filtering)
- `requireAccess()` - Middleware to enforce auth on API routes
- `requireMinimumLevel()` - Require minimum access level

#### `lib/utils/permissions.ts`
Permission helper functions (updated for 2 levels):
- `canViewInstitution()`
- `canViewAllInstitutions()`
- `canViewDepartment()`
- `canViewAllDepartments()`
- `canViewStudent()`
- `canViewStaff()`
- `canManageInstitutions()`
- `canManageDepartments()`
- `canManageStudents()`
- `canManageStaff()`

#### `lib/utils/api-filters.ts`
API filtering utilities:
- `applyAccessFilters()` - Apply institution filters to data (no department filtering)
- `updateMetadata()` - Update pagination after filtering
- `wereFiltersApplied()` - Check if filters were applied

#### `types/access-control.ts`
TypeScript type definitions:
- `AccessLevel` type (removed 'department_admin')
- `UserAccess` interface
- `AccessScope` interface
- `ACCESS_LEVEL_HIERARCHY` constant (2 levels)
- `ACCESS_LEVEL_META` constant (2 levels)

---

### 3. API Routes Updated

All API routes now enforce 2-level access control:

#### ✅ `/api/jkkn/institutions/route.ts`
- Checks user authentication
- Filters institutions based on user's access level
- Super admin sees all, institution admin sees only their institution

#### ✅ `/api/jkkn/departments/route.ts`
- Checks user authentication
- Filters by institution only (no department-level filtering)
- Institution admins see ALL departments in their institution

#### ✅ `/api/jkkn/students/route.ts`
- Checks user authentication
- Extracts institution_id from student data
- Applies institution filter only
- Institution admins see ALL students in their institution (all departments)

---

### 4. Frontend - UI Components

#### `hooks/useUserAccess.ts`
Client-side hook to get user's access info:
```typescript
const { accessInfo, loading } = useUserAccess();
// accessInfo contains: role, institutionId, departmentId, isSuperAdmin, isInstitutionAdmin
```

#### `components/ui/AccessLevelBadge.tsx`
Visual badge component showing user's access level:
- Color-coded by role (Red for super admin, Green for institution admin)
- Icon for each level
- Sizes: sm, md, lg

#### Updated: `components/layout/DashboardLayout.tsx`
- Added AccessLevelBadge to header
- Shows user's current access level at all times

---

## Access Control Summary

### Data Flow

```
User Login
    ↓
User Record (with role, institution_id)
    ↓
API Request
    ↓
getUserAccess() - Extract user's access level
    ↓
Apply Filters:
  - Super Admin: No filter (see all)
  - Institution Admin: Filter by institution_id only
    ↓
Return Filtered Data
```

### Example: Institution Admin Views Students

1. User logs in as Institution Admin
2. User has:
   - `role`: `institution_admin`
   - `institution_id`: `inst_123`
3. User navigates to `/students`
4. API call to `/api/jkkn/students`
5. `getUserAccess()` extracts user's access level
6. `applyAccessFilters()` filters students:
   - Keep only students where `institution_id = 'inst_123'`
   - **No department filtering** - sees ALL students in institution
7. Return filtered list of students

---

## Testing the Implementation

### Test Scenarios

**1. Super Admin**
- Should see ALL institutions
- Should see ALL departments across all institutions
- Should see ALL students across all institutions
- Should see ALL staff across all institutions

**2. Institution Admin**
- Should see ONLY their institution
- Should see ALL departments in their institution
- Should see ALL students in their institution (all departments)
- Should see ALL staff in their institution (all departments)

### How to Test

1. **Check User Role in Database:**
```sql
SELECT id, email, role, institution_id, department_id
FROM users
WHERE email = 'your_email@example.com';
```

2. **Update User Role:**
```sql
-- Make user a super admin
UPDATE users
SET role = 'super_admin', is_super_admin = true
WHERE email = 'your_email@example.com';

-- Make user an institution admin
UPDATE users
SET role = 'institution_admin',
    institution_id = 'your_institution_id'
WHERE email = 'your_email@example.com';
```

3. **Login and Navigate:**
- Login with the test user
- Check the badge in the header (shows your role)
- Navigate to:
  - `/institutions` - Check filtered results
  - `/departments` - Check filtered results (all departments in your institution)
  - `/students` - Check filtered results (all students in your institution)
  - `/staff` - Check filtered results (all staff in your institution)

4. **Check Console Logs:**
- Open browser DevTools → Console
- Look for messages like:
  - `[Access Control] Filtered institutions for institution_admin: 1 results`
  - `[Access Filter] Institution filter applied: 25 records`

---

## Specific Access Rules

| **Role**            | **Institutions** | **Departments**     | **Students**         | **Staff**            |
|---------------------|------------------|---------------------|----------------------|----------------------|
| Super Admin         | All              | All                 | All                  | All                  |
| Institution Admin   | Own only         | All in institution  | All in institution   | All in institution   |
| Mentor              | Not Implemented  | Not Implemented     | Not Implemented      | Not Implemented      |
| Student             | Not Implemented  | Not Implemented     | Not Implemented      | Not Implemented      |

---

## Security Notes

### What's Protected:
✅ Database level (RLS policies - 2 levels)
✅ API level (middleware checks - 2 levels)
✅ UI level (visual indicators)

### What's NOT Protected (Future Work):
⚠️ Level 3 (Mentor) - Can currently see all institution data
⚠️ Level 4 (Student) - Can currently see all data

---

## Next Steps (When Implementing Levels 3 & 4)

### For Level 3 (Mentor):
1. Update `/api/mentor/list/route.ts` to filter by assigned students only
2. Add `mentor_students` join in filtering logic
3. Update RLS policies for mentor-specific access
4. Test mentor can only see their assigned students

### For Level 4 (Student):
1. Add student-specific RLS policies
2. Filter all data to show only student's own records
3. Prevent students from seeing other students' data
4. Test student can only access their own profile

---

## Files Changed/Created

### Created:
- ✅ `lib/middleware/access-control.ts`
- ✅ `lib/utils/permissions.ts`
- ✅ `lib/utils/api-filters.ts`
- ✅ `types/access-control.ts`
- ✅ `hooks/useUserAccess.ts`
- ✅ `components/ui/AccessLevelBadge.tsx`

### Modified:
- ✅ `app/api/jkkn/institutions/route.ts`
- ✅ `app/api/jkkn/departments/route.ts`
- ✅ `app/api/jkkn/students/route.ts`
- ✅ `components/layout/DashboardLayout.tsx`

### Database:
- ✅ Migration: `add_access_control_roles_v2`
- ✅ Migration: `remove_department_admin_level`

---

## Summary

**Implemented:**
- ✅ 2-level access control (Super Admin, Institution Admin)
- ✅ Database RLS policies for students and mentors
- ✅ API route filtering based on user access (institution-level only)
- ✅ Frontend visual indicators (badges)
- ✅ Helper functions for permission checks

**Removed:**
- ❌ Level 3 (Department Admin) - All department admins migrated to institution admins
- ❌ Department-level filtering - Institution admins see all departments

**Pending (Levels 3 & 4):**
- ⏸️ Mentor-specific filtering (assigned students only)
- ⏸️ Student-specific filtering (own data only)

**Access Control is now active for 2 levels only: Super Admin and Institution Admin!** 🎉
