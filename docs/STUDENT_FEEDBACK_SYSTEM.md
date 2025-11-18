# Student Feedback System

## Overview

The Student Feedback System allows students to provide anonymous or identified feedback about their counseling sessions with mentors. The system automatically sends email requests to students after each counseling session and displays aggregated feedback to mentors.

## Features

✅ **Automatic Email Delivery**: Feedback requests are sent automatically when counseling sessions are created
✅ **Token-Based Access**: Students access feedback forms via unique, secure tokens (no login required)
✅ **Anonymous Feedback Option**: Students can choose to submit feedback anonymously
✅ **Star Ratings**: 5-star rating system for session helpfulness and mentor approachability
✅ **Open-Ended Comments**: Students can provide detailed feedback on what helped and what could improve
✅ **Statistics Dashboard**: Mentors see aggregated feedback stats (response rate, average ratings, etc.)
✅ **Email Tracking**: Track when emails are sent and potentially opened
✅ **Token Expiry**: Feedback links expire after 7 days for security

## Architecture

### Database Schema

**Table: `student_feedback`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `session_id` | UUID | FK to counseling_sessions |
| `student_id` | UUID | FK to students |
| `mentor_id` | UUID | FK to mentors |
| `session_helpfulness_rating` | INTEGER | 1-5 star rating |
| `mentor_approachability_rating` | INTEGER | 1-5 star rating |
| `concerns_addressed` | BOOLEAN | Were concerns addressed? |
| `what_helped` | TEXT | What was helpful |
| `what_could_improve` | TEXT | Suggestions for improvement |
| `additional_comments` | TEXT | Additional feedback |
| `feedback_token` | TEXT | Unique access token (64 chars) |
| `token_expires_at` | TIMESTAMP | Token expiration (7 days) |
| `email_sent_at` | TIMESTAMP | When email was sent |
| `email_opened_at` | TIMESTAMP | When email was opened |
| `submitted_at` | TIMESTAMP | When feedback was submitted |
| `is_anonymous` | BOOLEAN | Is feedback anonymous? |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Record update time |

**Constraints:**
- UNIQUE constraint on `(session_id, student_id)` - one feedback per student per session
- Index on `feedback_token` for fast lookups
- Index on `mentor_id` for dashboard queries

**RLS Policies:**
- Super admins can view all feedback
- Mentors can view their own feedback
- No direct student access (token-based only)

## Workflow

### 1. Session Creation → Email Trigger

When a mentor creates a counseling session:

1. **Session Record Created** (`counseling_sessions` table)
2. **Feedback Record Created** (`student_feedback` table)
   - Unique token generated using crypto.randomBytes(32)
   - Token expires in 7 days
   - Student email extracted from session data
3. **Email Sent Automatically**
   - Beautiful HTML email with JKKN branding
   - Contains feedback link: `https://yourdomain.com/feedback/{token}`
   - `email_sent_at` timestamp updated

**Implementation:** `app/api/mentor/[id]/counseling/route.ts:392-420`

```typescript
// After session creation succeeds
createFeedbackRecordsAndSendEmails(
  newSession.id,
  student.id,
  mentor!.id,
  studentEmail,
  studentName,
  mentorName,
  sessionName,
  date
).catch(err => {
  console.error('[Counseling API] Background feedback creation failed:', err);
});
```

### 2. Student Receives Email

Email includes:
- Session details (name, date, time)
- Mentor name
- Secure feedback link
- 7-day expiry notice

**Email Service:** Uses Resend (primary) or Nodemailer SMTP (fallback)
**Template:** `lib/email/send-feedback-request.ts`

### 3. Student Submits Feedback

1. Student clicks link → opens `app/feedback/[token]/page.tsx`
2. Form validates token via `GET /api/feedback/[token]`
   - Checks token validity
   - Checks expiration
   - Checks if already submitted
3. Student completes form:
   - Session helpfulness rating (1-5 stars)
   - Mentor approachability rating (1-5 stars)
   - Were concerns addressed? (Yes/No)
   - What helped? (optional text)
   - What could improve? (optional text)
   - Additional comments (optional text)
   - Anonymous checkbox
4. Form submits to `POST /api/feedback/[token]`
5. `submitted_at` timestamp recorded
6. Success message displayed

### 4. Mentor Views Feedback

Mentors access feedback via the "Student Feedback" tab on their detail page:

**Location:** `app/(dashboard)/mentor/[id]/page.tsx`

**Features:**
- **Statistics Dashboard:**
  - Total responses
  - Response rate percentage
  - Average helpfulness rating
  - Average approachability rating
  - Concerns addressed percentage
