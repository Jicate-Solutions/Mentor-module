# ✅ Institution Filtering Issues - Complete Solution

**Date:** 2025-11-22
**Status:** ✅ **FIXED AND DOCUMENTED**

---

## 📋 Overview

Fixed institution filtering issues where mentors/staff appeared in some pages but not others. Created comprehensive diagnostic tools and documentation to prevent and quickly resolve similar issues in the future.

---

## 🐛 Issues Identified

### Issue #1: DR. VIJAYTHIYAGARAJAN J Missing from Mentor Directory

**Symptom:**
- ✅ Appears in Mentor Activity page
- ❌ Does NOT appear in Mentor Directory page (when searching dental institution)

**Root Cause:**
JKKN User ID mismatch between JKKN API and database

**Fix Applied:**
```sql
UPDATE users
SET jkkn_user_id = '9dd48e61-f7cc-499a-a885-5151ca4ddc78'
WHERE email = 'vijaythiyagarajan.j@jkkn.ac.in';
```

**Status:** ✅ FIXED

---

## 🔍 Root Cause Analysis

The application has **two different data sources** for displaying mentors:

### 1. Mentor Directory Page (`/mentor`)
- **Data Source:** JKKN API (`https://www.jkkn.ai/api/api-management/staff`)
- **Filtering:** By `institution_id` from JKKN API
- **Matching:** Looks up users in database by `jkkn_user_id`
- **Purpose:** Shows ALL staff from JKKN API with student counts from database

### 2. Mentor Activity Page (`/mentor-activity`)
- **Data Source:** Local Database (Supabase `mentors` table)
- **Filtering:** By `institution_id` in database
- **Matching:** Direct lookup by `user_id`
- **Purpose:** Shows mentor performance stats from database

### The Problem

When JKKN User IDs don't match:

```
JKKN API Returns:
  staff.id = "9dd48e61-f7cc-499a-a885-5151ca4ddc78"

Database Has:
  user.jkkn_user_id = "fc6f3f83-5fda-43b6-a107-91ab71896326"  ← MISMATCH!

Result:
  - Mentor Directory: Can't find user → Excludes from results ❌
  - Mentor Activity: Uses user_id directly → Shows in results ✅
```

---

## 🛠️ Tools Created

### 1. Institution Filtering Debugger
**Script:** [scripts/debug-institution-filtering.ts](../scripts/debug-institution-filtering.ts)

**Usage:**
```bash
# Show all institutions and staff counts
npm run debug:institutions

# Search for specific staff
npm run debug:institutions "VIJAYTHIYAGARAJAN"
npm run debug:institutions "mentor@jkkn.ac.in"
```

**What it does:**
- Fetches ALL staff from JKKN API (304 staff members)
- Groups by institution
- Identifies staff without institution IDs
- Searches for specific staff members

**Example Output:**
```
📍 INSTITUTION BREAKDOWN:

Institution ID                        | Institution Name              | Staff Count
--------------------------------------------------------------------------------
e8fbe8aa-c44e-41aa-a44b-39dab2c8b9a5 | JKKN Dental College           | 89
5de4fba1-4564-41ed-8c73-5d948b74b843 | JKKN College of Engineering   | 62
b0b8a724-7c65-4f07-8047-2a38e8100ad5 | JKKN College of Arts & Science| 62
```

### 2. Specific Mentor Debugger
**Script:** [scripts/debug-specific-mentor.ts](../scripts/debug-specific-mentor.ts)

**Usage:**
```bash
npm run debug:mentor <email>

# Example
npm run debug:mentor vijaythiyagarajan.j@jkkn.ac.in
```

**What it does:**
- Searches for staff in JKKN API
- Searches for user in database
- Compares institution IDs
- Compares JKKN User IDs
- **Provides exact SQL fix commands** if mismatch found

**Example Output:**
```
Institution ID Comparison:
  JKKN API:  e8fbe8aa-c44e-41aa-a44b-39dab2c8b9a5
  Database:  e8fbe8aa-c44e-41aa-a44b-39dab2c8b9a5
  Status:    ✅ MATCH

JKKN User ID Comparison:
  JKKN API:  9dd48e61-f7cc-499a-a885-5151ca4ddc78
  Database:  fc6f3f83-5fda-43b6-a107-91ab71896326
  Status:    ❌ MISMATCH

💡 SOLUTION:
   UPDATE users SET jkkn_user_id = '9dd48e61-f7cc-499a-a885-5151ca4ddc78'
   WHERE email = 'vijaythiyagarajan.j@jkkn.ac.in';
```

### 3. Quick Fix Script
**Script:** [scripts/fix-vijaythiyagarajan.ts](../scripts/fix-vijaythiyagarajan.ts)

**Usage:**
```bash
npx tsx scripts/fix-vijaythiyagarajan.ts
```

