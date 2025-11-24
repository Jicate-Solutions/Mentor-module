# Role-Based Institution Filtering - Testing & Verification Guide

## Critical Bug Fix Applied

### 🔴 **Bug Found & Fixed: Mentor In-Charge Filter Priority**

**Location:** [lib/middleware/access-control.ts:144-166](../lib/middleware/access-control.ts#L144-L166)

**Problem:**
The `getInstitutionFilter()` function was **not prioritizing** `mentorInchargeInstitutionId` over `institutionId`, causing mentor in-charge users to see data from their **personal institution** instead of their **assigned institution**.

**Example:**
- Dr. Kumar from **Dental College** is assigned as **Mentor In-Charge for Engineering College**
- **Before Fix:** Dr. Kumar sees Dental programs/courses (wrong! ❌)
- **After Fix:** Dr. Kumar sees Engineering programs/courses (correct! ✅)

**Code Changes:**

```typescript
// BEFORE (WRONG ❌)
export function getInstitutionFilter(userAccess: UserAccess): string | null {
  if (userAccess.isSuperAdmin) return null;
  if (userAccess.role === 'institution_admin') return userAccess.institutionId;

  // BUG: Returns personal institution even for mentor in-charge!
  return userAccess.institutionId; // ❌ Ignores mentorInchargeInstitutionId
}

// AFTER (CORRECT ✅)
export function getInstitutionFilter(userAccess: UserAccess): string | null {
  if (userAccess.isSuperAdmin) return null;
  if (userAccess.role === 'institution_admin') return userAccess.institutionId;

  // FIX: Check mentor in-charge assignment FIRST
  if (userAccess.isMentorIncharge && userAccess.mentorInchargeInstitutionId) {
    return userAccess.mentorInchargeInstitutionId; // ✅ Returns assigned institution
  }

  return userAccess.institutionId; // Fallback to personal institution
}
```

---

## Role-Based Filtering Test Matrix

| Role | Access Scope | Institution Filter | Expected Behavior |
|------|-------------|-------------------|-------------------|
| **Super Admin** | All institutions | `null` (no filter) | Sees ALL data from ALL institutions |
| **Institution Admin (Dental)** | Dental College only | `dental-college-id` | Sees ONLY Dental data |
| **Mentor In-Charge (Engineering)** | Engineering College | `engineering-college-id` | Sees ONLY Engineering data (even if from different institution) |
| **HOD (Mechanical Dept)** | Own institution | `engineering-college-id` | Sees ONLY Engineering data |
| **Faculty (Arts)** | Own institution | `arts-college-id` | Sees ONLY Arts data |
| **Regular Mentor** | Own institution | `own-institution-id` | Sees ONLY their institution's data |

---

## Test Scenarios

### Test 1: Super Admin - No Filtering

**User:**
- Role: `super_admin`
- Personal Institution: Any (e.g., Dental)
- Is Super Admin: `true`

**Expected API Responses:**

```bash
GET /api/jkkn/institutions
# Should return: ALL institutions (Dental, Engineering, Arts, Management)

GET /api/jkkn/departments
# Should return: ALL departments from ALL institutions

GET /api/jkkn/programs
# Should return: B.Tech CSE, BDS, BA English, MBA, etc. (ALL programs)

GET /api/jkkn/courses
# Should return: ALL courses from ALL institutions

GET /api/mentor/list?search=kumar
# Should return: Dr. Kumar from ALL institutions (Dental, Engineering, etc.)
```

**Console Logs to Verify:**
```
[Access Control] Super Admin - No institution filter applied
[AFTER Access Control] Filtered mentors: 150 (from 150)  ← No filtering
[Programs] No institution filter applied
```

---

### Test 2: Institution Admin - Own Institution Only

**User:**
- Role: `institution_admin`
- Personal Institution: `dental-college-id`
- Is Super Admin: `false`

**Expected API Responses:**

```bash
GET /api/jkkn/institutions
# Should return: ONLY "JKKN Dental College"

GET /api/jkkn/departments
# Should return: ONLY Dental departments (Orthodontics, Periodontics, Prosthodontics)

GET /api/jkkn/programs
# Should return: ONLY BDS, MDS programs (NO B.Tech, NO MBA)

GET /api/jkkn/courses
# Should return: ONLY Dental courses (NO Computer Networks, NO Finance)

GET /api/mentor/list?search=kumar
# Should return: ONLY Dr. Kumar from Dental College (NOT Engineering)
```

**Console Logs to Verify:**
```
[Access Control] Institution Admin - Filtering by institution: dental-college-id
[AFTER Access Control] Filtered mentors: 35 (from 150)
[Programs] Filtered for institution dental-college-id: 8 results
[Departments] Filtered for institution dental-college-id: 5 results
```

---

### Test 3: Mentor In-Charge - Assigned Institution (CRITICAL TEST)

**User:**
- Role: `mentor` (regular faculty role)
- Personal Institution: `dental-college-id` (Dental College)
- **Mentor In-Charge Assignment:** `engineering-college-id` (Engineering College)
- `isMentorIncharge`: `true`
- `mentorInchargeInstitutionId`: `engineering-college-id`

**Expected API Responses:**

```bash
GET /api/jkkn/institutions
# Should return: ONLY "JKKN Engineering College" (NOT Dental!)

GET /api/jkkn/departments
# Should return: ONLY Engineering departments (CSE, ECE, Mechanical, Civil)
# Should NOT return: Dental departments

GET /api/jkkn/programs
# Should return: ONLY B.Tech CSE, B.Tech ECE, M.Tech, etc.
# Should NOT return: BDS, MDS

GET /api/jkkn/courses
# Should return: ONLY Engineering courses (Data Structures, Digital Electronics)
# Should NOT return: Dental courses (Orthodontics, Periodontics)

GET /api/mentor/list?search=kumar
# Should return: ONLY Engineering faculty
# Should NOT return: Dental faculty
```

**Console Logs to Verify:**
```
[Access Control] Mentor In-Charge - Filtering by assigned institution: engineering-college-id
[BEFORE Access Control] Total mentors: 150
[AFTER Access Control] Filtered mentors: 42 (from 150)  ← Engineering faculty only
[Programs] Filtered for institution engineering-college-id: 12 results
```

**Verification Checklist:**
- ✅ Filter uses `engineering-college-id` (assigned institution)
- ❌ Filter does NOT use `dental-college-id` (personal institution)
- ✅ Only Engineering data is visible
- ❌ Dental data is NOT visible

---

### Test 4: HOD (Head of Department) - Own Institution

**User:**
- Role: `hod`
- Personal Institution: `arts-college-id`
- Department: `english-dept-id`
- Is Mentor In-Charge: `false`

**Expected API Responses:**

```bash
GET /api/jkkn/institutions
# Should return: ONLY "JKKN Arts College"

GET /api/jkkn/departments
# Should return: ONLY Arts departments (English, Tamil, History, Economics)

GET /api/jkkn/programs
# Should return: ONLY BA English, BA Tamil, BA History, MA programs

GET /api/jkkn/courses
# Should return: ONLY Arts courses (Poetry, Literature, History courses)

GET /api/mentor/list?search=kumar
# Should return: ONLY Arts faculty
```

**Console Logs to Verify:**
```
[Access Control] Non-admin user (hod) - Filtering by personal institution: arts-college-id
[AFTER Access Control] Filtered mentors: 28 (from 150)
[Programs] Filtered for institution arts-college-id: 6 results
```

---

### Test 5: Regular Faculty - Own Institution

**User:**
- Role: `faculty`
- Personal Institution: `management-college-id`
- Is Mentor In-Charge: `false`

**Expected API Responses:**

```bash
GET /api/jkkn/institutions
# Should return: ONLY "JKKN School of Management"

GET /api/jkkn/departments
# Should return: ONLY Management departments (Finance, Marketing, HR, Operations)

GET /api/jkkn/programs
# Should return: ONLY MBA, PGDM programs

GET /api/jkkn/courses
# Should return: ONLY Management courses (Financial Management, Marketing Strategy)

GET /api/mentor/list?search=kumar
# Should return: ONLY Management faculty
```

**Console Logs to Verify:**
```
[Access Control] Non-admin user (faculty) - Filtering by personal institution: management-college-id
[AFTER Access Control] Filtered mentors: 22 (from 150)
[Programs] Filtered for institution management-college-id: 4 results
```

---

## Manual Testing Steps

### Step 1: Login as Different Roles

Use the browser's developer tools to check which institution filter is applied:

1. **Open DevTools** (F12)
2. **Go to Console tab**
3. **Login as test user**
4. **Navigate to Mentor Directory** (`/mentor`)
5. **Search for mentors**
6. **Check console logs**

### Step 2: Verify Filter Logs

Look for these console log patterns:

```typescript
// Super Admin
"[Access Control] Super Admin - No institution filter applied"

// Institution Admin
"[Access Control] Institution Admin - Filtering by institution: dental-college-id"

// Mentor In-Charge (CRITICAL - verify this shows ASSIGNED institution!)
"[Access Control] Mentor In-Charge - Filtering by assigned institution: engineering-college-id"

// Regular Users
"[Access Control] Non-admin user (mentor) - Filtering by personal institution: arts-college-id"
```

### Step 3: Verify API Responses

Check that API responses match expected data:

```typescript
// Check Institutions API
const response = await fetch('/api/jkkn/institutions', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
console.log('Institutions:', data.data.map(i => i.name));
// Mentor in-charge should ONLY see assigned institution

// Check Programs API
const response = await fetch('/api/jkkn/programs', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
console.log('Programs:', data.data.map(p => p.name));
// Should ONLY show programs from filtered institution

// Check Mentors API
const response = await fetch('/api/mentor/list?search=kumar', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
console.log('Mentors:', data.mentors.map(m => ({ name: m.name, institution: m.institution })));
// Should ONLY show mentors from filtered institution
```

### Step 4: Verify Data Isolation

Create a table to verify data isolation:

| User Role | Should See | Should NOT See |
|-----------|------------|----------------|
| Dental Admin | Dental programs (BDS, MDS) | Engineering programs (B.Tech) ✅ |
| Engineering Mentor In-Charge | Engineering courses | Dental courses ✅ |
| Arts HOD | Arts departments | Engineering departments ✅ |
| Management Faculty | MBA courses | BDS courses ✅ |

---

## Automated Testing Script

### JavaScript Test Script

Create a test file: `scripts/test-institution-filtering.ts`

```typescript
import { getUserAccess, getInstitutionFilter } from '@/lib/middleware/access-control';

// Test cases
const testCases = [
  {
    name: 'Super Admin - No Filter',
    userAccess: {
      userId: 'user-1',
      role: 'super_admin',
      institutionId: 'dental-college-id',
      departmentId: null,
      isSuperAdmin: true,
      isMentorIncharge: false,
      mentorInchargeInstitutionId: null,
    },
    expectedFilter: null,
  },
  {
    name: 'Institution Admin - Own Institution',
    userAccess: {
      userId: 'user-2',
      role: 'institution_admin',
      institutionId: 'dental-college-id',
      departmentId: null,
      isSuperAdmin: false,
      isMentorIncharge: false,
      mentorInchargeInstitutionId: null,
    },
    expectedFilter: 'dental-college-id',
  },
  {
    name: 'Mentor In-Charge - Assigned Institution (CRITICAL)',
    userAccess: {
      userId: 'user-3',
      role: 'mentor',
      institutionId: 'dental-college-id', // Personal institution
      departmentId: 'orthodontics-dept-id',
      isSuperAdmin: false,
      isMentorIncharge: true,
      mentorInchargeInstitutionId: 'engineering-college-id', // Assigned institution
    },
    expectedFilter: 'engineering-college-id', // Should return ASSIGNED, not personal!
  },
  {
    name: 'Regular Faculty - Own Institution',
    userAccess: {
      userId: 'user-4',
      role: 'faculty',
      institutionId: 'arts-college-id',
      departmentId: 'english-dept-id',
      isSuperAdmin: false,
      isMentorIncharge: false,
      mentorInchargeInstitutionId: null,
    },
    expectedFilter: 'arts-college-id',
  },
];

// Run tests
console.log('🧪 Testing Institution Filtering Logic\n');

testCases.forEach((testCase) => {
  const result = getInstitutionFilter(testCase.userAccess);
  const passed = result === testCase.expectedFilter;

  console.log(`${passed ? '✅' : '❌'} ${testCase.name}`);
  console.log(`   Expected: ${testCase.expectedFilter}`);
  console.log(`   Received: ${result}`);

  if (!passed) {
    console.log(`   ⚠️ TEST FAILED!`);
  }
  console.log('');
});
```

**Run the test:**
```bash
npx tsx scripts/test-institution-filtering.ts
```

**Expected Output:**
```
🧪 Testing Institution Filtering Logic

✅ Super Admin - No Filter
   Expected: null
   Received: null

✅ Institution Admin - Own Institution
   Expected: dental-college-id
   Received: dental-college-id

✅ Mentor In-Charge - Assigned Institution (CRITICAL)
   Expected: engineering-college-id
   Received: engineering-college-id

✅ Regular Faculty - Own Institution
   Expected: arts-college-id
   Received: arts-college-id
```

---

## Database Verification

### Check Mentor In-Charge Assignments

```sql
-- View all mentor in-charge assignments
SELECT
  mia.id,
  u.email as user_email,
  u.full_name as user_name,
  u.institution_id as user_personal_institution,
  mia.institution_id as assigned_institution,
  i.name as assigned_institution_name
FROM mentor_incharge_assignments mia
JOIN users u ON mia.user_id = u.id
LEFT JOIN institutions i ON mia.institution_id = i.id
WHERE mia.deleted_at IS NULL;
```

**Expected Result:**
```
| user_email         | user_name  | user_personal_institution | assigned_institution | assigned_institution_name |
|--------------------|------------|---------------------------|----------------------|---------------------------|
| dr.kumar@dental.edu| Dr. Kumar  | dental-college-id         | engineering-college-id| JKKN Engineering College  |
```

This confirms that Dr. Kumar from Dental is assigned to Engineering.

---

## Common Issues & Solutions

### Issue 1: Mentor In-Charge Sees Personal Institution Data

**Symptoms:**
- Dental mentor in-charge sees Dental programs instead of Engineering programs
- Console shows: `Filtering by personal institution: dental-college-id`

**Root Cause:**
`getInstitutionFilter()` not checking `mentorInchargeInstitutionId` first

**Solution:**
✅ **FIXED** in this update - `getInstitutionFilter()` now checks mentor in-charge assignment before personal institution

---

### Issue 2: Institution Admin Sees All Institutions

**Symptoms:**
- Institution admin for Dental sees Engineering and Arts data
- Console shows: `No institution filter applied`

**Root Cause:**
User has `is_super_admin` flag set to `true` in database

**Solution:**
```sql
UPDATE users
SET is_super_admin = false
WHERE id = 'user-id-here' AND role = 'institution_admin';
```

---

### Issue 3: Filter Dropdowns Show Empty

**Symptoms:**
- Dropdowns for institutions, departments, programs are empty
- Console shows: `Filtered for institution xxx: 0 results`

**Root Cause:**
Data in MyJKKN API doesn't have `institution_id` field populated

**Solution:**
Ensure MyJKKN API data includes `institution_id`:
```json
{
  "id": "prog-123",
  "name": "B.Tech CSE",
  "institution_id": "engineering-college-id"  ← Must be present
}
```

---

## Success Criteria

✅ All tests pass with correct institution filtering
✅ Super admin sees all data
✅ Institution admin sees only their institution
✅ **Mentor in-charge sees ASSIGNED institution (not personal)**
✅ Regular users see only their personal institution
✅ No data leakage across institutions
✅ Console logs clearly show which filter is applied

---

## Rollback Plan

If issues occur, revert the fix:

```bash
# Revert access-control.ts changes
git checkout HEAD~1 -- lib/middleware/access-control.ts

# Or manually change lines 157-161 back to:
# return userAccess.institutionId;
```

**Note:** Only do this if absolutely necessary, as it will re-introduce the mentor in-charge filtering bug.

---

**Last Updated:** 2025-01-24
**Critical Fix:** Mentor In-Charge institution filter priority
**Status:** ✅ Fixed & Ready for Testing
**Impact:** High - Affects all mentor in-charge users
