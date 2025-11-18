import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';

/**
 * GET /api/admin/mentors
 * List all mentors from our database with their user information
 * Used for assigning mentor incharge roles
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Get all mentors with their user information
    const { data: mentors, error } = await supabase
      .from('mentors')
      .select(`
        id,
        user_id,
        designation,
        department_id,
        institution_id,
        total_students,
        user:users!user_id (
          id,
          jkkn_user_id,
          email,
          full_name,
          department_id,
          institution_id
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin Mentors] Error fetching mentors:', error);
      return NextResponse.json({ 
        success: false,
        error: error.message 
      }, { status: 500 });
    }

    // Transform data for easier use
    const transformedMentors = mentors?.map((mentor: any) => ({
      id: mentor.id,
      user_id: mentor.user_id,
      full_name: mentor.user?.full_name || 'Unknown',
      email: mentor.user?.email || '',
      designation: mentor.designation || 'Mentor',
      department_id: mentor.department_id,
      institution_id: mentor.institution_id,
      total_students: mentor.total_students || 0,
    })) || [];

    return NextResponse.json({
      success: true,
      data: transformedMentors,
      total: transformedMentors.length,
    });
  } catch (error: any) {
    console.error('[Admin Mentors] Error:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}
