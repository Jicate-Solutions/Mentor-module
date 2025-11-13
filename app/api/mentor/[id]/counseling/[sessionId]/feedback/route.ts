import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { CounselingSession } from '@/lib/types/mentor';

/**
 * POST /api/mentor/[id]/counseling/[sessionId]/feedback
 * Submit feedback for a counseling session in Supabase
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
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

    const { id: mentorId, sessionId } = await params;
    const body = await request.json();
    const { counselingQueries, actionTaken } = body;

    // Validation
    if (!counselingQueries || !actionTaken) {
      return NextResponse.json(
        { error: 'Missing required feedback fields: counselingQueries, actionTaken' },
        { status: 400 }
      );
    }

    // Create admin client for this request
    const supabaseAdmin = createAdminClient();

    // Verify session exists and belongs to this mentor
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('counseling_sessions')
      .select('id, mentor_id, student_id')
      .eq('id', sessionId)
      .eq('mentor_id', mentorId)
      .single();

    if (sessionError || !session) {
      console.error('[Feedback API] Session not found:', sessionError);
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Insert feedback into session_feedback table
    const { data: feedback, error: feedbackError } = await supabaseAdmin
      .from('session_feedback')
      .insert({
        session_id: sessionId,
        counseling_queries: counselingQueries,
        action_taken: actionTaken,
        submitted_by: mentorId,
      })
      .select()
      .single();

    if (feedbackError) {
      // Check if feedback already exists (unique constraint violation)
      if (feedbackError.code === '23505') {
        return NextResponse.json(
          { error: 'Feedback already submitted for this session' },
          { status: 409 }
        );
      }

      console.error('[Feedback API] Error inserting feedback:', feedbackError);
      return NextResponse.json(
        { error: 'Failed to submit feedback', details: feedbackError.message },
        { status: 500 }
      );
    }

    // Update session status to completed
    const { error: updateError } = await supabaseAdmin
      .from('counseling_sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId);

    if (updateError) {
      console.error('[Feedback API] Error updating session status:', updateError);
      // Don't fail the request, feedback was saved successfully
    }

    // Fetch complete session with feedback and student details
    const { data: updatedSession, error: fetchError } = await supabaseAdmin
      .from('counseling_sessions')
      .select(`
        *,
        student:students!student_id (
          id,
          name,
          roll_number,
          email
        ),
        feedback:session_feedback!session_id (
          id,
          counseling_queries,
          action_taken,
          submitted_by,
          submitted_at
        )
      `)
      .eq('id', sessionId)
      .single();

    if (fetchError || !updatedSession) {
      console.error('[Feedback API] Error fetching updated session:', fetchError);
      // Return basic response with feedback
      return NextResponse.json({
        success: true,
        message: 'Feedback submitted successfully',
        feedback: {
          counselingQueries: feedback.counseling_queries,
          actionTaken: feedback.action_taken,
          submittedAt: feedback.submitted_at,
          submittedBy: feedback.submitted_by || mentorId,
        },
      });
    }

    // Transform to frontend interface
    const transformedSession: CounselingSession = {
      id: updatedSession.id,
      mentorId: updatedSession.mentor_id,
      studentId: updatedSession.student_id,
      studentName: updatedSession.student?.name || 'Unknown Student',
      sessionName: updatedSession.session_name,
      date: updatedSession.date,
      time: updatedSession.time,
      notes: updatedSession.notes || undefined,
      attachment: updatedSession.attachment_url || undefined,
      status: updatedSession.status,
      feedback: updatedSession.feedback ? {
        counselingQueries: updatedSession.feedback.counseling_queries,
        actionTaken: updatedSession.feedback.action_taken,
        submittedAt: updatedSession.feedback.submitted_at,
        submittedBy: updatedSession.feedback.submitted_by || mentorId,
      } : undefined,
      createdAt: updatedSession.created_at,
      updatedAt: updatedSession.updated_at,
    };

    console.log(`[Feedback API] Feedback submitted for session ${sessionId}`);

    return NextResponse.json({
      success: true,
      session: transformedSession,
      message: 'Feedback submitted successfully',
    });
  } catch (error) {
    console.error('[Feedback API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
