import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { CounselingSession } from '@/lib/types/mentor';
import { sendFeedbackRequestEmail } from '@/lib/email/send-feedback-request';
import { randomBytes } from 'crypto';

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
    const { counselingQueries, actionTaken, attachmentUrl } = body;

    // Validation
    if (!counselingQueries || !actionTaken) {
      return NextResponse.json(
        { error: 'Missing required feedback fields: counselingQueries, actionTaken' },
        { status: 400 }
      );
    }

    // Create admin client for this request
    const supabaseAdmin = createAdminClient();

    // IMPORTANT: mentorId is the JKKN staff ID, we need to find the Supabase mentor.id
    // First, find the user by jkkn_user_id
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('jkkn_user_id', mentorId)
      .single();

    if (!user) {
      console.error('[Feedback API] User not found for JKKN ID:', mentorId);
      return NextResponse.json(
        { error: 'Mentor not found' },
        { status: 404 }
      );
    }

    // Then find the mentor record
    const { data: mentor } = await supabaseAdmin
      .from('mentors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!mentor) {
      console.error('[Feedback API] Mentor record not found for user:', user.id);
      return NextResponse.json(
        { error: 'Mentor record not found' },
        { status: 404 }
      );
    }

    // Verify session exists and belongs to this mentor
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('counseling_sessions')
      .select('id, mentor_id, student_id, session_name, date')
      .eq('id', sessionId)
      .eq('mentor_id', mentor.id) // Use resolved mentor.id
      .single();

    if (sessionError || !session) {
      console.error('[Feedback API] Session not found:', sessionError);
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Insert feedback into session_feedback table
    const feedbackData: any = {
      session_id: sessionId,
      counseling_queries: counselingQueries,
      action_taken: actionTaken,
      submitted_by: user.id, // Use user.id instead of mentor.id to match FK constraint
    };

    if (attachmentUrl) {
      feedbackData.attachment_url = attachmentUrl;
    }

    const { data: feedback, error: feedbackError } = await supabaseAdmin
      .from('session_feedback')
      .insert(feedbackData)
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

    // --- Send feedback request email to student (non-blocking) ---
    // Now that the mentor has completed session details, request the student's feedback
    (async () => {
      try {
        // Get mentor name
        const { data: mentorUser } = await supabaseAdmin
          .from('users')
          .select('full_name')
          .eq('id', user.id)
          .single();
        const mentorName = mentorUser?.full_name || 'Your Mentor';

        // Get student details — prefer real email from JKKN API
        const { data: studentRecord } = await supabaseAdmin
          .from('students')
          .select('id, name, email')
          .eq('id', session.student_id)
          .single();

        let studentEmail = studentRecord?.email || '';
        const studentName = studentRecord?.name || 'Student';

        const isPlaceholder = (email: string) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}@student\.jkkn\.ac\.in$/i.test(email);

        // If local email is a placeholder, try fetching real email from JKKN API
        if (!studentEmail || isPlaceholder(studentEmail)) {
          const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
          const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';
          if (apiKey) {
            try {
              const jkknRes = await fetch(
                `${baseUrl}/api-management/learners/profiles/${session.student_id}`,
                { headers: { Authorization: `Bearer ${apiKey}` } }
              );
              if (jkknRes.ok) {
                const jkknData = await jkknRes.json();
                const profile = jkknData.data || jkknData;
                studentEmail = profile?.college_email || profile?.student_email || studentEmail;
              }
            } catch (e) {
              console.warn('[Feedback API] Could not fetch student email from JKKN API:', e);
            }
          }
        }

        // Only send if we have a valid email
        const hasValidEmail = studentEmail &&
          studentEmail.trim() !== '' &&
          studentEmail.includes('@') &&
          !isPlaceholder(studentEmail);

        if (!hasValidEmail) {
          console.warn(`[Feedback API] ⚠️ Skipping feedback email — no valid email for student ${session.student_id}`);
          return;
        }

        console.log(`[Feedback API] Sending feedback request email to ${studentEmail}`);

        // Generate unique feedback token
        const feedbackToken = randomBytes(32).toString('hex');
        const tokenExpiresAt = new Date();
        tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7);

        // Create student_feedback record
        const { data: studentFeedback, error: sfError } = await supabaseAdmin
          .from('student_feedback')
          .insert({
            session_id: sessionId,
            student_id: session.student_id,
            mentor_id: mentor.id,
            feedback_token: feedbackToken,
            token_expires_at: tokenExpiresAt.toISOString(),
            is_anonymous: false,
          })
          .select()
          .single();

        if (sfError) {
          console.error('[Feedback API] Failed to create student_feedback record:', sfError);
        }

        // Send the email
        const emailSent = await sendFeedbackRequestEmail({
          studentEmail,
          studentName,
          mentorName,
          sessionName: session.session_name,
          sessionDate: session.date,
          feedbackToken,
        });

        if (emailSent && studentFeedback?.id) {
          await supabaseAdmin
            .from('student_feedback')
            .update({ email_sent_at: new Date().toISOString() })
            .eq('id', studentFeedback.id);
          console.log(`[Feedback API] ✅ Feedback request email sent to ${studentEmail}`);
        } else if (!emailSent) {
          console.error(`[Feedback API] ❌ Failed to send feedback email to ${studentEmail}`);
        }
      } catch (error) {
        console.error('[Feedback API] Error sending feedback email:', error);
      }
    })();

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
          attachment_url,
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
          submittedBy: feedback.submitted_by || user.id,
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
        attachmentUrl: updatedSession.feedback.attachment_url || undefined,
        submittedAt: updatedSession.feedback.submitted_at,
        submittedBy: updatedSession.feedback.submitted_by || user.id,
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
