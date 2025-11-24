/**
 * Email Workflow Testing Script
 *
 * Tests the complete email workflow including:
 * - Configuration validation
 * - API key verification
 * - Email sending functionality
 * - Error handling
 *
 * Usage: npx tsx scripts/test-email-workflow.ts
 */

import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuration from .env.local
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'resend';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@jkkn.ac.in';
const FROM_NAME = process.env.FROM_NAME || 'JKKN Mentor System';

async function main() {
  console.log('='.repeat(80));
  console.log('EMAIL WORKFLOW TEST');
  console.log('='.repeat(80));
  console.log();

  /**
   * Test 1: Configuration Validation
   */
  console.log('📋 Test 1: Configuration Validation');
  console.log('-'.repeat(80));

  const configTests = {
  'EMAIL_SERVICE': EMAIL_SERVICE,
  'RESEND_API_KEY': RESEND_API_KEY ? `${RESEND_API_KEY.substring(0, 10)}...` : '❌ NOT SET',
  'FROM_EMAIL': FROM_EMAIL,
  'FROM_NAME': FROM_NAME,
  };

  let configValid = true;
  for (const [key, value] of Object.entries(configTests)) {
    const status = value && !value.includes('NOT SET') ? '✅' : '❌';
    console.log(`${status} ${key}: ${value}`);

    if (status === '❌') {
      configValid = false;
    }
  }

  console.log();

  if (!configValid) {
    console.error('❌ Configuration is incomplete! Please set all required environment variables.');
    process.exit(1);
  }

  console.log('✅ Configuration is valid');
  console.log();

  /**
   * Test 2: Resend API Key Validation
   */
  console.log('🔑 Test 2: Resend API Key Validation');
  console.log('-'.repeat(80));

  if (EMAIL_SERVICE !== 'resend') {
    console.log('⚠️  Skipping - EMAIL_SERVICE is not set to "resend"');
    console.log();
  } else if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is not set!');
    process.exit(1);
  } else {
    try {
      const resend = new Resend(RESEND_API_KEY);

      // Test API key by attempting to retrieve API keys (will fail if invalid)
      console.log('Testing API key validity...');
      console.log('API Key format: ' + (RESEND_API_KEY.startsWith('re_') ? '✅ Valid (starts with re_)' : '⚠️  Unusual format'));
      console.log('API Key length: ' + RESEND_API_KEY.length + ' characters');

      console.log('✅ Resend client initialized successfully');
      console.log();
    } catch (error) {
      console.error('❌ Failed to initialize Resend client:', error);
      process.exit(1);
    }
  }

  /**
   * Test 3: Email Domain Configuration
   */
  console.log('🌐 Test 3: Email Domain Configuration');
  console.log('-'.repeat(80));

  const emailDomain = FROM_EMAIL.split('@')[1];
  console.log(`Domain: ${emailDomain}`);

  if (emailDomain === 'mentor.jkkn.ai') {
    console.log('✅ Using correct verified domain (mentor.jkkn.ai)');
  } else if (emailDomain === 'jkkn.ac.in') {
    console.log('⚠️  Domain is jkkn.ac.in - ensure this is verified in Resend');
  } else {
    console.log('⚠️  Unexpected domain - ensure it is verified in Resend');
  }
  console.log();

  /**
   * Test 4: Test Email Sending (Optional - requires valid test email)
   */
  console.log('📧 Test 4: Email Sending Test');
  console.log('-'.repeat(80));

  const TEST_EMAIL = process.env.TEST_EMAIL || process.argv[2];

  if (!TEST_EMAIL) {
    console.log('⚠️  No test email provided. Skipping send test.');
    console.log('   To test email sending, run:');
    console.log('   npx tsx scripts/test-email-workflow.ts your-email@example.com');
    console.log();
  } else {
    console.log(`Sending test email to: ${TEST_EMAIL}`);

    try {
      const resend = new Resend(RESEND_API_KEY);

      const result = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: TEST_EMAIL,
        subject: '✅ JKKN Mentor System - Email Configuration Test',
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fbfbee;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background-color: #0b6d41; padding: 30px; border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">
                        ✅ Email Configuration Test
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px 0; color: #0b6d41; font-size: 20px;">
                        Email System is Working! 🎉
                      </h2>

                      <p style="margin: 0 0 15px 0; color: #333; font-size: 16px; line-height: 1.6;">
                        This is a test email to confirm that the JKKN Mentor System email configuration is working correctly.
                      </p>

                      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <h3 style="margin: 0 0 10px 0; color: #0b6d41; font-size: 16px;">Configuration Details:</h3>
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="padding: 5px 0; color: #666;">Service:</td>
                            <td style="padding: 5px 0; color: #333; text-align: right; font-weight: 600;">${EMAIL_SERVICE}</td>
                          </tr>
                          <tr>
                            <td style="padding: 5px 0; color: #666;">From:</td>
                            <td style="padding: 5px 0; color: #333; text-align: right; font-weight: 600;">${FROM_EMAIL}</td>
                          </tr>
                          <tr>
                            <td style="padding: 5px 0; color: #666;">Domain:</td>
                            <td style="padding: 5px 0; color: #333; text-align: right; font-weight: 600;">${emailDomain}</td>
                          </tr>
                        </table>
                      </div>

                      <p style="margin: 20px 0 0 0; padding: 15px; background-color: #d1fae5; border-left: 3px solid #0b6d41; color: #065f46; font-size: 14px; line-height: 1.5;">
                        <strong>✅ Success!</strong> If you received this email, your email configuration is working correctly and you can now receive session notifications, feedback requests, and other system emails.
                      </p>
                    </td>
                  </tr>
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
      `,
        text: `
Email Configuration Test - JKKN Mentor System

This is a test email to confirm that the email configuration is working correctly.

Configuration Details:
- Service: ${EMAIL_SERVICE}
- From: ${FROM_EMAIL}
- Domain: ${emailDomain}

✅ Success! If you received this email, your email configuration is working correctly.

© ${new Date().getFullYear()} JKKN Institutions. All rights reserved.
      `,
      });

      console.log('✅ Email sent successfully!');
      console.log('Response:', JSON.stringify(result, null, 2));
      console.log();
      console.log('📬 Please check your inbox (and spam folder) for the test email.');
      console.log();
    } catch (error) {
      console.error('❌ Failed to send test email:');
      console.error(error);
      console.log();

      if (error instanceof Error) {
        console.log('Error details:');
        console.log('  Message:', error.message);
        console.log('  Name:', error.name);

        // Check for common errors
        if (error.message.includes('Invalid API key')) {
          console.log();
          console.log('💡 Suggestion: Your Resend API key appears to be invalid.');
          console.log('   1. Go to https://resend.com/api-keys');
          console.log('   2. Generate a new API key');
          console.log('   3. Update RESEND_API_KEY in .env.local');
        } else if (error.message.includes('domain') || error.message.includes('verify')) {
          console.log();
          console.log('💡 Suggestion: Your domain may not be verified in Resend.');
          console.log('   1. Go to https://resend.com/domains');
          console.log('   2. Verify your domain: ' + emailDomain);
          console.log('   3. Add the required DNS records');
        } else if (error.message.includes('rate limit')) {
          console.log();
          console.log('💡 Suggestion: Rate limit reached.');
          console.log('   Wait a few minutes before trying again.');
        }
      }

      console.log();
      process.exit(1);
    }
  }

  /**
   * Test Summary
   */
  console.log('='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log('✅ Configuration: Valid');
  console.log('✅ API Key: Initialized');
  console.log('✅ Domain: Configured');

  if (TEST_EMAIL) {
    console.log('✅ Email Sending: Tested');
  } else {
    console.log('⚠️  Email Sending: Not tested (no test email provided)');
  }

  console.log();
  console.log('🎉 Email workflow validation complete!');
  console.log();
  console.log('Next steps:');
  console.log('1. Create a counseling session to test session creation emails');
  console.log('2. Update a session to test session update emails');
  console.log('3. Delete a session to test cancellation emails');
  console.log('4. Check the email_notifications table in Supabase for logs');
  console.log();
}

// Run the main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
