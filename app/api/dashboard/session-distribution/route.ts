import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Fetch sessions with department information
    let sessionQuery = supabase
      .from('counseling_sessions')
      .select(`
        id,
        status,
        created_at,
        staff!mentor_id(
          id,
          name,
          department_id,
          institution_id,
          departments(
            id,
            name
          )
        )
      `);

    // Role-based filtering
    if (user.role === 'institution_admin' || user.role === 'mentor') {
      // Filter by user's institution through mentor
      if (user.institution_id) {
        sessionQuery = sessionQuery.eq('staff.institution_id', user.institution_id);
      }
    }

    if (user.role === 'mentor') {
      // Filter to only show mentor's own sessions
      sessionQuery = sessionQuery.eq('mentor_id', user.id);
    }

    const { data: sessions, error } = await sessionQuery;

    if (error) {
      console.error('Error fetching session distribution:', error);
      return NextResponse.json({ error: 'Failed to fetch session distribution' }, { status: 500 });
    }

    // Group sessions by department
    const departmentMap = new Map<string, {
      name: string;
      total: number;
      completed: number;
      scheduled: number;
      cancelled: number;
    }>();

    sessions?.forEach((session: any) => {
      const deptName = session.staff?.departments?.name || 'Unknown Department';

      if (!departmentMap.has(deptName)) {
        departmentMap.set(deptName, {
          name: deptName,
          total: 0,
          completed: 0,
          scheduled: 0,
          cancelled: 0,
        });
      }

      const dept = departmentMap.get(deptName)!;
      dept.total++;

      if (session.status === 'completed') dept.completed++;
      else if (session.status === 'scheduled') dept.scheduled++;
      else if (session.status === 'cancelled') dept.cancelled++;
    });

    // Convert to array and sort by total sessions
    const distribution = Array.from(departmentMap.values())
      .sort((a, b) => b.total - a.total);

    // Calculate totals
    const totals = {
      total: distribution.reduce((sum, d) => sum + d.total, 0),
      completed: distribution.reduce((sum, d) => sum + d.completed, 0),
      scheduled: distribution.reduce((sum, d) => sum + d.scheduled, 0),
      cancelled: distribution.reduce((sum, d) => sum + d.cancelled, 0),
    };

    return NextResponse.json({
      success: true,
      distribution,
      totals,
      scope: user.role === 'super_admin' || user.role === 'administrator'
        ? 'all_institutions'
        : user.role === 'mentor'
        ? 'personal'
        : 'institution',
    });
  } catch (error) {
    console.error('Session distribution error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
