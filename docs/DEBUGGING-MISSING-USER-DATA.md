# Debugging: Missing User Data Issue

## 🔍 Issue Summary

Users reported missing data for mentors, directors (institution admins), and students in the Mentor Module application.

## 🚨 Root Causes Identified

### Issue 1: Staff API Missing Access Control Filters ⚠️

**File:** `app/api/jkkn/staff/route.ts`

**Problem:**
- The staff endpoint was NOT applying institution-based access control filtering
- All users could see ALL staff from ALL institutions, regardless of their role
- Students API has proper filtering, but staff API was missing it entirely

**Impact:**
- Institution admins saw staff from other institutions
- Regular mentors saw staff they shouldn't access
- Data leakage across institutional boundaries
- **After filtering was applied, users with NULL institution_id were excluded → DATA DISAPPEARED**

**Fix Applied:**
```typescript
// ✅ NOW WITH ACCESS CONTROL
const userAccess = await getUserAccess();
if (!userAccess) return 401;

const staffWithIds = transformedStaff.map((staff: any) => ({
  ...staff,
  ...extractInstitutionDepartmentIds(staff)
}));

const filteredData = applyAccessFilters(staffWithIds, userAccess);
```

---

### Issue 2: Users Missing `institution_id` and `department_id` ⚠️

**File:** Database `users` table

**Problem:**
Found **6 users** with NULL `institution_id` or `department_id`:

| Email | Role | Institution ID | Department ID | Status |
|-------|------|----------------|---------------|---------|
| `thankamaniammal@jkkn.ac.in` | faculty | NULL | NULL | ❌ Missing both |
| `automation@jkkn.ac.in` | mentor | NULL | NULL | ❌ Missing both |
| `vijaythiyagarajan.j@jkkn.ac.in` | hod | NULL | NULL | ❌ Missing both |
| `drerdeepak@jkkn.ac.in` | faculty | NULL | NULL | ❌ Missing both |
| `faculty@jkkn.ac.in` | mentor | NULL | NULL | ❌ Missing both |
| `principal@jkkn.ac.in` | institution_admin | JKKN-COLLEGE | NULL | ⚠️ Dept NULL is OK for admin |

**Impact:**
- Access control filters by `institution_id`
- When `record.institution_id === userAccess.institutionId` is checked:
  - If `record.institution_id` is NULL → comparison fails
  - Record gets filtered out → **DATA DISAPPEARS FROM API RESPONSES**

**Why This Happens:**
1. User authenticates via MyJKKN SSO
2. User record created in local DB from JKKN token data
3. If JKKN token doesn't include `institution_id` or `department_id`, local user has NULL values
4. When access filters run, NULL values don't match → user's data excluded

**Verification Query:**
```sql
SELECT
  id, email, full_name, role,
  institution_id, department_id,
  jkkn_user_id
FROM users
WHERE
  (institution_id IS NULL OR department_id IS NULL)
  AND role NOT IN ('super_admin')
ORDER BY created_at DESC;
```

---

### Issue 3: Role Confusion - "director" vs "institution_admin" ⚠️

**Files:** `lib/middleware/access-control.ts`, multiple access control files

**Problem:**
User mentioned "director" role, but the codebase uses `institution_admin`. Additionally, found unrecognized roles:

**Current roles in database:**
- ✅ `mentor` (307 users) - Recognized
- ✅ `super_admin` (4 users) - Recognized
- ✅ `institution_admin` (3 users) - **This is what the user calls "director"**
- ❌ `faculty` (2 users) - **NOT in AccessLevel type** (NOW FIXED)
- ❌ `hod` (1 user) - **NOT in AccessLevel type** (NOW FIXED)

**Previous AccessLevel Type:**
```typescript
// ❌ BEFORE - Missing roles
export type AccessLevel = 'super_admin' | 'institution_admin' | 'mentor' | 'student';
```

**Fixed AccessLevel Type:**
```typescript
// ✅ AFTER - All roles supported
export type AccessLevel =
  | 'super_admin'
  | 'institution_admin'  // Directors
  | 'mentor'
  | 'student'
  | 'faculty'  // NEW - Faculty members
  | 'hod';     // NEW - Head of Department
```

