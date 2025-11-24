# Counseling Page Filter Duplicates - Bug Fix

**Date:** 2025-01-24
**Status:** ✅ Fixed
**Severity:** Medium
**Impact:** User Experience - Dropdown filters showing duplicate values

---

## 🐛 Bug Description

### Problem
The Counseling Sessions page (/counseling) was showing **duplicate values** in filter dropdowns:

- **Program dropdown:** Multiple "MDS" entries (one per institution)
- **Department dropdown:** Potential duplicates across institutions
- **Institution dropdown:** Potential duplicates if multiple records exist

### Root Cause
The filter dropdowns were displaying **all records** from the MyJKKN API without deduplication. Since multiple institutions can have:
- Programs with the same name (e.g., "MDS", "BDS", "B.Tech CSE")
- Departments with the same name (e.g., "Computer Science", "Mechanical")

The dropdowns showed all these duplicate entries to users.

### User Impact
- Confusing user experience with multiple identical options
- Difficulty selecting the correct filter value
- Cluttered dropdown menus
- Poor data presentation

---

## 🔍 Technical Analysis

### Before Fix (WRONG ❌)

**File:** `app/(dashboard)/counseling/page.tsx`

```typescript
// Lines 66-84 - Institution Filter (BEFORE)
options: async () => {
  const response = await fetch('/api/jkkn/institutions', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  if (response.ok) {
    const data = await response.json();
    // ❌ NO DEDUPLICATION - Shows all records as-is
    return (data.data || []).map((inst: any) => ({
      value: inst.institution_name || inst.name,
      label: inst.institution_name || inst.name,
    }));
  }
  return [];
}
```

**Problem:** Direct mapping without checking for duplicates.

---

## ✅ Solution Applied

### Fix Overview
Added **Map-based deduplication** to all three filter dropdowns:
1. Institution filter
2. Department filter
3. Program filter

### After Fix (CORRECT ✅)

**File:** `app/(dashboard)/counseling/page.tsx`

#### 1. Institution Filter (Lines 66-94)
```typescript
options: async () => {
  try {
    const response = await fetch('/api/jkkn/institutions', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    if (response.ok) {
      const data = await response.json();
      // ✅ Deduplicate institutions by name
      const uniqueInstitutions = new Map();
      (data.data || []).forEach((inst: any) => {
        const institutionName = inst.institution_name || inst.name;
        if (institutionName && !uniqueInstitutions.has(institutionName)) {
          uniqueInstitutions.set(institutionName, {
            value: institutionName,
            label: institutionName,
          });
        }
      });
      return Array.from(uniqueInstitutions.values());
    }
  } catch (error) {
    console.error('Error loading institutions:', error);
  }
  return [];
}
```

#### 2. Department Filter (Lines 96-128)
```typescript
options: async () => {
  try {
    const response = await fetch('/api/jkkn/departments', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    if (response.ok) {
      const data = await response.json();
      // ✅ Deduplicate departments by name
      const uniqueDepartments = new Map();
      (data.data || []).forEach((dept: any) => {
        const departmentName = dept.department_name || dept.name;
        if (departmentName && !uniqueDepartments.has(departmentName)) {
          uniqueDepartments.set(departmentName, {
            value: departmentName,
            label: departmentName,
          });
        }
      });
      return Array.from(uniqueDepartments.values());
    }
  } catch (error) {
    console.error('Error loading departments:', error);
  }
  return [];
}
```

#### 3. Program Filter (Lines 130-165)
```typescript
options: async () => {
  try {
    const response = await fetch('/api/jkkn/programs', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    if (response.ok) {
      const data = await response.json();
      // ✅ Deduplicate programs by name (multiple institutions may have same program name)
      const uniquePrograms = new Map();
      (data.data || []).forEach((prog: any) => {
        const programName = prog.program_name || prog.name;
        if (programName && !uniquePrograms.has(programName)) {
          uniquePrograms.set(programName, {
            value: programName,
            label: programName,
          });
        }
      });
      return Array.from(uniquePrograms.values());
    }
  } catch (error) {
    console.error('Error loading programs:', error);
  }
  return [];
}
```

---

## 🔧 How the Fix Works

