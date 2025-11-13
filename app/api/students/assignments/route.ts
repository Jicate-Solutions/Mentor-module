import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/students/assignments
 * Fetches all student assignments across all mentors
 * Returns a mapping of student_id -> mentor info
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create admin client for this request
    const supabaseAdmin = createAdminClient();

    // Fetch all mentor-student assignments with mentor details
    const { data: assignments, error: queryError } = await supabaseAdmin
      .from('mentor_students')
      .select(`
        student_id,
        mentor_id,
        mentors (
          id,
          users (
            full_name,
            email
          )
        )
      `);

    if (queryError) {
      console.error('Error fetching assignments:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch assignments', details: queryError.message },
        { status: 500 }
      );
    }

    // Transform the data into a mapping: student_id -> mentor info
    const assignmentMap: Record<string, { mentorId: string; mentorName: string; mentorEmail: string }> = {};

    if (assignments) {
      assignments.forEach((assignment: any) => {
        const mentorName = assignment.mentors?.users?.full_name || 'Unknown Mentor';
        const mentorEmail = assignment.mentors?.users?.email || '';

        assignmentMap[assignment.student_id] = {
          mentorId: assignment.mentor_id,
          mentorName,
          mentorEmail,
        };
      });
    }

    return NextResponse.json({ assignments: assignmentMap }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/students/assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