**Access Level Hierarchy:**
```typescript
const levelHierarchy: Record<AccessLevel, number> = {
  super_admin: 1,        // Highest - full system access
  institution_admin: 2,  // Directors - institution-wide access
  hod: 3,               // HOD - department-level elevated permissions
  faculty: 3,           // Faculty - same level as mentors
  mentor: 3,            // Mentors - standard access
  student: 4,           // Lowest - limited access
};
```

**Impact:**
- Users with role `faculty` or `hod` were not recognized by the type system
- TypeScript errors in access control logic
- These users may have been treated incorrectly or defaulted to lowest permissions
- "Director" users are actually `institution_admin` in the code (no role rename needed)

---

## ✅ Fixes Applied

### 1. Added Access Control to Staff API

**File:** `app/api/jkkn/staff/route.ts`

**Changes:**
- ✅ Import `getUserAccess` and access filter utilities
- ✅ Add `extractInstitutionDepartmentIds()` helper function
- ✅ Get user access level at start of request
- ✅ Extract institution/department IDs from staff data
- ✅ Apply access filters: `applyAccessFilters(staffWithIds, userAccess)`
- ✅ Update metadata to reflect filtered count
- ✅ Add extensive logging for debugging

**Before:**
```typescript
// ❌ No access control
return NextResponse.json({
  success: true,
  data: transformedStaff,
  metadata: metadata,
});
```

**After:**
```typescript
// ✅ With access control
const filteredData = applyAccessFilters(staffWithIds, userAccess);
const metadata = updateMetadata(originalMetadata, filteredData.length, filtersApplied);

return NextResponse.json({
  success: true,
  data: filteredData,
  metadata: metadata,
  accessLevel: userAccess.role,
});
```

---

### 2. Added Support for Missing Roles

**File:** `lib/middleware/access-control.ts`

**Changes:**
- ✅ Added `faculty` and `hod` to `AccessLevel` type
- ✅ Updated access level hierarchy (both at level 3)
- ✅ Updated `getAccessLevelLabel()` with friendly names
- ✅ Updated `getAccessLevelVariant()` for UI badges
- ✅ Added comments explaining role equivalence

**Access Level Labels:**
```typescript
{
  super_admin: 'Super Admin',
  institution_admin: 'Institution Admin (Director)',  // Clarified
  hod: 'Head of Department',                         // NEW
  faculty: 'Faculty',                                 // NEW
  mentor: 'Mentor',
  student: 'Student',
}
```

---

### 3. Created Tools to Fix Missing Institution Data

#### A. SQL Diagnostic Script

**File:** `scripts/fix-missing-user-institutions.sql`

**Purpose:**
- Identify users with NULL `institution_id` or `department_id`
- Provide manual update templates
- Verification queries

**Usage:**
```bash
# Run in Supabase SQL Editor or via CLI
psql -f scripts/fix-missing-user-institutions.sql
```

#### B. Automated Sync Script

**File:** `scripts/sync-user-institutions.ts`

**Purpose:**
- Automatically fetch institution/department data from JKKN API
- Update local database for users with NULL values
- Provides detailed logging and summary

**Usage:**
```bash
# Run the sync script
npx tsx scripts/sync-user-institutions.ts
```

**What it does:**
1. Finds all users with NULL `institution_id` or `department_id`
2. For each user, fetches their staff data from JKKN API using `jkkn_user_id`
3. Extracts `institution_id` and `department_id` from JKKN response
4. Updates local database with the correct values
5. Provides summary report

**Example Output:**
```
🔄 Starting user institution sync...

📋 Found 5 users with missing data:

👤 Processing: DR. THANKAMANI AMMAL K (thankamaniammal@jkkn.ac.in)
   Role: faculty
   Current: institution=NULL, department=NULL
   JKKN API: institution=5de4fba1-4564-41ed-8c73-5d948b74b843, department=4884e33b-9288-4725-93b7-fb841e331d4e
   ✅ Updated successfully

============================================================
📊 Sync Summary:
   Total users processed: 5
   ✅ Successfully updated: 5
   ❌ Failed: 0
============================================================

✅ All users now have institution and department data!
```