- **Filter Options:**
  - All feedback
  - Submitted only
  - Pending only
- **Feedback Cards:**
  - Star ratings visualization
  - Open-ended comments (color-coded)
  - Email status (sent/opened)
  - Submission timestamp
  - Anonymous/Identified indicator

**API Endpoint:** `GET /api/mentor/[id]/feedback`

## File Structure

```
Mentor-module/
├── app/
│   ├── api/
│   │   ├── feedback/
│   │   │   └── [token]/
│   │   │       └── route.ts              # Public feedback submission API
│   │   └── mentor/
│   │       └── [id]/
│   │           ├── counseling/
│   │           │   └── route.ts          # Modified: Auto-create feedback
│   │           └── feedback/
│   │               └── route.ts          # Mentor feedback dashboard API
│   ├── feedback/
│   │   └── [token]/
│   │       └── page.tsx                  # Public feedback form UI
│   └── (dashboard)/
│       └── mentor/
│           └── [id]/
│               ├── page.tsx              # Modified: Added Student Feedback tab
│               └── components/
│                   └── StudentFeedbackTab.tsx  # Feedback dashboard component
├── lib/
│   ├── email/
│   │   ├── config.ts                     # Email service configuration
│   │   └── send-feedback-request.ts     # Email template & sender
│   └── types/
│       └── mentor.ts                     # Modified: Added feedback types
├── supabase/
│   └── migrations/
│       └── *_create_student_feedback_table.sql
└── docs/
    └── STUDENT_FEEDBACK_SYSTEM.md        # This file
```

## API Endpoints

### Public Endpoints (No Auth Required)

#### `GET /api/feedback/[token]`
Verify feedback token and get session details.

**Response:**
```json
{
  "success": true,
  "feedbackId": "uuid",
  "session": {
    "id": "uuid",
    "name": "Career Guidance Session",
    "date": "2025-01-17",
    "time": "10:00 AM"
  },
  "student": {
    "id": "uuid",
    "name": "John Doe"
  },
  "mentor": {
    "name": "Dr. Smith"
  },
  "isAnonymous": false
}
```

**Error Responses:**
- `404`: Invalid token
- `410`: Token expired
- `409`: Feedback already submitted

#### `POST /api/feedback/[token]`
Submit student feedback.

**Request Body:**
```json
{
  "session_helpfulness_rating": 5,
  "mentor_approachability_rating": 5,
  "concerns_addressed": true,
  "what_helped": "The mentor listened carefully...",
  "what_could_improve": "More time would be helpful...",
  "additional_comments": "Thank you!",
  "is_anonymous": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Thank you for your feedback!",
  "feedback": { /* full feedback object */ }
}
```

### Protected Endpoints (Requires Auth)

#### `GET /api/mentor/[id]/feedback`
Get all feedback for a mentor with statistics.

**Headers:** `Authorization: Bearer {accessToken}`

**Response:**
```json
{
  "success": true,
  "feedback": [
    {
      "id": "uuid",
      "session_id": "uuid",
      "student_id": "uuid",
      "session_helpfulness_rating": 5,
      "mentor_approachability_rating": 4,
      "concerns_addressed": true,
      "what_helped": "...",
      "submitted_at": "2025-01-17T10:30:00Z",
      "is_anonymous": false,
      "student": { /* student details */ },
      "session": { /* session details */ }
    }
  ],
  "stats": {
    "total_responses": 10,
    "response_rate": 66.67,
    "avg_helpfulness": 4.5,
    "avg_approachability": 4.3,
    "concerns_addressed_count": 8,
    "concerns_addressed_percentage": 80
  }
}
```

## Email Configuration

### Environment Variables

Add these to your `.env.local`:

```bash
# Email Service (resend or smtp)
EMAIL_SERVICE=resend

# Resend Configuration (Recommended)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx

# SMTP Configuration (Fallback)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Sender Email
FROM_EMAIL=noreply@jkkn.ac.in

# Application URL (for feedback links)
NEXT_PUBLIC_APP_URL=https://mentor.jkkn.ac.in
```

### Email Template Customization

The email template is in `lib/email/send-feedback-request.ts`.

**Brand Colors:**
- Green: `#0b6d41`
- Yellow: `#ffde59`
- Cream: `#fbfbee`

To customize the email:
1. Edit the HTML template in `send-feedback-request.ts`
2. Modify colors, logo, or copy
3. Test with a real email address

## Testing Guide

### 1. Setup Email Service

