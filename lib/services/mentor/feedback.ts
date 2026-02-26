import { createAdminClient } from '@/lib/supabase/server';
import type { StudentFeedback, StudentFeedbackStats } from '@/lib/types/mentor';

export interface FeedbackResult {
  feedback: StudentFeedback[];
  stats: StudentFeedbackStats;
}

/**
 * Fetch all student feedback records for a mentor identified by their JKKN staff ID.
 * Returns feedback data along with computed statistics.
 *
 * Resolves the JKKN ID through the users table (jkkn_user_id column); if no user
 * or mentor record is found, returns empty feedback and zeroed stats.
 */
export async function getStudentFeedbackForMentor(mentorJkknId: string): Promise<FeedbackResult> {
  const supabaseAdmin = createAdminClient();

  // Resolve JKKN ID → user
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('jkkn_user_id', mentorJkknId)
    .single();

  const emptyResult: FeedbackResult = {
    feedback: [],
    stats: {
      total_responses: 0,
      response_rate: 0,
      avg_helpfulness: 0,
      avg_approachability: 0,
      concerns_addressed_count: 0,
      concerns_addressed_percentage: 0,
    },
  };

  if (!user) {
    console.log(`[getStudentFeedbackForMentor] No user found for JKKN ID ${mentorJkknId}`);
    return emptyResult;
  }

  // Resolve user → mentor record
  const { data: mentor } = await supabaseAdmin
    .from('mentors')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!mentor) {
    console.log(`[getStudentFeedbackForMentor] No mentor record for user ${user.id}`);
    return emptyResult;
  }

  // Fetch all feedback records with student + session joins
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
    throw new Error(`Failed to fetch feedback: ${feedbackError.message}`);
  }

  // Transform raw rows to typed StudentFeedback[]
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
    student: record.student
      ? {
          id: record.student.id,
          name: record.student.name,
          email: record.student.email || '',
          rollNumber: record.student.roll_number || '',
          department: '',
          year: '',
          isActive: true,
        }
      : undefined,
    session: record.session
      ? {
          id: record.session.id,
          mentorId: record.mentor_id,
          studentId: record.student_id,
          studentName: record.student?.name || '',
          sessionName: record.session.session_name,
          date: record.session.date,
          time: record.session.time,
          notes: record.session.notes,
          status: 'completed' as const,
          createdAt: record.created_at,
          updatedAt: record.updated_at,
        }
      : undefined,
  }));

  // Compute statistics
  const submittedFeedback = transformedFeedback.filter(f => f.submitted_at !== null);
  const totalFeedbackRequests = transformedFeedback.length;
  const totalSubmitted = submittedFeedback.length;

  const stats: StudentFeedbackStats = {
    total_responses: totalSubmitted,
    response_rate:
      totalFeedbackRequests > 0
        ? (totalSubmitted / totalFeedbackRequests) * 100
        : 0,
    avg_helpfulness:
      totalSubmitted > 0
        ? submittedFeedback.reduce(
            (sum, f) => sum + (f.session_helpfulness_rating || 0),
            0
          ) / totalSubmitted
        : 0,
    avg_approachability:
      totalSubmitted > 0
        ? submittedFeedback.reduce(
            (sum, f) => sum + (f.mentor_approachability_rating || 0),
            0
          ) / totalSubmitted
        : 0,
    concerns_addressed_count: submittedFeedback.filter(f => f.concerns_addressed === true).length,
    concerns_addressed_percentage:
      totalSubmitted > 0
        ? (submittedFeedback.filter(f => f.concerns_addressed === true).length /
            totalSubmitted) *
          100
        : 0,
  };

  console.log(`[getStudentFeedbackForMentor] Returning ${transformedFeedback.length} feedback records for mentor ${mentorJkknId}`);

  return { feedback: transformedFeedback, stats };
}