**What it does:**
- Checks current state
- Updates jkkn_user_id
- Verifies the fix
- Shows next steps for testing

---

## 📖 Documentation Created

### 1. [INSTITUTION-FILTERING-DEBUG.md](INSTITUTION-FILTERING-DEBUG.md)
**Comprehensive debugging guide covering:**
- How institution filtering works (with diagrams)
- Common issues and solutions
- Step-by-step debugging process
- Testing procedures
- API endpoints involved
- Prevention tips

### 2. [DR-VIJAYTHIYAGARAJAN-FIX.md](DR-VIJAYTHIYAGARAJAN-FIX.md)
**Specific fix documentation for DR. VIJAYTHIYAGARAJAN J:**
- Detailed diagnostic results
- Root cause explanation
- Data flow comparison
- Exact fix command
- Verification steps

---

## 🎯 How to Debug Similar Issues

### Step 1: User Reports Missing Mentor

User says: "I can see this mentor in Activity page but not in Directory page"

### Step 2: Run Diagnostic

```bash
npm run debug:mentor <mentor-email>
```

### Step 3: Read the Output

The script will tell you EXACTLY what's wrong:
- ✅ Both sources match → No issue
- ❌ Institution ID mismatch → Update database institution_id
- ❌ JKKN ID mismatch → Update database jkkn_user_id
- ❌ Not in JKKN API → Add to JKKN API or explain
- ❌ Not in database → Sync users

### Step 4: Apply the Fix

The script provides exact SQL commands:

```sql
-- If institution mismatch
UPDATE users
SET institution_id = 'correct-id'
WHERE email = 'mentor@jkkn.ac.in';

-- If JKKN ID mismatch
UPDATE users
SET jkkn_user_id = 'correct-id'
WHERE email = 'mentor@jkkn.ac.in';
```

**OR** use the sync script to fix ALL mismatched users:
```bash
npm run sync:users
```

### Step 5: Verify

1. Restart dev server (if needed)
2. Log in as mentor in-charge for the institution
3. Search for the mentor
4. They should now appear! ✅

---

## 🧪 Testing Procedures

### Test Case 1: Verify DR. VIJAYTHIYAGARAJAN Fix

**Steps:**
1. Log in as mentor in-charge for JKKN Dental College
2. Go to Mentor Directory page (`/mentor`)
3. Search for "VIJAYTHIYAGARAJAN"
4. **Expected:** DR. VIJAYTHIYAGARAJAN J appears in results
5. **Verify:** Shows as "Reader" designation
6. **Verify:** Shows correct student count

### Test Case 2: Check Both Pages

**Steps:**
1. Note mentors shown in Mentor Activity page
2. Search for same mentors in Mentor Directory page
3. **Expected:** Same mentors appear in both pages
4. **If mismatch:** Run diagnostic tool

### Test Case 3: Institution Filtering

**Steps:**
1. Log in as mentor in-charge for "JKKN Dental College"
2. Go to Mentor Directory
3. Search for any mentor
4. **Expected:** Only see mentors from JKKN Dental College
5. **NOT expected:** Mentors from other institutions

### Test Case 4: Super Admin View

**Steps:**
1. Log in as super admin
2. Go to Mentor Directory
3. Search for "Reader" (designation)
4. **Expected:** See mentors from ALL institutions
5. **Verify:** DR. VIJAYTHIYAGARAJAN J appears

---

## 📊 Data Flow Diagrams

### Mentor Directory Page Flow

```
┌──────────────────────────────────────────────────────┐
│ USER LOGS IN (Mentor In-charge, Dental College)     │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │   getUserAccess()      │
        │   Returns:             │
        │   - institutionId      │
        └────────────┬───────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│ FETCH FROM JKKN API                                  │
│ https://www.jkkn.ai/api/api-management/staff         │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
        Returns: [
          {
            id: "9dd48e61-...",  ← JKKN User ID
            institution_id: "e8fbe8aa-...",
            name: "DR. VIJAYTHIYAGARAJAN J"
          },
          ...
        ]
                     │
                     ▼
        ┌────────────────────────┐
        │ Filter by institution  │
        │ (e8fbe8aa-...)        │
        └────────────┬───────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │ Lookup in database:    │
        │ WHERE jkkn_user_id =   │
        │   '9dd48e61-...'       │
        └────────────┬───────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ✅ FOUND                ❌ NOT FOUND
         │                       │
         ▼                       ▼
  Get student count      Exclude from
  Include in results     results
```

### Mentor Activity Page Flow