**Option A: Resend (Recommended)**
1. Sign up at https://resend.com
2. Get API key
3. Add to `.env.local`: `RESEND_API_KEY=re_xxx`

**Option B: SMTP (Gmail)**
1. Enable 2FA on Gmail
2. Generate App Password
3. Add SMTP credentials to `.env.local`

### 2. Test Workflow

#### Step 1: Create a Counseling Session
1. Login as a mentor
2. Navigate to mentor detail page
3. Go to "Counseling" tab
4. Click "Schedule Session"
5. Fill in student details (use a real email you can check)
6. Submit

**Expected:**
- Session created successfully
- Console logs show feedback record created
- Email sent to student
- Check your email inbox

#### Step 2: Student Receives Email
1. Open the email
2. Verify:
   - JKKN branding visible
   - Session details correct
   - Feedback link present
   - Expiry notice shown

#### Step 3: Submit Feedback
1. Click feedback link in email
2. Verify form loads with session details
3. Fill out:
   - Rate session helpfulness (1-5 stars)
   - Rate mentor approachability (1-5 stars)
   - Select if concerns were addressed
   - Add optional comments
4. Submit

**Expected:**
- Success message displayed
- "Thank you for your feedback!" message

#### Step 4: View Feedback Dashboard
1. Return to mentor detail page
2. Click "Student Feedback" tab
3. Verify:
   - Statistics cards show correct data
   - Feedback appears in list
   - Ratings displayed as stars
   - Comments visible (color-coded)
   - Filter tabs work (All/Submitted/Pending)

### 3. Edge Case Testing

**Test Token Expiry:**
1. Manually update `token_expires_at` in database to past date
2. Try accessing feedback link
3. Should show "This feedback link has expired" error

**Test Duplicate Submission:**
1. Submit feedback once
2. Try submitting again with same token
3. Should show "Feedback has already been submitted" error

**Test Invalid Token:**
1. Try accessing `/feedback/invalid-token-xyz`
2. Should show "Invalid feedback link" error

**Test Anonymous Feedback:**
1. Submit feedback with "Submit anonymously" checked
2. Verify mentor sees "Anonymous Student" instead of name

## Troubleshooting

### Email Not Sending

**Issue:** Feedback record created but email not received

**Solutions:**
1. Check email service configuration in `.env.local`
2. Verify `FROM_EMAIL` is valid
3. Check console logs for email errors
4. Ensure student has valid email in database
5. Check spam folder

**Debug:**
```bash
# Check feedback records
SELECT id, student_id, email_sent_at, feedback_token
FROM student_feedback
WHERE email_sent_at IS NULL;
```

### Token Invalid Error

**Issue:** Feedback link shows "Invalid feedback link"

**Solutions:**
1. Verify token in URL matches database
2. Check if feedback record exists
3. Ensure token hasn't expired

**Debug:**
```sql
SELECT id, feedback_token, token_expires_at, submitted_at
FROM student_feedback
WHERE feedback_token = 'your-token-here';
```

### Stats Not Showing

**Issue:** Student Feedback tab shows no statistics

**Solutions:**
1. Verify mentor has counseling sessions
2. Check if feedback records exist
3. Ensure API endpoint returns data

**Debug:**
- Open browser DevTools → Network tab
- Inspect `/api/mentor/[id]/feedback` response
- Check for errors in console

## Security Considerations

✅ **Token Security**
- Tokens are 64 characters (256-bit entropy)
- Generated using crypto.randomBytes (cryptographically secure)
- Single-use: Cannot resubmit after submission
- Time-limited: Expire after 7 days

✅ **Data Privacy**
- Students can submit anonymously
- RLS policies prevent unauthorized access
- Feedback only visible to mentor and super admins
- No PII exposed in public endpoints

✅ **Input Validation**
- Rating values validated (1-5 range)
- Token format validated
- XSS protection via React sanitization
- SQL injection protection via Supabase parameterization

## Future Enhancements

📋 **Potential Improvements:**
- Email open tracking (via tracking pixel)
- Reminder emails for pending feedback
- Sentiment analysis on comments
- Trends over time (monthly reports)
- Bulk export to CSV/PDF
- Notification when new feedback submitted
- Anonymous feedback with masked identity
- Multi-language support for emails

## Support

For questions or issues:
1. Check this documentation first
2. Review console logs for errors
3. Check Supabase logs for database issues
4. Contact development team with:
   - Error message
   - Steps to reproduce
   - Screenshots (if applicable)

---

**Last Updated:** January 17, 2025
**Version:** 1.0.0
**Maintained By:** Development Team
