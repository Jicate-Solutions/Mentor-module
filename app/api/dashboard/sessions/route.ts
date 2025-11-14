import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Fetch upcoming sessions (bypassing RLS with service role)
    const { data: sessions, error } = await supabase
      .from('counseling_sessions')
      .select(`
        id,
        session_name,
        date,
        time,
        status,
        mentors:mentor_id (
          id,
          users:user_id (
            full_name,
            avatar_url
          )
        ),
        students:student_id (
          id,
          name,
          roll_number
        )
      `)
      .gte('date', today)
      .eq('status', 'scheduled')
      .order('date', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching upcoming sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch upcoming sessions', details: error.message },
        { status: 500 }
      );
    }

    // Format sessions
    const formattedSessions = sessions?.map((session: any) => ({
      id: session.id,
      session_name: session.session_name,
      date: session.date,
      time: session.time || 'TBD',
      status: session.status,
      mentor_name: session.mentors?.users?.full_name || 'Unknown Mentor',
      student_name: session.students?.name || 'Unknown Student',
      student_roll_number: session.students?.roll_number,
    })) || [];

    return NextResponse.json({
      sessions: formattedSessions,
      total: formattedSessions.length,
    });
  } catch (error: any) {
    console.error('Error in sessions endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions', details: error.message },
      { status: 500 }
    );
  }
}