### Map-Based Deduplication Strategy

**Step 1:** Create a `Map` to track unique names
```typescript
const uniquePrograms = new Map();
```

**Step 2:** Iterate through all API data
```typescript
(data.data || []).forEach((prog: any) => {
  const programName = prog.program_name || prog.name;
  ...
});
```

**Step 3:** Check if name already exists
```typescript
if (programName && !uniquePrograms.has(programName)) {
  uniquePrograms.set(programName, {
    value: programName,
    label: programName,
  });
}
```

**Step 4:** Convert Map to array
```typescript
return Array.from(uniquePrograms.values());
```

### Why Map?
- **Fast lookups:** O(1) complexity for `.has()` check
- **Automatic deduplication:** Keys are unique by design
- **Preserves insertion order:** First occurrence kept
- **Type-safe:** Works with objects as values

---

## 📊 Expected Results

### Before Fix
**Program Dropdown:**
```
MDS (Dental College)
MDS (Arts College)
MDS (Engineering College)
MDS (Management)
MDS (Another Institution)
BDS
```

### After Fix
**Program Dropdown:**
```
MDS
BDS
```

### Benefits
✅ Clean, deduplicated dropdown options
✅ Improved user experience
✅ Faster filter selection
✅ Reduced visual clutter
✅ Consistent across all filters (Institution, Department, Program)

---

## 🧪 Testing Checklist

### Manual Testing Steps

1. **Navigate to Counseling Sessions Page**
   ```
   URL: /counseling
   ```

2. **Open Program Filter Dropdown**
   - Click on "Program" filter
   - Verify: Only unique program names appear (e.g., single "MDS", not multiple)

3. **Open Department Filter Dropdown**
   - Click on "Department" filter
   - Verify: Only unique department names appear

4. **Open Institution Filter Dropdown**
   - Click on "Institution" filter
   - Verify: Only unique institution names appear

5. **Test Filter Functionality**
   - Select a program (e.g., "MDS")
   - Verify: Sessions are filtered correctly across all institutions offering MDS

### Console Verification

Check browser console for:
- ✅ No errors loading filter options
- ✅ API responses successful (200 status)
- ✅ No duplicate warnings

---

## 🎯 Related Issues

### Fixed
✅ Duplicate programs in dropdown
✅ Duplicate departments in dropdown
✅ Duplicate institutions in dropdown

### Related (Fixed Previously)
✅ Institution-based filtering in API routes ([docs/institution-based-filtering-complete.md](institution-based-filtering-complete.md))
✅ Role-based access control ([docs/role-based-filtering-testing-guide.md](role-based-filtering-testing-guide.md))

---

## 📝 Notes

### Design Decision
- **Deduplication by name** instead of ID because:
  - Dropdowns show name to users (not ID)
  - Users filter by program name (e.g., "MDS") regardless of institution
  - IDs are institution-specific and not user-facing
  - Filtering logic later matches by name anyway (lines 279-290)

### Alternative Approaches (Not Chosen)
1. **Backend deduplication:** Would require API changes; client-side is faster to implement
2. **Array.filter():** O(n²) complexity; Map is O(n) and more efficient
3. **Set:** Would lose the object structure; Map preserves {value, label} format

### Performance Impact
- **Minimal overhead:** Map operations are O(1)
- **Better UX:** Fewer options = faster user selection
- **No backend changes:** Fix is client-side only

---

## 🔄 Rollback Plan

If issues occur, revert changes:

```bash
# Revert to previous version
git checkout HEAD~1 -- app/(dashboard)/counseling/page.tsx

# Or manually remove deduplication logic and use direct mapping
```

**Note:** Only rollback if critical issues arise. The fix improves UX significantly.

---

## 📚 Related Documentation

- [Role-Based Filtering Testing Guide](role-based-filtering-testing-guide.md)
- [Institution-Based Filtering Complete](institution-based-filtering-complete.md)
- [401 Unauthorized Fix Summary](unauthorized-401-fix-summary.md)

---

**Status:** ✅ Fixed & Ready for Testing
**Files Modified:** 1
**Impact:** High - Affects all counseling filter dropdowns
**Backward Compatible:** Yes
**Breaking Changes:** None
