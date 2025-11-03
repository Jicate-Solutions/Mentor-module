# Mentor-Student Assignment Fixes - Implementation Summary

## Overview
Fixed three critical issues in the mentor-student assignment system:
1. Assignment errors due to missing RLS policies
2. Already-assigned students not showing as disabled
3. Manual search instead of automatic real-time search

## Changes Made

### 1. Database Migration - RLS Policies
**File**: `supabase/migrations/20250103_fix_mentor_students_rls.sql`

Added INSERT, UPDATE, DELETE policies for:
- `students` table - Allow authenticated users to insert/update students
- `mentor_students` table - Allow authenticated users to create/update/delete assignments
- `users` table - Allow authenticated users to insert/update user records
- `mentors` table - Allow authenticated users to insert/update mentors
- `counseling_sessions` table - Allow authenticated users to manage sessions

**To Apply**:
```bash
# Option 1: Via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of supabase/migrations/20250103_fix_mentor_students_rls.sql
4. Execute the SQL

# Option 2: Via Supabase CLI (if configured)
npx supabase db push
```

### 2. New API Endpoint - All Student Assignments
**File**: `app/api/students/assignments/route.ts` (NEW)

- Fetches all student-mentor assignments across the entire system
- Returns a mapping of `student_id` → `{ mentorId, mentorName, mentorEmail }`
- Used to check if students are assigned to other mentors
- Endpoint: `GET /api/students/assignments`

### 3. Enhanced StudentsTab Component
**File**: `app/(dashboard)/mentor/[id]/components/StudentsTab.tsx`

**Changes**:
- Added state for tracking all student assignments: `allAssignments`
- Fetch all assignments on component mount via `fetchAllAssignments()`
- Removed filtering of assigned students from search results
- Implemented automatic debounced search (300ms delay, 2-character minimum)
- Search triggers automatically as user types (no button click needed)
- Already-assigned students now shown with:
  - Disabled state (opacity-60, cursor-not-allowed)
  - Badge showing mentor name: "Assigned to [Mentor Name]"
  - Checkbox disabled and grayed out
  - Cannot be selected or clicked
- Students assigned to current mentor show "Already Assigned" badge
- Updated placeholder text to indicate 2-character minimum

**Key Features**:
```typescript
// Automatic search with debouncing
useEffect(() => {
  if (searchQuery.length < 2) {
    setSearchResults([]);
    return;
  }
  const debounceTimer = setTimeout(() => {
    handleSearch();
  }, 300);
  return () => clearTimeout(debounceTimer);
}, [searchQuery]);

// Visual indicator for assigned students
{isAssignedToOther && (
  <Badge variant="warning" size="sm">
    Assigned to {assignment.mentorName}
  </Badge>
)}
```

### 4. Fixed Department Field in API
**File**: `app/api/mentor/[id]/students/route.ts`

**Changes**:
- Added `department_id` to SELECT query
- Added JOIN to `departments` table to fetch department name
- Changed response mapping from `assignment.student?.department` to `assignment.student?.departments?.name`
- Department now shows actual name instead of empty string

**Before**:
```typescript
student:students!student_id (
  id, name, email, roll_number, year
)
// department always returned empty string
```

**After**:
```typescript
student:students!student_id (
  id, name, email, roll_number, year, department_id,
  departments (name)
)
// department now returns actual department name
```

## Features Implemented

### 1. Assignment Error Fix
- **Root Cause**: Missing INSERT policies on `students` and `mentor_students` tables
- **Solution**: Added comprehensive RLS policies for all CRUD operations
- **Result**: Students can now be successfully assigned to mentors without RLS violations

### 2. Disabled State for Assigned Students
- **Before**: Already-assigned students were hidden from search results
- **After**:
  - All students visible in search results
  - Students assigned to other mentors shown in disabled state
  - Badge displays which mentor they're assigned to
  - Cannot be selected or clicked
  - Visual distinction via opacity and styling

### 3. Automatic Real-Time Search
- **Before**: Required clicking search button or pressing Enter
- **After**:
  - Searches automatically as user types
  - 300ms debounce delay (fast but efficient)
  - 2-character minimum before triggering search
  - No button click needed
  - Better user experience

## Testing Checklist

- [ ] Apply database migration (see instructions above)
- [ ] Test assigning a student to a mentor (should work without errors)
- [ ] Search for students with < 2 characters (should show message)
- [ ] Search for students with >= 2 characters (should auto-search after 300ms)
- [ ] Verify already-assigned students show as disabled with mentor name
- [ ] Try to click disabled students (should not be selectable)
- [ ] Verify department names show correctly for assigned students
- [ ] Assign multiple students at once (should work)
- [ ] Check that students assigned to current mentor show "Already Assigned" badge

## File Changes Summary

### Created:
1. `supabase/migrations/20250103_fix_mentor_students_rls.sql` - RLS policies
2. `app/api/students/assignments/route.ts` - All assignments API
3. `MENTOR_ASSIGNMENT_FIXES.md` - This documentation

### Modified:
1. `app/(dashboard)/mentor/[id]/components/StudentsTab.tsx` - Enhanced UI and search
2. `app/api/mentor/[id]/students/route.ts` - Fixed department field

## Next Steps

1. **Apply the database migration** using one of the methods described above
2. **Restart your Next.js development server** to pick up the new API route
3. **Test the functionality** using the checklist above
4. **Monitor for any errors** in browser console or server logs

## Technical Details

### Search Debouncing Implementation
```typescript
useEffect(() => {
  if (searchQuery.length < 2) {
    setSearchResults([]);
    return;
  }
  const debounceTimer = setTimeout(() => {
    handleSearch();
  }, 300);
  return () => clearTimeout(debounceTimer);
}, [searchQuery]);
```

### Assignment Check Logic
```typescript
const assignment = allAssignments[student.id];
const isAssignedToOther = assignment && assignment.mentorId !== mentorId;
const isAssignedToCurrent = assignment && assignment.mentorId === mentorId;
```

### Preventing Selection of Assigned Students
```typescript
const toggleStudentSelection = (student: Student) => {
  const assignment = allAssignments[student.id];
  if (assignment && assignment.mentorId !== mentorId) {
    return; // Don't allow selection
  }
  // ... rest of selection logic
};
```

## Troubleshooting

### Migration Fails
- Check if you're connected to the correct Supabase project
- Verify you have admin permissions
- Try applying via Supabase Dashboard SQL Editor instead of CLI

### Students Still Can't Be Assigned
- Verify migration was applied successfully
- Check browser console for specific error messages
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in environment variables
- Check Supabase logs in dashboard

### Search Not Working
- Clear browser cache and reload
- Check that searchQuery state is updating
- Verify API endpoint `/api/students/search` is accessible
- Check network tab for API responses

### Department Field Empty
- Verify `departments` table exists in your database
- Check that `students.department_id` FK is properly configured
- Test query directly in Supabase SQL Editor

## Notes

- All policies currently allow any authenticated user to perform operations
- For production, consider adding role-based checks (admin, mentor, etc.)
- The 300ms debounce can be adjusted based on performance needs
- Minimum character requirement prevents excessive API calls
- Badge colors: warning (yellow) for assigned to others, success (green) for current mentor

---

**Date**: 2025-01-03
**Status**: ✅ Implementation Complete - Awaiting Migration Application & Testing
