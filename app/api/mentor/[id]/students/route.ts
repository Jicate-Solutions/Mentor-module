import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

/**
 * GET /api/mentor/[id]/students
 * Get all students assigned to a mentor from Supabase
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: mentorId } = await params;

    // Fetch student assignments from Supabase with student details
    const { data: assignments, error } = await supabaseAdmin
      .from('mentor_students')
      .select(`
        *,
        student:students!student_id (
          id,
          name,
          email,
          roll_number,
          year,
          department_id,
          departments (
            name
          )
        )
      `)
      .eq('mentor_id', mentorId)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('[Students API] Error fetching students:', error);
      return NextResponse.json(
        { error: 'Failed to fetch students', details: error.message },
        { status: 500 }
      );
    }

    // Transform data to match frontend expectations
    const students = (assignments || []).map((assignment: any) => ({
      id: assignment.student?.id || assignment.student_id,
      name: assignment.student?.name || 'Unknown Student',
      email: assignment.student?.email || '',
      rollNumber: assignment.student?.roll_number || '',
      department: assignment.student?.departments?.name || 'Unknown',
      year: assignment.student?.year || '',
      assignedAt: assignment.assigned_at,
      notes: assignment.notes || undefined,
    }));

    console.log(`[Students API] Found ${students.length} students for mentor ${mentorId}`);

    return NextResponse.json({
      success: true,
      students,
    });
  } catch (error) {
    console.error('[Students API] Error fetching mentor students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mentor/[id]/students
 * Assign a student to a mentor in Supabase
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: mentorId } = await params;
    const body = await request.json();
    const { student, notes } = body;

    console.log('[Students API POST] Starting assignment:', {
      mentorId,
      studentId: student?.id,
      studentName: student?.name
    });

    if (!student || !student.id) {
      return NextResponse.json(
        { error: 'Student data is required' },
        { status: 400 }
      );
    }

    // Get mentor's department and institution for student record
    console.log('[Students API POST] Querying mentor:', mentorId);
    const { data: mentor, error: mentorError } = await supabaseAdmin
      .from('mentors')
      .select('id, department_id, institution_id')
      .eq('id', mentorId)
      .single();

    console.log('[Students API POST] Mentor query result:', {
      found: !!mentor,
      mentor,
      error: mentorError
    });

    if (mentorError || !mentor) {
      console.error('[Students API] Mentor not found in Supabase. Using FALLBACK values.');
      console.error('[Students API] This means the mentor from JKKN API is not in Supabase mentors table.');
      console.error('[Students API] Error details:', mentorError);

      // FALLBACK: Use placeholder IDs (you should create these in Supabase)
      // TODO: Sync mentors from JKKN API to Supabase mentors table
      const fallbackMentor = {
        department_id: '00000000-0000-0000-0000-000000000001', // Placeholder department
        institution_id: '00000000-0000-0000-0000-000000000001' // Placeholder institution
      };

      console.log('[Students API] Using fallback values:', fallbackMentor);
    }

    // Check if student is already assigned to this mentor
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('mentor_students')
      .select('id')
      .eq('mentor_id', mentorId)
      .eq('student_id', student.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Student already assigned to this mentor' },
        { status: 400 }
      );
    }

    // Use actual mentor or fallback values
    const departmentId = mentor?.department_id || '00000000-0000-0000-0000-000000000001';
    const institutionId = mentor?.institution_id || '00000000-0000-0000-0000-000000000001';

    // First, upsert student data into students table with required fields
    console.log('[Students API] Upserting student with values:', {
      id: student.id,
      name: student.name,
      department_id: departmentId,
      institution_id: institutionId
    });

    const { error: studentUpsertError } = await supabaseAdmin
      .from('students')
      .upsert({
        id: student.id,
        name: student.name,
        email: student.email || `${student.id}@student.jkkn.ac.in`,
        roll_number: student.rollNumber || student.id,
        department_id: departmentId,
        institution_id: institutionId,
        year: student.year || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id', // If student exists, update their data
      });

    if (studentUpsertError) {
      console.error('[Students API] Error upserting student:', studentUpsertError);
      console.error('[Students API] Full error:', JSON.stringify(studentUpsertError, null, 2));
      return NextResponse.json(
        { error: 'Failed to store student data', details: studentUpsertError.message },
        { status: 500 }
      );
    }

    console.log(`[Students API] ✅ Successfully upserted student ${student.id} into students table`);

    // Then insert new student assignment into Supabase
    console.log('[Students API] Creating mentor-student relationship');
    const { data: newAssignment, error: insertError } = await supabaseAdmin
      .from('mentor_students')
      .insert({
        mentor_id: mentorId,
        student_id: student.id,
        assigned_by: mentorId, // TODO: Get actual user ID from auth token
        notes: notes || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Students API] Error creating mentor-student relationship:', insertError);
      console.error('[Students API] Full error:', JSON.stringify(insertError, null, 2));
      return NextResponse.json(
        { error: 'Failed to assign student', details: insertError.message },
        { status: 500 }
      );
    }

    console.log(`[Students API] ✅ Successfully assigned student ${student.id} to mentor ${mentorId}`);

    return NextResponse.json({
      success: true,
      message: 'Student assigned successfully',
      assignment: newAssignment,
    });
  } catch (error) {
    console.error('[Students API] Error assigning student:', error);
    return NextResponse.json(
      { error: 'Failed to assign student' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mentor/[id]/students/[studentId]
 * Remove a student from a mentor in Supabase
 */
export async function DELETE(
  request: NextRequest,
  context: any
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

    // Extract mentorId and studentId from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const mentorId = pathParts[3]; // /api/mentor/[id]/students/[studentId]
    const studentId = pathParts[5];

    if (!mentorId || !studentId) {
      return NextResponse.json(
        { error: 'Missing mentor ID or student ID' },
        { status: 400 }
      );
    }

    // Delete student assignment from Supabase
    const { error: deleteError } = await supabaseAdmin
      .from('mentor_students')
      .delete()
      .eq('mentor_id', mentorId)
      .eq('student_id', studentId);

    if (deleteError) {
      console.error('[Students API] Error removing student:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove student', details: deleteError.message },
        { status: 500 }
      );
    }

    console.log(`[Students API] Removed student ${studentId} from mentor ${mentorId}`);

    return NextResponse.json({
      success: true,
      message: 'Student removed successfully',
    });
  } catch (error) {
    console.error('[Students API] Error removing student:', error);
    return NextResponse.json(
      { error: 'Failed to remove student' },
      { status: 500 }
    );
  }
}
