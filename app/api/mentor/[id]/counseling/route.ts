import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { CounselingSession } from '@/lib/types/mentor';
import { randomBytes } from 'crypto';
import { sendFeedbackRequestEmail } from '@/lib/email/send-feedback-request';
import { sendSessionCreatedEmail } from '@/lib/email/send-session-notification';
import { getUserAccess, canManageMentor } from '@/lib/middleware/access-control';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { logSessionCreated } from '@/lib/utils/activity-logger';

/**
 * Helper function to send session creation notification email
 * Runs asynchronously after session creation
 */
async function sendSessionCreationNotification(
  sessionId: string,
  studentId: string,
  mentorId: string,
  studentEmail: string,
  studentName: string,
  mentorName: string,
  sessionName: string,
  sessionDate: string,
  sessionTime: string,
  sessionNotes?: string
) {
  try {
    console.log(`[Session Email] Sending session creation notification for session ${sessionId}`);
    console.log(`[Session Email] Recipient: ${studentEmail}`);

    const emailSent = await sendSessionCreatedEmail({
      studentEmail,
      studentName,
      studentId,
      mentorName,
      mentorId,
      sessionId,
      sessionName,
      sessionDate,
      sessionTime,
      sessionNotes,
      sessionStatus: 'scheduled',
    });

    if (emailSent) {
      console.log(`[Session Email] ✅ Session creation notification sent successfully to ${studentEmail}`);
    } else {
      console.error(`[Session Email] ❌ Failed to send session creation notification to ${studentEmail}`);
    }
  } catch (error) {
    console.error(`[Session Email] ❌ Exception while sending session creation notification:`, error);
    // Don't throw - session creation should succeed even if email fails
  }
}

/**
 * Helper function to create feedback records and send emails
 * Runs asynchronously after session creation
 */
async function createFeedbackRecordsAndSendEmails(
  sessionId: string,
  studentId: string,
  mentorId: string,
  studentEmail: string,
  studentName: string,
  mentorName: string,
  sessionName: string,
  sessionDate: string
) {
  try {
    const supabaseAdmin = createAdminClient();

    // Generate unique feedback token (cryptographically secure)
    const feedbackToken = randomBytes(32).toString('hex');

    // Token expires in 7 days
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7);

    console.log(`[Feedback] Creating feedback record for session ${sessionId}, student ${studentId}`);

    // Create feedback record
    const { data: feedbackRecord, error: feedbackError } = await supabaseAdmin
      .from('student_feedback')
      .insert({
        session_id: sessionId,
        student_id: studentId,
        mentor_id: mentorId,
        feedback_token: feedbackToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        is_anonymous: false,
      })
      .select()
      .single();

    if (feedbackError) {
      console.error(`[Feedback] Failed to create feedback record:`, feedbackError);
      console.error(`[Feedback] Error code:`, feedbackError.code);
      console.error(`[Feedback] Full error:`, JSON.stringify(feedbackError, null, 2));

      // Even if feedback record creation fails, we should still send the notification
      // This can happen if duplicate records exist
      console.warn(`[Feedback] Skipping feedback record creation but will still send email`);
    } else {
      console.log(`[Feedback] Created feedback record ${feedbackRecord.id}`);
    }

    // Send email regardless of whether feedback record was created
    // The session creation notification is more important than the feedback record
    try {
      console.log(`[Feedback] Preparing to send email to ${studentEmail}`);
      console.log(`[Feedback] Email data:`, {
        studentEmail,
        studentName,
        mentorName,
        sessionName,
        sessionDate,
        feedbackToken: feedbackToken.substring(0, 10) + '...',
      });

      const emailSent = await sendFeedbackRequestEmail({
        studentEmail,
        studentName,
        mentorName,
        sessionName,
        sessionDate,
        feedbackToken,
      });

      if (emailSent) {
        // Update email_sent_at timestamp only if feedback record was created
        if (feedbackRecord?.id) {
          await supabaseAdmin
            .from('student_feedback')
            .update({ email_sent_at: new Date().toISOString() })
            .eq('id', feedbackRecord.id);
        }

        console.log(`[Feedback] ✅ Email sent successfully to ${studentEmail}`);
      } else {
        console.error(`[Feedback] ❌ Email sending returned false for ${studentEmail}`);
      }
    } catch (emailError) {
      console.error(`[Feedback] ❌ Exception while sending email to ${studentEmail}`);
      console.error('[Feedback] Email error details:', emailError);
      // Don't throw - we still want the session to be created successfully
    }
  } catch (error) {
    console.error('[Feedback] Error in createFeedbackRecordsAndSendEmails:', error);
    // Don't throw - session creation should succeed even if feedback fails
  }
}

