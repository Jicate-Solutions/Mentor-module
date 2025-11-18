/**
 * Email service configuration
 * Using Resend for email delivery (recommended) or Nodemailer as fallback
 */

// Check which email service is configured
export const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'resend'; // 'resend' or 'nodemailer'

// Resend configuration
export const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Nodemailer configuration (fallback)
export const SMTP_HOST = process.env.SMTP_HOST;
export const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
export const SMTP_USER = process.env.SMTP_USER;
export const SMTP_PASS = process.env.SMTP_PASS;

// Email settings
export const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@jkkn.ac.in';
export const FROM_NAME = process.env.FROM_NAME || 'JKKN Mentor System';

// Base URL for feedback form links
export const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export function isEmailConfigured(): boolean {
  if (EMAIL_SERVICE === 'resend') {
    return !!RESEND_API_KEY;
  }
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}
