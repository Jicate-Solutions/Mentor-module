import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * DELETE /api/mentor/[id]/students/[studentId]
 * Remove a student assignment from a mentor in Supabase
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: mentorId, studentId } = await params;

    console.log('[DELETE Student] Removing student assignment:', {
      mentorId,
      studentId
    });

    // Create admin client
    const supabaseAdmin = createAdminClient();

    // IMPORTANT: mentorId is the JKKN staff ID, we need to find the Supabase mentor.id
    // Step 1: Find user by jkkn_user_id
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('jkkn_user_id', mentorId)
      .single();

    if (!user) {
      console.error('[DELETE Student] User not found for JKKN ID:', mentorId);
      return NextResponse.json(
        { error: 'Mentor not found' },
        { status: 404 }
      );
    }

    // Step 2: Find mentor by user_id
    const { data: mentor } = await supabaseAdmin
      .from('mentors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!mentor) {
      console.error('[DELETE Student] Mentor record not found for user:', user.id);
      return NextResponse.json(
        { error: 'Mentor record not found' },
        { status: 404 }
      );
    }

    // Step 3: Delete the mentor-student assignment
    const { error: deleteError } = await supabaseAdmin
      .from('mentor_students')
      .delete()
      .eq('mentor_id', mentor.id)
      .eq('student_id', studentId);

    if (deleteError) {
      console.error('[DELETE Student] Error deleting assignment:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove student assignment', details: deleteError.message },
        { status: 500 }
      );
    }

    // Step 4: Update mentor's total_students count
    const { data: remainingStudents } = await supabaseAdmin
      .from('mentor_students')
      .select('id')
      .eq('mentor_id', mentor.id);

    await supabaseAdmin
      .from('mentors')
      .update({ total_students: remainingStudents?.length || 0 })
      .eq('id', mentor.id);

    console.log('[DELETE Student] ✅ Successfully removed student assignment');

    return NextResponse.json({
      success: true,
      message: 'Student removed successfully',
    });
  } catch (error) {
    console.error('[DELETE Student] Error:', error);
    return NextResponse.json(
      { error: 'Failed to remove student' },
      { status: 500 }
    );
  }
}
