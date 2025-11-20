/**
 * Activity Logger Utility
 * Logs mentor activities to the mentor_activity_log table
 */

import { createClient } from '@supabase/supabase-js';
import type { ActivityType } from '@/lib/types/activity';

// Create Supabase admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export interface LogActivityParams {
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
export async function logActivity(params: LogActivityParams): Promise<boolean> {
  try {
    const {
      mentorId,
      activityType,
      activityDescription,
      activityData,
      relatedStudentId,
      relatedSessionId,
      createdBy,
    } = params;

    console.log('[Activity Logger] Logging activity:', {
      mentorId,
      activityType,
      description: activityDescription,
    });

    const { error } = await supabaseAdmin.from('mentor_activity_log').insert({
      mentor_id: mentorId,
      activity_type: activityType,
      activity_description: activityDescription,
      activity_data: activityData || null,
      related_student_id: relatedStudentId || null,
      related_session_id: relatedSessionId || null,
      created_by: createdBy || null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[Activity Logger] ❌ Failed to log activity:', error);
      return false;
    }

    console.log('[Activity Logger] ✅ Activity logged successfully');
    return true;
  } catch (error) {
    console.error('[Activity Logger] ❌ Exception logging activity:', error);
    return false;
  }
}

/**
 * Log student assignment activity
 */
export async function logStudentAssignment(
  mentorId: string,
  studentId: string,
  studentName: string,
  assignedBy?: string
): Promise<boolean> {
  return logActivity({
    mentorId,
    activityType: 'student_assigned',
    activityDescription: `Student ${studentName} assigned to mentor`,
    activityData: { studentName },
    relatedStudentId: studentId,
    createdBy: assignedBy,
  });
}

/**
 * Log student removal activity
 */
export async function logStudentRemoval(
  mentorId: string,
  studentId: string,
  studentName: string,
  removedBy?: string
): Promise<boolean> {
  return logActivity({
    mentorId,
    activityType: 'student_removed',
    activityDescription: `Student ${studentName} removed from mentor`,
    activityData: { studentName },
    relatedStudentId: studentId,
    createdBy: removedBy,
  });
}

/**
 * Log counseling session creation
 */
export async function logSessionCreated(
  mentorId: string,
  sessionId: string,
  sessionName: string,
  studentId: string,
  studentName: string,
  sessionDate: string,
  createdBy?: string
): Promise<boolean> {
  return logActivity({
    mentorId,
    activityType: 'session_created',
    activityDescription: `Created counseling session: ${sessionName}`,
    activityData: {
      sessionName,
      studentName,
      sessionDate,
    },
    relatedStudentId: studentId,
    relatedSessionId: sessionId,
    createdBy,
  });
}

/**
 * Log counseling session update
 */
export async function logSessionUpdated(
  mentorId: string,
  sessionId: string,
  sessionName: string,
  studentId: string,
  studentName: string,
  updatedBy?: string
): Promise<boolean> {
  return logActivity({
    mentorId,
    activityType: 'session_updated',
    activityDescription: `Updated counseling session: ${sessionName}`,
    activityData: {
      sessionName,
      studentName,
    },
    relatedStudentId: studentId,
    relatedSessionId: sessionId,
    createdBy: updatedBy,
  });
}

/**
 * Log counseling session completion
 */
export async function logSessionCompleted(
  mentorId: string,
  sessionId: string,
  sessionName: string,
  studentId: string,
  studentName: string,
  completedBy?: string
): Promise<boolean> {
  return logActivity({
    mentorId,
    activityType: 'session_completed',
    activityDescription: `Completed counseling session: ${sessionName}`,
    activityData: {
      sessionName,
      studentName,
    },
    relatedStudentId: studentId,
    relatedSessionId: sessionId,
    createdBy: completedBy,
  });
}

/**
 * Log counseling session cancellation
 */
export async function logSessionCancelled(
  mentorId: string,
  sessionId: string,
  sessionName: string,
  studentId: string,
  studentName: string,
  reason?: string,
  cancelledBy?: string
): Promise<boolean> {
  return logActivity({
    mentorId,
    activityType: 'session_cancelled',
    activityDescription: `Cancelled counseling session: ${sessionName}`,
    activityData: {
      sessionName,
      studentName,
      reason,
    },
    relatedStudentId: studentId,
    relatedSessionId: sessionId,
    createdBy: cancelledBy,
  });
}

/**
 * Log IDP creation
 */
export async function logIdpCreated(
  mentorId: string,
  idpId: string,
  studentId: string,
  studentName: string,
  areaOfFocus: string,
  createdBy?: string
): Promise<boolean> {
  return logActivity({
    mentorId,
    activityType: 'idp_created',
    activityDescription: `Created IDP for ${studentName}`,
    activityData: {
      idpId,
      studentName,
      areaOfFocus,
    },
    relatedStudentId: studentId,
    createdBy,
  });
}

/**
 * Log IDP update
 */
export async function logIdpUpdated(
  mentorId: string,
  idpId: string,
  studentId: string,
  studentName: string,
  updatedBy?: string
): Promise<boolean> {
  return logActivity({
    mentorId,
    activityType: 'idp_updated',
    activityDescription: `Updated IDP for ${studentName}`,
    activityData: {
      idpId,
      studentName,
    },
    relatedStudentId: studentId,
    createdBy: updatedBy,
  });
}

/**
 * Log IDP completion
 */
export async function logIdpCompleted(
  mentorId: string,
  idpId: string,
  studentId: string,
  studentName: string,
  completedBy?: string
): Promise<boolean> {
  return logActivity({
    mentorId,
    activityType: 'idp_completed',
    activityDescription: `Completed IDP for ${studentName}`,
    activityData: {
      idpId,
      studentName,
    },
    relatedStudentId: studentId,
    createdBy: completedBy,
  });
}

/**
 * Log feedback submission
 */
export async function logFeedbackSubmitted(
  mentorId: string,
  sessionId: string,
  sessionName: string,
  studentId: string,
  studentName: string,
  submittedBy?: string
): Promise<boolean> {
  return logActivity({
    mentorId,
    activityType: 'feedback_submitted',
    activityDescription: `Submitted feedback for session: ${sessionName}`,
    activityData: {
      sessionName,
      studentName,
    },
    relatedStudentId: studentId,
    relatedSessionId: sessionId,
    createdBy: submittedBy,
  });
}

/**
 * Log report generation
 */
export async function logReportGenerated(
  mentorId: string,
  reportType: string,
  period: string,
  sessionCount: number,
  generatedBy?: string
): Promise<boolean> {
  return logActivity({
    mentorId,
    activityType: 'report_generated',
    activityDescription: `Generated ${reportType} report for ${period}`,
    activityData: {
      reportType,
      period,
      sessionCount,
    },
    createdBy: generatedBy,
  });
}

/**
 * Log email sending
 */
export async function logEmailSent(
  mentorId: string,
  emailType: string,
  recipientEmail: string,
  studentId?: string,
  studentName?: string,
  sessionId?: string
): Promise<boolean> {
  return logActivity({
    mentorId,
    activityType: 'email_sent',
    activityDescription: `Sent ${emailType} email to ${recipientEmail}`,
    activityData: {
      emailType,
      recipientEmail,
      studentName,
    },
    relatedStudentId: studentId,
    relatedSessionId: sessionId,
  });
}
