/**
 * Email Notification Logging Utilities
 *
 * Provides functions to log and track email notifications sent by the system.
 * All email sends should be logged for audit and debugging purposes.
 */

import { createClient } from '@supabase/supabase-js';

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

export type NotificationType =
  | 'session_created'
  | 'session_updated'
  | 'session_cancelled'
  | 'feedback_request'
  | 'reminder'
  | 'other';

export type RecipientType = 'student' | 'mentor' | 'admin';

export type EmailStatus = 'pending' | 'sent' | 'failed' | 'bounced' | 'delivered';

export type EmailProvider = 'resend' | 'nodemailer';

export interface EmailNotificationData {
  notificationType: NotificationType;
  recipientType: RecipientType;
  recipientEmail: string;
  recipientId?: string;
  subject: string;
  templateUsed: string;
  sessionId?: string;
  mentorId?: string;
  studentId?: string;
  emailProvider?: EmailProvider;
  metadata?: Record<string, any>;
}

export interface EmailNotificationUpdate {
  status?: EmailStatus;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  errorMessage?: string;
  retryCount?: number;
  providerMessageId?: string;
  providerResponse?: Record<string, any>;
}

/**
 * Log a new email notification attempt
 *
 * @param data Email notification data
 * @returns The ID of the created notification log, or null if failed
 */
export async function logEmailNotification(
  data: EmailNotificationData
): Promise<string | null> {
  try {
    console.log('[Email Log] Creating notification log:', {
      type: data.notificationType,
      recipient: data.recipientEmail,
      subject: data.subject,
    });

    const { data: notification, error } = await supabaseAdmin
      .from('email_notifications')
      .insert({
        notification_type: data.notificationType,
        recipient_type: data.recipientType,
        recipient_email: data.recipientEmail,
        recipient_id: data.recipientId,
        subject: data.subject,
        template_used: data.templateUsed,
        session_id: data.sessionId,
        mentor_id: data.mentorId,
        student_id: data.studentId,
        email_provider: data.emailProvider,
        status: 'pending',
        metadata: data.metadata,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Email Log] ❌ Failed to create notification log:', error);
      return null;
    }

    console.log('[Email Log] ✅ Notification log created:', notification.id);
    return notification.id;
  } catch (error) {
    console.error('[Email Log] ❌ Exception creating notification log:', error);
    return null;
  }
}

/**
 * Update an existing email notification log
 *
 * @param notificationId ID of the notification log to update
 * @param updates Fields to update
 * @returns Success status
 */
export async function updateEmailNotification(
  notificationId: string,
  updates: EmailNotificationUpdate
): Promise<boolean> {
  try {
    console.log('[Email Log] Updating notification:', notificationId, updates);

    const updateData: Record<string, any> = {};

    if (updates.status) updateData.status = updates.status;
    if (updates.sentAt) updateData.sent_at = updates.sentAt;
    if (updates.deliveredAt) updateData.delivered_at = updates.deliveredAt;
    if (updates.openedAt) updateData.opened_at = updates.openedAt;
    if (updates.clickedAt) updateData.clicked_at = updates.clickedAt;
    if (updates.errorMessage) updateData.error_message = updates.errorMessage;
    if (updates.retryCount !== undefined) updateData.retry_count = updates.retryCount;
    if (updates.providerMessageId) updateData.provider_message_id = updates.providerMessageId;
    if (updates.providerResponse) updateData.provider_response = updates.providerResponse;

    const { error } = await supabaseAdmin
      .from('email_notifications')
      .update(updateData)
      .eq('id', notificationId);

    if (error) {
      console.error('[Email Log] ❌ Failed to update notification:', error);
      return false;
    }

    console.log('[Email Log] ✅ Notification updated successfully');
    return true;
  } catch (error) {
    console.error('[Email Log] ❌ Exception updating notification:', error);
    return false;
  }
}

