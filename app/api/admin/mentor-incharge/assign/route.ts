import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';

/**
 * POST /api/admin/mentor-incharge/assign
 * Assign mentor incharge responsibility to a mentor
 * NOTE: This does NOT change the user's role - they remain a 'mentor'
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

    // Verify user exists and is a mentor
    const { data: targetUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, role, full_name')
      .eq('id', userId)
      .single();

    if (userCheckError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.role !== 'mentor') {
      return NextResponse.json(
        { error: 'Only mentors can be assigned as Mentor Incharge' },
        { status: 400 }
      );
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

    console.log(`[Assign Incharge] Successfully assigned ${targetUser.full_name} as Mentor Incharge`);

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
