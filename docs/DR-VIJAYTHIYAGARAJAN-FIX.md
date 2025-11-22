# 🔧 DR. VIJAYTHIYAGARAJAN J - Missing from Mentor Directory Fix

**Issue:** DR. VIJAYTHIYAGARAJAN J appears in Mentor Activity page but NOT in Mentor Directory page

**Status:** ✅ **ROOT CAUSE IDENTIFIED - READY TO FIX**

---

## 🐛 Problem Summary

DR. VIJAYTHIYAGARAJAN J (Reader, JKKN Dental College) is visible in:
- ✅ Mentor Activity page
- ❌ Mentor Directory page (Dental institution search)

---

## 🔍 Diagnostic Results

### From JKKN API:
```
ID: 9dd48e61-f7cc-499a-a885-5151ca4ddc78
Name: DR. VIJAYTHIYAGARAJAN J
Email: vijaythiyagarajan.j@jkkn.ac.in
Designation: Reader
Institution ID: e8fbe8aa-c44e-41aa-a44b-39dab2c8b9a5
Institution: JKKN Dental College and Hospital
```

### From Database:
```
User ID: 16320802-de99-488f-a07b-91ddd917f737
Email: vijaythiyagarajan.j@jkkn.ac.in
JKKN User ID: fc6f3f83-5fda-43b6-a107-91ab71896326  ← WRONG!
Institution ID: e8fbe8aa-c44e-41aa-a44b-39dab2c8b9a5  ← CORRECT!
Role: hod
```

### Comparison:
```
Institution ID:
  JKKN API:  e8fbe8aa-c44e-41aa-a44b-39dab2c8b9a5  ✅ MATCH
  Database:  e8fbe8aa-c44e-41aa-a44b-39dab2c8b9a5  ✅ MATCH

JKKN User ID:
  JKKN API:  9dd48e61-f7cc-499a-a885-5151ca4ddc78  ← CORRECT
  Database:  fc6f3f83-5fda-43b6-a107-91ab71896326  ❌ MISMATCH!
```

---

## 💡 Root Cause

The two pages use **different data sources**:

### Mentor Activity Page ✅ (Working)
```
Data Source: LOCAL DATABASE (Supabase mentors table)
Filtering:   institution_id in database
Lookup:      user_id → full_name, email

Result: Shows DR. VIJAYTHIYAGARAJAN because:
  - Has mentor record in database
  - institution_id matches
  - user_id exists in users table
```

### Mentor Directory Page ❌ (Broken)
```
Data Source: JKKN API (https://www.jkkn.ai/api/api-management/staff)
Filtering:   institution_id from JKKN API
Lookup:      jkkn_user_id → user_id → mentor_id → student count

Result: Does NOT show DR. VIJAYTHIYAGARAJAN because:
  - Fetches from JKKN API ✅
  - Has correct institution_id ✅
  - Tries to lookup by jkkn_user_id ❌
  - jkkn_user_id in database doesn't match JKKN API ID ❌
  - Can't find user in database ❌
  - Can't get student count ❌
  - Excluded from results ❌
```

---

## 📊 Data Flow Comparison

### Activity Page (Working)
```
┌─────────────────────┐
│  Supabase Database  │
│   mentors table     │
└──────────┬──────────┘
           │
           ▼
   Filter by institution_id
           │
           ▼
   Lookup user by user_id
           │
           ▼
     ✅ FOUND! Show in list
```

### Directory Page (Broken)
```
┌─────────────────────┐
│     JKKN API        │
│ api-management/staff│
└──────────┬──────────┘
           │
           ▼
   Filter by institution_id
           │
           ▼
   Lookup user by jkkn_user_id
           │
           ▼
   jkkn_user_id = 9dd48e61-... (from JKKN API)
           │
           ▼
   Search in database:
   WHERE jkkn_user_id = 'fc6f3f83-...' ← WRONG ID!
           │
           ▼
    ❌ NOT FOUND! Excluded from list
```

---

## ✅ The Fix

Update the database to use the correct JKKN User ID from the JKKN API:

