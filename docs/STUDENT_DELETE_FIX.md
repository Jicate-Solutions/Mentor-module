# Student Assignment Deletion Fix

## Problem

When trying to remove an assigned student from a mentor's student list, the delete operation was failing because the API route was using **in-memory storage** instead of deleting from the **Supabase database**.

### Symptoms:
- Click "Remove Student" button
- UI shows loading state
- Student is NOT removed from the list
- Page refresh shows student still assigned
- No error messages visible to user

---

## Root Cause

**File:** `app/api/mentor/[id]/students/[studentId]/route.ts`

The DELETE route was using a temporary in-memory storage hack:

```typescript
// ❌ BEFORE (BROKEN)
const mentorStudents: Record<string, any[]> = {};

export async function DELETE(...) {
  // Remove student from in-memory storage
  mentorStudents[mentorId] = mentorStudents[mentorId].filter(
    student => student.id !== studentId
  );
}
```

**Why it failed:**
- Student assignments are stored in Supabase `mentor_students` table
- DELETE route was modifying in-memory storage
- In-memory storage was empty (never populated)
- Database was never updated
- Result: Nothing actually got deleted

---

## Solution

### Updated DELETE Route

**File:** [app/api/mentor/[id]/students/[studentId]/route.ts](app/api/mentor/[id]/students/[studentId]/route.ts)

**Changes:**

1. **Import Supabase Admin Client**
   ```typescript
   import { createAdminClient } from '@/lib/supabase/server';
   ```

2. **Resolve JKKN Mentor ID to Supabase Mentor ID**
   ```typescript
   // Step 1: Find user by jkkn_user_id
   const { data: user } = await supabaseAdmin
     .from('users')
     .select('id')
     .eq('jkkn_user_id', mentorId)
     .single();

   // Step 2: Find mentor by user_id
   const { data: mentor } = await supabaseAdmin
     .from('mentors')
     .select('id')
     .eq('user_id', user.id)
     .single();
   ```

3. **Delete from mentor_students Table**
   ```typescript
   // Step 3: Delete the mentor-student assignment
   const { error: deleteError } = await supabaseAdmin
     .from('mentor_students')
     .delete()
     .eq('mentor_id', mentor.id)
     .eq('student_id', studentId);
   ```

4. **Update Mentor's Student Count**
   ```typescript
   // Step 4: Update mentor's total_students count
   const { data: remainingStudents } = await supabaseAdmin
     .from('mentor_students')
     .select('id')
     .eq('mentor_id', mentor.id);

   await supabaseAdmin
     .from('mentors')
     .update({ total_students: remainingStudents?.length || 0 })
     .eq('id', mentor.id);
   ```

5. **Enhanced Logging**
   ```typescript
   console.log('[DELETE Student] Removing student assignment:', {
     mentorId,
     studentId
   });

   console.log('[DELETE Student] ✅ Successfully removed student assignment');
   ```

---

## Database Schema

### mentor_students Table

```sql
CREATE TABLE IF NOT EXISTS public.mentor_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(mentor_id, student_id)  -- One assignment per mentor-student pair
);

CREATE INDEX idx_mentor_students_mentor ON public.mentor_students(mentor_id);
CREATE INDEX idx_mentor_students_student ON public.mentor_students(student_id);
```

**Key Points:**
- `UNIQUE(mentor_id, student_id)` - Prevents duplicate assignments
- `ON DELETE CASCADE` - Automatically deletes assignments if mentor or student is deleted
- Indexed on both `mentor_id` and `student_id` for fast lookups

---

## How It Works Now

### Delete Flow:

```
1. User clicks "Remove Student" button
   ↓
2. Frontend sends DELETE request
   DELETE /api/mentor/{jkknMentorId}/students/{studentId}
   ↓
3. Backend resolves JKKN mentor ID:
   - Lookup user by jkkn_user_id
   - Lookup mentor by user_id
   ↓
4. Delete from mentor_students table
   DELETE FROM mentor_students
   WHERE mentor_id = {supabaseMentorId}
   AND student_id = {studentId}
   ↓
5. Update mentor's student count
   UPDATE mentors
   SET total_students = (SELECT COUNT(*) FROM mentor_students WHERE mentor_id = ...)
   ↓
6. Return success response
   { success: true, message: "Student removed successfully" }
   ↓
7. Frontend refreshes the student list
   ✅ Student no longer appears
```

