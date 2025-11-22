# 🔧 Institution Filtering Debug Guide

**Issue:** Mentors/staff appear in the staff API connect page but don't appear when searching in their respective institution as mentor in-charge

**Status:** 🔍 DIAGNOSTIC TOOLS CREATED

---

## 🐛 Problem Description

You've noticed that:
1. ✅ Some mentors appear in the staff API connect page (when logged in as super admin)
2. ❌ Those same mentors do NOT appear when searching in their institution (when logged in as mentor in-charge)
3. ❌ Students might also have similar filtering issues

This is likely caused by **institution ID mismatches** between:
- JKKN API data
- Database user records

---

## 🔍 Diagnostic Tools

We've created two powerful diagnostic scripts to help identify the issue:

### 1. Institution Overview Tool

**Command:**
```bash
npm run debug:institutions
```

**What it does:**
- Fetches ALL staff from JKKN API
- Groups them by institution
- Shows institution breakdown
- Identifies staff without institution IDs

**Example Output:**
```
📍 INSTITUTION BREAKDOWN:

Institution ID                        | Institution Name              | Staff Count
--------------------------------------------------------------------------------
e8fbe8aa-c44e-41aa-a44b-39dab2c8b9a5 | JKKN Dental College           | 89
5de4fba1-4564-41ed-8c73-5d948b74b843 | JKKN College of Engineering   | 62
b0b8a724-7c65-4f07-8047-2a38e8100ad5 | JKKN College of Arts & Science| 62
```

**Search for specific staff:**
```bash
npm run debug:institutions "john"
npm run debug:institutions "mentor@jkkn.ac.in"
```

### 2. Specific Mentor Debugger

**Command:**
```bash
npm run debug:mentor <email>
```

**Example:**
```bash
npm run debug:mentor mentor@jkkn.ac.in
```

**What it does:**
- Searches for staff in JKKN API
- Searches for user in database
- Compares institution IDs
- Shows exact mismatch if any
- Provides SQL fix commands

**Example Output:**
```
📊 COMPARISON & DIAGNOSIS

Institution ID Comparison:
  JKKN API:  e8fbe8aa-c44e-41aa-a44b-39dab2c8b9a5
  Database:  5de4fba1-4564-41ed-8c73-5d948b74b843
  Status:    ❌ MISMATCH

❌ Institution IDs DO NOT match!
   → This is why institution filtering fails!

💡 SOLUTION:
   Update database to match JKKN API:
   UPDATE users SET institution_id = 'e8fbe8aa-c44e-41aa-a44b-39dab2c8b9a5'
   WHERE email = 'mentor@jkkn.ac.in';
```

---

## 🔍 How Institution Filtering Works

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     USER LOGS IN                             │
│        (Mentor In-charge at "JKKN College of Arts")         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │   getUserAccess()     │
                │   Checks database     │
                └──────────┬────────────┘
                           │
                           ▼
        Returns: {
          role: "mentor",
          institutionId: "b0b8a724-7c65-4f07-8047-2a38e8100ad5",
          isMentorIncharge: true
        }
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              FETCH STAFF FROM JKKN API                        │
│   https://www.jkkn.ai/api/api-management/staff              │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
        Returns: [
          {
            id: "staff-1",
            institution_id: "b0b8a724-...",  ← Should match!
            name: "John Doe"
          },
          {
            id: "staff-2",
            institution_id: "e8fbe8aa-...",  ← Different institution
            name: "Jane Smith"
          }
        ]
                            │
                            ▼
        ┌───────────────────────────────────┐
        │   applyAccessFilters()            │
        │   Filters by institution_id       │
        └──────────────┬────────────────────┘
                       │
                       ▼
        filteredData = staff.filter(s =>
          s.institution_id === userAccess.institutionId
        )
                       │
                       ▼
        Returns: [
          { id: "staff-1", name: "John Doe" }  ← Only matching institution
        ]
