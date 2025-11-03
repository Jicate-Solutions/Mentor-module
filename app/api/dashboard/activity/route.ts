import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface Activity {
  id: string;
  type: 'session' | 'assignment' | 'feedback' | 'student';
  title: string;
  description: string;
  timestamp: string;
  user?: {
    name: string;
    avatar?: string;
  };
  metadata?: any;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Fetch recent counseling sessions
    const { data: recentSessions } = await supabase
      .from('counseling_sessions')
      .select(`
        id,
        session_name,
        date,
        status,
        created_at,
        mentors:mentor_id (
          id,
          users:user_id (
            full_name,
            avatar_url
          )
        ),
        students:student_id (
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch recent mentor-student assignments
    const { data: recentAssignments } = await supabase
      .from('mentor_students')
      .select(`
        id,
        assigned_at,
        mentors:mentor_id (
          users:user_id (
            full_name,
            avatar_url
          )
        ),
        students:student_id (
          name
        )
      `)
      .order('assigned_at', { ascending: false })
      .limit(10);

    // Fetch recent feedback submissions
    const { data: recentFeedback } = await supabase
      .from('session_feedback')
      .select(`
        id,
        submitted_at,
        counseling_sessions:session_id (
          session_name,
          mentors:mentor_id (
            users:user_id (
              full_name,
              avatar_url
            )
          )
        )
      `)
      .order('submitted_at', { ascending: false })
      .limit(10);

    // Fetch recently added students
    const { data: recentStudents } = await supabase
      .from('students')
      .select('id, name, created_at, departments(name)')
      .order('created_at', { ascending: false })
      .limit(10);

    // Combine and format activities
    const activities: Activity[] = [];

    // Add session activities
    recentSessions?.forEach((session: any) => {
      const mentorName = session.mentors?.users?.full_name || 'Unknown Mentor';
      const studentName = session.students?.name || 'Unknown Student';

      let description = '';
      let title = '';

      if (session.status === 'completed') {
        title = 'Session Completed';
        description = `${mentorName} completed "${session.session_name}" with ${studentName}`;
      } else if (session.status === 'scheduled') {
        title = 'Session Scheduled';
        description = `${mentorName} scheduled "${session.session_name}" with ${studentName}`;
      } else if (session.status === 'cancelled') {
        title = 'Session Cancelled';
        description = `"${session.session_name}" was cancelled`;
      }

      activities.push({
        id: `session-${session.id}`,
        type: 'session',
        title,
        description,
        timestamp: session.created_at,
        user: {
          name: mentorName,
          avatar: session.mentors?.users?.avatar_url,
        },
        metadata: {
          sessionId: session.id,
          date: session.date,
        },
      });
    });

    // Add assignment activities
    recentAssignments?.forEach((assignment: any) => {
      const mentorName = assignment.mentors?.users?.full_name || 'Unknown Mentor';
      const studentName = assignment.students?.name || 'Unknown Student';

      activities.push({
        id: `assignment-${assignment.id}`,
        type: 'assignment',
        title: 'New Student Assignment',
        description: `${studentName} was assigned to ${mentorName}`,
        timestamp: assignment.assigned_at,
        user: {
          name: mentorName,
          avatar: assignment.mentors?.users?.avatar_url,
        },
        metadata: {
          assignmentId: assignment.id,
        },
      });
    });

    // Add feedback activities
    recentFeedback?.forEach((feedback: any) => {
      const mentorName = feedback.counseling_sessions?.mentors?.users?.full_name || 'Unknown Mentor';
      const sessionName = feedback.counseling_sessions?.session_name || 'Session';

      activities.push({
        id: `feedback-${feedback.id}`,
        type: 'feedback',
        title: 'Feedback Submitted',
        description: `${mentorName} submitted feedback for "${sessionName}"`,
        timestamp: feedback.submitted_at,
        user: {
          name: mentorName,
          avatar: feedback.counseling_sessions?.mentors?.users?.avatar_url,
        },
        metadata: {
          feedbackId: feedback.id,
        },
      });
    });

    // Add new student activities
    recentStudents?.forEach((student: any) => {
      activities.push({
        id: `student-${student.id}`,
        type: 'student',
        title: 'New Student Added',
        description: `${student.name} joined ${student.departments?.name || 'the system'}`,
        timestamp: student.created_at,
        metadata: {
          studentId: student.id,
        },
      });
    });

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Return limited number of activities
    return NextResponse.json({
      activities: activities.slice(0, limit),
      total: activities.length,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity feed', details: error.message },
      { status: 500 }
    );
  }
}
