/**
 * Send Session Notification Emails
 *
 * Sends email notifications to students when counseling sessions are created, updated, or cancelled.
 * Includes comprehensive logging of all email attempts.
 */

import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import {
  EMAIL_SERVICE,
  RESEND_API_KEY,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  FROM_EMAIL,
  FROM_NAME,
  APP_BASE_URL,
  isEmailConfigured
} from './config';
import {
  logEmailNotification,
  markEmailSent,
  markEmailFailed,
  type NotificationType,
} from './log-email-notification';

export interface SessionNotificationData {
  studentEmail: string;
  studentName: string;
  studentId?: string;
  mentorName: string;
  mentorId?: string;
  sessionId: string;
  sessionName: string;
  sessionDate: string;
  sessionTime: string;
  sessionNotes?: string;
  sessionStatus?: 'scheduled' | 'updated' | 'cancelled';
  // For updates, include previous details
  previousDate?: string;
  previousTime?: string;
  cancellationReason?: string;
}

/**
 * Send session creation notification email
 */
export async function sendSessionCreatedEmail(
  data: SessionNotificationData
): Promise<boolean> {
  return sendSessionNotificationEmail(data, 'session_created');
}

/**
 * Send session update notification email
 */
export async function sendSessionUpdatedEmail(
  data: SessionNotificationData
): Promise<boolean> {
  return sendSessionNotificationEmail(data, 'session_updated');
}

/**
 * Send session cancellation notification email
 */
export async function sendSessionCancelledEmail(
  data: SessionNotificationData
): Promise<boolean> {
  return sendSessionNotificationEmail(data, 'session_cancelled');
}

/**
 * Core function to send session notification emails with logging
 */
async function sendSessionNotificationEmail(
  data: SessionNotificationData,
  notificationType: NotificationType
): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.error('[Session Email] Email service not configured. Set RESEND_API_KEY or SMTP credentials.');
    return false;
  }

  // Determine email subject and content based on notification type
  let subject: string;
  let title: string;
  let messageIntro: string;

  switch (notificationType) {
    case 'session_created':
      subject = `New Counseling Session Scheduled - ${data.sessionName}`;
      title = 'New Session Scheduled';
      messageIntro = `${data.mentorName} has scheduled a new counseling session with you.`;
      break;
    case 'session_updated':
      subject = `Session Rescheduled - ${data.sessionName}`;
      title = 'Session Rescheduled';
      messageIntro = `${data.mentorName} has updated your counseling session.`;
      break;
    case 'session_cancelled':
      subject = `Session Cancelled - ${data.sessionName}`;
      title = 'Session Cancelled';
      messageIntro = `${data.mentorName} has cancelled your counseling session.`;
      break;
    default:
      subject = `Counseling Session Notification - ${data.sessionName}`;
      title = 'Session Notification';
      messageIntro = `You have a notification about your counseling session.`;
  }

  // Format date for display
  const formattedDate = formatDate(data.sessionDate);
  const sessionDetailsUrl = `${APP_BASE_URL}/dashboard`;

  const htmlContent = buildHtmlEmail(
    data,
    notificationType,
    title,
    messageIntro,
    formattedDate,
    sessionDetailsUrl
  );

  const textContent = buildTextEmail(
    data,
    notificationType,
    messageIntro,
    formattedDate,
    sessionDetailsUrl
  );

  // Log the email notification attempt
  const notificationLogId = await logEmailNotification({
    notificationType,
    recipientType: 'student',
    recipientEmail: data.studentEmail,
    recipientId: data.studentId,
    subject,
    templateUsed: 'session_notification',
    sessionId: data.sessionId,
    mentorId: data.mentorId,
    studentId: data.studentId,
    emailProvider: EMAIL_SERVICE as 'resend' | 'nodemailer',
    metadata: {
      sessionName: data.sessionName,
      sessionDate: data.sessionDate,
      sessionTime: data.sessionTime,
      sessionStatus: data.sessionStatus,
    },
  });

  try {
    console.log('[Session Email] Preparing to send notification:', {
      type: notificationType,
      recipient: data.studentEmail,
      session: data.sessionName,
      logId: notificationLogId,
    });

    if (EMAIL_SERVICE === 'resend' && RESEND_API_KEY) {
      // Use Resend
      console.log('[Session Email] Sending via Resend...');
      console.log('[Session Email] FROM:', `${FROM_NAME} <${FROM_EMAIL}>`);
      console.log('[Session Email] TO:', data.studentEmail);
      console.log('[Session Email] Subject:', subject);

      const resend = new Resend(RESEND_API_KEY);
      const result = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: data.studentEmail,
        subject,
        html: htmlContent,
        text: textContent,
      });

      console.log('[Session Email] ✅ Notification sent via Resend successfully!');
      console.log('[Session Email] Resend response:', JSON.stringify(result, null, 2));

      // Update log with success
      if (notificationLogId) {
        await markEmailSent(
          notificationLogId,
          result.data?.id,
          result as any
        );
      }

      return true;
    } else {
      // Use Nodemailer (SMTP)
      console.log('[Session Email] Sending via SMTP...');

      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });

      const result = await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: data.studentEmail,
        subject,
        html: htmlContent,
        text: textContent,
      });

      console.log('[Session Email] ✅ Notification sent via SMTP successfully!');
      console.log('[Session Email] SMTP response:', result.messageId);

      // Update log with success
      if (notificationLogId) {
        await markEmailSent(
          notificationLogId,
          result.messageId,
          { messageId: result.messageId }
        );
      }

      return true;
    }
  } catch (error) {
    console.error('[Session Email] ❌ Failed to send notification');
    console.error('[Session Email] Error details:', error);

    // Update log with failure
    if (notificationLogId) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await markEmailFailed(notificationLogId, errorMessage);
    }

    if (error instanceof Error) {
      console.error('[Session Email] Error message:', error.message);
      console.error('[Session Email] Error stack:', error.stack);
    }

    return false;
  }
}

