# Mentor Incharge Role Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Add a Mentor Incharge supervisory role with dashboard for monitoring mentor activities (counseling sessions, IDP plans, student assignments) and managing workload across assigned departments.

**Architecture:** Hybrid approach using role-based access control (`role='mentor_incharge'` in users table) combined with a separate `mentor_incharge_assignments` table for flexible multi-department scope management. Dashboard provides read-only monitoring plus management capabilities (assign students, send reminders, generate reports).

**Tech Stack:** Next.js 15, Supabase (PostgreSQL), TypeScript, Tailwind CSS, Shadcn/UI components, React Query

---

## Task 1: Database Schema - Create Incharge Assignments Table

**Files:**
- Create: `supabase/migrations/[timestamp]_create_mentor_incharge_assignments.sql`

**Step 1: Create migration file**

Create new migration file with timestamp.

**Step 2: Write migration SQL**

```sql
-- Create mentor_incharge_assignments table
CREATE TABLE mentor_incharge_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incharge_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('department', 'institution', 'multi_department')),
  institution_id TEXT,
  department_ids TEXT[], -- Array for multi-department assignments
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(incharge_id) -- One assignment record per incharge
);

-- Add comment
COMMENT ON TABLE mentor_incharge_assignments IS 'Defines scope and departments for Mentor Incharges';

-- Create index for faster lookups
CREATE INDEX idx_incharge_assignments_active ON mentor_incharge_assignments(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_incharge_assignments_institution ON mentor_incharge_assignments(institution_id);
CREATE INDEX idx_incharge_assignments_departments ON mentor_incharge_assignments USING GIN(department_ids);

-- Add RLS policies
ALTER TABLE mentor_incharge_assignments ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all assignments
CREATE POLICY mentor_incharge_assignments_super_admin_all
  ON mentor_incharge_assignments
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'super_admin');

-- Mentor incharges can view their own assignment
CREATE POLICY mentor_incharge_assignments_view_own
  ON mentor_incharge_assignments
  FOR SELECT
  USING (incharge_id = auth.uid());
```

**Step 3: Apply migration**

Run: `npx supabase db push` or use Supabase dashboard

Expected: Migration applied successfully, table created

**Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): create mentor_incharge_assignments table"
```

---

## Task 2: Database Schema - Update Users Role Constraint

**Files:**
- Create: `supabase/migrations/[timestamp]_add_mentor_incharge_role.sql`

**Step 1: Create migration file**

Create new migration file with timestamp.

**Step 2: Write migration to add mentor_incharge role**

```sql
-- Drop existing check constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new check constraint with mentor_incharge role
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role = ANY (ARRAY['super_admin'::text, 'institution_admin'::text, 'mentor_incharge'::text, 'mentor'::text, 'student'::text]));

-- Add comment
COMMENT ON COLUMN users.role IS 'User role: super_admin, institution_admin, mentor_incharge, mentor, student';
```

**Step 3: Apply migration**

Run: `npx supabase db push`

Expected: Constraint updated successfully

**Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): add mentor_incharge to user roles"
```

---

## Task 3: TypeScript Types - Update Access Control Types

**Files:**
- Modify: `lib/middleware/access-control.ts:11`
- Modify: `lib/types/mentor.ts`

**Step 1: Update AccessLevel type**

In `lib/middleware/access-control.ts`:

```typescript
export type AccessLevel = 'super_admin' | 'institution_admin' | 'mentor_incharge' | 'mentor' | 'student';
```

**Step 2: Update level hierarchy**

In `lib/middleware/access-control.ts`, find `levelHierarchy` object and update:

```typescript
const levelHierarchy: Record<AccessLevel, number> = {
  super_admin: 1,
  institution_admin: 2,
  mentor_incharge: 3,  // NEW
  mentor: 4,
  student: 5,
};
```

**Step 3: Update access level labels**

In `lib/middleware/access-control.ts`, update `getAccessLevelLabel`:

```typescript
export function getAccessLevelLabel(role: AccessLevel): string {
  const labels: Record<AccessLevel, string> = {
    super_admin: 'Super Admin',
    institution_admin: 'Institution Admin',
    mentor_incharge: 'Mentor Incharge',  // NEW
    mentor: 'Mentor',
    student: 'Student',
  };

  return labels[role] || role;
}
```

**Step 4: Update badge variants**

In `lib/middleware/access-control.ts`, update `getAccessLevelVariant`:

```typescript
export function getAccessLevelVariant(
  role: AccessLevel
): 'default' | 'success' | 'warning' | 'error' {
  const variants: Record<AccessLevel, 'default' | 'success' | 'warning' | 'error'> = {
    super_admin: 'error',
    institution_admin: 'success',
    mentor_incharge: 'warning',  // NEW - orange/yellow badge
    mentor: 'default',
    student: 'default',
  };

  return variants[role] || 'default';
}
```

