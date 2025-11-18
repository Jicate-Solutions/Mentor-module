import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';

/**
 * GET /api/admin/mentor-incharge
 * List all mentor incharges with their assignments
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('mentor_incharge_assignments')
      .select(`
        *,
        incharge:users!incharge_id (
          id,
          full_name,
          email,
          department_id,
          institution_id,
          avatar_url
        ),
        assigner:users!assigned_by (
          id,
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[List Incharges] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    console.error('[List Incharges] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
