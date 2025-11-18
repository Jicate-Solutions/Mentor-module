# Student Feedback System - Setup Guide

## Quick Setup (5 minutes)

### Step 1: Configure Email Service

Add these environment variables to your `.env.local`:

```bash
# Choose email service (resend recommended)
EMAIL_SERVICE=resend

# Option A: Resend (Recommended - Free tier: 3000 emails/month)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx

# Option B: SMTP (Gmail or any SMTP server)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Sender email address
FROM_EMAIL=noreply@jkkn.ac.in

# Your application URL (used in feedback links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 2: Install Dependencies

```bash
npm install resend nodemailer
npm install --save-dev @types/nodemailer
```

### Step 3: Apply Database Migration

The migration file has already been created. Apply it to your Supabase database:

```bash
# The migration is in: supabase/migrations/*_create_student_feedback_table.sql
# It will be applied automatically on next deployment or you can apply manually
```

Or apply manually in Supabase SQL Editor:
1. Go to Supabase Dashboard → SQL Editor
2. Paste the contents of the migration file
3. Run the query

### Step 4: Test the Feature

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Create a test counseling session:**
   - Login as a mentor
   - Navigate to a mentor detail page
   - Go to "Counseling" tab
   - Schedule a session with a student (use your own email for testing)
   - Submit the form

3. **Check your email:**
   - You should receive a feedback request email
   - Click the feedback link
   - Complete the feedback form

4. **View the feedback:**
   - Go back to the mentor detail page
   - Click the "Student Feedback" tab
   - You should see statistics and the submitted feedback

## Getting Email Service API Keys

### Option A: Resend (Recommended)

1. Go to https://resend.com
2. Sign up for free account
3. Verify your email
4. Go to API Keys section
5. Create a new API key
6. Copy the key and add to `.env.local`

**Free Tier:**
- 3,000 emails/month
- 100 emails/day
- Perfect for testing and small deployments

### Option B: Gmail SMTP

1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account → Security → App Passwords
3. Generate an app password
4. Use these credentials:
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_USER=your-email@gmail.com`
   - `SMTP_PASSWORD=your-16-char-app-password`

**Note:** Gmail has sending limits (500 emails/day for free accounts)

## Verification Checklist

✅ Environment variables configured
✅ Dependencies installed (`resend`, `nodemailer`)
✅ Database migration applied
✅ Development server running
✅ Email service tested (check spam folder if not received)
✅ Feedback form accessible via emailed link
✅ Feedback submission successful
✅ Statistics visible in Student Feedback tab
✅ TypeScript compilation successful (`npx tsc --noEmit`)

## Troubleshooting

### Email Not Received

**Problem:** Created session but no email received

**Solutions:**
1. Check spam/junk folder
2. Verify email service configuration in `.env.local`
3. Check console logs for errors
4. Test email service with a simple script:

```typescript
// test-email.ts
import { sendFeedbackRequestEmail } from './lib/email/send-feedback-request';

await sendFeedbackRequestEmail({
  studentEmail: 'your-test-email@example.com',
  studentName: 'Test Student',
  mentorName: 'Test Mentor',
  sessionName: 'Test Session',
  sessionDate: '2025-01-17',
  feedbackToken: 'test-token-123',
});
```

### TypeScript Errors

**Problem:** TypeScript compilation errors

**Solution:**
```bash
npx tsc --noEmit
```

If you see errors related to the student feedback types, ensure:
- `lib/types/mentor.ts` has been updated with new interfaces
- All imports are correct

### Database Connection Issues

**Problem:** Error creating feedback records

**Solutions:**
1. Verify Supabase connection in `lib/supabase/server.ts`
2. Check RLS policies allow inserting into `student_feedback` table
3. Verify foreign key constraints (session_id, student_id, mentor_id must exist)

### Token Invalid Error

**Problem:** Feedback link shows "Invalid feedback link"

**Solutions:**
1. Check if `feedback_token` exists in database
2. Verify token hasn't expired (7 days from creation)
3. Check if feedback already submitted

## Production Deployment

### Environment Variables

Ensure these are set in your production environment:

```bash
# Production email service
EMAIL_SERVICE=resend
RESEND_API_KEY=re_production_key

# Production URL (IMPORTANT!)
NEXT_PUBLIC_APP_URL=https://mentor.jkkn.ac.in

# Production sender email
FROM_EMAIL=noreply@jkkn.ac.in
```

### Domain Configuration (Resend)

If using Resend in production:

1. Add your domain in Resend dashboard
2. Add DNS records (for email authentication)
3. Verify domain
4. Update `FROM_EMAIL` to use your verified domain

### Monitoring

Monitor these metrics in production:

- Email delivery rate (Resend dashboard)
- Feedback response rate (Student Feedback tab stats)
- Token expiry (check for expired tokens not submitted)
- Error logs (check Supabase logs and application logs)

## Next Steps

After successful setup:

1. ✅ **Test with real mentors and students**
2. ✅ **Monitor email delivery and open rates**
3. ✅ **Collect initial feedback and iterate**
4. 📋 **Optional: Add reminder emails for pending feedback**
5. 📋 **Optional: Export feedback data to CSV**
6. 📋 **Optional: Add sentiment analysis to comments**

## Support

For issues or questions:
- Check full documentation: `docs/STUDENT_FEEDBACK_SYSTEM.md`
- Review console logs for detailed error messages
- Check Supabase logs for database-related issues

---

**Setup Time:** ~5 minutes
**Last Updated:** January 17, 2025
