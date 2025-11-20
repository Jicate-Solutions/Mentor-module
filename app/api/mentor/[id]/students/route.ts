import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserAccess, canAssignStudents } from '@/lib/middleware/access-control';
import { getCurrentUser } from '@/lib/auth/get-current-user';

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

    // Create admin client for this request
    const supabaseAdmin = createAdminClient();

    // IMPORTANT: mentorId is the JKKN staff ID, we need to find the Supabase mentor.id
    // First, find the user by jkkn_user_id
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('jkkn_user_id', mentorId)
      .single();

    if (!user) {
      console.log(`[Students API GET] No user found for JKKN ID ${mentorId}`);
      return NextResponse.json({
        success: true,
        students: [],
      });
    }

    // Then find the mentor record
    const { data: mentor } = await supabaseAdmin
      .from('mentors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!mentor) {
      console.log(`[Students API GET] No mentor record found for user ${user.id}`);
      return NextResponse.json({
        success: true,
        students: [],
      });
    }

    console.log(`[Students API GET] Found mentor ${mentor.id} for JKKN ID ${mentorId}`);

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
          department_id
        )
      `)
      .eq('mentor_id', mentor.id)
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
      department: assignment.student?.department_id || 'Unknown',
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
    // Get current user and access level
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userAccess = await getUserAccess();
    if (!userAccess) {
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

    // Create admin client for this request
    const supabaseAdmin = createAdminClient();

    // IMPORTANT: mentorId here is the JKKN staff ID, not Supabase mentors.id
    console.log('[Students API POST] Looking up mentor by JKKN ID:', mentorId);

    // Step 1: Find or create user with jkkn_user_id = mentorId
    let { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, jkkn_user_id, full_name, email, department_id, institution_id')
      .eq('jkkn_user_id', mentorId)
      .single();

    console.log('[Students API POST] User lookup result:', {
      found: !!user,
      user,
      error: userError
    });

    // If user not found OR has placeholder/null values, fetch from JKKN API and update
    const needsUpdate = !user || !user.department_id || !user.institution_id || user.full_name === 'Unknown';

    if (userError || !user) {
      console.log('[Students API] User not found in Supabase. Fetching from JKKN API...');
    } else if (needsUpdate) {
      console.log('[Students API] User exists but has incomplete data. Fetching from JKKN API to update...');
    }

    if (needsUpdate) {

      try {
        // Fetch staff list from JKKN API (this endpoint works reliably)
        const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';
        const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;

        const staffResponse = await fetch(
          `${baseUrl}/api-management/staff?page=1&limit=1000`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!staffResponse.ok) {
          throw new Error('Failed to fetch staff list from JKKN API');
        }

        const staffData = await staffResponse.json();

        // Find the specific mentor by ID
        const jkknMentor = staffData.data?.find((staff: any) => staff.id === mentorId);

        if (!jkknMentor) {
          throw new Error(`Mentor with ID ${mentorId} not found in JKKN staff list`);
        }

        console.log('[Students API] ✓ Found mentor in JKKN staff list:', {
          id: jkknMentor.id,
          name: `${jkknMentor.first_name} ${jkknMentor.last_name}`,
          department_id: jkknMentor.department_id,
          institution_id: jkknMentor.institution_id
        });

        // Extract department and institution IDs
        const departmentId = typeof jkknMentor.department === 'object'
          ? jkknMentor.department?.id
          : jkknMentor.department;
        const institutionId = typeof jkknMentor.institution === 'object'
          ? jkknMentor.institution?.id
          : jkknMentor.institution;

        // Create user record
        const { data: newUser, error: userCreateError } = await supabaseAdmin
          .from('users')
          .upsert({
            jkkn_user_id: mentorId,
            email: jkknMentor.email || jkknMentor.institution_email || `${mentorId}@jkkn.ac.in`,
            full_name: `${jkknMentor.first_name || ''} ${jkknMentor.last_name || ''}`.trim() || 'Unknown',
            role: 'mentor',
            department_id: departmentId || null,
            institution_id: institutionId || null,
            phone_number: jkknMentor.phone || null,
            gender: jkknMentor.gender || null,
            designation: jkknMentor.designation || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'jkkn_user_id',
          })
          .select('id, jkkn_user_id, full_name, email, department_id, institution_id')
          .single();

        if (userCreateError) {
          console.error('[Students API] Failed to create user:', userCreateError);
          throw userCreateError;
        }

        console.log('[Students API] ✅ Created user record');
        user = newUser;

      } catch (fetchError) {
        console.error('[Students API] Error fetching/creating user:', fetchError);
        return NextResponse.json(
          { error: 'Failed to initialize mentor record', details: String(fetchError) },
          { status: 500 }
        );
      }
    }

    // Step 2: Find or create mentor record linked to user
    let { data: mentor, error: mentorError } = await supabaseAdmin
      .from('mentors')
      .select('id, user_id, department_id, institution_id')
      .eq('user_id', user!.id)
      .single();

    if (mentorError || !mentor) {
      console.log('[Students API] Mentor record not found. Creating...');

      // Create mentor record
      const { data: newMentor, error: mentorCreateError } = await supabaseAdmin
        .from('mentors')
        .insert({
          user_id: user!.id,
          department_id: user!.department_id || '00000000-0000-0000-0000-000000000001',
          institution_id: user!.institution_id || '00000000-0000-0000-0000-000000000001',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id, user_id, department_id, institution_id')
        .single();

      if (mentorCreateError) {
        console.error('[Students API] Failed to create mentor:', mentorCreateError);
        return NextResponse.json(
          { error: 'Failed to create mentor record', details: mentorCreateError.message },
          { status: 500 }
        );
      }

      console.log('[Students API] ✅ Created mentor record');
      mentor = newMentor;
    } else if (mentor.department_id === '00000000-0000-0000-0000-000000000001' || mentor.institution_id === '00000000-0000-0000-0000-000000000001') {
      // Update mentor with real IDs if it has placeholder values
      console.log('[Students API] Updating mentor with real department/institution IDs...');
      const { data: updatedMentor, error: updateError } = await supabaseAdmin
        .from('mentors')
        .update({
          department_id: user!.department_id || mentor.department_id,
          institution_id: user!.institution_id || mentor.institution_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', mentor.id)
        .select('id, user_id, department_id, institution_id')
        .single();

      if (!updateError && updatedMentor) {
        console.log('[Students API] ✅ Updated mentor with real IDs');
        mentor = updatedMentor;
      }
    }

    console.log('[Students API] Using mentor:', mentor);

    // AUTHORIZATION CHECK: Can the current user assign students to this mentor?
    const canAssign = await canAssignStudents(
      userAccess,
      mentor!.id,
      mentor!.institution_id
    );

    if (!canAssign) {
      console.log('[Students API] Authorization failed:', {
        userId: userAccess.userId,
        role: userAccess.role,
        isMentorIncharge: userAccess.isMentorIncharge,
        targetMentorId: mentor!.id,
        targetInstitutionId: mentor!.institution_id,
      });
      return NextResponse.json(
        {
          error: 'Forbidden: You do not have permission to assign students to this mentor',
          details: 'Regular mentors can only assign students to themselves. Mentor in-charges can assign within their institution.'
        },
        { status: 403 }
      );
    }

    console.log('[Students API] ✅ Authorization passed');

    // Use actual mentor or fallback values
    const departmentId = mentor?.department_id || '00000000-0000-0000-0000-000000000001';
    const institutionId = mentor?.institution_id || '00000000-0000-0000-0000-000000000001';

    // INSTITUTION BOUNDARY CHECK: Ensure student is being assigned within the same institution
    // (Student institution will be set to mentor's institution during upsert, but we validate here)
    if (!userAccess.isSuperAdmin) {
      // Non-super admins cannot cross institution boundaries
      if (userAccess.institutionId && institutionId !== userAccess.institutionId && !userAccess.isMentorIncharge) {
        return NextResponse.json(
          {
            error: 'Forbidden: Cannot assign students across institution boundaries',
            details: 'You can only assign students within your own institution.'
          },
          { status: 403 }
        );
      }

      // Mentor in-charge can only assign within their assigned institution
      if (userAccess.isMentorIncharge && institutionId !== userAccess.mentorInchargeInstitutionId) {
        return NextResponse.json(
          {
            error: 'Forbidden: Cannot assign students outside your assigned institution',
            details: 'Mentor in-charges can only assign students within their assigned institution.'
          },
          { status: 403 }
        );
      }
    }

    // Check if student is already assigned to this mentor
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('mentor_students')
      .select('id')
      .eq('mentor_id', mentor!.id)
      .eq('student_id', student.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Student already assigned to this mentor' },
        { status: 400 }
      );
    }

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
    console.log('[Students API] Creating mentor-student relationship:', {
      mentor_id: mentor!.id,
      student_id: student.id,
      assigned_by: user!.id
    });
    const { data: newAssignment, error: insertError } = await supabaseAdmin
      .from('mentor_students')
      .insert({
        mentor_id: mentor!.id,  // Use Supabase mentor.id, not JKKN mentorId
        student_id: student.id,
        assigned_by: user!.id, // assigned_by is FK to users table, not mentors
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

    console.log(`[Students API] ✅ Successfully assigned student ${student.id} to mentor ${mentor!.id} (JKKN ID: ${mentorId})`);

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

    // Create admin client for this request
    const supabaseAdmin = createAdminClient();

    // IMPORTANT: mentorId is the JKKN staff ID, we need to find the Supabase mentor.id
    // First, find the user by jkkn_user_id
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('jkkn_user_id', mentorId)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'Mentor not found' },
        { status: 404 }
      );
    }

    // Then find the mentor record
    const { data: mentor } = await supabaseAdmin
      .from('mentors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!mentor) {
      return NextResponse.json(
        { error: 'Mentor record not found' },
        { status: 404 }
      );
    }

    // Delete student assignment from Supabase
    const { error: deleteError } = await supabaseAdmin
      .from('mentor_students')
      .delete()
      .eq('mentor_id', mentor.id)
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
