/**
 * Activity Logger Service
 * Logs mentor activities to the mentor_activity_log table
 */

import { createAdminClient } from '@/lib/supabase/server';
import type { ActivityType } from '@/lib/types/activity';

interface LogActivityParams {
  mentorId: string;
  activityType: ActivityType;
  activityDescription: string;
  activityData?: Record<string, any>;
  relatedStudentId?: string;
  relatedSessionId?: string;
  createdBy?: string;
}

/**
 * Log a mentor activity to the database
 */
export async function logMentorActivity(params: LogActivityParams): Promise<boolean> {
  try {
    // Server-side only. Uses admin client intentionally — activity logs are write-only
    // from the server. Read access is gated by RLS policies on mentor_activity_log.
    const supabase = createAdminClient();

    const { error } = await supabase.from('mentor_activity_log').insert({
      mentor_id: params.mentorId,
      activity_type: params.activityType,
      activity_description: params.activityDescription,
      activity_data: params.activityData || {},
      related_student_id: params.relatedStudentId || null,
      related_session_id: params.relatedSessionId || null,
      created_by: params.createdBy || null,
    });

    if (error) {
      console.error('[Activity Logger] Failed to log activity:', error);
      return false;
    }

    console.log('[Activity Logger] Activity logged:', params.activityType);
    return true;
  } catch (error) {
    console.error('[Activity Logger] Error:', error);
    return false;
  }
}

// Convenience methods for common activities
export const ActivityLogger = {
  studentAssigned: (mentorId: string, studentId: string, studentName: string, createdBy?: string) =>
    logMentorActivity({
      mentorId,
      activityType: 'student_assigned',
      activityDescription: `Assigned student: ${studentName}`,
      activityData: { studentName },
      relatedStudentId: studentId,
      createdBy,
    }),

  studentRemoved: (mentorId: string, studentId: string, studentName: string, createdBy?: string) =>
    logMentorActivity({
      mentorId,
      activityType: 'student_removed',
      activityDescription: `Removed student: ${studentName}`,
      activityData: { studentName },
      relatedStudentId: studentId,
      createdBy,
    }),

  sessionCreated: (mentorId: string, sessionId: string, sessionName: string, studentId?: string, createdBy?: string) =>
    logMentorActivity({
      mentorId,
      activityType: 'session_created',
      activityDescription: `Created session: ${sessionName}`,
      activityData: { sessionName },
      relatedSessionId: sessionId,
      relatedStudentId: studentId,
      createdBy,
    }),

  sessionUpdated: (mentorId: string, sessionId: string, sessionName: string, createdBy?: string) =>
    logMentorActivity({
      mentorId,
      activityType: 'session_updated',
      activityDescription: `Updated session: ${sessionName}`,
      activityData: { sessionName },
      relatedSessionId: sessionId,
      createdBy,
    }),

  sessionCompleted: (mentorId: string, sessionId: string, sessionName: string, createdBy?: string) =>
    logMentorActivity({
      mentorId,
      activityType: 'session_completed',
      activityDescription: `Completed session: ${sessionName}`,
      activityData: { sessionName },
      relatedSessionId: sessionId,
      createdBy,
    }),

  sessionCancelled: (mentorId: string, sessionId: string, sessionName: string, createdBy?: string) =>
    logMentorActivity({
      mentorId,
      activityType: 'session_cancelled',
      activityDescription: `Cancelled session: ${sessionName}`,
      activityData: { sessionName },
      relatedSessionId: sessionId,
      createdBy,
    }),

  idpCreated: (mentorId: string, studentId: string, studentName: string, createdBy?: string) =>
    logMentorActivity({
      mentorId,
      activityType: 'idp_created',
      activityDescription: `Created IDP for: ${studentName}`,
      activityData: { studentName },
      relatedStudentId: studentId,
      createdBy,
    }),

  idpUpdated: (mentorId: string, studentId: string, studentName: string, createdBy?: string) =>
    logMentorActivity({
      mentorId,
      activityType: 'idp_updated',
      activityDescription: `Updated IDP for: ${studentName}`,
      activityData: { studentName },
      relatedStudentId: studentId,
      createdBy,
    }),

  idpCompleted: (mentorId: string, studentId: string, studentName: string, createdBy?: string) =>
    logMentorActivity({
      mentorId,
      activityType: 'idp_completed',
      activityDescription: `Completed IDP for: ${studentName}`,
      activityData: { studentName },
      relatedStudentId: studentId,
      createdBy,
    }),

  feedbackSubmitted: (mentorId: string, sessionId: string, sessionName: string, createdBy?: string) =>
    logMentorActivity({
      mentorId,
      activityType: 'feedback_submitted',
      activityDescription: `Submitted feedback for: ${sessionName}`,
      activityData: { sessionName },
      relatedSessionId: sessionId,
      createdBy,
    }),

  reportGenerated: (mentorId: string, reportType: string, createdBy?: string) =>
    logMentorActivity({
      mentorId,
      activityType: 'report_generated',
      activityDescription: `Generated ${reportType} report`,
      activityData: { reportType },
      createdBy,
    }),

  emailSent: (mentorId: string, studentId: string, studentName: string, emailType: string, createdBy?: string) =>
    logMentorActivity({
      mentorId,
      activityType: 'email_sent',
      activityDescription: `Sent ${emailType} email to: ${studentName}`,
      activityData: { emailType, studentName },
      relatedStudentId: studentId,
      createdBy,
    }),
};
