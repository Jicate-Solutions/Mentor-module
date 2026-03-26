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

    // Fetch departments from jkkn_departments
    let departmentQuery = supabase
      .from('jkkn_departments')
      .select('id, name, institution_id')
      .eq('is_active', true);

    // Role-based filtering
    if (user.role !== 'super_admin' && user.role !== 'administrator' && user.institution_id) {
      departmentQuery = departmentQuery.eq('institution_id', user.institution_id);
    }

    const { data: departments, error: deptError } = await departmentQuery;

    if (deptError) {
      console.error('Error fetching departments:', deptError);
      return NextResponse.json({ error: 'Failed to fetch department progress' }, { status: 500 });
    }

    // Fetch mentors with their sessions
    const { data: mentors } = await supabase
      .from('mentors')
      .select('id, department_id')
      .eq('is_active', true);

    const { data: sessions } = await supabase
      .from('counseling_sessions')
      .select('id, mentor_id, status');

    // Build mentor-to-sessions map
    const mentorSessionsMap: Record<string, { total: number; completed: number }> = {};
    sessions?.forEach((session: any) => {
      if (!mentorSessionsMap[session.mentor_id]) {
        mentorSessionsMap[session.mentor_id] = { total: 0, completed: 0 };
      }
      mentorSessionsMap[session.mentor_id].total++;
      if (session.status === 'completed') {
        mentorSessionsMap[session.mentor_id].completed++;
      }
    });

    // Calculate progress for each department
    const departmentProgress = (departments || []).map((dept: any) => {
      const deptMentors = mentors?.filter((m: any) => m.department_id === dept.id) || [];
      const totalMentors = deptMentors.length;

      let totalSessions = 0;
      let completedSessions = 0;
      let activeMentors = 0;

      deptMentors.forEach((mentor: any) => {
        const stats = mentorSessionsMap[mentor.id];
        if (stats) {
          totalSessions += stats.total;
          completedSessions += stats.completed;
          if (stats.completed > 0) activeMentors++;
        }
      });

      const progressPercentage = totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 100)
        : 0;

      return {
        id: dept.id,
        name: dept.name,
        totalMentors,
        activeMentors,
        totalSessions,
        completedSessions,
        progress: progressPercentage,
        color: getProgressColor(progressPercentage),
      };
    });

    // Sort by progress percentage (descending), filter out departments with no sessions
    departmentProgress.sort((a, b) => b.progress - a.progress);

    return NextResponse.json({
      success: true,
      departments: departmentProgress,
      scope: user.role === 'super_admin' || user.role === 'administrator'
        ? 'all_institutions'
        : 'institution',
    });
  } catch (error) {
    console.error('Department progress error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getProgressColor(percentage: number): string {
  if (percentage >= 80) return '#0b6d41'; // brand-green
  if (percentage >= 60) return '#10b981'; // green-500
  if (percentage >= 40) return '#f59e0b'; // amber-500
  if (percentage >= 20) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}
