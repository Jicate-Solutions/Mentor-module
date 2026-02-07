/**
 * Debug endpoint to test email sending functionality
 * REMOVE THIS FILE AFTER DEBUGGING - DO NOT LEAVE IN PRODUCTION
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testEmail } = body;

    if (!testEmail) {
      return NextResponse.json({
        success: false,
        error: 'testEmail is required in request body'
      }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL || 'noreply@mentor.jkkn.ai';
    const fromName = process.env.FROM_NAME || 'JKKN Mentor System';

    console.log('[Test Email] Starting email test...');
    console.log('[Test Email] Configuration:', {
      hasApiKey: !!apiKey,
      apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : 'NOT SET',
      fromEmail,
      fromName,
      testEmail,
    });

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'RESEND_API_KEY is not configured in environment variables',
        config: {
          hasApiKey: false,
          fromEmail,
          fromName,
        }
      }, { status: 500 });
    }

    console.log('[Test Email] Attempting to send test email via Resend...');

    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: testEmail,
      subject: 'Test Email - JKKN Mentor System',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fbfbee;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #0b6d41; padding: 30px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">
                JKKN Mentor System - Test Email
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #0b6d41; font-size: 20px;">
                Email System Test Successful!
              </h2>
              <p style="margin: 0 0 15px 0; color: #333; font-size: 16px; line-height: 1.5;">
                If you're reading this, the email system is working correctly.
              </p>
              <p style="margin: 0 0 15px 0; color: #666; font-size: 14px; line-height: 1.5;">
                <strong>Test Details:</strong><br>
                Sent at: ${new Date().toISOString()}<br>
                From: ${fromName} &lt;${fromEmail}&gt;<br>
                To: ${testEmail}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #999; font-size: 12px;">
                This is a test email from the JKKN Mentor System debug endpoint.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
      text: `JKKN Mentor System - Test Email\n\nEmail System Test Successful!\n\nIf you're reading this, the email system is working correctly.\n\nTest Details:\nSent at: ${new Date().toISOString()}\nFrom: ${fromName} <${fromEmail}>\nTo: ${testEmail}`,
    });

    console.log('[Test Email] Resend API response:', JSON.stringify(result, null, 2));

    // Check for error in result
    if (result.error) {
      console.error('[Test Email] Resend returned error:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error.message || 'Resend API error',
        errorDetails: result.error,
        config: {
          hasApiKey: true,
          apiKeyPreview: `${apiKey.substring(0, 8)}...`,
          fromEmail,
          fromName,
        }
      }, { status: 400 });
    }

    console.log('[Test Email] Email sent successfully!');

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully!',
      emailId: result.data?.id,
      sentTo: testEmail,
      config: {
        hasApiKey: true,
        apiKeyPreview: `${apiKey.substring(0, 8)}...`,
        fromEmail,
        fromName,
      }
    });

  } catch (error: any) {
    console.error('[Test Email] Exception occurred:', error);
    console.error('[Test Email] Error name:', error.name);
    console.error('[Test Email] Error message:', error.message);
    console.error('[Test Email] Error stack:', error.stack);

    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error occurred',
      errorName: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

// GET endpoint to show usage instructions
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/debug/test-email',
    method: 'POST',
    description: 'Send a test email to verify Resend is working',
    usage: {
      body: {
        testEmail: 'recipient@example.com (required)'
      }
    },
    example: {
      curl: 'curl -X POST http://localhost:3000/api/debug/test-email -H "Content-Type: application/json" -d \'{"testEmail": "your-email@example.com"}\''
    },
    note: 'REMOVE THIS ENDPOINT BEFORE PRODUCTION DEPLOYMENT'
  });
}
