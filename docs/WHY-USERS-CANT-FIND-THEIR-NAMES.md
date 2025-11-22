# 🔍 Why Users Can't Find Their Names in Mentor/Director Lists

**Issue:** Some users report they can't find their names when searching in the mentor or director lists.

**Root Cause:** The lists pull data from **JKKN API**, not from the local database.

---

## 📊 Current Status

### Database vs JKKN API

| Source | Count | Status |
|--------|-------|--------|
| **Local Database** | 314 users | ✅ All have institution_id |
| **JKKN API** | 304 staff | ✅ Source of mentor list data |
| **Missing from API** | 10 users | ❌ Won't appear in lists |

---

## ❌ Users Missing from JKKN API

These 10 users exist in the database but **NOT in the JKKN API**, so they won't appear in mentor/director lists:

1. `3cd035d7-6876-459d-a437-66d536bc2546@jkkn.ac.in`
2. `anitha.nair@jkkn.ac.in`
3. `automation@jkkn.ac.in`
4. `hod.cs@jkkn.ac.in`
5. `hod.it@jkkn.ac.in`
6. `lakshmi.iyer@jkkn.ac.in`
7. `principal@jkkn.ac.in`
8. `rajesh.kumar@jkkn.ac.in`
9. `suresh.reddy@jkkn.ac.in`
10. `vikram.singh@jkkn.ac.in`

**Why?** These are likely:
- Test accounts
- Manually added users
- Users not yet synced to JKKN API

---

## 🎯 3 Reasons Users Can't Find Themselves

### Reason 1: Not in JKKN API ⚠️ (Most Common)

**Problem:**
- Mentor/Staff lists fetch data from JKKN API endpoint
- If user doesn't exist in JKKN API, they won't appear
- Local database users are NOT shown in the lists

**How to verify:**
```bash
npm run check:users
```

**Solution:**
- **Option A:** Add the user to JKKN API (recommended)
  - Contact JKKN API admin
  - Add user to `https://www.jkkn.ai/api/api-management/staff`

- **Option B:** Use hybrid approach (pull from both JKKN API + local database)
  - See "Technical Solution" section below

---

### Reason 2: Wrong Institution 🏛️

**Problem:**
- User from **Institution A** is viewing **Institution B's** list
- Institution-based filtering hides them

**How to verify:**
- Check user's `institution_id` in database
- Check which institution they're viewing in the UI

**Solution:**
- Make sure they're viewing their own institution's list
- Or login as super admin to see all institutions

**Example:**
```
User: rajesh.kumar@jkkn.ac.in
institution_id: JKKN-COLLEGE

If viewing:
- JKKN-COLLEGE list → ✅ Will appear
- Different institution → ❌ Won't appear
```

---

### Reason 3: Wrong Role 👤

**Problem:**
- User has role `student` but expects to see themselves in mentor list
- Only these roles appear in mentor/director lists:
  - `mentor`
  - `faculty`
  - `hod`
  - `institution_admin`

**How to verify:**
```bash
npm run check:users
```

**Solution:**
- Update user's role in database if incorrect
- Use Supabase dashboard or admin panel

---

## 🔧 Quick Diagnostic Commands

### Check Why a User is Missing
```bash
npm run check:users
```

**This will show:**
- ✅ Total users in database (should be ~318)
- ✅ Users by role breakdown
- ❌ Users with NULL institution_id (should be 0 for non-super-admins)
- ❌ Users not found in JKKN API (10 users)
- 📊 Visible vs invisible users

### Check API Integration
```bash
npm run test:api
```

**This will verify:**
- ✅ JKKN API connection working
- ✅ Staff data fetching (304 staff from JKKN API)
- ✅ Institution-wise filtering working
- ✅ Access control properly configured

---

## 🛠️ Technical Solution: Hybrid Mentor List

If you want users to appear even if they're not in JKKN API, you can create a **hybrid approach**:

### Current Approach
```
Mentor List = JKKN API Staff only
```

### Hybrid Approach
```
Mentor List = JKKN API Staff + Local Database Users
```

**Advantages:**
- ✅ All users appear in lists (even test accounts)
- ✅ No dependency on JKKN API sync
- ✅ Immediate visibility for new users

**Disadvantages:**
- ⚠️ Duplicate handling needed
- ⚠️ Data consistency issues if JKKN API is source of truth

### Implementation

Create a new API endpoint: `app/api/mentor/list-hybrid/route.ts`

