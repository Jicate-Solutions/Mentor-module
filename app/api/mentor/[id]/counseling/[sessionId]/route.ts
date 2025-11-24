import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { CounselingSession } from '@/lib/types/mentor';
import {
  sendSessionUpdatedEmail,
  sendSessionCancelledEmail,
} from '@/lib/email/send-session-notification';

/**
 * PUT /api/mentor/[id]/counseling/[sessionId]
 * Update a counseling session in Supabase
 */
export async function PUT(
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
    const { sessionName, date, time, notes, attachment, status } = body;

    console.log('[Counseling API PUT] Updating session:', {
      mentorId,
      sessionId,
      updates: { sessionName, date, time, status }
    });

    // Validation
    if (!sessionName && !date && !time && !notes && !attachment && !status) {
      return NextResponse.json(
        { error: 'At least one field must be provided for update' },
        { status: 400 }
      );
    }

    // Create admin client
    const supabaseAdmin = createAdminClient();

    // IMPORTANT: mentorId is the JKKN staff ID, we need to find the Supabase mentor.id
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('jkkn_user_id', mentorId)
      .single();

    if (!user) {
      console.error('[Counseling API PUT] User not found for JKKN ID:', mentorId);
      return NextResponse.json(
        { error: 'Mentor not found' },
        { status: 404 }
      );
    }

    const { data: mentor } = await supabaseAdmin
      .from('mentors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!mentor) {
      console.error('[Counseling API PUT] Mentor record not found');
      return NextResponse.json(
        { error: 'Mentor record not found' },
        { status: 404 }
      );
    }

    // Verify session exists and belongs to this mentor (get full details for email)
    const { data: existingSession } = await supabaseAdmin
      .from('counseling_sessions')
      .select(`
        *,
        student:students!student_id (
          id,
          name,
          email
        )
      `)
      .eq('id', sessionId)
      .eq('mentor_id', mentor.id)
      .single();

    if (!existingSession) {
      console.error('[Counseling API PUT] Session not found or access denied');
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Build update object (only include provided fields)
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (sessionName) updateData.session_name = sessionName;
    if (date) updateData.date = date;
    if (time) updateData.time = time;
    if (notes !== undefined) updateData.notes = notes;
    if (attachment !== undefined) updateData.attachment_url = attachment;
    if (status) updateData.status = status;

    // Update session
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('counseling_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select(`
        *,
        student:students!student_id (
          id,
          name,
          roll_number,
          email,
          department_id,
          year,
          avatar_url,
          is_active
        ),
        feedback:session_feedback!session_id (
          id,
          counseling_queries,
          action_taken,
          submitted_at,
          submitted_by
        )
      `)
      .single();

    if (updateError) {
      console.error('[Counseling API PUT] Error updating session:', updateError);
      return NextResponse.json(
        { error: 'Failed to update session', details: updateError.message },
        { status: 500 }
      );
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
        submittedBy: updatedSession.feedback.submitted_by || '',
      } : undefined,
      createdAt: updatedSession.created_at,
      updatedAt: updatedSession.updated_at,
    };

    console.log('[Counseling API PUT] ✅ Successfully updated session');

    // Send email notification if date or time changed (asynchronously, non-blocking)
    const dateChanged = date && date !== existingSession.date;
    const timeChanged = time && time !== existingSession.time;

    if ((dateChanged || timeChanged) && updatedSession.student?.email) {
      const studentEmail = updatedSession.student.email;

      // Send to all valid emails
      if (studentEmail && studentEmail.includes('@')) {
        // Get mentor name for email
        const { data: mentorUserData } = await supabaseAdmin
          .from('users')
          .select('full_name')
          .eq('id', user.id)
          .single();

        const mentorName = mentorUserData?.full_name || 'Your Mentor';

        // Send update notification (non-blocking)
        sendSessionUpdatedEmail({
          studentEmail,
          studentName: updatedSession.student.name,
          studentId: updatedSession.student_id,
          mentorName,
          mentorId: mentor.id,
          sessionId: updatedSession.id,
          sessionName: updatedSession.session_name,
          sessionDate: updatedSession.date,
          sessionTime: updatedSession.time,
          sessionNotes: updatedSession.notes || undefined,
          sessionStatus: 'updated',
          previousDate: dateChanged ? existingSession.date : undefined,
          previousTime: timeChanged ? existingSession.time : undefined,
        }).catch(err => {
          console.error('[Counseling API PUT] Failed to send update notification:', err);
        });

        console.log('[Counseling API PUT] Sending session update notification to:', studentEmail);
      }
    }

    return NextResponse.json({
      success: true,
      session: transformedSession,
      message: 'Session updated successfully',
    });
  } catch (error) {
    console.error('[Counseling API PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mentor/[id]/counseling/[sessionId]
 * Delete a counseling session from Supabase
 */
export async function DELETE(
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

    console.log('[Counseling API DELETE] Deleting session:', {
      mentorId,
      sessionId
    });

    // Create admin client
    const supabaseAdmin = createAdminClient();

    // Resolve mentor ID
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('jkkn_user_id', mentorId)
      .single();

    if (!user) {
      console.error('[Counseling API DELETE] User not found');
      return NextResponse.json(
        { error: 'Mentor not found' },
        { status: 404 }
      );
    }

    const { data: mentor } = await supabaseAdmin
      .from('mentors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!mentor) {
      console.error('[Counseling API DELETE] Mentor record not found');
      return NextResponse.json(
        { error: 'Mentor record not found' },
        { status: 404 }
      );
    }

    // Verify session exists and belongs to this mentor (get full details for email)
    const { data: existingSession } = await supabaseAdmin
      .from('counseling_sessions')
      .select(`
        *,
        student:students!student_id (
          id,
          name,
          email
        )
      `)
      .eq('id', sessionId)
      .eq('mentor_id', mentor.id)
      .single();

    if (!existingSession) {
      console.error('[Counseling API DELETE] Session not found or access denied');
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Send cancellation notification email before deleting (asynchronously, non-blocking)
    if (existingSession.student?.email && existingSession.student.email.includes('@')) {
      // Get mentor name for email
      const { data: mentorUserData } = await supabaseAdmin
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const mentorName = mentorUserData?.full_name || 'Your Mentor';

      // Send cancellation notification (non-blocking)
      sendSessionCancelledEmail({
        studentEmail: existingSession.student.email,
        studentName: existingSession.student.name,
        studentId: existingSession.student_id,
        mentorName,
        mentorId: mentor.id,
        sessionId: existingSession.id,
        sessionName: existingSession.session_name,
        sessionDate: existingSession.date,
        sessionTime: existingSession.time,
        sessionNotes: existingSession.notes || undefined,
        sessionStatus: 'cancelled',
      }).catch(err => {
        console.error('[Counseling API DELETE] Failed to send cancellation notification:', err);
      });

      console.log('[Counseling API DELETE] Sending session cancellation notification to:', existingSession.student.email);
    }

    // Delete session (CASCADE will delete related feedback and student_feedback)
    const { error: deleteError } = await supabaseAdmin
      .from('counseling_sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteError) {
      console.error('[Counseling API DELETE] Error deleting session:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete session', details: deleteError.message },
        { status: 500 }
      );
    }

    console.log('[Counseling API DELETE] ✅ Successfully deleted session');

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    console.error('[Counseling API DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
