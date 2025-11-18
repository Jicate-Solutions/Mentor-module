import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { StudentFeedback, StudentFeedbackStats } from '@/lib/types/mentor';

/**
 * GET /api/mentor/[id]/feedback
 * Get all student feedback for a mentor with statistics
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
    const supabaseAdmin = createAdminClient();

    // Find user by jkkn_user_id
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('jkkn_user_id', mentorId)
      .single();

    if (!user) {
      return NextResponse.json({
        success: true,
        feedback: [],
        stats: null,
      });
    }

    // Find mentor record
    const { data: mentor } = await supabaseAdmin
      .from('mentors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!mentor) {
      return NextResponse.json({
        success: true,
        feedback: [],
        stats: null,
      });
    }

    // Fetch all feedback for this mentor
    const { data: feedbackRecords, error: feedbackError } = await supabaseAdmin
      .from('student_feedback')
      .select(`
        id,
        session_id,
        student_id,
        mentor_id,
        session_helpfulness_rating,
        mentor_approachability_rating,
        concerns_addressed,
        what_helped,
        what_could_improve,
        additional_comments,
        feedback_token,
        token_expires_at,
        email_sent_at,
        email_opened_at,
        submitted_at,
        is_anonymous,
        created_at,
        updated_at,
        student:students!student_id (
          id,
          name,
          email,
          roll_number
        ),
        session:counseling_sessions!session_id (
          id,
          session_name,
          date,
          time,
          notes
        )
      `)
      .eq('mentor_id', mentor.id)
      .order('created_at', { ascending: false });

    if (feedbackError) {
      console.error('[Feedback API] Error fetching feedback:', feedbackError);
      return NextResponse.json(
        { error: 'Failed to fetch feedback', details: feedbackError.message },
        { status: 500 }
      );
    }

    // Transform feedback data
    const transformedFeedback: StudentFeedback[] = (feedbackRecords || []).map((record: any) => ({
      id: record.id,
      session_id: record.session_id,
      student_id: record.student_id,
      mentor_id: record.mentor_id,
      session_helpfulness_rating: record.session_helpfulness_rating,
      mentor_approachability_rating: record.mentor_approachability_rating,
      concerns_addressed: record.concerns_addressed,
      what_helped: record.what_helped,
      what_could_improve: record.what_could_improve,
      additional_comments: record.additional_comments,
      feedback_token: record.feedback_token,
      token_expires_at: record.token_expires_at,
      email_sent_at: record.email_sent_at,
      email_opened_at: record.email_opened_at,
      submitted_at: record.submitted_at,
      is_anonymous: record.is_anonymous,
      created_at: record.created_at,
      updated_at: record.updated_at,
      student: record.student ? {
        id: record.student.id,
        name: record.student.name,
        email: record.student.email || '',
        rollNumber: record.student.roll_number || '',
        department: '',
        year: '',
        isActive: true,
      } : undefined,
      session: record.session ? {
        id: record.session.id,
        mentorId: record.mentor_id,
        studentId: record.student_id,
        studentName: record.student?.name || '',
        sessionName: record.session.session_name,
        date: record.session.date,
        time: record.session.time,
        notes: record.session.notes,
        status: 'completed',
        createdAt: record.created_at,
        updatedAt: record.updated_at,
      } : undefined,
    }));

    // Calculate statistics
    const submittedFeedback = transformedFeedback.filter(f => f.submitted_at !== null);
    const totalFeedbackRequests = transformedFeedback.length;
    const totalSubmitted = submittedFeedback.length;

    const stats: StudentFeedbackStats = {
      total_responses: totalSubmitted,
      response_rate: totalFeedbackRequests > 0 ? (totalSubmitted / totalFeedbackRequests) * 100 : 0,
      avg_helpfulness: totalSubmitted > 0
        ? submittedFeedback.reduce((sum, f) => sum + (f.session_helpfulness_rating || 0), 0) / totalSubmitted
        : 0,
      avg_approachability: totalSubmitted > 0
        ? submittedFeedback.reduce((sum, f) => sum + (f.mentor_approachability_rating || 0), 0) / totalSubmitted
        : 0,
      concerns_addressed_count: submittedFeedback.filter(f => f.concerns_addressed === true).length,
      concerns_addressed_percentage: totalSubmitted > 0
        ? (submittedFeedback.filter(f => f.concerns_addressed === true).length / totalSubmitted) * 100
        : 0,
    };

    return NextResponse.json({
      success: true,
      feedback: transformedFeedback,
      stats,
    });
  } catch (error) {
    console.error('[Feedback API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}