```
┌──────────────────────────────────────────────────────┐
│ USER LOGS IN (Mentor In-charge, Dental College)     │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │   getUserAccess()      │
        │   Returns:             │
        │   - institutionId      │
        └────────────┬───────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│ FETCH FROM DATABASE                                  │
│ SELECT * FROM mentors WHERE institution_id = ...     │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
        Returns: [
          {
            id: "mentor-id",
            user_id: "16320802-...",  ← User ID (not JKKN ID!)
            institution_id: "e8fbe8aa-..."
          },
          ...
        ]
                     │
                     ▼
        ┌────────────────────────┐
        │ Lookup user by user_id │
        │ (Direct match)         │
        └────────────┬───────────┘
                     │
                     ▼
               ✅ ALWAYS WORKS
           (No JKKN ID matching needed)
```

**Key Difference:**
- **Directory:** Requires JKKN ID match
- **Activity:** Uses user_id directly

---

## 🔧 Technical Details

### Why Two Data Sources?

**Mentor Directory:**
- Shows ALL staff from JKKN (including non-mentors)
- Real-time data from JKKN API
- Institution filtering from JKKN API
- Student counts from database (requires matching)

**Mentor Activity:**
- Shows only active mentors in database
- Performance stats calculated from database
- Institution filtering from database
- No need to match with JKKN API

### The Matching Process

**File:** [app/api/mentor/list/route.ts:393-402](../app/api/mentor/list/route.ts#L393-L402)

```typescript
// Try JKKN ID first
let userId = jkknToUserMap.get(staff.id);

// Fallback: try email
if (!userId) {
  const staffEmail = (staff.email || staff.institution_email)?.toLowerCase();
  if (staffEmail) {
    userId = emailToUserMap.get(staffEmail);
  }
}

// If still no match → Can't get student count → Might exclude
```

**Why DR. VIJAYTHIYAGARAJAN was excluded:**
- JKKN ID didn't match ❌
- Email fallback might have failed (case sensitivity? different email?)
- No `userId` found → Can't get student count → Excluded from results

---

## 💡 Prevention Tips

### 1. Regular Sync

Run the sync script weekly or monthly:
```bash
npm run sync:users
```

This ensures all users have correct:
- `jkkn_user_id` (matches JKKN API)
- `institution_id` (matches JKKN API)

### 2. After JKKN API Updates

If JKKN API has major updates (data migration, ID changes), run:
```bash
npm run sync:users
```

### 3. When Users Report Issues

Don't guess! Use the diagnostic tool:
```bash
npm run debug:mentor <email>
```

It will tell you EXACTLY what's wrong and how to fix it.

### 4. Monitor Logs

Watch for these patterns in server logs:
```
[BEFORE Access Control] Total staff: 304
[AFTER Access Control] Filtered staff: 0  ← RED FLAG!
```

If filtered count is 0 or very low, something's wrong with institution filtering.

---

## 📋 Quick Reference

### Diagnostic Commands

| Command | Purpose |
|---------|---------|
| `npm run debug:institutions` | Show all institutions and staff counts |
| `npm run debug:institutions "search"` | Search for specific staff |
| `npm run debug:mentor <email>` | Debug specific mentor's data |
| `npm run sync:users` | Sync all users with JKKN API |

### Common SQL Fixes

```sql
-- Fix institution ID
UPDATE users
SET institution_id = 'correct-id'
WHERE email = 'user@jkkn.ac.in';

-- Fix JKKN user ID
UPDATE users
SET jkkn_user_id = 'correct-id'
WHERE email = 'user@jkkn.ac.in';

-- Check user's current state
SELECT email, jkkn_user_id, institution_id, role
FROM users
WHERE email = 'user@jkkn.ac.in';
```

### Key Files

| File | Purpose |
|------|---------|
| [app/api/mentor/list/route.ts](../app/api/mentor/list/route.ts) | Mentor Directory API (JKKN API) |
| [app/api/mentor-activity/institution-stats/route.ts](../app/api/mentor-activity/institution-stats/route.ts) | Activity Stats API (Database) |
| [lib/middleware/access-control.ts](../lib/middleware/access-control.ts) | Institution filtering logic |
| [lib/utils/api-filters.ts](../lib/utils/api-filters.ts) | Access control filters |

---

## ✅ Summary

**Problem:** Mentors appear in Activity page but not in Directory page

**Root Cause:** JKKN User ID mismatch between JKKN API and database

**Solution:**
1. Use diagnostic tools to identify exact issue
2. Update database to match JKKN API
3. Verify fix in UI

**Tools Created:**
- Institution filtering debugger
- Specific mentor debugger
- Quick fix scripts
- Comprehensive documentation

**Prevention:**
- Regular sync script runs
- Use diagnostic tools when issues arise
- Monitor server logs for filtering issues

**Status:** ✅ Issue fixed, tools created, documented for future

---

**Last Updated:** 2025-11-22
**Fixed By:** Claude Code with diagnostic tools
**Verified:** DR. VIJAYTHIYAGARAJAN J now appears in Mentor Directory ✅
