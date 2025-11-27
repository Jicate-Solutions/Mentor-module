import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserAccess, canAssignStudents } from '@/lib/middleware/access-control';

interface BulkStudent {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  department: string;
  year: string;
  institution?: string;
}

interface BulkAssignmentRequest {
  students: BulkStudent[];
}

/**
 * POST /api/mentor/[id]/students/bulk
 * Bulk assign multiple students to a mentor
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userAccess = await getUserAccess();
    if (!userAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: mentorJkknId } = await params;
    const { students }: BulkAssignmentRequest = await request.json();

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: 'Students array required' }, { status: 400 });
    }

    // Limit bulk assignment
    const MAX_BULK_SIZE = 100;
    if (students.length > MAX_BULK_SIZE) {
      return NextResponse.json({
        error: `Maximum ${MAX_BULK_SIZE} students allowed per bulk assignment`
      }, { status: 400 });
    }

    console.log('[Bulk Assignment] Starting bulk assignment for', students.length, 'students to mentor:', mentorJkknId);

    const supabaseAdmin = createAdminClient();

    // Step 1: Find user by JKKN ID
    let { data: user } = await supabaseAdmin
      .from('users')
      .select('id, jkkn_user_id, full_name, email, department_id, institution_id')
      .eq('jkkn_user_id', mentorJkknId)
      .single();

    // If not found, try JKKN API lookup
    if (!user) {
      const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
      const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

      if (apiKey) {
        try {
          const staffResponse = await fetch(`${baseUrl}/api-management/staff/${mentorJkknId}`, {
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
                await supabaseAdmin
                  .from('users')
                  .update({ jkkn_user_id: mentorJkknId })
                  .eq('id', userByEmail.id);
                user = { ...userByEmail, jkkn_user_id: mentorJkknId };
              }
            }
          }
        } catch (e) {
          console.error('[Bulk Assignment] JKKN API lookup failed:', e);
        }
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Mentor user not found' }, { status: 404 });
    }

    // Step 2: Find mentor record
    let { data: mentor } = await supabaseAdmin
      .from('mentors')
      .select('id, user_id, department_id, institution_id')
      .eq('user_id', user.id)
      .single();

    if (!mentor) {
      // Create mentor record if it doesn't exist
      const { data: newMentor, error: mentorError } = await supabaseAdmin
        .from('mentors')
        .insert({
          user_id: user.id,
          department_id: user.department_id || '00000000-0000-0000-0000-000000000001',
          institution_id: user.institution_id || '00000000-0000-0000-0000-000000000001',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id, user_id, department_id, institution_id')
        .single();

      if (mentorError) {
        console.error('[Bulk Assignment] Failed to create mentor:', mentorError);
        return NextResponse.json({ error: 'Failed to create mentor record' }, { status: 500 });
      }

      mentor = newMentor;
    }

    // Step 3: Authorization check
    const canAssign = await canAssignStudents(userAccess, mentor.id, mentor.institution_id);
    if (!canAssign) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    console.log('[Bulk Assignment] Authorization passed, processing students...');

    // Step 4: Get assigning user's ID
    const { data: assigningUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('jkkn_user_id', userAccess.userId)
      .single();

    const results = {
      success: [] as string[],
      alreadyAssigned: [] as string[],
      failed: [] as { rollNumber: string; error: string }[]
    };

    // Use mentor's institution/department for students
    const institutionId = mentor.institution_id || '00000000-0000-0000-0000-000000000001';
    const departmentId = mentor.department_id || '00000000-0000-0000-0000-000000000001';

    // Step 5: Process each student
    for (const student of students) {
      try {
        // Upsert student record
        const { data: studentRecord, error: upsertError } = await supabaseAdmin
          .from('students')
          .upsert({
            id: student.id,
            roll_number: student.rollNumber,
            name: student.name,
            email: student.email || `${student.rollNumber}@student.jkkn.ac.in`,
            department_id: departmentId,
            institution_id: institutionId,
            year: student.year || null,
            is_active: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          })
          .select('id')
          .single();

        if (upsertError) {
          console.error(`[Bulk Assignment] Failed to upsert student ${student.rollNumber}:`, upsertError);
          results.failed.push({
            rollNumber: student.rollNumber,
            error: 'Failed to create student record'
          });
          continue;
        }

        // Create mentor-student mapping
        const { error: mappingError } = await supabaseAdmin
          .from('mentor_students')
          .insert({
            mentor_id: mentor.id,
            student_id: studentRecord.id,
            assigned_by: assigningUser?.id || user.id,
            assigned_at: new Date().toISOString()
          });

        if (mappingError) {
          if (mappingError.code === '23505') { // Unique violation - already assigned
            results.alreadyAssigned.push(student.rollNumber);
          } else {
            console.error(`[Bulk Assignment] Failed to assign ${student.rollNumber}:`, mappingError);
            results.failed.push({
              rollNumber: student.rollNumber,
              error: mappingError.message
            });
          }
        } else {
          results.success.push(student.rollNumber);
        }

      } catch (err) {
        console.error(`[Bulk Assignment] Unexpected error for ${student.rollNumber}:`, err);
        results.failed.push({
          rollNumber: student.rollNumber,
          error: 'Unexpected error'
        });
      }
    }

    // Step 6: Update mentor's total_students count
    if (results.success.length > 0) {
      const { count } = await supabaseAdmin
        .from('mentor_students')
        .select('*', { count: 'exact', head: true })
        .eq('mentor_id', mentor.id);

      await supabaseAdmin
        .from('mentors')
        .update({
          total_students: count || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', mentor.id);
    }

    console.log('[Bulk Assignment] Completed:', {
      success: results.success.length,
      alreadyAssigned: results.alreadyAssigned.length,
      failed: results.failed.length
    });

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: students.length,
        assigned: results.success.length,
        alreadyAssigned: results.alreadyAssigned.length,
        failed: results.failed.length
      }
    });

  } catch (error) {
    console.error('[Bulk Assignment] Error:', error);
    return NextResponse.json({
      error: 'Bulk assignment failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