---

## 🔍 How Access Control Works

### Institution-Based Filtering

```typescript
// lib/utils/api-filters.ts
export function applyAccessFilters<T>(
  data: T[],
  userAccess: UserAccess,
  institutionField: string = 'institution_id',
  departmentField: string = 'department_id'
): T[] {
  const institutionFilter = getInstitutionFilter(userAccess);

  // Filter by institution
  if (institutionFilter !== null) {
    data = data.filter(
      (record) => record[institutionField] === institutionFilter
    );
  }

  return data;
}
```

### Who Sees What?

| User Role | Institution Filter | Department Filter | What They See |
|-----------|-------------------|-------------------|---------------|
| `super_admin` | NULL (no filter) | NULL | **Everything** - all institutions |
| `institution_admin` | Their institution ID | NULL | **Their institution only** |
| `hod` | Their institution ID | NULL | **Their institution only** |
| `faculty` | Their institution ID | NULL | **Their institution only** |
| `mentor` | Their institution ID | NULL | **Their institution only** |
| `student` | Their institution ID | NULL | **Their institution only** |

### Special Case: Mentor In-charge

Mentors can be assigned as "Mentor In-charge" via the `mentor_incharge_assignments` table:

```typescript
// Check if user has mentor in-charge assignment
const { data: inchargeAssignment } = await supabase
  .from('mentor_incharge_assignments')
  .select('institution_id')
  .eq('user_id', user.id)
  .maybeSingle();

// Mentor in-charge gets elevated permissions
if (userAccess.isMentorIncharge) {
  // Can access all mentors in their assigned institution
  // Similar to institution_admin but without changing role
}
```

---

## 🧪 Testing & Verification

### 1. Verify Users Have Institution Data

```sql
-- Check if any users still have missing data
SELECT
  role,
  COUNT(*) as total_users,
  COUNT(institution_id) as users_with_institution,
  COUNT(*) - COUNT(institution_id) as users_missing_institution
FROM users
WHERE role NOT IN ('super_admin')
GROUP BY role;

-- Expected result: users_missing_institution should be 0 for all roles
```

### 2. Test API Endpoints

#### A. Test Staff API Filtering

```bash
# As super admin - should see ALL staff
curl -X GET "http://localhost:3000/api/jkkn/staff?limit=100" \
  -H "Authorization: Bearer <super_admin_token>"
# Expected: All staff from all institutions

# As institution admin - should see only their institution's staff
curl -X GET "http://localhost:3000/api/jkkn/staff?limit=100" \
  -H "Authorization: Bearer <institution_admin_token>"
# Expected: Only staff from their institution
```

#### B. Test Students API Filtering

```bash
# Similar tests for students endpoint
curl -X GET "http://localhost:3000/api/jkkn/students?limit=10000" \
  -H "Authorization: Bearer <token>"
```

### 3. Test Different User Roles

Login as different user types and verify they see appropriate data:

| Test User | Role | Expected Behavior |
|-----------|------|-------------------|
| Super Admin | `super_admin` | See ALL data from ALL institutions |
| Director | `institution_admin` | See only their institution's data |
| HOD | `hod` | See only their institution's data |
| Faculty | `faculty` | See only their institution's data |
| Mentor | `mentor` | See only their institution's data |

---

## 📊 Data Summary (From Database Analysis)

**Total Users:** 317

**By Role:**
- Mentors: 307
- Super Admins: 4
- Institution Admins (Directors): 3
- Faculty: 2
- HOD: 1

**Users with Missing Data (BEFORE FIX):** 6
- 5 users missing both `institution_id` and `department_id`
- 1 institution admin missing only `department_id` (acceptable)

**Unique Institutions:** Multiple (verified via filtering logs)

---

## 🔧 How to Fix in Production

### Step 1: Run the Sync Script

```bash
# Install dependencies if needed
npm install

# Run the institution sync
npx tsx scripts/sync-user-institutions.ts
```

