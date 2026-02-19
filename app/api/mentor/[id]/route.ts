import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserAccess, canAccessFacultyProfile } from '@/lib/middleware/access-control';

/**
 * GET /api/mentor/[id]
 * Fetch specific mentor details from JKKN API and sync to Supabase
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

    // Authorization check - verify user has access
    const userAccess = await getUserAccess();
    if (!userAccess) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    console.log(`[Mentor Detail] Fetching mentor ${mentorId} from JKKN API (requested by ${userAccess.role})`);

    // Create admin client for this request
    const supabaseAdmin = createAdminClient();

    // Get API credentials
    const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'MyJKKN API key not configured' },
        { status: 500 }
      );
    }

    // Fetch staff member from JKKN API
    const apiResponse = await fetch(`${baseUrl}/api-management/staff/${mentorId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!apiResponse.ok) {
      console.error(`[Mentor Detail] JKKN API error: ${apiResponse.status}`);
      return NextResponse.json(
        { error: 'Mentor not found in JKKN system' },
        { status: 404 }
      );
    }

    const apiData = await apiResponse.json();
    console.log('[Mentor Detail] JKKN API response:', apiData);

    if (!apiData || !apiData.data) {
      return NextResponse.json(
        { error: 'Invalid response from JKKN API' },
        { status: 500 }
      );
    }

    const staff = apiData.data;

    // Extract mentor information
    const firstName = staff.first_name || staff.firstName || '';
    const lastName = staff.last_name || staff.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();

    const getDepartmentId = (dept: any): string => {
      if (!dept) return '';
      if (typeof dept === 'string') return dept;
      return dept.id || dept.department_id || '';
    };

    const getDepartmentName = (dept: any): string => {
      if (!dept) return 'Unknown Department';
      if (typeof dept === 'string') return dept;
      return dept.department_name || dept.name || 'Unknown Department';
    };

    const getInstitutionId = (inst: any): string => {
      if (!inst) return '';
      if (typeof inst === 'string') return inst;
      return inst.id || inst.institution_id || '';
    };

    const departmentId = getDepartmentId(staff.department);
    const institutionId = getInstitutionId(staff.institution);

    console.log('[Mentor Detail] Looking up mentor in Supabase:', {
      jkkn_id: mentorId,
      department_id: departmentId,
      institution_id: institutionId
    });

    // Step 1: Find or create user by JKKN user ID (or email fallback)
    let { data: user } = await supabaseAdmin
      .from('users')
      .select('id, jkkn_user_id, department_id, institution_id')
      .eq('jkkn_user_id', mentorId)
      .single();

    // If not found by jkkn_user_id, try email lookup (handles JKKN ID changes)
    if (!user && staff.email) {
      console.log('[Mentor Detail] User not found by jkkn_user_id, trying email lookup...');
      const { data: userByEmail } = await supabaseAdmin
        .from('users')
        .select('id, jkkn_user_id, department_id, institution_id')
        .eq('email', staff.email)
        .single();

      if (userByEmail) {
        // Update the jkkn_user_id to the new one
        console.log(`[Mentor Detail] Found user by email, updating jkkn_user_id: ${userByEmail.jkkn_user_id} → ${mentorId}`);
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ jkkn_user_id: mentorId })
          .eq('id', userByEmail.id);

        if (updateError) {
          console.error('[Mentor Detail] Failed to update jkkn_user_id:', updateError);
          // Still use the found user even if jkkn_user_id update fails
          user = userByEmail;
        } else {
          user = { ...userByEmail, jkkn_user_id: mentorId };
        }
      }
    }

    if (!user) {
      console.log('[Mentor Detail] User not found, creating...');
      const { data: newUser, error: userError } = await supabaseAdmin
        .from('users')
        .upsert({
          jkkn_user_id: mentorId,
          email: staff.email || staff.institution_email || `${mentorId}@jkkn.ac.in`,
          full_name: fullName || 'Unknown',
          role: 'mentor',
          department_id: departmentId,
          institution_id: institutionId,
        }, {
          onConflict: 'jkkn_user_id',
        })
        .select('id, jkkn_user_id, department_id, institution_id')
        .single();

      if (userError) {
        console.error('[Mentor Detail] Error creating user:', userError);
      } else {
        user = newUser;
        console.log('[Mentor Detail] ✅ Created user record');
      }
    }

    // Step 2: Find or create mentor record by user_id
    let totalStudents = 0;

    if (user) {
      let { data: mentorRecord } = await supabaseAdmin
        .from('mentors')
        .select('id, user_id, department_id, institution_id')
        .eq('user_id', user.id)
        .single();

      if (!mentorRecord) {
        console.log('[Mentor Detail] Mentor record not found, creating...');
        const { data: newMentor, error: mentorError } = await supabaseAdmin
          .from('mentors')
          .insert({
            user_id: user.id,
            department_id: departmentId || '00000000-0000-0000-0000-000000000001',
            institution_id: institutionId || '00000000-0000-0000-0000-000000000001',
            designation: staff.designation || staff.position || null,
            specialization: staff.specialization || null,
            is_active: true,
          })
          .select('id, user_id, department_id, institution_id')
          .single();

        if (mentorError) {
          console.error('[Mentor Detail] Error creating mentor:', mentorError);
        } else {
          mentorRecord = newMentor;
          console.log('[Mentor Detail] ✅ Created mentor record');
        }
      }

      // Count students assigned to this mentor
      if (mentorRecord) {
        const { count } = await supabaseAdmin
          .from('mentor_students')
          .select('*', { count: 'exact', head: true })
          .eq('mentor_id', mentorRecord.id);

        totalStudents = count || 0;
        console.log(`[Mentor Detail] Found ${totalStudents} students for mentor ${mentorId}`);
      }

      // Authorization check - verify user can access this profile
      const canAccess = await canAccessFacultyProfile(
        userAccess,
        user.id,
        user.department_id,
        user.institution_id
      );

      if (!canAccess) {
        console.log('[Mentor Detail] Access denied:', {
          requestedMentorId: mentorId,
          requestedUserId: user.id,
          requestingUserRole: userAccess.role,
          requestingUserId: userAccess.userId,
        });
        return NextResponse.json(
          { error: 'You do not have permission to view this profile' },
          { status: 403 }
        );
      }

      console.log('[Mentor Detail] Access granted for user:', userAccess.userId);
    }

    // Return mentor data
    const mentor = {
      id: staff.id || mentorId,
      name: fullName || staff.email?.split('@')[0] || 'Unknown',
      email: staff.email || staff.institution_email || '',
      department: getDepartmentName(staff.department),
      designation: staff.designation || staff.position || 'Faculty',
      phone: staff.phone || staff.phone_number || staff.mobile || '',
      totalStudents: totalStudents || 0,
      avatar: staff.avatar_url || null,
    };

    console.log('[Mentor Detail] Returning mentor data:', mentor);

    return NextResponse.json({
      success: true,
      mentor,
    });
  } catch (error) {
    console.error('[Mentor Detail] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mentor details' },
      { status: 500 }
    );
  }
}