### Console Logs You'll See:

```
[DELETE Student] Removing student assignment: {
  mentorId: '8729b2d0-8038-4dc7-b213-71dad1371282',
  studentId: 'cd9bbe7c-859d-4a31-9cf5-a2697d779f21'
}
[DELETE Student] ✅ Successfully removed student assignment
```

---

## Testing

### Test the Fix:

1. **Go to mentor detail page:**
   ```
   http://localhost:3000/mentor/{mentorId}
   ```

2. **Navigate to "Students" tab**
   - Should see list of assigned students

3. **Click "Remove Student" button**
   - Should see loading state
   - Student should disappear from list
   - Success message should appear

4. **Refresh the page**
   - Student should still be gone ✅
   - Total student count should decrease

5. **Check console logs**
   - Should see: `[DELETE Student] ✅ Successfully removed student assignment`

6. **Verify in Supabase**
   - Go to Supabase dashboard
   - Check `mentor_students` table
   - Assignment record should be deleted

---

## Error Handling

### Possible Errors:

**1. Mentor Not Found (404)**
```json
{
  "error": "Mentor not found"
}
```
**Cause:** Invalid JKKN mentor ID or mentor doesn't exist in Supabase

**2. Mentor Record Not Found (404)**
```json
{
  "error": "Mentor record not found"
}
```
**Cause:** User exists but no mentor record in `mentors` table

**3. Database Error (500)**
```json
{
  "error": "Failed to remove student assignment",
  "details": "RLS policy violation"
}
```
**Cause:** Supabase RLS policies blocking the delete

**4. Unauthorized (401)**
```json
{
  "error": "Unauthorized"
}
```
**Cause:** No auth token in request headers

---

## Frontend Integration

The frontend should handle the delete response:

```typescript
const handleRemoveStudent = async (studentId: string) => {
  try {
    const response = await fetch(`/api/mentor/${mentorId}/students/${studentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove student');
    }

    const data = await response.json();

    // Show success message
    toast.success(data.message);

    // Refresh student list
    await refreshStudents();

  } catch (error) {
    toast.error(error.message);
    console.error('Error removing student:', error);
  }
};
```

---

## RLS Policy Verification

Ensure the `mentor_students` table has proper RLS policies:

```sql
-- Allow mentors to delete their own student assignments
CREATE POLICY "Mentors can delete their student assignments"
ON public.mentor_students
FOR DELETE
TO authenticated
USING (
  mentor_id IN (
    SELECT m.id FROM mentors m
    JOIN users u ON m.user_id = u.id
    WHERE u.id = auth.uid()
  )
);

-- Allow admins to delete any student assignment
CREATE POLICY "Admins can delete any student assignment"
ON public.mentor_students
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND is_super_admin = true
  )
);
```

---

## Related Issues Fixed

This fix also resolves:

1. ✅ **Student count accuracy** - `total_students` is now updated after deletion
2. ✅ **Database consistency** - Assignments are actually removed from database
3. ✅ **UI state sync** - UI reflects actual database state
4. ✅ **Proper error handling** - Meaningful error messages for debugging

---

## Files Modified

### 1. [app/api/mentor/[id]/students/[studentId]/route.ts](app/api/mentor/[id]/students/[studentId]/route.ts)

**Before:**
- Used in-memory storage (temporary hack)
- Never touched the database
- Always returned success even when nothing happened

**After:**
- Uses Supabase admin client
- Properly deletes from `mentor_students` table
- Updates mentor's `total_students` count
- Includes comprehensive error handling and logging

---

## Summary

**Problem:** Student deletion not working due to in-memory storage hack
**Root Cause:** DELETE route never touched the Supabase database
**Solution:** Replaced in-memory storage with proper Supabase delete operation
**Result:** Student assignments are now properly deleted from database
**Status:** ✅ Fixed and tested

---

**Date Fixed:** 2025-11-20
**Tested:** Yes
**Production Ready:** Yes
