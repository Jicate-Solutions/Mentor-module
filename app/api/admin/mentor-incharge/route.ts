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

    // Fetch all assignments
    const { data: assignments, error } = await supabase
      .from('mentor_incharge_assignments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[List Incharges] Error fetching assignments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch user details for all user_ids and assigned_by users
    const userIds = new Set<string>();
    assignments?.forEach((assignment: any) => {
      if (assignment.user_id) userIds.add(assignment.user_id);
      if (assignment.assigned_by) userIds.add(assignment.assigned_by);
    });

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email, department_id, institution_id, avatar_url')
      .in('id', Array.from(userIds));

    if (usersError) {
      console.error('[List Incharges] Error fetching users:', usersError);
    }

    // Map users by ID for quick lookup
    const usersMap = new Map();
    users?.forEach((u: any) => usersMap.set(u.id, u));

    // Transform to match frontend InchargeAssignment interface
    const data = assignments?.map((assignment: any) => ({
      id: assignment.id,
      incharge_id: assignment.user_id,
      scope_type: assignment.department_id ? 'department' : 'institution',
      institution_id: assignment.institution_id,
      department_ids: assignment.department_id ? [assignment.department_id] : [],
      assigned_at: assignment.created_at,
      is_active: true,
      notes: assignment.notes,
      incharge: assignment.user_id
        ? [usersMap.get(assignment.user_id)].filter(Boolean)
        : [],
      assigner: assignment.assigned_by
        ? [usersMap.get(assignment.assigned_by)].filter(Boolean)
        : [],
    }));

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    console.error('[List Incharges] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
