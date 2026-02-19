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
    let { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('jkkn_user_id', mentorId)
      .single();

    // If not found, try to get email from JKKN API and lookup by email
    if (!user) {
      console.log(`[Students API GET] No user found by jkkn_user_id ${mentorId}, trying JKKN API lookup...`);

      const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
      const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

      if (apiKey) {
        try {
          const staffResponse = await fetch(`${baseUrl}/api-management/staff/${mentorId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          });

          if (staffResponse.ok) {
            const staffData = await staffResponse.json();
            const email = staffData.data?.email;

            if (email) {
              const { data: userByEmail } = await supabaseAdmin
                .from('users')
                .select('id, email')
                .eq('email', email)
                .single();

              if (userByEmail) {
                console.log(`[Students API GET] Found user by email ${email}, updating jkkn_user_id`);
                await supabaseAdmin
                  .from('users')
                  .update({ jkkn_user_id: mentorId })
                  .eq('id', userByEmail.id);
                user = userByEmail;
              }
            }
          }
        } catch (e) {
          console.error('[Students API GET] JKKN API lookup failed:', e);
        }
      }
    }

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

    // Fetch department names from JKKN API to resolve department_id
    const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';
    let departmentMap = new Map<string, string>();

    if (apiKey) {
      try {
        const deptResponse = await fetch(`${baseUrl}/api-management/organizations/departments?page=1&limit=500`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          next: { revalidate: 60 },
        });

        if (deptResponse.ok) {
          const deptData = await deptResponse.json();
          (deptData.data || []).forEach((dept: any) => {
            const id = dept.id || dept.department_id;
            const name = dept.name || dept.department_name || 'Unknown Department';
            if (id) departmentMap.set(id, name);
          });
          console.log(`[Students API] Built department lookup map with ${departmentMap.size} entries`);
        }
      } catch (e) {
        console.warn('[Students API] Failed to fetch departments for lookup:', e);
      }
    }

    // Transform data to match frontend expectations
    const students = (assignments || []).map((assignment: any) => {
      const deptId = assignment.student?.department_id;
      const departmentName = deptId ? (departmentMap.get(deptId) || 'Unknown Department') : 'Unknown Department';

      return {
        id: assignment.student?.id || assignment.student_id,
        name: assignment.student?.name || 'Unknown Student',
        email: assignment.student?.email || '',
        rollNumber: assignment.student?.roll_number || '',
        department: departmentName,
        year: assignment.student?.year || '',
        assignedAt: assignment.assigned_at,
        notes: assignment.notes || undefined,
      };
    });

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

    // Step 1: Find user with jkkn_user_id = mentorId (or by email as fallback)
    let { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, jkkn_user_id, full_name, email, department_id, institution_id')
      .eq('jkkn_user_id', mentorId)
      .single();

    // If not found by jkkn_user_id, fetch from JKKN API and try email lookup
    const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';
    const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;

    if (!user && apiKey) {
      console.log('[Students API POST] User not found by jkkn_user_id, trying JKKN API + email lookup...');
      try {
        const staffResponse = await fetch(`${baseUrl}/api-management/staff/${mentorId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });

        if (staffResponse.ok) {
          const staffData = await staffResponse.json();
          const email = staffData.data?.email;

          if (email) {
            const { data: userByEmail } = await supabaseAdmin
              .from('users')
              .select('id, jkkn_user_id, full_name, email, department_id, institution_id')
              .eq('email', email)
              .single();

            if (userByEmail) {
              console.log(`[Students API POST] Found user by email ${email}, updating jkkn_user_id`);
              await supabaseAdmin
                .from('users')
                .update({ jkkn_user_id: mentorId })
                .eq('id', userByEmail.id);
              user = { ...userByEmail, jkkn_user_id: mentorId };
              userError = null;
            }
          }
        }
      } catch (e) {
        console.error('[Students API POST] JKKN API lookup failed:', e);
      }
    }

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
          details: 'Mentors and faculty can only assign students to themselves. Mentor in-charges can assign within their institution.',
          debug: {
            userId: userAccess.userId,
            role: userAccess.role,
            targetMentorId: mentor!.id,
          }
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

    // Check if student is already assigned to ANY mentor
    console.log('[Students API] Checking for existing assignment:', {
      mentor_id: mentor!.id,
      student_id: student.id
    });

    const { data: existingAssignment, error: checkError } = await supabaseAdmin
      .from('mentor_students')
      .select(`
        id,
        mentor_id,
        mentors:mentor_id (
          id,
          users:user_id (
            full_name
          )
        )
      `)
      .eq('student_id', student.id)
      .maybeSingle();

    console.log('[Students API] Existing assignment check result:', {
      exists: !!existingAssignment,
      existingMentorId: existingAssignment?.mentor_id,
      error: checkError?.message
    });

    if (existingAssignment) {
      const assignedMentorName = (existingAssignment as any).mentors?.users?.full_name || 'another mentor';
      const isSameMentor = existingAssignment.mentor_id === mentor!.id;

      if (isSameMentor) {
        console.log('[Students API] ❌ Student already assigned to this mentor');
        return NextResponse.json(
          { error: `${student.name} is already assigned to this mentor` },
          { status: 409 }
        );
      } else {
        console.log(`[Students API] ❌ Student already assigned to ${assignedMentorName}`);
        return NextResponse.json(
          { error: `${student.name} is already assigned to ${assignedMentorName}` },
          { status: 409 }
        );
      }
    }

    console.log('[Students API] ✅ No existing assignment found - proceeding with assignment');

    // First, upsert student data into students table with required fields
    const studentData = {
      id: student.id,
      name: student.name,
      email: student.email || `${student.id}@student.jkkn.ac.in`,
      roll_number: (student.rollNumber && student.rollNumber !== 'N/A') ? student.rollNumber : student.id,
      department_id: departmentId,
      institution_id: institutionId,
      year: student.year || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    console.log('[Students API] Upserting student with values:', {
      id: studentData.id,
      name: studentData.name,
      roll_number: studentData.roll_number,
      department_id: studentData.department_id,
      institution_id: studentData.institution_id,
    });

    let { error: studentUpsertError } = await supabaseAdmin
      .from('students')
      .upsert(studentData, { onConflict: 'id' });

    // Handle duplicate roll_number from stale/old student rows
    if (studentUpsertError?.code === '23505') {
      console.warn('[Students API] Duplicate key conflict, checking for stale row...');
      const rollNum = studentData.roll_number;

      // Find the conflicting student
      const { data: conflicting } = await supabaseAdmin
        .from('students')
        .select('id, name, roll_number, email')
        .eq('roll_number', rollNum)
        .maybeSingle();

      if (conflicting && conflicting.id !== student.id) {
        // Different ID = stale row from old bulk import. JKKN API is source of truth.
        console.log(`[Students API] Stale student row found: id=${conflicting.id}, name=${conflicting.name}, email=${conflicting.email}`);
        console.log(`[Students API] Replacing with JKKN API student: id=${student.id}, name=${student.name}`);

        // Check if the stale row is assigned to a mentor
        const { data: staleAssignment } = await supabaseAdmin
          .from('mentor_students')
          .select('id, mentor_id')
          .eq('student_id', conflicting.id);

        if (staleAssignment && staleAssignment.length > 0) {
          // Clean up stale mentor-student assignments
          await supabaseAdmin
            .from('mentor_students')
            .delete()
            .eq('student_id', conflicting.id);
          console.log(`[Students API] Cleaned up ${staleAssignment.length} stale mentor assignment(s) for old student ${conflicting.id}`);
        }

        // Delete the stale student row
        const { error: deleteError } = await supabaseAdmin
          .from('students')
          .delete()
          .eq('id', conflicting.id);

        if (deleteError) {
          console.error('[Students API] Failed to delete stale student row:', deleteError);
          return NextResponse.json(
            { error: `Failed to replace stale student record: ${deleteError.message}` },
            { status: 500 }
          );
        }
        console.log(`[Students API] Deleted stale student row ${conflicting.id}`);

        // Retry the upsert with the real JKKN API data
        const { error: retryError } = await supabaseAdmin
          .from('students')
          .upsert(studentData, { onConflict: 'id' });

        if (retryError) {
          console.error('[Students API] Retry upsert failed:', retryError);
          return NextResponse.json(
            { error: `Failed to save student data after cleanup: ${retryError.message}` },
            { status: 500 }
          );
        }

        console.log(`[Students API] ✅ Successfully replaced stale row and upserted student ${student.id}`);
        // Clear the error so we proceed to assignment
        studentUpsertError = null;
      } else if (conflicting) {
        // Same roll number, different scenario — check if assigned to another mentor
        const { data: assignment } = await supabaseAdmin
          .from('mentor_students')
          .select(`
            mentors:mentor_id (
              users:user_id ( full_name )
            )
          `)
          .eq('student_id', conflicting.id)
          .maybeSingle();

        const assignedTo = (assignment as any)?.mentors?.users?.full_name;
        const errorMsg = assignedTo
          ? `${student.name} (${rollNum}) is already in the system as ${conflicting.name} and assigned to ${assignedTo}`
          : `${student.name} could not be added — roll number ${rollNum} already belongs to ${conflicting.name}`;

        return NextResponse.json(
          { error: errorMsg, details: studentUpsertError.message },
          { status: 409 }
        );
      }
    }

    if (studentUpsertError) {
      console.error('[Students API] Error upserting student:', studentUpsertError);
      return NextResponse.json(
        { error: `Failed to save student data: ${studentUpsertError.message}`, details: studentUpsertError.message },
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
