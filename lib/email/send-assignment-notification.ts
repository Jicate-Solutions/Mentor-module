/**
 * Send Mentor Assignment Notification Email
 *
 * Sends an email notification to a student when they are assigned to a mentor.
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
} from './log-email-notification';

export interface AssignmentNotificationData {
  studentEmail: string;
  studentName: string;
  studentId?: string;
  mentorName: string;
  mentorId?: string;
  departmentName?: string;
  institutionName?: string;
}

/**
 * Send mentor assignment notification email to a student
 */
export async function sendMentorAssignmentEmail(
  data: AssignmentNotificationData
): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.error('[Assignment Email] Email service not configured. Set RESEND_API_KEY or SMTP credentials.');
    return false;
  }

  const subject = "You've Been Assigned a Mentor - JKKN Mentor System";
  const dashboardUrl = `${APP_BASE_URL}/dashboard`;

  const htmlContent = buildHtmlEmail(data, dashboardUrl);
  const textContent = buildTextEmail(data, dashboardUrl);

  // Log the email notification attempt
  const notificationLogId = await logEmailNotification({
    notificationType: 'other',
    recipientType: 'student',
    recipientEmail: data.studentEmail,
    recipientId: data.studentId,
    subject,
    templateUsed: 'assignment_notification',
    mentorId: data.mentorId,
    studentId: data.studentId,
    emailProvider: EMAIL_SERVICE as 'resend' | 'nodemailer',
    metadata: {
      mentorName: data.mentorName,
      departmentName: data.departmentName,
      institutionName: data.institutionName,
    },
  });

  try {
    console.log('[Assignment Email] Preparing to send notification:', {
      recipient: data.studentEmail,
      mentor: data.mentorName,
      logId: notificationLogId,
    });

    if (EMAIL_SERVICE === 'resend' && RESEND_API_KEY) {
      // Use Resend
      console.log('[Assignment Email] Sending via Resend...');
      console.log('[Assignment Email] FROM:', `${FROM_NAME} <${FROM_EMAIL}>`);
      console.log('[Assignment Email] TO:', data.studentEmail);
      console.log('[Assignment Email] Subject:', subject);

      const resend = new Resend(RESEND_API_KEY);
      const result = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: data.studentEmail,
        subject,
        html: htmlContent,
        text: textContent,
      });

      console.log('[Assignment Email] Notification sent via Resend successfully!');
      console.log('[Assignment Email] Resend response:', JSON.stringify(result, null, 2));

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
      console.log('[Assignment Email] Sending via SMTP...');

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

      console.log('[Assignment Email] Notification sent via SMTP successfully!');
      console.log('[Assignment Email] SMTP response:', result.messageId);

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
    console.error('[Assignment Email] Failed to send notification');
    console.error('[Assignment Email] Error details:', error);

    // Update log with failure
    if (notificationLogId) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await markEmailFailed(notificationLogId, errorMessage);
    }

    if (error instanceof Error) {
      console.error('[Assignment Email] Error message:', error.message);
      console.error('[Assignment Email] Error stack:', error.stack);
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
  data: AssignmentNotificationData,
  dashboardUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mentor Assigned</title>
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
                    <h2 style="margin: 0 0 10px 0; color: #0b6d41; font-size: 22px; font-weight: 600;">
                      Mentor Assigned
                    </h2>
                    <span style="display: inline-block; background-color: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-top: 5px;">NEW</span>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 15px 0; color: #333; font-size: 16px; line-height: 1.5;">
                Hi ${he(data.studentName)},
              </p>

              <p style="margin: 0 0 25px 0; color: #333; font-size: 16px; line-height: 1.5;">
                Welcome! You have been assigned a mentor who will guide and support you throughout your academic journey.
              </p>

              <!-- Assignment Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #0b6d41; font-size: 18px; font-weight: 600;">
                      Your Mentor Details
                    </h3>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #666; font-size: 14px;">Mentor Name:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #333; font-size: 14px;">${he(data.mentorName)}</span>
                        </td>
                      </tr>
                      ${data.departmentName ? `
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #666; font-size: 14px;">Department:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #333; font-size: 14px;">${he(data.departmentName)}</span>
                        </td>
                      </tr>
                      ` : ''}
                      ${data.institutionName ? `
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #666; font-size: 14px;">Institution:</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #333; font-size: 14px;">${he(data.institutionName)}</span>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${dashboardUrl}"
                       style="display: inline-block; background-color: #ffde59; color: #0b6d41; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      View Your Mentor
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 25px 0 0 0; padding: 15px; background-color: #f5f5f5; border-left: 3px solid #ffde59; color: #666; font-size: 14px; line-height: 1.5;">
                <strong>Note:</strong> Your mentor is available to help you with academic guidance, career advice, and personal development. Feel free to reach out to them through the mentoring platform.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #999; font-size: 12px;">
                &copy; ${new Date().getFullYear()} JKKN Institutions. All rights reserved.
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
  data: AssignmentNotificationData,
  dashboardUrl: string
): string {
  let content = `
JKKN Mentoring Platform - Mentor Assignment Notification

Hi ${data.studentName},

Welcome! You have been assigned a mentor who will guide and support you throughout your academic journey.

YOUR MENTOR DETAILS
====================
Mentor Name: ${data.mentorName}
`;

  if (data.departmentName) {
    content += `Department: ${data.departmentName}\n`;
  }

  if (data.institutionName) {
    content += `Institution: ${data.institutionName}\n`;
  }

  content += `
View your mentor: ${dashboardUrl}

Your mentor is available to help you with academic guidance, career advice, and personal development. Feel free to reach out to them through the mentoring platform.

© ${new Date().getFullYear()} JKKN Institutions. All rights reserved.
  `;

  return content;
}
