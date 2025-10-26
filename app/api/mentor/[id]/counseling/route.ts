import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import type { CounselingSession } from '@/lib/types/mentor';

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

    // Fetch sessions from Supabase with student details and feedback
    const { data: sessions, error } = await supabaseAdmin
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
      .eq('mentor_id', mentorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Counseling API] Error fetching sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch counseling sessions', details: error.message },
        { status: 500 }
      );
    }

    // Transform data to match frontend interface
    const transformedSessions: CounselingSession[] = (sessions || []).map((session: any) => ({
      id: session.id,
      mentorId: session.mentor_id,
      studentId: session.student_id,
      studentName: session.student?.name || 'Unknown Student',
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
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
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

    // Get mentor's department and institution for student record
    console.log('[Counseling API POST] Querying mentor:', mentorId);
    const { data: mentor, error: mentorError } = await supabaseAdmin
      .from('mentors')
      .select('department_id, institution_id')
      .eq('id', mentorId)
      .single();

    console.log('[Counseling API POST] Mentor query result:', {
      found: !!mentor,
      mentor,
      error: mentorError
    });

    if (mentorError || !mentor) {
      console.error('[Counseling API] Mentor not found in Supabase. Using FALLBACK values.');
      console.error('[Counseling API] This means the mentor from JKKN API is not in Supabase mentors table.');
      console.error('[Counseling API] Error details:', mentorError);
    }

    // Use actual mentor or fallback values
    const departmentId = mentor?.department_id || '00000000-0000-0000-0000-000000000001';
    const institutionId = mentor?.institution_id || '00000000-0000-0000-0000-000000000001';

    // Verify student exists in Supabase (should exist from assignment)
    console.log('[Counseling API] Checking if student exists:', student.id);
    const { data: studentData, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, name, roll_number')
      .eq('id', student.id)
      .single();

    console.log('[Counseling API] Student query result:', {
      found: !!studentData,
      studentData,
      error: studentError
    });

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
          name: student.name,
          email: student.email || `${student.id}@student.jkkn.ac.in`,
          roll_number: student.rollNumber || student.id,
          department_id: departmentId,
          institution_id: institutionId,
          year: student.year || null,
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
      mentor_id: mentorId,
      student_id: student.id,
      session_name: sessionName,
      date,
      time
    });

    const { data: newSession, error: insertError } = await supabaseAdmin
      .from('counseling_sessions')
      .insert({
        mentor_id: mentorId,
        student_id: student.id,
        session_name: sessionName,
        date: date,
        time: time,
        notes: notes || null,
        attachment_url: attachment || null,
        status: 'scheduled',
        created_by: mentorId,
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