/**
 * GET /api/mentor/[id]/counseling
 * Get all counseling sessions for a mentor from Supabase
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

    // Create admin client for this request
    const supabaseAdmin = createAdminClient();

    // IMPORTANT: mentorId is the JKKN staff ID, we need to find the Supabase mentor.id
    // First, find the user by jkkn_user_id (with email fallback)
    let { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('jkkn_user_id', mentorId)
      .single();

    // If not found by jkkn_user_id, try JKKN API + email lookup
    if (!user) {
      console.log(`[Counseling API GET] No user found by jkkn_user_id ${mentorId}, trying JKKN API lookup...`);
      const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';
      const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;

      if (apiKey) {
        try {
          const staffResponse = await fetch(`${baseUrl}/api-management/staff/${mentorId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          });

          if (staffResponse.ok) {
            const staffData = await staffResponse.json();
            const email = staffData.data?.email;

            if (email) {
              const { data: userByEmail } = await supabaseAdmin
                .from('users')
                .select('id, email')
                .eq('email', email)
                .single();

              if (userByEmail) {
                console.log(`[Counseling API GET] Found user by email ${email}, updating jkkn_user_id`);
                await supabaseAdmin
                  .from('users')
                  .update({ jkkn_user_id: mentorId })
                  .eq('id', userByEmail.id);
                user = userByEmail;
              }
            }
          }
        } catch (e) {
          console.error('[Counseling API GET] JKKN API lookup failed:', e);
        }
      }
    }

    if (!user) {
      console.log(`[Counseling API GET] No user found for JKKN ID ${mentorId}`);
      return NextResponse.json({
        success: true,
        sessions: [],
      });
    }

    // Then find the mentor record
    const { data: mentor } = await supabaseAdmin
      .from('mentors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!mentor) {
      console.log(`[Counseling API GET] No mentor record found for user ${user.id}`);
      return NextResponse.json({
        success: true,
        sessions: [],
      });
    }

    console.log(`[Counseling API GET] Found mentor ${mentor.id} for JKKN ID ${mentorId}`);

    // Fetch sessions from Supabase with complete student details and feedback
    const { data: sessions, error } = await supabaseAdmin
      .from('counseling_sessions')
      .select(`
        *,
        student:students!student_id (
          id,
          name,
          roll_number,
          email,
          year,
          section,
          department_id,
          avatar_url,
          is_active
        ),
        feedback:session_feedback!session_id (
          id,
          counseling_queries,
          action_taken,
          submitted_by,
          submitted_at
        )
      `)
      .eq('mentor_id', mentor.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Counseling API] Error fetching sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch counseling sessions', details: error.message },
        { status: 500 }
      );
    }

    // Transform data to match frontend interface with complete student info
    const transformedSessions: CounselingSession[] = (sessions || []).map((session: any) => ({
      id: session.id,
      mentorId: session.mentor_id,
      studentId: session.student_id,
      studentName: session.student?.name || 'Unknown Student',
      student: session.student ? {
        id: session.student.id,
        name: session.student.name,
        email: session.student.email || '',
        rollNumber: session.student.roll_number || '',
        department: session.student.department_id || '',
        year: session.student.year || '',
        avatar: session.student.avatar_url || undefined,
        isActive: session.student.is_active ?? true,
      } : undefined,
      sessionName: session.session_name,
      date: session.date,
      time: session.time,
      notes: session.notes || undefined,
      attachment: session.attachment_url || undefined,
      status: session.status,
      feedback: session.feedback ? {
        counselingQueries: session.feedback.counseling_queries,
        actionTaken: session.feedback.action_taken,
        submittedAt: session.feedback.submitted_at,
        submittedBy: session.feedback.submitted_by || '',
      } : undefined,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    }));

    console.log(`[Counseling API] Found ${transformedSessions.length} sessions for mentor ${mentorId}`);

    return NextResponse.json({
      success: true,
      sessions: transformedSessions,
    });
  } catch (error) {
    console.error('[Counseling API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch counseling sessions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mentor/[id]/counseling
 * Create a new counseling session in Supabase
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get current user and access level
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userAccess = await getUserAccess();
    if (!userAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: mentorId } = await params;
    const body = await request.json();
    const { student, sessionName, date, time, notes, attachment } = body;

    console.log('[Counseling API POST] Starting session creation:', {
      mentorId,
      studentId: student?.id,
      studentName: student?.name,
      sessionName
    });

    // Validation
    if (!student || !student.id || !sessionName || !date || !time) {
      return NextResponse.json(
        { error: 'Missing required fields: student (with id), sessionName, date, time' },
        { status: 400 }
      );
    }

    // Create admin client for this request
    const supabaseAdmin = createAdminClient();

    // IMPORTANT: mentorId here is the JKKN staff ID, not Supabase mentors.id
    console.log('[Counseling API POST] Looking up mentor by JKKN ID:', mentorId);

    // Step 1: Find user by jkkn_user_id (with email fallback)
    let { data: user } = await supabaseAdmin
      .from('users')
      .select('id, jkkn_user_id, department_id, institution_id')
      .eq('jkkn_user_id', mentorId)
      .single();

    // If not found by jkkn_user_id, try JKKN API + email lookup
    if (!user) {
      console.log('[Counseling API POST] User not found by jkkn_user_id, trying JKKN API + email lookup...');
      const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';
      const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;

      if (apiKey) {
        try {
          const staffResponse = await fetch(`${baseUrl}/api-management/staff/${mentorId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          });

          if (staffResponse.ok) {
            const staffData = await staffResponse.json();
            const email = staffData.data?.email;

            if (email) {
              const { data: userByEmail } = await supabaseAdmin
                .from('users')
                .select('id, jkkn_user_id, department_id, institution_id')
                .eq('email', email)
                .single();

              if (userByEmail) {
                console.log(`[Counseling API POST] Found user by email ${email}, updating jkkn_user_id`);
                await supabaseAdmin
                  .from('users')
                  .update({ jkkn_user_id: mentorId })
                  .eq('id', userByEmail.id);
                user = { ...userByEmail, jkkn_user_id: mentorId };
              }
            }
          }
        } catch (e) {
          console.error('[Counseling API POST] JKKN API lookup failed:', e);
        }
      }
    }

    if (!user) {
      console.error('[Counseling API] User not found for JKKN ID:', mentorId);
      return NextResponse.json(
        { error: 'Mentor not found. Please ensure the mentor has been set up correctly.' },
        { status: 404 }
      );
    }

    // Step 2: Find mentor by user_id
    const { data: mentor, error: mentorError } = await supabaseAdmin
      .from('mentors')
      .select('id, user_id, department_id, institution_id')
      .eq('user_id', user.id)
      .single();

    console.log('[Counseling API POST] Mentor query result:', {
      found: !!mentor,
      mentor,
      error: mentorError
    });

    if (mentorError || !mentor) {
      console.error('[Counseling API] Mentor record not found for user:', user.id);
      return NextResponse.json(
        { error: 'Mentor record not found. Please contact support.' },
        { status: 404 }
      );
    }

    // Use actual mentor or fallback values
    const departmentId = mentor?.department_id || '00000000-0000-0000-0000-000000000001';
    const institutionId = mentor?.institution_id || '00000000-0000-0000-0000-000000000001';

    // AUTHORIZATION CHECK: Can the current user create counseling sessions for this mentor?
    const canManage = await canManageMentor(
      userAccess,
      mentor.id,
      institutionId
    );

    if (!canManage) {
      console.log('[Counseling API] Authorization failed:', {
        userId: userAccess.userId,
        role: userAccess.role,
        isMentorIncharge: userAccess.isMentorIncharge,
        targetMentorId: mentor.id,
        targetInstitutionId: institutionId,
      });
      return NextResponse.json(
        {
          error: 'Forbidden: You do not have permission to create counseling sessions for this mentor',
          details: 'Regular mentors can only create sessions for themselves. Mentor in-charges can create for all mentors in their institution.'
        },
        { status: 403 }
      );
    }

    console.log('[Counseling API] ✅ Authorization passed');

    // Fetch real student email from JKKN API
    console.log('[Counseling API] Fetching student details from JKKN API:', student.id);
    let realStudentEmail = student.email || '';
    let realStudentData = null;

    try {
      const jkknResponse = await fetch(`${process.env.NEXT_PUBLIC_MYJKKN_BASE_URL}/api-management/students/${student.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_MYJKKN_API_KEY}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (jkknResponse.ok) {
        const jkknData = await jkknResponse.json();
        realStudentData = jkknData.data;
        realStudentEmail = realStudentData?.email || realStudentData?.college_email || student.email || '';
        console.log('[Counseling API] ✅ Got real student email from JKKN API:', realStudentEmail);
      } else {
        console.warn('[Counseling API] Could not fetch student from JKKN API, will use provided email');
      }
    } catch (jkknError) {
      console.error('[Counseling API] Error fetching student from JKKN API:', jkknError);
    }

    // Verify student exists in Supabase (should exist from assignment)
    console.log('[Counseling API] Checking if student exists:', student.id);
    let { data: studentData, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, name, roll_number, email')
      .eq('id', student.id)
      .single();

    console.log('[Counseling API] Student query result:', {
      found: !!studentData,
      studentData,
      error: studentError
    });

    // If student exists but has placeholder email, update with real email from JKKN API
    if (studentData && realStudentEmail && studentData.email?.includes('@student.jkkn.ac.in')) {
      console.log('[Counseling API] Updating student with real email from JKKN API');
      const { data: updatedStudent } = await supabaseAdmin
        .from('students')
        .update({
          email: realStudentEmail,
          name: realStudentData?.name || studentData.name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', student.id)
        .select('id, name, roll_number, email')
        .single();

      if (updatedStudent) {
        studentData = updatedStudent;
        console.log('[Counseling API] ✅ Updated student email to:', realStudentEmail);
      }
    }

    // If student not found, create them (fallback)
    if (studentError || !studentData) {
      console.log('[Counseling API] Student not in DB, creating from request data with values:', {
        id: student.id,
        name: student.name,
        department_id: departmentId,
        institution_id: institutionId
      });

      const { error: createError } = await supabaseAdmin
        .from('students')
        .upsert({
          id: student.id,
          name: realStudentData?.name || student.name,
          email: realStudentEmail || `${student.id}@student.jkkn.ac.in`,  // Use real email from JKKN API
          roll_number: realStudentData?.roll_number || student.rollNumber || student.id,
          department_id: departmentId,
          institution_id: institutionId,
          year: realStudentData?.year || student.year || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });

      if (createError) {
        console.error('[Counseling API] Failed to create student:', createError);
        console.error('[Counseling API] Full error:', JSON.stringify(createError, null, 2));
        return NextResponse.json(
          { error: 'Failed to store student data', details: createError.message },
          { status: 500 }
        );
      }

      console.log(`[Counseling API] ✅ Successfully upserted student ${student.id} into students table`);
    }

    // Insert new session into Supabase
    console.log('[Counseling API] Creating counseling session with data:', {
      mentor_id: mentor!.id,
      student_id: student.id,
      session_name: sessionName,
      date,
      time
    });

    const { data: newSession, error: insertError } = await supabaseAdmin
      .from('counseling_sessions')
      .insert({
        mentor_id: mentor!.id,  // Use Supabase mentor.id, not JKKN mentorId
        student_id: student.id,
        session_name: sessionName,
        date: date,
        time: time,
        notes: notes || null,
        attachment_url: attachment || null,
        status: 'scheduled',
        created_by: user!.id,  // FK to users.id, not JKKN mentorId
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Counseling API] Error creating session:', insertError);
      console.error('[Counseling API] Full error:', JSON.stringify(insertError, null, 2));
      return NextResponse.json(
        { error: 'Failed to create counseling session', details: insertError.message },
        { status: 500 }
      );
    }

    console.log(`[Counseling API] ✅ Successfully created counseling session ${newSession.id}`);

    // Log activity (non-blocking)
    logSessionCreated(
      mentor!.id,
      newSession.id,
      sessionName,
      student.id,
      studentData?.name || student.name || 'Student',
      date,
      user!.id
    ).catch(err => {
      console.error('[Counseling API] Failed to log activity:', err);
    });

    // Create feedback record and send email asynchronously (non-blocking)
    // We need to get mentor name for the email
    const { data: mentorUserData } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const mentorName = mentorUserData?.full_name || 'Your Mentor';
    // Use the real email from JKKN API, fallback to Supabase, then request data
    const studentEmail = realStudentEmail || studentData?.email || student.email || '';

    console.log('[Counseling API] Email resolution:', {
      realStudentEmail,
      supabaseEmail: studentData?.email,
      requestEmail: student.email,
      finalEmail: studentEmail
    });

    // Send session creation notification email (primary notification)
    // Send emails if we have a valid email address (not empty and not a placeholder)
    const hasValidEmail = studentEmail &&
                         studentEmail.trim() !== '' &&
                         !studentEmail.includes('@student.jkkn.ac.in');

    if (hasValidEmail) {
      console.log('[Counseling API] ✅ Valid email found, sending notifications:', studentEmail);

      // Send session creation notification (non-blocking)
      sendSessionCreationNotification(
        newSession.id,
        student.id,
        mentor!.id,
        studentEmail,
        studentData?.name || student.name || 'Student',
        mentorName,
        sessionName,
        date,
        time,
        notes
      ).catch(err => {
        console.error('[Counseling API] Background session notification failed:', err);
      });

      // Also create feedback record and send feedback email (non-blocking)
      createFeedbackRecordsAndSendEmails(
        newSession.id,
        student.id,
        mentor!.id,
        studentEmail,
        studentData?.name || student.name || 'Student',
        mentorName,
        sessionName,
        date
      ).catch(err => {
        console.error('[Counseling API] Background feedback creation failed:', err);
      });
    } else {
      console.warn(`[Counseling API] ⚠️ Skipping emails - no valid email for student ${student.id}`);
      console.warn(`[Counseling API] Email details:`, {
        studentEmail,
        isPlaceholder: studentEmail?.includes('@student.jkkn.ac.in'),
        realEmailFromJKKN: realStudentEmail,
      });
    }

    // Transform to frontend interface
    const transformedSession: CounselingSession = {
      id: newSession.id,
      mentorId: newSession.mentor_id,
      studentId: newSession.student_id,
      studentName: studentData?.name || student.name || 'Unknown Student',
      sessionName: newSession.session_name,
      date: newSession.date,
      time: newSession.time,
      notes: newSession.notes || undefined,
      attachment: newSession.attachment_url || undefined,
      status: newSession.status,
      createdAt: newSession.created_at,
      updatedAt: newSession.updated_at,
    };

    console.log(`[Counseling API] Created session ${newSession.id} for mentor ${mentorId}`);

    return NextResponse.json({
      success: true,
      session: transformedSession,
      message: 'Counseling session created successfully',
    });
  } catch (error) {
    console.error('[Counseling API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create counseling session' },
      { status: 500 }
    );
  }
}