```

### Key Points

1. **User's institution_id** comes from `users` table in database
2. **Staff institution_id** comes from JKKN API response
3. **Filtering** happens by comparing these two IDs
4. **If IDs don't match** → Staff won't appear in filtered results

---

## 🔬 Common Issues & Solutions

### Issue #1: Institution ID Mismatch

**Symptom:**
- Staff appears in super admin view
- Staff doesn NOT appear in mentor in-charge view
- Both are searching the same institution

**Diagnosis:**
```bash
npm run debug:mentor staff@jkkn.ac.in
```

**Root Cause:**
```
JKKN API:  e8fbe8aa-c44e-41aa-a44b-39dab2c8b9a5
Database:  5de4fba1-4564-41ed-8c73-5d948b74b843  ← MISMATCH!
```

**Solution:**
Update the database to match JKKN API:
```sql
UPDATE users
SET institution_id = 'e8fbe8aa-c44e-41aa-a44b-39dab2c8b9a5'
WHERE email = 'staff@jkkn.ac.in';
```

---

### Issue #2: Missing JKKN User ID

**Symptom:**
- User exists in database
- User does NOT appear in staff lists

**Diagnosis:**
```bash
npm run debug:mentor user@jkkn.ac.in
```

**Root Cause:**
```
Database user found but NOT in JKKN API
JKKN User ID in DB: null or wrong ID
```

**Solution:**
1. Find the correct JKKN ID from JKKN API
2. Update database:
```sql
UPDATE users
SET jkkn_user_id = 'correct-jkkn-id-here'
WHERE email = 'user@jkkn.ac.in';
```

---

### Issue #3: Staff Not in JKKN API

**Symptom:**
- User exists in database
- User can log in
- User does NOT appear in any staff lists (even super admin)

**Diagnosis:**
```bash
npm run debug:mentor user@jkkn.ac.in
```

**Root Cause:**
```
❌ Staff member found in DATABASE but NOT in JKKN API
   → This is why they won't appear in staff lists!
   → The app fetches staff from JKKN API, not the database.
```

**Solution:**
1. **Option A:** Add the staff member to JKKN API
2. **Option B:** If they shouldn't be in staff lists, this is correct behavior

---

### Issue #4: User Not in Database

**Symptom:**
- Staff appears in staff lists (super admin)
- Staff does NOT appear in mentor in-charge filtered view
- Staff can't log in

**Diagnosis:**
```bash
npm run debug:mentor staff@jkkn.ac.in
```

**Root Cause:**
```
⚠️  Staff member found in JKKN API but NOT in database
   → They can't log in yet (no user account)