### Step 2: Verify Results

```sql
-- Check for any remaining users with missing data
SELECT * FROM users
WHERE (institution_id IS NULL OR department_id IS NULL)
AND role NOT IN ('super_admin');
```

### Step 3: Manual Fixes (if needed)

If the sync script fails for some users (e.g., JKKN API doesn't have their data):

```sql
-- Manually update specific users
UPDATE users
SET
  institution_id = '<correct_institution_id>',
  department_id = '<correct_department_id>',
  updated_at = NOW()
WHERE email = 'user@jkkn.ac.in';
```

### Step 4: Test Access Control

1. Login as different user roles
2. Navigate to Staff, Students, Mentors pages
3. Verify each role sees appropriate data
4. Check browser console and server logs for filtering logs

---

## 📝 Important Notes

### Institution ID Requirements

| Role | Requires `institution_id`? | Requires `department_id`? |
|------|---------------------------|---------------------------|
| `super_admin` | ❌ No | ❌ No |
| `institution_admin` | ✅ Yes | ⚠️ Optional (can be NULL) |
| `hod` | ✅ Yes | ✅ Yes |
| `faculty` | ✅ Yes | ✅ Yes |
| `mentor` | ✅ Yes | ✅ Yes |
| `student` | ✅ Yes | ✅ Yes |

### Why Data Was Missing

The data wasn't actually "deleted" or "lost". Here's what happened:

1. **Before Fix:**
   - Staff API had no access control
   - Everyone saw everything (security issue)
   - Users with NULL `institution_id` were visible

2. **After Applying Access Control (but before fixing NULL values):**
   - Staff API now filters by institution
   - Users with NULL `institution_id` don't match any filter
   - These users disappear from API responses → "missing data"

3. **After Running Sync Script:**
   - Users now have correct `institution_id` and `department_id`
   - Access filters work correctly
   - All data visible to appropriate users

### Director vs Institution Admin

- **User's term:** "Director"
- **Database role:** `institution_admin`
- **Access level:** Level 2 (institution-wide access)
- **No code changes needed** - just terminology clarification

---

## 🚀 Future Improvements

### 1. Prevent NULL Institution IDs

**Add database constraint:**
```sql
-- Add check constraint to prevent NULL values for non-admin roles
-- (This is a suggestion, not yet implemented)
ALTER TABLE users
ADD CONSTRAINT check_institution_id
CHECK (
  role = 'super_admin'
  OR (institution_id IS NOT NULL)
);
```

### 2. Automated Sync on Login

Update the authentication flow to:
1. When user logs in via MyJKKN SSO
2. If their `institution_id` is NULL
3. Automatically fetch from JKKN API
4. Update local database

**File to modify:** `lib/auth/get-current-user.ts`

### 3. Better Error Messages

When data is filtered out, show helpful messages:

```typescript
if (filteredData.length === 0 && originalData.length > 0) {
  console.warn(
    `[Access Control] All ${originalData.length} records filtered out. ` +
    `User ${userAccess.email} (${userAccess.role}) may have NULL institution_id.`
  );
}
```

---

## 📞 Support

If issues persist after running the sync script:

1. Check server logs for access control filtering messages
2. Verify user has correct `institution_id` in database
3. Verify JKKN API returns institution data for the user
4. Check if user's role is recognized in `AccessLevel` type
5. Contact system administrator with user email and role

---

## ✅ Summary

**Problems Found:**
1. ❌ Staff API missing access control filters
2. ❌ 6 users with NULL `institution_id` or `department_id`
3. ❌ Missing support for `faculty` and `hod` roles

**Fixes Applied:**
1. ✅ Added access control to Staff API
2. ✅ Created sync script to fix NULL institution data
3. ✅ Added `faculty` and `hod` to AccessLevel type
4. ✅ Updated all access control logic to support new roles

**Next Steps:**
1. Run `npx tsx scripts/sync-user-institutions.ts`
2. Verify all users now have institution data
3. Test access control with different user roles
4. Monitor logs for any filtering issues

---

**Last Updated:** 2025-11-22
**Documentation Version:** 1.0
