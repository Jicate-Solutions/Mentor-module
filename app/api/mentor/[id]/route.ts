import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

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

    console.log(`[Mentor Detail] Fetching mentor ${mentorId} from JKKN API`);

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

    console.log('[Mentor Detail] Syncing mentor to Supabase:', {
      id: mentorId,
      department_id: departmentId,
      institution_id: institutionId
    });

    // Upsert mentor into Supabase mentors table
    const { error: upsertError } = await supabaseAdmin
      .from('mentors')
      .upsert({
        id: mentorId, // Use JKKN staff ID as primary key
        user_id: null, // Will be set when mentor logs in
        department_id: departmentId,
        institution_id: institutionId,
        designation: staff.designation || staff.position || null,
        specialization: staff.specialization || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    if (upsertError) {
      console.error('[Mentor Detail] Error syncing to Supabase:', upsertError);
      // Don't fail the request, just log the error
    } else {
      console.log(`[Mentor Detail] ✅ Successfully synced mentor ${mentorId} to Supabase`);
    }

    // Count students assigned to this mentor from Supabase
    const { count: totalStudents } = await supabaseAdmin
      .from('mentor_students')
      .select('*', { count: 'exact', head: true })
      .eq('mentor_id', mentorId);

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