**Step 5: Create MentorInchargeAssignment type**

Create new file `lib/types/mentor-incharge.ts`:

```typescript
export interface MentorInchargeAssignment {
  id: string;
  incharge_id: string;
  scope_type: 'department' | 'institution' | 'multi_department';
  institution_id: string | null;
  department_ids: string[];
  assigned_by: string | null;
  assigned_at: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MentorInchargeWithUser {
  id: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    department_id: string | null;
    institution_id: string | null;
  };
  assignment: MentorInchargeAssignment;
}

export interface InchargeScope {
  scopeType: 'department' | 'institution' | 'multi_department';
  institutionId: string | null;
  departmentIds: string[];
}
```

**Step 6: Commit**

```bash
git add lib/middleware/access-control.ts lib/types/mentor-incharge.ts
git commit -m "feat(types): add mentor_incharge role and types"
```

---

## Task 4: Access Control - Scope Management Functions

**Files:**
- Modify: `lib/middleware/access-control.ts` (add new functions at end)

**Step 1: Add getMentorInchargeScope function**

```typescript
/**
 * Get Mentor Incharge scope from database
 */
export async function getMentorInchargeScope(userId: string): Promise<InchargeScope | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('mentor_incharge_assignments')
      .select('scope_type, institution_id, department_ids')
      .eq('incharge_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.error('[Access Control] No active incharge assignment found for user:', userId);
      return null;
    }

    return {
      scopeType: data.scope_type,
      institutionId: data.institution_id,
      departmentIds: data.department_ids || [],
    };
  } catch (error) {
    console.error('[Access Control] Error getting incharge scope:', error);
    return null;
  }
}
```

**Step 2: Add canAccessMentor function**

```typescript
/**
 * Check if Mentor Incharge can access a specific mentor's data
 */
export function canAccessMentor(
  inchargeScope: InchargeScope,
  mentorInstitutionId: string | null,
  mentorDepartmentId: string | null
): boolean {
  // Institution-wide scope
  if (inchargeScope.scopeType === 'institution') {
    return inchargeScope.institutionId === mentorInstitutionId;
  }

  // Department or multi-department scope
  if (mentorDepartmentId && inchargeScope.departmentIds.length > 0) {
    return inchargeScope.departmentIds.includes(mentorDepartmentId);
  }

  return false;
}
```

**Step 3: Add import for InchargeScope type**

At top of file:

```typescript
import type { InchargeScope } from '@/lib/types/mentor-incharge';
```

**Step 4: Add import for createAdminClient**

```typescript
import { createAdminClient } from '@/lib/supabase/server';
```

**Step 5: Commit**

```bash
git add lib/middleware/access-control.ts
git commit -m "feat(access): add mentor incharge scope functions"
```

---

## Task 5: API - Admin Assign Mentor Incharge Endpoint

**Files:**
- Create: `app/api/admin/mentor-incharge/assign/route.ts`

**Step 1: Create the API route file**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';