/**
 * Escape HTML special characters to prevent broken markup in email templates.
 */
function he(str: string | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Build HTML email content
 */
function buildHtmlEmail(
  data: SessionNotificationData,
  notificationType: NotificationType,
  title: string,
  messageIntro: string,
  formattedDate: string,
  sessionDetailsUrl: string
): string {
  const iconColor = notificationType === 'session_cancelled' ? '#dc2626' : '#0b6d41';
  const statusBadge = getStatusBadge(notificationType);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fbfbee;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0b6d41; padding: 30px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">
                JKKN Mentoring Platform
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 10px 0; color: ${iconColor}; font-size: 22px; font-weight: 600;">
                      ${title}
                    </h2>
                    ${statusBadge}
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 15px 0; color: #333; font-size: 16px; line-height: 1.5;">
                Hi ${he(data.studentName)},
              </p>

              <p style="margin: 0 0 25px 0; color: #333; font-size: 16px; line-height: 1.5;">
                ${he(messageIntro)}
              </p>

              <!-- Session Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #0b6d41; font-size: 18px; font-weight: 600;">
                      Session Details
                    </h3>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #666; font-size: 14px;">Session Name:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #333; font-size: 14px;">${he(data.sessionName)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #666; font-size: 14px;">Mentor:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #333; font-size: 14px;">${he(data.mentorName)}</span>
                        </td>
                      </tr>
                      ${notificationType !== 'session_cancelled' ? `
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #666; font-size: 14px;">Date:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #333; font-size: 14px;">${he(formattedDate)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #666; font-size: 14px;">Time:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #333; font-size: 14px;">${he(data.sessionTime)}</span>
                        </td>
                      </tr>
                      ` : ''}
                      ${data.sessionNotes ? `
                      <tr>
                        <td colspan="2" style="padding: 15px 0 8px 0;">
                          <strong style="color: #666; font-size: 14px;">Notes:</strong>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 0 0 8px 0;">
                          <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.5;">${he(data.sessionNotes)}</p>
                        </td>
                      </tr>
                      ` : ''}
                      ${data.previousDate && data.previousTime ? `
                      <tr>
                        <td colspan="2" style="padding: 15px 0 5px 0; border-top: 1px solid #e5e7eb;">
                          <strong style="color: #999; font-size: 13px;">Previous Schedule:</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0;">
                          <span style="color: #999; font-size: 13px; text-decoration: line-through;">${he(formatDate(data.previousDate))}</span>
                        </td>
                        <td style="padding: 5px 0; text-align: right;">
                          <span style="color: #999; font-size: 13px; text-decoration: line-through;">${he(data.previousTime)}</span>
                        </td>
                      </tr>
                      ` : ''}
                      ${data.cancellationReason ? `
                      <tr>
                        <td colspan="2" style="padding: 15px 0 8px 0;">
                          <strong style="color: #666; font-size: 14px;">Reason:</strong>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 0 0 8px 0;">
                          <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.5;">${he(data.cancellationReason)}</p>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              ${notificationType !== 'session_cancelled' ? `
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${sessionDetailsUrl}"
                       style="display: inline-block; background-color: #ffde59; color: #0b6d41; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      View Session Details
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}

              <p style="margin: 25px 0 0 0; padding: 15px; background-color: #f5f5f5; border-left: 3px solid #ffde59; color: #666; font-size: 14px; line-height: 1.5;">
                <strong>Note:</strong> ${getNotificationNote(notificationType)}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #999; font-size: 12px;">
                © ${new Date().getFullYear()} JKKN Institutions. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Build plain text email content
 */
function buildTextEmail(
  data: SessionNotificationData,
  notificationType: NotificationType,
  messageIntro: string,
  formattedDate: string,
  sessionDetailsUrl: string
): string {
  let content = `
JKKN Mentoring Platform - Session Notification

Hi ${data.studentName},

${messageIntro}

SESSION DETAILS
===============
Session Name: ${data.sessionName}
Mentor: ${data.mentorName}
`;

  if (notificationType !== 'session_cancelled') {
    content += `Date: ${formattedDate}
Time: ${data.sessionTime}
`;
  }

  if (data.sessionNotes) {
    content += `\nNotes: ${data.sessionNotes}\n`;
  }

  if (data.previousDate && data.previousTime) {
    content += `\nPrevious Schedule: ${formatDate(data.previousDate)} at ${data.previousTime}\n`;
  }

  if (data.cancellationReason) {
    content += `\nReason: ${data.cancellationReason}\n`;
  }

  if (notificationType !== 'session_cancelled') {
    content += `\nView session details: ${sessionDetailsUrl}\n`;
  }

  content += `\n${getNotificationNote(notificationType)}

© ${new Date().getFullYear()} JKKN Institutions. All rights reserved.
  `;

  return content;
}

/**
 * Get status badge HTML
 */
function getStatusBadge(notificationType: NotificationType): string {
  switch (notificationType) {
    case 'session_created':
      return '<span style="display: inline-block; background-color: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-top: 5px;">NEW</span>';
    case 'session_updated':
      return '<span style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-top: 5px;">UPDATED</span>';
    case 'session_cancelled':
      return '<span style="display: inline-block; background-color: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-top: 5px;">CANCELLED</span>';
    default:
      return '';
  }
}

/**
 * Get notification note text
 */
function getNotificationNote(notificationType: NotificationType): string {
  switch (notificationType) {
    case 'session_created':
      return 'Please make sure to attend this session at the scheduled time. Contact your mentor if you need to reschedule.';
    case 'session_updated':
      return 'The session schedule has been changed. Please note the new date and time.';
    case 'session_cancelled':
      return 'This session has been cancelled. Your mentor may schedule a new session with you.';
    default:
      return 'For any questions, please contact your mentor.';
  }
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    return dateString;
  }
}