/**
 * Mark an email notification as sent
 *
 * @param notificationId ID of the notification log
 * @param providerMessageId Message ID from email provider
 * @param providerResponse Full response from provider
 * @returns Success status
 */
export async function markEmailSent(
  notificationId: string,
  providerMessageId?: string,
  providerResponse?: Record<string, any>
): Promise<boolean> {
  return updateEmailNotification(notificationId, {
    status: 'sent',
    sentAt: new Date().toISOString(),
    providerMessageId,
    providerResponse,
  });
}

/**
 * Mark an email notification as failed
 *
 * @param notificationId ID of the notification log
 * @param errorMessage Error message
 * @param retryCount Current retry count
 * @returns Success status
 */
export async function markEmailFailed(
  notificationId: string,
  errorMessage: string,
  retryCount: number = 0
): Promise<boolean> {
  return updateEmailNotification(notificationId, {
    status: 'failed',
    errorMessage,
    retryCount,
  });
}

/**
 * Get email notification logs for a session
 *
 * @param sessionId Session ID
 * @returns Array of email notification logs
 */
export async function getSessionEmailLogs(sessionId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('email_notifications')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Email Log] Failed to fetch session email logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[Email Log] Exception fetching session email logs:', error);
    return [];
  }
}

/**
 * Get email notification logs for a student
 *
 * @param studentId Student ID
 * @param limit Maximum number of logs to return
 * @returns Array of email notification logs
 */
export async function getStudentEmailLogs(studentId: string, limit: number = 50) {
  try {
    const { data, error } = await supabaseAdmin
      .from('email_notifications')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Email Log] Failed to fetch student email logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[Email Log] Exception fetching student email logs:', error);
    return [];
  }
}

/**
 * Get email notification logs for a mentor
 *
 * @param mentorId Mentor ID
 * @param limit Maximum number of logs to return
 * @returns Array of email notification logs
 */
export async function getMentorEmailLogs(mentorId: string, limit: number = 50) {
  try {
    const { data, error } = await supabaseAdmin
      .from('email_notifications')
      .select('*')
      .eq('mentor_id', mentorId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Email Log] Failed to fetch mentor email logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[Email Log] Exception fetching mentor email logs:', error);
    return [];
  }
}

/**
 * Get failed email notifications that can be retried
 *
 * @param maxRetries Maximum retry count to filter by
 * @returns Array of failed email notification logs
 */
export async function getRetryableFailedEmails(maxRetries: number = 3) {
  try {
    const { data, error } = await supabaseAdmin
      .from('email_notifications')
      .select('*')
      .eq('status', 'failed')
      .lt('retry_count', maxRetries)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Email Log] Failed to fetch retryable emails:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[Email Log] Exception fetching retryable emails:', error);
    return [];
  }
}

/**
 * Get email notification statistics
 *
 * @param filters Optional filters (sessionId, mentorId, studentId)
 * @returns Statistics object
 */
export async function getEmailStats(filters?: {
  sessionId?: string;
  mentorId?: string;
  studentId?: string;
  startDate?: string;
  endDate?: string;
}) {
  try {
    let query = supabaseAdmin
      .from('email_notifications')
      .select('status, notification_type, created_at');

    if (filters?.sessionId) {
      query = query.eq('session_id', filters.sessionId);
    }
    if (filters?.mentorId) {
      query = query.eq('mentor_id', filters.mentorId);
    }
    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Email Log] Failed to fetch email stats:', error);
      return null;
    }

    // Calculate statistics
    const stats = {
      total: data?.length || 0,
      sent: data?.filter(n => n.status === 'sent').length || 0,
      failed: data?.filter(n => n.status === 'failed').length || 0,
      pending: data?.filter(n => n.status === 'pending').length || 0,
      byType: {} as Record<string, number>,
    };

    // Count by type
    data?.forEach(n => {
      stats.byType[n.notification_type] = (stats.byType[n.notification_type] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('[Email Log] Exception calculating email stats:', error);
    return null;
  }
}
