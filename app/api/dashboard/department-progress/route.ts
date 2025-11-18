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

    // Fetch departments with mentors and sessions
    let departmentQuery = supabase
      .from('departments')
      .select(`
        id,
        name,
        institution_id,
        staff!department_id(
          id,
          role,
          counseling_sessions!mentor_id(
            id,
            status
          )
        )
      `);

    // Role-based filtering
    if (user.role === 'institution_admin' || user.role === 'mentor') {
      if (user.institution_id) {
        departmentQuery = departmentQuery.eq('institution_id', user.institution_id);
      }
    }

    const { data: departments, error } = await departmentQuery;

    if (error) {
      console.error('Error fetching department progress:', error);
      return NextResponse.json({ error: 'Failed to fetch department progress' }, { status: 500 });
    }

    // Calculate progress for each department
    const departmentProgress = departments.map((dept: any) => {
      const mentors = dept.staff?.filter((s: any) => s.role === 'mentor') || [];
      const totalMentors = mentors.length;

      // Count mentors with at least one completed session
      const activeMentors = mentors.filter((mentor: any) => {
        const completedSessions = mentor.counseling_sessions?.filter(
          (session: any) => session.status === 'completed'
        ).length || 0;
        return completedSessions > 0;
      }).length;

      const totalSessions = mentors.reduce((sum: number, mentor: any) => {
        return sum + (mentor.counseling_sessions?.length || 0);
      }, 0);

      const completedSessions = mentors.reduce((sum: number, mentor: any) => {
        const completed = mentor.counseling_sessions?.filter(
          (session: any) => session.status === 'completed'
        ).length || 0;
        return sum + completed;
      }, 0);

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

    // Sort by progress percentage (descending)
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
