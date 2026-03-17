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
    const { userId, institutionId, departmentId, notes } = body;

    // Validate required fields
    if (!userId || !institutionId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, institutionId' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify user exists and is a mentor
    const { data: targetUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, role, full_name, institution_id')
      .eq('id', userId)
      .single();

    if (userCheckError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const allowedRoles = ['mentor', 'hod', 'faculty'];
    if (!allowedRoles.includes(targetUser.role)) {
      return NextResponse.json(
        { error: 'Only mentors, HODs, and faculty can be assigned as Mentor Incharge' },
        { status: 400 }
      );
    }

    // Verify institution matches user's institution (optional but recommended)
    if (targetUser.institution_id && targetUser.institution_id !== institutionId) {
      console.warn(`[Assign Incharge] Warning: User institution (${targetUser.institution_id}) differs from assignment institution (${institutionId})`);
    }

    // Check if user already has an assignment
    const { data: existingAssignment } = await supabase
      .from('mentor_incharge_assignments')
      .select('id, institution_id, department_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingAssignment) {
      // Update existing assignment
      const { data: assignment, error: updateError } = await supabase
        .from('mentor_incharge_assignments')
        .update({
          institution_id: institutionId,
          department_id: departmentId || null,
          assigned_by: user.id,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAssignment.id)
        .select()
        .single();

      if (updateError) {
        console.error('[Assign Incharge] Error updating assignment:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      console.log(`[Assign Incharge] Successfully updated ${targetUser.full_name} as Mentor Incharge`);

      return NextResponse.json({
        success: true,
        message: 'Mentor Incharge assignment updated successfully',
        assignment,
      });
    } else {
      // Create new assignment
      const { data: assignment, error: assignError } = await supabase
        .from('mentor_incharge_assignments')
        .insert({
          user_id: userId,
          institution_id: institutionId,
          department_id: departmentId || null,
          assigned_by: user.id,
          notes: notes || null,
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
    }
  } catch (error: any) {
    console.error('[Assign Incharge] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