```typescript
// Fetch from JKKN API
const jkknStaff = await fetchFromJKKNAPI();

// Fetch from local database
const { data: localUsers } = await supabase
  .from('users')
  .select('*')
  .in('role', ['mentor', 'faculty', 'hod', 'institution_admin']);

// Merge (avoid duplicates by email)
const emailSet = new Set(jkknStaff.map(s => s.email.toLowerCase()));
const localOnlyUsers = localUsers.filter(u =>
  !emailSet.has(u.email.toLowerCase())
);

// Combine
const allMentors = [...jkknStaff, ...localOnlyUsers];

// Apply filtering
return applyAccessFilters(allMentors, userAccess);
```

---

## 📋 Step-by-Step Troubleshooting

### User Reports: "I can't find my name"

**Step 1:** Verify user exists in database
```sql
SELECT email, role, institution_id, department_id
FROM users
WHERE email = 'user@jkkn.ac.in';
```

**Step 2:** Check if user exists in JKKN API
```bash
npm run check:users | grep "user@jkkn.ac.in"
```

**Step 3:** Verify user's institution
- If NULL → Run `npm run fix:users`
- If wrong institution → Update in database

**Step 4:** Check user's role
- Should be: `mentor`, `faculty`, `hod`, or `institution_admin`
- If wrong → Update role in database

**Step 5:** Verify which institution they're viewing
- Make sure they're viewing their own institution
- Or have them login as correct role

---

## ✅ Recommended Actions

### For Missing Users (Not in JKKN API)

**Option 1: Add to JKKN API** (Recommended)
1. Contact JKKN API administrator
2. Request to add the 10 missing users
3. Wait for sync
4. Verify with `npm run test:api`

**Option 2: Use Hybrid Approach**
1. Implement hybrid mentor list (see above)
2. Pull from both JKKN API + local database
3. Handle duplicates by email
4. Deploy and test

**Option 3: Manual Entry**
1. For test users, manually add them to JKKN API
2. Use JKKN admin panel (if available)
3. Or API POST request to add staff

---

## 📊 Expected Behavior

### What SHOULD Work

**Scenario 1: Super Admin**
- ✅ Sees ALL 304 staff from JKKN API
- ✅ Across ALL institutions
- ✅ No filtering applied

**Scenario 2: Institution Admin (e.g., `hod.cs@jkkn.ac.in`)**
- ⚠️ **Problem:** hod.cs is NOT in JKKN API
- ❌ Won't see themselves in the list
- ✅ Will see other staff from `JKKN-COLLEGE` institution
- **Fix:** Add hod.cs to JKKN API OR use hybrid approach

**Scenario 3: Regular Mentor (e.g., `coo@jkkn.ac.in`)**
- ✅ coo@jkkn.ac.in IS in JKKN API
- ✅ Will see themselves in the list
- ✅ Will see other mentors from same institution
- ✅ Filtering works correctly

---

## 🔍 How to Verify a Specific User

### Example: Check if `principal@jkkn.ac.in` will appear

1. **Is user in database?**
   ```bash
   npm run check:users | grep principal
   ```
   ✅ Yes: `principal@jkkn.ac.in (institution_admin)`

2. **Is user in JKKN API?**
   ```bash
   npm run check:users
   ```
   ❌ No: Listed in "Users NOT found in JKKN API"

3. **Will they appear in lists?**
   ❌ **NO** - Because JKKN API doesn't have them

4. **Solution:**
   - Add principal@jkkn.ac.in to JKKN API
   - OR use hybrid approach

---

## 📖 Related Documentation

- [API-INTEGRATION-REPORT.md](../API-INTEGRATION-REPORT.md) - Full API integration status
- [TEST-RESULTS.md](../TEST-RESULTS.md) - Database and application tests
- [DEBUGGING-MISSING-USER-DATA.md](DEBUGGING-MISSING-USER-DATA.md) - Original debugging analysis

---

## 🚀 Quick Commands Reference

```bash
# Check which users are missing from lists
npm run check:users

# Test API integration
npm run test:api

# Test database integrity
npm test

# Fix users with NULL institution_id
npm run fix:users

# Sync users from JKKN API
npm run sync:users
```

---

**Summary:** Users can't find their names because the mentor list pulls from **JKKN API**, not the local database. 10 users exist in the database but not in JKKN API, so they won't appear. Solution: Add them to JKKN API or use a hybrid approach.
