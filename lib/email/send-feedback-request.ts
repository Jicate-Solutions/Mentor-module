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

interface FeedbackEmailData {
  studentEmail: string;
  studentName: string;
  mentorName: string;
  sessionName: string;
  sessionDate: string;
  feedbackToken: string;
}

/**
 * Send feedback request email to student
 */
export async function sendFeedbackRequestEmail(data: FeedbackEmailData): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.error('[Email] Email service not configured. Set RESEND_API_KEY or SMTP credentials.');
    return false;
  }

  const feedbackUrl = `${APP_BASE_URL}/feedback/${data.feedbackToken}`;
  
  const subject = `Share Your Feedback - ${data.sessionName}`;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Counseling Session Feedback</title>
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
              <h2 style="margin: 0 0 20px 0; color: #0b6d41; font-size: 20px;">
                We'd Love Your Feedback!
              </h2>
              
              <p style="margin: 0 0 15px 0; color: #333; font-size: 16px; line-height: 1.5;">
                Hi ${data.studentName},
              </p>
              
              <p style="margin: 0 0 15px 0; color: #333; font-size: 16px; line-height: 1.5;">
                Thank you for attending the counseling session "<strong>${data.sessionName}</strong>" 
                with ${data.mentorName} on ${data.sessionDate}.
              </p>
              
              <p style="margin: 0 0 25px 0; color: #333; font-size: 16px; line-height: 1.5;">
                Your feedback helps us improve the mentoring experience. Please take 2 minutes to share your thoughts.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${feedbackUrl}" 
                       style="display: inline-block; background-color: #ffde59; color: #0b6d41; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      Submit Feedback
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; color: #666; font-size: 14px; line-height: 1.5;">
                Or copy this link: <br>
                <a href="${feedbackUrl}" style="color: #0b6d41; word-break: break-all;">${feedbackUrl}</a>
              </p>
              
              <p style="margin: 25px 0 0 0; padding: 15px; background-color: #f5f5f5; border-left: 3px solid #ffde59; color: #666; font-size: 14px; line-height: 1.5;">
                <strong>Note:</strong> This link is unique to you and will expire in 7 days. 
                Your feedback can be submitted anonymously if you prefer.
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
  
  const textContent = `
JKKN Mentoring Platform - Feedback Request

Hi ${data.studentName},

Thank you for attending the counseling session "${data.sessionName}" with ${data.mentorName} on ${data.sessionDate}.

Your feedback helps us improve the mentoring experience. Please take 2 minutes to share your thoughts.

Submit your feedback here:
${feedbackUrl}

Note: This link is unique to you and will expire in 7 days. Your feedback can be submitted anonymously if you prefer.

© ${new Date().getFullYear()} JKKN Institutions. All rights reserved.
  `;

  try {
    if (EMAIL_SERVICE === 'resend' && RESEND_API_KEY) {
      // Use Resend
      const resend = new Resend(RESEND_API_KEY);
      const result = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: data.studentEmail,
        subject,
        html: htmlContent,
        text: textContent,
      });
      
      console.log('[Email] Feedback request sent via Resend:', result);
      return true;
    } else {
      // Use Nodemailer (SMTP)
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });
      
      await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: data.studentEmail,
        subject,
        html: htmlContent,
        text: textContent,
      });
      
      console.log('[Email] Feedback request sent via SMTP to:', data.studentEmail);
      return true;
    }
  } catch (error) {
    console.error('[Email] Failed to send feedback request:', error);
    return false;
  }
}
