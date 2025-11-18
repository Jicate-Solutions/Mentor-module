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

/**
 * DELETE /api/admin/mentor-incharge/[id]
 * Remove mentor incharge assignment
 * NOTE: User role stays as 'mentor', we just remove the assignment
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

    // Get assignment to log the removal
    const { data: assignment, error: fetchError } = await supabase
      .from('mentor_incharge_assignments')
      .select('incharge_id')
      .eq('id', id)
      .single();

    if (fetchError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Delete assignment (user role remains 'mentor')
    const { error: deleteError } = await supabase
      .from('mentor_incharge_assignments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Delete Incharge] Error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    console.log(`[Delete Incharge] Removed mentor incharge assignment for user ${assignment.incharge_id}`);

    return NextResponse.json({
      success: true,
      message: 'Mentor Incharge assignment removed successfully',
    });
  } catch (error: any) {
    console.error('[Delete Incharge] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