/**
 * POST /api/admin/mentor-incharge/assign
 * Assign mentor incharge role to a user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    // Only super admins can assign
    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, scopeType, institutionId, departmentIds, notes } = body;

    // Validate required fields
    if (!userId || !scopeType) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, scopeType' },
        { status: 400 }
      );
    }

    // Validate scope type
    if (!['department', 'institution', 'multi_department'].includes(scopeType)) {
      return NextResponse.json(
        { error: 'Invalid scope_type. Must be: department, institution, or multi_department' },
        { status: 400 }
      );
    }

    // Validate department requirements
    if ((scopeType === 'department' || scopeType === 'multi_department') &&
        (!departmentIds || departmentIds.length === 0)) {
      return NextResponse.json(
        { error: 'department_ids required for department/multi_department scope' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Update user role to mentor_incharge
    const { error: userError } = await supabase
      .from('users')
      .update({ role: 'mentor_incharge' })
      .eq('id', userId);

    if (userError) {
      console.error('[Assign Incharge] Error updating user role:', userError);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // Create assignment record (upsert in case re-assigning)
    const { data: assignment, error: assignError } = await supabase
      .from('mentor_incharge_assignments')
      .upsert({
        incharge_id: userId,
        scope_type: scopeType,
        institution_id: institutionId || null,
        department_ids: departmentIds || [],
        assigned_by: user.id,
        is_active: true,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'incharge_id',
      })
      .select()
      .single();

    if (assignError) {
      console.error('[Assign Incharge] Error creating assignment:', assignError);
      return NextResponse.json({ error: assignError.message }, { status: 500 });
    }

    console.log(`[Assign Incharge] Successfully assigned user ${userId} as Mentor Incharge`);

    return NextResponse.json({
      success: true,
      message: 'Mentor Incharge assigned successfully',
      assignment,
    });
  } catch (error: any) {
    console.error('[Assign Incharge] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 2: Test the endpoint**

Manual test after frontend is ready, or use curl:

```bash
curl -X POST http://localhost:3000/api/admin/mentor-incharge/assign \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-id","scopeType":"department","departmentIds":["dept-1"]}'
```

Expected: 200 OK with assignment data

**Step 3: Commit**

```bash
git add app/api/admin/mentor-incharge/assign/route.ts
git commit -m "feat(api): add assign mentor incharge endpoint"
```

---

## Task 6: API - Admin List Mentor Incharges Endpoint

**Files:**
- Create: `app/api/admin/mentor-incharge/route.ts`

**Step 1: Create GET endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';

/**
 * GET /api/admin/mentor-incharge
 * List all mentor incharges with their assignments
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('mentor_incharge_assignments')
      .select(`
        *,
        incharge:users!incharge_id (
          id,
          full_name,
          email,
          department_id,
          institution_id,
          avatar_url
        ),
        assigner:users!assigned_by (
          id,
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[List Incharges] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    console.error('[List Incharges] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/admin/mentor-incharge/route.ts
git commit -m "feat(api): add list mentor incharges endpoint"
```

---

## Task 7: API - Admin Update Incharge Assignment

**Files:**
- Create: `app/api/admin/mentor-incharge/[id]/route.ts`

**Step 1: Create PUT endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';

/**
 * PUT /api/admin/mentor-incharge/[id]
 * Update mentor incharge assignment
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { scopeType, institutionId, departmentIds, isActive, notes } = body;

    const supabase = createAdminClient();

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (scopeType !== undefined) updateData.scope_type = scopeType;
    if (institutionId !== undefined) updateData.institution_id = institutionId;
    if (departmentIds !== undefined) updateData.department_ids = departmentIds;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from('mentor_incharge_assignments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Update Incharge] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Assignment updated successfully',
      data,
    });
  } catch (error: any) {
    console.error('[Update Incharge] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 2: Create DELETE endpoint**

Add to same file:

```typescript
/**
 * DELETE /api/admin/mentor-incharge/[id]
 * Remove mentor incharge role
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Get assignment to find user
    const { data: assignment, error: fetchError } = await supabase
      .from('mentor_incharge_assignments')
      .select('incharge_id')
      .eq('id', id)
      .single();

    if (fetchError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Delete assignment
    const { error: deleteError } = await supabase
      .from('mentor_incharge_assignments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Delete Incharge] Error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Revert user role to mentor
    const { error: userError } = await supabase
      .from('users')
      .update({ role: 'mentor' })
      .eq('id', assignment.incharge_id);

    if (userError) {
      console.error('[Delete Incharge] Error updating user role:', userError);
    }

    return NextResponse.json({
      success: true,
      message: 'Mentor Incharge role removed successfully',
    });
  } catch (error: any) {
    console.error('[Delete Incharge] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add app/api/admin/mentor-incharge/[id]/route.ts
git commit -m "feat(api): add update/delete incharge endpoints"
```

---

## Task 8: API - Mentor Incharge Dashboard Stats

**Files:**
- Create: `app/api/mentor-incharge/dashboard/stats/route.ts`

**Step 1: Create stats endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { getMentorInchargeScope } from '@/lib/middleware/access-control';

/**
 * GET /api/mentor-incharge/dashboard/stats
 * Get dashboard statistics for mentor incharge
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'mentor_incharge') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const scope = await getMentorInchargeScope(user.id);

    if (!scope) {
      return NextResponse.json({ error: 'No active assignment found' }, { status: 404 });
    }

    const supabase = createAdminClient();

    // Get mentors in scope
    let mentorsQuery = supabase
      .from('mentors')
      .select('id, user_id, total_students');

    if (scope.scopeType === 'institution') {
      mentorsQuery = mentorsQuery.eq('institution_id', scope.institutionId);
    } else {
      mentorsQuery = mentorsQuery.in('department_id', scope.departmentIds);
    }

    const { data: mentors, error: mentorsError } = await mentorsQuery;

    if (mentorsError) {
      console.error('[Dashboard Stats] Error fetching mentors:', mentorsError);
      return NextResponse.json({ error: mentorsError.message }, { status: 500 });
    }

    const mentorIds = mentors?.map(m => m.id) || [];

    // Get counseling sessions stats
    const { data: sessions, error: sessionsError } = await supabase
      .from('counseling_sessions')
      .select('status')
      .in('mentor_id', mentorIds);

    if (sessionsError) {
      console.error('[Dashboard Stats] Error fetching sessions:', sessionsError);
    }

    const totalSessions = sessions?.length || 0;
    const activeSessions = sessions?.filter(s => s.status === 'scheduled').length || 0;
    const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;

    // Get sessions without feedback
    const { data: sessionsWithoutFeedback, error: feedbackError } = await supabase
      .from('counseling_sessions')
      .select('id')
      .in('mentor_id', mentorIds)
      .eq('status', 'completed')
      .is('feedback', null);

    if (feedbackError) {
      console.error('[Dashboard Stats] Error fetching feedback:', feedbackError);
    }

    const pendingFeedback = sessionsWithoutFeedback?.length || 0;

    // Calculate completion rate
    const completionRate = totalSessions > 0
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0;

    // Get IDP stats
    const { data: idpPlans, error: idpError } = await supabase
      .from('individual_development_plans')
      .select('status')
      .in('mentor_id', mentorIds);

    if (idpError) {
      console.error('[Dashboard Stats] Error fetching IDP:', idpError);
    }

    const stats = {
      totalMentors: mentors?.length || 0,
      totalStudents: mentors?.reduce((sum, m) => sum + (m.total_students || 0), 0) || 0,
      activeSessions,
      completedSessions,
      totalSessions,
      pendingFeedback,
      completionRate,
      idpPlans: {
        total: idpPlans?.length || 0,
        draft: idpPlans?.filter(p => p.status === 'draft').length || 0,
        inProgress: idpPlans?.filter(p => p.status === 'in_progress').length || 0,
        completed: idpPlans?.filter(p => p.status === 'completed').length || 0,
      },
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('[Dashboard Stats] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/mentor-incharge/dashboard/stats/route.ts
git commit -m "feat(api): add mentor incharge dashboard stats endpoint"
```

---

## Task 9: API - Mentor Incharge List Supervised Mentors

**Files:**
- Create: `app/api/mentor-incharge/mentors/route.ts`

**Step 1: Create mentors list endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { getMentorInchargeScope } from '@/lib/middleware/access-control';

/**
 * GET /api/mentor-incharge/mentors
 * List all mentors under supervision
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'mentor_incharge') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const scope = await getMentorInchargeScope(user.id);

    if (!scope) {
      return NextResponse.json({ error: 'No active assignment found' }, { status: 404 });
    }

    const supabase = createAdminClient();

    // Build query based on scope
    let query = supabase
      .from('mentors')
      .select(`
        *,
        user:users!user_id (
          id,
          full_name,
          email,
          phone_number,
          avatar_url
        )
      `);

    if (scope.scopeType === 'institution') {
      query = query.eq('institution_id', scope.institutionId);
    } else {
      query = query.in('department_id', scope.departmentIds);
    }

    const { data: mentors, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[Incharge Mentors] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get activity metrics for each mentor
    const mentorIds = mentors?.map(m => m.id) || [];

    // Get session counts
    const { data: sessionCounts } = await supabase
      .from('counseling_sessions')
      .select('mentor_id, status')
      .in('mentor_id', mentorIds);

    // Calculate metrics per mentor
    const mentorsWithMetrics = mentors?.map(mentor => {
      const mentorSessions = sessionCounts?.filter(s => s.mentor_id === mentor.id) || [];
      const completedSessions = mentorSessions.filter(s => s.status === 'completed').length;
      const totalSessions = mentorSessions.length;
      const completionRate = totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 100)
        : 0;

      return {
        ...mentor,
        metrics: {
          totalSessions,
          completedSessions,
          activeSessions: mentorSessions.filter(s => s.status === 'scheduled').length,
          completionRate,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: mentorsWithMetrics || [],
    });
  } catch (error: any) {
    console.error('[Incharge Mentors] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/mentor-incharge/mentors/route.ts
git commit -m "feat(api): add list supervised mentors endpoint"
```

---

## Task 10: API - Mentor Incharge Counseling Sessions

**Files:**
- Create: `app/api/mentor-incharge/counseling-sessions/route.ts`

**Step 1: Create sessions endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { getMentorInchargeScope } from '@/lib/middleware/access-control';

/**
 * GET /api/mentor-incharge/counseling-sessions
 * Get all counseling sessions from supervised mentors
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'mentor_incharge') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const scope = await getMentorInchargeScope(user.id);

    if (!scope) {
      return NextResponse.json({ error: 'No active assignment found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const mentorId = searchParams.get('mentorId');

    const supabase = createAdminClient();

    // Get mentors in scope first
    let mentorsQuery = supabase
      .from('mentors')
      .select('id');

    if (scope.scopeType === 'institution') {
      mentorsQuery = mentorsQuery.eq('institution_id', scope.institutionId);
    } else {
      mentorsQuery = mentorsQuery.in('department_id', scope.departmentIds);
    }

    const { data: mentors, error: mentorsError } = await mentorsQuery;

    if (mentorsError) {
      return NextResponse.json({ error: mentorsError.message }, { status: 500 });
    }

    const mentorIds = mentors?.map(m => m.id) || [];

    // Build sessions query
    let query = supabase
      .from('counseling_sessions')
      .select(`
        *,
        mentor:mentors!mentor_id (
          id,
          designation,
          user:users!user_id (
            id,
            full_name,
            email
          )
        ),
        student:students!student_id (
          id,
          name,
          roll_number,
          email
        ),
        feedback:session_feedback!session_id (
          id,
          counseling_queries,
          action_taken,
          attachment_url,
          submitted_at
        )
      `)
      .in('mentor_id', mentorIds);

    if (status) {
      query = query.eq('status', status);
    }

    if (mentorId) {
      query = query.eq('mentor_id', mentorId);
    }

    const { data: sessions, error } = await query.order('date', { ascending: false });

    if (error) {
      console.error('[Incharge Sessions] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: sessions || [],
    });
  } catch (error: any) {
    console.error('[Incharge Sessions] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/mentor-incharge/counseling-sessions/route.ts
git commit -m "feat(api): add mentor incharge sessions endpoint"
```

---

## Task 11: API - Mentor Incharge IDP Plans

**Files:**
- Create: `app/api/mentor-incharge/idp-plans/route.ts`

**Step 1: Create IDP plans endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { getMentorInchargeScope } from '@/lib/middleware/access-control';

/**
 * GET /api/mentor-incharge/idp-plans
 * Get all IDP plans from supervised mentors
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'mentor_incharge') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const scope = await getMentorInchargeScope(user.id);

    if (!scope) {
      return NextResponse.json({ error: 'No active assignment found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const mentorId = searchParams.get('mentorId');

    const supabase = createAdminClient();

    // Get mentors in scope
    let mentorsQuery = supabase
      .from('mentors')
      .select('id');

    if (scope.scopeType === 'institution') {
      mentorsQuery = mentorsQuery.eq('institution_id', scope.institutionId);
    } else {
      mentorsQuery = mentorsQuery.in('department_id', scope.departmentIds);
    }

    const { data: mentors, error: mentorsError } = await mentorsQuery;

    if (mentorsError) {
      return NextResponse.json({ error: mentorsError.message }, { status: 500 });
    }

    const mentorIds = mentors?.map(m => m.id) || [];

    // Build IDP query
    let query = supabase
      .from('individual_development_plans')
      .select(`
        *,
        mentor:mentors!mentor_id (
          id,
          designation,
          user:users!user_id (
            id,
            full_name,
            email
          )
        ),
        student:students!student_id (
          id,
          name,
          roll_number,
          email
        )
      `)
      .in('mentor_id', mentorIds);

    if (status) {
      query = query.eq('status', status);
    }

    if (mentorId) {
      query = query.eq('mentor_id', mentorId);
    }

    const { data: plans, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[Incharge IDP] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: plans || [],
    });
  } catch (error: any) {
    console.error('[Incharge IDP] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/mentor-incharge/idp-plans/route.ts
git commit -m "feat(api): add mentor incharge IDP plans endpoint"
```

---

## Task 12: Update Auth Role Mapping

**Files:**
- Modify: `lib/supabase/auth.ts:243-255`

**Step 1: Add mentor_incharge to role mapping**

Update the `mapJkknRoleToDbRole` function:

```typescript
export function mapJkknRoleToDbRole(jkknRole: string): string {
  const roleMapping: Record<string, string> = {
    // MyJKKN role -> Our DB role
    'administrator': 'super_admin',
    'principal': 'institution_admin',
    'hod': 'institution_admin',
    'digital_coordinator': 'institution_admin',
    'faculty': 'mentor',
    'super_admin': 'super_admin',
    // Note: mentor_incharge is assigned via admin panel, not from MyJKKN
  };

  return roleMapping[jkknRole] || 'mentor';
}
```

**Step 2: Add mentor_incharge to allowed roles**

Update the `isRoleAllowed` function:

```typescript
export function isRoleAllowed(role: string): boolean {
  const allowedRoles = [
    'faculty',
    'hod',
    'principal',
    'administrator',
    'digital_coordinator',
    'super_admin',
    'mentor_incharge', // NEW - Allow access
  ];

  return allowedRoles.includes(role);
}
```

**Step 3: Add default route for mentor_incharge**

Update the `getDefaultRouteForRole` function:

```typescript
export function getDefaultRouteForRole(role: string): string {
  const roleRoutes: Record<string, string> = {
    faculty: '/mentor',
    hod: '/dashboard',
    principal: '/dashboard',
    administrator: '/dashboard',
    digital_coordinator: '/dashboard',
    super_admin: '/dashboard',
    mentor_incharge: '/mentor-incharge/dashboard', // NEW
  };

  return roleRoutes[role] || '/';
}
```

**Step 4: Add mentor_incharge to route permissions**

Update the `canAccessRoute` function:

```typescript
export function canAccessRoute(role: string, route: string): boolean {
  // Super admin can access everything
  if (role === 'super_admin' || role === 'administrator') {
    return true;
  }

  const routePermissions: Record<string, string[]> = {
    '/admin': ['super_admin', 'administrator', 'digital_coordinator'],
    '/mentor': ['faculty', 'hod', 'principal', 'administrator', 'digital_coordinator', 'super_admin'],
    '/dashboard': ['hod', 'principal', 'administrator', 'digital_coordinator', 'super_admin'],
    '/mentor-incharge': ['mentor_incharge', 'super_admin'], // NEW
  };

  const allowedRoles = routePermissions[route];
  if (!allowedRoles) {
    return true; // Public route
  }

  return allowedRoles.includes(role);
}
```

**Step 5: Commit**

```bash
git add lib/supabase/auth.ts
git commit -m "feat(auth): add mentor_incharge role mapping and routes"
```

---

**CHECKPOINT: Backend Complete**

At this point, all database schema and API endpoints are implemented. Next tasks will build the frontend UI.

---

## Task 13: Create Super Admin - Mentor Incharge Management Page

**Files:**
- Create: `app/(dashboard)/admin/mentor-incharge/page.tsx`

**Step 1: Create the page component**

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { SkeletonCard } from '@/components/ui/Skeleton';
import AssignInchargeModal from './components/AssignInchargeModal';
import type { MentorInchargeWithUser } from '@/lib/types/mentor-incharge';

export default function MentorInchargePage() {
  const { accessToken } = useAuth();
  const toast = useToast();

  const [incharges, setIncharges] = useState<MentorInchargeWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedIncharge, setSelectedIncharge] = useState<MentorInchargeWithUser | null>(null);

  useEffect(() => {
    if (accessToken) {
      fetchIncharges();
    }
  }, [accessToken]);

  const fetchIncharges = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/mentor-incharge', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setIncharges(data.data || []);
      } else {
        toast.error('Failed to load incharges', data.error);
      }
    } catch (error) {
      toast.error('Error loading incharges', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this Mentor Incharge assignment?')) return;

    try {
      const response = await fetch(`/api/admin/mentor-incharge/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: false }),
      });

      if (response.ok) {
        toast.success('Deactivated', 'Assignment deactivated successfully');
        fetchIncharges();
      } else {
        const data = await response.json();
        toast.error('Failed to deactivate', data.error);
      }
    } catch (error) {
      toast.error('Error', 'Failed to deactivate assignment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove Mentor Incharge role? This will revert the user to regular Mentor.')) return;

    try {
      const response = await fetch(`/api/admin/mentor-incharge/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        toast.success('Removed', 'Mentor Incharge role removed successfully');
        fetchIncharges();
      } else {
        const data = await response.json();
        toast.error('Failed to remove', data.error);
      }
    } catch (error) {
      toast.error('Error', 'Failed to remove role');
    }
  };

  const getScopeLabel = (assignment: any) => {
    if (assignment.scope_type === 'institution') {
      return 'Institution-wide';
    }
    if (assignment.scope_type === 'multi_department') {
      return `${assignment.department_ids?.length || 0} Departments`;
    }
    return 'Department';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Mentor Incharge Management</h1>
          <p className="text-neutral-600 mt-1">Assign and manage mentor supervisory roles</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setSelectedIncharge(null);
            setShowAssignModal(true);
          }}
          className="bg-brand-green hover:bg-brand-green/90"
        >
          Assign New Incharge
        </Button>
      </div>

      {incharges.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-neutral-600 mb-4">No Mentor Incharges assigned yet</p>
            <Button
              variant="primary"
              onClick={() => setShowAssignModal(true)}
              className="bg-brand-green hover:bg-brand-green/90"
            >
              Assign First Incharge
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {incharges.map((incharge) => (
            <Card key={incharge.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {incharge.user.full_name}
                    </h3>
                    <Badge variant={incharge.assignment.is_active ? 'success' : 'default'}>
                      {incharge.assignment.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="warning">
                      {getScopeLabel(incharge.assignment)}
                    </Badge>
                  </div>
                  <p className="text-sm text-neutral-600 mb-3">{incharge.user.email}</p>

                  {incharge.assignment.department_ids && incharge.assignment.department_ids.length > 0 && (
                    <div className="text-sm text-neutral-600">
                      <strong>Departments:</strong> {incharge.assignment.department_ids.join(', ')}
                    </div>
                  )}

                  {incharge.assignment.notes && (
                    <div className="text-sm text-neutral-600 mt-2">
                      <strong>Notes:</strong> {incharge.assignment.notes}
                    </div>
                  )}

                  <div className="text-xs text-neutral-500 mt-3">
                    Assigned on {new Date(incharge.assignment.assigned_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {incharge.assignment.is_active ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeactivate(incharge.assignment.id)}
                      >
                        Deactivate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(incharge.assignment.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove Role
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(incharge.assignment.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showAssignModal && (
        <AssignInchargeModal
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            setShowAssignModal(false);
            fetchIncharges();
          }}
        />
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/\(dashboard\)/admin/mentor-incharge/page.tsx
git commit -m "feat(ui): create mentor incharge management page"
```

---

## Task 14: Create Assign Incharge Modal Component

**Files:**
- Create: `app/(dashboard)/admin/mentor-incharge/components/AssignInchargeModal.tsx`

**Step 1: Create modal component**

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input, { TextArea } from '@/components/ui/Input';

interface AssignInchargeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignInchargeModal({ onClose, onSuccess }: AssignInchargeModalProps) {
  const { accessToken } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    userId: '',
    scopeType: 'department' as 'department' | 'institution' | 'multi_department',
    institutionId: '',
    departmentIds: [] as string[],
    notes: '',
  });

  useEffect(() => {
    fetchFaculty();
    fetchDepartments();
    fetchInstitutions();
  }, []);

  const fetchFaculty = async () => {
    try {
      const response = await fetch('/api/jkkn/staff', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (response.ok) {
        setFaculty(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching faculty:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/jkkn/departments', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (response.ok) {
        setDepartments(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchInstitutions = async () => {
    try {
      const response = await fetch('/api/jkkn/institutions', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (response.ok) {
        setInstitutions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching institutions:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.userId) {
      toast.warning('Validation Error', 'Please select a faculty member');
      return;
    }

    if ((formData.scopeType === 'department' || formData.scopeType === 'multi_department')
        && formData.departmentIds.length === 0) {
      toast.warning('Validation Error', 'Please select at least one department');
      return;
    }

    if (formData.scopeType === 'institution' && !formData.institutionId) {
      toast.warning('Validation Error', 'Please select an institution');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/admin/mentor-incharge/assign', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Success', 'Mentor Incharge assigned successfully');
        onSuccess();
      } else {
        toast.error('Assignment Failed', data.error || 'Failed to assign role');
      }
    } catch (error) {
      toast.error('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentToggle = (deptId: string) => {
    setFormData(prev => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(deptId)
        ? prev.departmentIds.filter(id => id !== deptId)
        : [...prev.departmentIds, deptId],
    }));
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Assign Mentor Incharge"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Select Faculty Member
          </label>
          <select
            value={formData.userId}
            onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
            required
          >
            <option value="">-- Select Faculty --</option>
            {faculty.map((f) => (
              <option key={f.id} value={f.id}>
                {f.first_name} {f.last_name} ({f.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Scope Type
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="scopeType"
                value="department"
                checked={formData.scopeType === 'department'}
                onChange={(e) => setFormData({ ...formData, scopeType: e.target.value as any })}
              />
              <span>Single Department</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="scopeType"
                value="multi_department"
                checked={formData.scopeType === 'multi_department'}
                onChange={(e) => setFormData({ ...formData, scopeType: e.target.value as any })}
              />
              <span>Multiple Departments</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="scopeType"
                value="institution"
                checked={formData.scopeType === 'institution'}
                onChange={(e) => setFormData({ ...formData, scopeType: e.target.value as any })}
              />
              <span>Institution-wide</span>
            </label>
          </div>
        </div>

        {formData.scopeType === 'institution' && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Institution
            </label>
            <select
              value={formData.institutionId}
              onChange={(e) => setFormData({ ...formData, institutionId: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
              required
            >
              <option value="">-- Select Institution --</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {(formData.scopeType === 'department' || formData.scopeType === 'multi_department') && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Departments {formData.scopeType === 'multi_department' && '(select multiple)'}
            </label>
            <div className="border border-neutral-300 rounded-md p-3 max-h-48 overflow-y-auto">
              {departments.map((dept) => (
                <label key={dept.id} className="flex items-center gap-2 py-1 hover:bg-neutral-50">
                  <input
                    type="checkbox"
                    checked={formData.departmentIds.includes(dept.id)}
                    onChange={() => handleDepartmentToggle(dept.id)}
                  />
                  <span>{dept.department_name || dept.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <TextArea
          label="Notes (Optional)"
          placeholder="Add any notes about this assignment..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />

        <ModalFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={loading}
            className="bg-brand-green hover:bg-brand-green/90"
          >
            {loading ? 'Assigning...' : 'Assign Mentor Incharge'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
```

**Step 2: Commit**

```bash
git add app/\(dashboard\)/admin/mentor-incharge/components/AssignInchargeModal.tsx
git commit -m "feat(ui): create assign incharge modal component"
```

---

## Task 15: Create Mentor Incharge Dashboard Page

**Files:**
- Create: `app/(dashboard)/mentor-incharge/dashboard/page.tsx`

**Step 1: Create dashboard page**

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import Card from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';

export default function MentorInchargeDashboardPage() {
  const { accessToken } = useAuth();
  const toast = useToast();

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accessToken) {
      fetchStats();
    }
  }, [accessToken]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mentor-incharge/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setStats(data.stats);
      } else {
        toast.error('Failed to load stats', data.error);
      }
    } catch (error) {
      toast.error('Error loading stats', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Mentor Incharge Dashboard</h1>
        <p className="text-neutral-600 mt-1">Monitor and manage mentor activities</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Total Mentors</p>
              <p className="text-3xl font-bold text-neutral-900 mt-1">{stats?.totalMentors || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            Supervising {stats?.totalStudents || 0} students
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Active Sessions</p>
              <p className="text-3xl font-bold text-neutral-900 mt-1">{stats?.activeSessions || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            {stats?.completedSessions || 0} completed
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Pending Feedback</p>
              <p className="text-3xl font-bold text-neutral-900 mt-1">{stats?.pendingFeedback || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            Awaiting mentor feedback
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Completion Rate</p>
              <p className="text-3xl font-bold text-neutral-900 mt-1">{stats?.completionRate || 0}%</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            Overall performance
          </p>
        </Card>
      </div>

      {/* IDP Stats */}
      {stats?.idpPlans && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">IDP Plans Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-neutral-50 rounded-lg">
              <p className="text-2xl font-bold text-neutral-900">{stats.idpPlans.total}</p>
              <p className="text-sm text-neutral-600 mt-1">Total Plans</p>
            </div>
            <div className="text-center p-4 bg-neutral-50 rounded-lg">
              <p className="text-2xl font-bold text-neutral-600">{stats.idpPlans.draft}</p>
              <p className="text-sm text-neutral-600 mt-1">Draft</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{stats.idpPlans.inProgress}</p>
              <p className="text-sm text-neutral-600 mt-1">In Progress</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{stats.idpPlans.completed}</p>
              <p className="text-sm text-neutral-600 mt-1">Completed</p>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/mentor-incharge/mentors'}>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">View Mentors</h3>
          <p className="text-sm text-neutral-600">See all mentors under your supervision</p>
        </Card>
        <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/mentor-incharge/sessions'}>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Counseling Sessions</h3>
          <p className="text-sm text-neutral-600">Monitor all counseling activities</p>
        </Card>
        <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/mentor-incharge/idp'}>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">IDP Plans</h3>
          <p className="text-sm text-neutral-600">Track development plans and progress</p>
        </Card>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/\(dashboard\)/mentor-incharge/dashboard/page.tsx
git commit -m "feat(ui): create mentor incharge dashboard overview"
```

---

**PLAN COMPLETE - Ready for Implementation**

This plan provides 15 detailed tasks covering:
- ✅ Database schema (2 tasks)
- ✅ TypeScript types (1 task)
- ✅ Access control functions (1 task)
- ✅ Admin API endpoints (3 tasks)
- ✅ Mentor Incharge API endpoints (4 tasks)
- ✅ Auth role mapping (1 task)
- ✅ Admin UI (2 tasks)
- ✅ Dashboard UI (1 task)

**Remaining tasks to complete separately:**
- Mentor Incharge Mentors List Page
- Mentor Incharge Sessions Page
- Mentor Incharge IDP Plans Page
- Student Assignment functionality
- Send Reminders functionality
- Reports Generation functionality

Each task is broken into small steps (2-5 minutes each) following TDD principles where applicable.
