import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { StudentFeedbackSubmission } from '@/lib/types/mentor';

/**
 * GET /api/feedback/[token]
 * Verify feedback token and get session details (public, no auth required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: 'Feedback token is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Find feedback record by token
    const { data: feedbackRecord, error: feedbackError } = await supabaseAdmin
      .from('student_feedback')
      .select(`
        id,
        session_id,
        student_id,
        mentor_id,
        feedback_token,
        token_expires_at,
        submitted_at,
        is_anonymous,
        session:counseling_sessions!session_id (
          id,
          session_name,
          date,
          time,
          notes
        ),
        student:students!student_id (
          id,
          name,
          email
        ),
        mentor:mentors!mentor_id (
          id,
          user:users!user_id (
            full_name
          )
        )
      `)
      .eq('feedback_token', token)
      .single();

    if (feedbackError || !feedbackRecord) {
      console.error('[Feedback API] Token not found:', token);
      return NextResponse.json(
        { error: 'Invalid feedback link' },
        { status: 404 }
      );
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(feedbackRecord.token_expires_at);

    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'This feedback link has expired' },
        { status: 410 } // 410 Gone
      );
    }

    // Check if already submitted
    if (feedbackRecord.submitted_at) {
      return NextResponse.json(
        { error: 'Feedback has already been submitted for this session' },
        { status: 409 } // 409 Conflict
      );
    }

    // Return session details
    const sessionData = Array.isArray(feedbackRecord.session)
      ? feedbackRecord.session[0]
      : feedbackRecord.session;

    const studentData = Array.isArray(feedbackRecord.student)
      ? feedbackRecord.student[0]
      : feedbackRecord.student;

    const mentorData = Array.isArray(feedbackRecord.mentor)
      ? feedbackRecord.mentor[0]
      : feedbackRecord.mentor;

    const mentorUser = mentorData?.user;
    const mentorUserData = Array.isArray(mentorUser) ? mentorUser[0] : mentorUser;

    return NextResponse.json({
      success: true,
      feedbackId: feedbackRecord.id,
      session: {
        id: sessionData?.id,
        name: sessionData?.session_name,
        date: sessionData?.date,
        time: sessionData?.time,
        notes: sessionData?.notes,
      },
      student: {
        id: studentData?.id,
        name: studentData?.name,
      },
      mentor: {
        name: mentorUserData?.full_name || 'Your Mentor',
      },
      isAnonymous: feedbackRecord.is_anonymous,
    });
  } catch (error) {
    console.error('[Feedback API GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify feedback link' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feedback/[token]
 * Submit student feedback (public, no auth required)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body: StudentFeedbackSubmission = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Feedback token is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (
      body.session_helpfulness_rating === undefined ||
      body.mentor_approachability_rating === undefined ||
      body.concerns_addressed === undefined
    ) {
      return NextResponse.json(
        { error: 'Please complete all required fields' },
        { status: 400 }
      );
    }

    // Validate ratings are 1-5
    if (
      body.session_helpfulness_rating < 1 || body.session_helpfulness_rating > 5 ||
      body.mentor_approachability_rating < 1 || body.mentor_approachability_rating > 5
    ) {
      return NextResponse.json(
        { error: 'Ratings must be between 1 and 5' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Find feedback record by token
    const { data: feedbackRecord, error: lookupError } = await supabaseAdmin
      .from('student_feedback')
      .select('id, token_expires_at, submitted_at')
      .eq('feedback_token', token)
      .single();

    if (lookupError || !feedbackRecord) {
      return NextResponse.json(
        { error: 'Invalid feedback link' },
        { status: 404 }
      );
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(feedbackRecord.token_expires_at);

    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'This feedback link has expired' },
        { status: 410 }
      );
    }

    // Check if already submitted
    if (feedbackRecord.submitted_at) {
      return NextResponse.json(
        { error: 'Feedback has already been submitted' },
        { status: 409 }
      );
    }

    // Update feedback record with submission
    const { data: updatedFeedback, error: updateError } = await supabaseAdmin
      .from('student_feedback')
      .update({
        session_helpfulness_rating: body.session_helpfulness_rating,
        mentor_approachability_rating: body.mentor_approachability_rating,
        concerns_addressed: body.concerns_addressed,
        what_helped: body.what_helped || null,
        what_could_improve: body.what_could_improve || null,
        additional_comments: body.additional_comments || null,
        is_anonymous: body.is_anonymous || false,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', feedbackRecord.id)
      .select()
      .single();

    if (updateError) {
      console.error('[Feedback API POST] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to submit feedback', details: updateError.message },
        { status: 500 }
      );
    }

    console.log(`[Feedback API] ✅ Feedback submitted for record ${feedbackRecord.id}`);

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback!',
      feedback: updatedFeedback,
    });
  } catch (error) {
    console.error('[Feedback API POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
