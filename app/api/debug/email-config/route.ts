/**
 * Debug endpoint to check email configuration
 * REMOVE THIS FILE AFTER DEBUGGING - DO NOT LEAVE IN PRODUCTION
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    email_service: process.env.EMAIL_SERVICE || 'not set',
    from_email: process.env.FROM_EMAIL || 'not set',
    from_name: process.env.FROM_NAME || 'not set',
    has_resend_key: !!process.env.RESEND_API_KEY,
    resend_key_preview: process.env.RESEND_API_KEY
      ? `${process.env.RESEND_API_KEY.substring(0, 8)}...`
      : 'not set',
    app_base_url: process.env.NEXT_PUBLIC_APP_URL || 'not set',
    node_env: process.env.NODE_ENV,
    expected_from_email: 'noreply@mentor.jkkn.ai',
    status: process.env.FROM_EMAIL === 'noreply@mentor.jkkn.ai' ? '✅ Correct' : '❌ Wrong - Update to noreply@mentor.jkkn.ai'
  });
}
