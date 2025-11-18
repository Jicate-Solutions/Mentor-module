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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Base query for mentor session counts
    let query = supabase
      .from('staff')
      .select(`
        id,
        name,
        avatar_url,
        institution_id,
        department_id,
        counseling_sessions!mentor_id(
          id,
          status
        )
      `)
      .eq('role', 'mentor');

    // Role-based filtering
    if (user.role === 'institution_admin' || user.role === 'mentor') {
      // Filter by user's institution
      if (user.institution_id) {
        query = query.eq('institution_id', user.institution_id);
      }
    }
    // super_admin and administrator see all mentors (no filter)

    const { data: mentors, error } = await query;

    if (error) {
      console.error('Error fetching mentors:', error);
      return NextResponse.json({ error: 'Failed to fetch mentors' }, { status: 500 });
    }

    // Calculate session counts and rank mentors
    const mentorsWithStats = mentors
      .map((mentor: any) => {
        const completedSessions = mentor.counseling_sessions?.filter(
          (session: any) => session.status === 'completed'
        ).length || 0;

        return {
          id: mentor.id,
          name: mentor.name,
          avatar: mentor.avatar_url,
          sessionCount: completedSessions,
          institutionId: mentor.institution_id,
          departmentId: mentor.department_id,
        };
      })
      .sort((a, b) => b.sessionCount - a.sessionCount)
      .slice(0, limit);

    // If user is a mentor, find their rank
    let currentUserRank = null;
    if (user.role === 'mentor') {
      const userIndex = mentorsWithStats.findIndex((m) => m.id === user.id);
      if (userIndex !== -1) {
        currentUserRank = {
          rank: userIndex + 1,
          sessionCount: mentorsWithStats[userIndex].sessionCount,
          total: mentorsWithStats.length,
        };
      }
    }

    return NextResponse.json({
      success: true,
      mentors: mentorsWithStats,
      currentUserRank,
      scope: user.role === 'super_admin' || user.role === 'administrator'
        ? 'all_institutions'
        : 'institution',
    });
  } catch (error) {
    console.error('Top mentors error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