```

**Solution:**
Create a user account for this staff member (sync users script):
```bash
npm run sync:users
```

---

## 📋 Step-by-Step Debugging Process

### Step 1: Identify the Missing Mentor

Get the email of the mentor who's not appearing in filtered results.

### Step 2: Run Diagnostic

```bash
npm run debug:mentor mentor@jkkn.ac.in
```

### Step 3: Read the Output

The script will tell you EXACTLY what's wrong:
- ✅ Both sources match → No issue
- ❌ Institution ID mismatch → Update database
- ❌ JKKN ID mismatch → Update database
- ❌ Not in JKKN API → Add to JKKN API
- ❌ Not in database → Sync users

### Step 4: Apply the Fix

The script provides exact SQL commands or next steps.

### Step 5: Verify

After applying the fix:
1. Restart the dev server
2. Log in as mentor in-charge
3. Search for the staff member
4. They should now appear! ✅

---

## 🧪 Testing Institution Filtering

### Test Case 1: Super Admin View

**Login as:** Super Admin
**Expected:** See ALL staff from ALL institutions

**How to verify:**
```bash
npm run debug:institutions
```

Count should match total staff count (e.g., 304)

### Test Case 2: Mentor In-charge View

**Login as:** Mentor In-charge at "JKKN College of Arts"
**Expected:** See ONLY staff from "JKKN College of Arts"

**How to verify:**
1. Check your institution_id in database
2. Run diagnostic:
```bash
npm run debug:institutions
```
3. Find your institution's staff count
4. That's how many staff you should see

### Test Case 3: Specific Mentor Search

**Login as:** Mentor In-charge
**Search for:** "john"
**Expected:** See only Johns from your institution

**How to verify:**
```bash
npm run debug:institutions "john"
```

This shows ALL Johns from ALL institutions. Your filtered view should show a subset.

---

## 🔧 API Endpoints Involved

### `/api/jkkn/staff`

**File:** [app/api/jkkn/staff/route.ts](../app/api/jkkn/staff/route.ts)

**How it works:**
1. Gets user access via `getUserAccess()` (line 83)
2. Fetches staff from JKKN API (line 130-178)
3. Transforms staff data (line 231)
4. **Extracts institution_id** (line 234-237):
   ```typescript
   const staffWithIds = transformedStaff.map((staff: any) => ({
     ...staff,
     ...extractInstitutionDepartmentIds(staff)  // Line 8-30
   }));
   ```
5. **Applies access filters** (line 243):
   ```typescript
   const filteredData = applyAccessFilters(staffWithIds, userAccess);
   ```
6. Returns filtered staff (line 306-311)

### `/api/mentor/list`

**File:** [app/api/mentor/list/route.ts](../app/api/mentor/list/route.ts)

**How it works:**
1. Gets user access (line 37)
2. Fetches ALL staff from JKKN API (line 118-204)
3. Filters by designation (is mentor?) (line 271-273)
4. **Applies institution filtering** (line 423-431):
   ```typescript
   if (!userAccess.isSuperAdmin && userAccess.institutionId) {
     mentors = mentors.filter((mentor: any) =>
       mentor.institution_id === userAccess.institutionId
     );
   }
   ```
5. Returns filtered mentors (line 453-460)

---

## 📊 Key Functions

### `extractInstitutionDepartmentIds()`

**File:** [app/api/jkkn/staff/route.ts:8-30](../app/api/jkkn/staff/route.ts#L8-L30)

**Purpose:** Extract institution_id and department_id from nested objects

**How it works:**
```typescript
function extractInstitutionDepartmentIds(staff: any) {
  // Try multiple ways to get institution_id
  let institution_id = '';
  if (typeof staff.institution === 'object' && staff.institution !== null) {
    institution_id = staff.institution.id || staff.institution.institution_id || '';
  } else if (typeof staff.institution === 'string') {
    institution_id = staff.institution;
  } else if (staff.institution_id) {
    institution_id = staff.institution_id;
  }

  return { institution_id, department_id };
}
```

**Why important:** This handles different JKKN API response formats

### `applyAccessFilters()`

**File:** [lib/utils/api-filters.ts:16-45](../lib/utils/api-filters.ts#L16-L45)

**Purpose:** Filter data by user's institution/department

**How it works:**
```typescript
export function applyAccessFilters<T>(
  data: T[],
  userAccess: UserAccess,
  institutionField: string = 'institution_id'
): T[] {
  let filteredData = [...data];

  const institutionFilter = getInstitutionFilter(userAccess);

  // Filter by institution
  if (institutionFilter !== null) {
    filteredData = filteredData.filter(
      (record) => record[institutionField] === institutionFilter
    );
  }

  return filteredData;
}
```

### `getInstitutionFilter()`

**File:** [lib/middleware/access-control.ts:143-159](../lib/middleware/access-control.ts#L143-L159)

**Purpose:** Determine which institution_id to filter by

**How it works:**
```typescript
export function getInstitutionFilter(userAccess: UserAccess): string | null {
  // Super admin sees ALL institutions
  if (userAccess.isSuperAdmin || userAccess.role === 'super_admin') {
    return null; // No filter
  }

  // Everyone else sees only their institution
  return userAccess.institutionId; // Filter by this ID
}
```

---

## 💡 Prevention Tips

### 1. Always Use Sync Script After Adding Users

When you manually add users to the database:
```bash
npm run sync:users
```

This ensures `institution_id` and `jkkn_user_id` are correct.

### 2. Verify Institution IDs Match

Before assigning a user to an institution, verify the institution ID exists in JKKN API:
```bash
npm run debug:institutions
```

### 3. Use Diagnostic Tools Regularly

Run diagnostics when you notice filtering issues:
```bash
npm run debug:mentor <email>
```

Don't wait until production!

### 4. Check Logs

Institution filtering logs to console:
```
[Access Control] Non-admin user (mentor) - Filtering by institution: abc-123
[BEFORE Access Control] Total staff: 304
[AFTER Access Control] Filtered staff: 62 (from 304)
```

If you see `Filtered staff: 0`, something's wrong!

---

## 📖 Related Documentation

- [DATA-FLOW-DIAGRAM.md](DATA-FLOW-DIAGRAM.md) - Complete data flow overview
- [WHY-USERS-CANT-FIND-THEIR-NAMES.md](WHY-USERS-CANT-FIND-THEIR-NAMES.md) - Missing users explanation
- [API-INTEGRATION-REPORT.md](../API-INTEGRATION-REPORT.md) - API integration status

---

## 🚀 Quick Reference

### Diagnostic Commands

| Command | Purpose |
|---------|---------|
| `npm run debug:institutions` | Show all institutions and staff counts |
| `npm run debug:institutions "search"` | Search for specific staff member |
| `npm run debug:mentor <email>` | Debug specific mentor's institution filtering |
| `npm run sync:users` | Sync user institution IDs from JKKN API |
| `npm run check:users` | Check for missing users |

### Common SQL Fixes

```sql
-- Fix institution ID mismatch
UPDATE users
SET institution_id = 'correct-institution-id'
WHERE email = 'user@jkkn.ac.in';

-- Fix JKKN user ID mismatch
UPDATE users
SET jkkn_user_id = 'correct-jkkn-id'
WHERE email = 'user@jkkn.ac.in';

-- Check user's current institution
SELECT email, institution_id, jkkn_user_id
FROM users
WHERE email = 'user@jkkn.ac.in';
```

---

## ✅ Summary

**The Problem:**
Institution filtering fails when:
1. User's `institution_id` in database ≠ Staff's `institution_id` from JKKN API
2. User missing from JKKN API
3. User missing from database
4. JKKN user ID mismatch

**The Solution:**
1. Use diagnostic tools to identify exact issue
2. Apply provided SQL fixes or sync scripts
3. Verify with another search
4. Celebrate! 🎉

**Key Insight:**
The app fetches data from JKKN API and filters by user's institution_id from database. These MUST match for filtering to work correctly.

---

**Last Updated:** 2025-11-22
**Status:** 🔍 Diagnostic phase - Tools ready for debugging