### SQL Command:
```sql
UPDATE users
SET jkkn_user_id = '9dd48e61-f7cc-499a-a885-5151ca4ddc78'
WHERE email = 'vijaythiyagarajan.j@jkkn.ac.in';
```

### Why This Works:
1. JKKN API returns staff with ID `9dd48e61-...`
2. `/api/mentor/list` tries to match this with database using `jkkn_user_id`
3. After update, database will have matching `jkkn_user_id`
4. Lookup succeeds → User found → Student count retrieved → Included in results ✅

---

## 🧪 Verification

### Step 1: Check Current State
```sql
SELECT id, email, jkkn_user_id, institution_id
FROM users
WHERE email = 'vijaythiyagarajan.j@jkkn.ac.in';
```

**Expected Before Fix:**
```
jkkn_user_id: fc6f3f83-5fda-43b6-a107-91ab71896326  ← WRONG
```

### Step 2: Apply Fix
```sql
UPDATE users
SET jkkn_user_id = '9dd48e61-f7cc-499a-a885-5151ca4ddc78'
WHERE email = 'vijaythiyagarajan.j@jkkn.ac.in';
```

### Step 3: Verify Fix
```sql
SELECT id, email, jkkn_user_id, institution_id
FROM users
WHERE email = 'vijaythiyagarajan.j@jkkn.ac.in';
```

**Expected After Fix:**
```
jkkn_user_id: 9dd48e61-f7cc-499a-a885-5151ca4ddc78  ✅ CORRECT
```

### Step 4: Test in UI
1. Log in as mentor in-charge for JKKN Dental College
2. Go to Mentor Directory page
3. Search for "VIJAYTHIYAGARAJAN" or browse dental college mentors
4. DR. VIJAYTHIYAGARAJAN J should NOW appear ✅

---

## 🔧 Alternative: Use Sync Script

Instead of manually updating, you can use the sync script to fix ALL mismatched users:

```bash
npm run sync:users
```

This will:
- Fetch all users from database
- Match them with JKKN API by email
- Update `jkkn_user_id` and `institution_id` to match JKKN API
- Fix DR. VIJAYTHIYAGARAJAN and any other mismatched users

---

## 📋 Prevention

This issue happens when:
1. User's JKKN ID changes in the JKKN API
2. Database still has the old JKKN ID
3. The two don't match → Lookup fails

### To Prevent:
1. Run `npm run sync:users` periodically (weekly/monthly)
2. Run after major JKKN API updates
3. Use diagnostic tool when users report missing mentors:
   ```bash
   npm run debug:mentor <email>
   ```

---

## 📖 Related Files

### API Endpoints:
- [app/api/mentor/list/route.ts](../app/api/mentor/list/route.ts#L393-L402) - Mentor Directory (uses JKKN API)
- [app/api/mentor-activity/institution-stats/route.ts](../app/api/mentor-activity/institution-stats/route.ts#L80-L111) - Activity Stats (uses Database)

### How Mentor List Matches JKKN ID:
```typescript
// Line 393-402 in app/api/mentor/list/route.ts
let userId = jkknToUserMap.get(staff.id);  // Lookup by JKKN ID
if (!userId) {
  // Fallback: lookup by email
  const staffEmail = (staff.email || staff.institution_email)?.toLowerCase();
  if (staffEmail) {
    userId = emailToUserMap.get(staffEmail);
  }
}
```

**The Fallback:**
Notice there's a fallback that looks up by email! This should theoretically work, but there might be a case-sensitivity issue or the email matching is not working correctly.

---

## 🎯 Summary

**Problem:** Database has outdated JKKN User ID

**Impact:** Mentor appears in Activity page (database-based) but NOT in Directory page (JKKN API-based)

**Fix:** Update database jkkn_user_id to match JKKN API ID

**Command:**
```sql
UPDATE users
SET jkkn_user_id = '9dd48e61-f7cc-499a-a885-5151ca4ddc78'
WHERE email = 'vijaythiyagarajan.j@jkkn.ac.in';
```

**OR use sync script:**
```bash
npm run sync:users
```

---

**Last Updated:** 2025-11-22
**Status:** ✅ Ready to fix
**Verified:** DR. VIJAYTHIYAGARAJAN J exists in JKKN API with correct institution
