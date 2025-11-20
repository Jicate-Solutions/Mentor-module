# Fix: Email Notifications for Multiple Sessions

## Problem
- ✅ **First session creation**: Student receives email notification
- ❌ **Second session creation** (same student): No email sent
- Only ONE email per student, not one per session

## Root Cause

### Issue 1: Placeholder Emails in Database
Students in the database had placeholder emails ending with `@student.jkkn.ac.in`:
```typescript
// Example student emails in DB
"arun.kumar@student.jkkn.ac.in"  // ❌ Placeholder
"priya.raj@student.jkkn.ac.in"   // ❌ Placeholder
```

### Issue 2: Email Validation Blocked Placeholders
The code was checking:
```typescript
if (studentEmail && !studentEmail.includes('@student.jkkn.ac.in')) {
  // Send emails...
} else {
  console.warn('Skipping emails - no valid email');
}
```

### Issue 3: Email Only Fetched for New Students
The real email from JKKN API was only fetched when **creating new students**, not when students already existed:

```typescript
// Fetch real student email from JKKN API
const jkknResponse = await fetch(...);
realStudentEmail = jkknData?.email;

// But this was only used for NEW students
if (studentError || !studentData) {
  // Create new student with real email ✅
}

// Existing students kept placeholder email ❌
```

## Solution

### Change 1: Always Update Existing Student Emails
Now the code updates existing students with real emails from JKKN API:

```typescript
// If student exists but has placeholder email, update with real email
if (studentData && realStudentEmail && studentData.email?.includes('@student.jkkn.ac.in')) {
  console.log('[Counseling API] Updating student with real email from JKKN API');
  const { data: updatedStudent } = await supabaseAdmin
    .from('students')
    .update({
      email: realStudentEmail,
      name: realStudentData?.name || studentData.name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', student.id)
    .select('id, name, roll_number, email')
    .single();

  if (updatedStudent) {
    studentData = updatedStudent;
    console.log('[Counseling API] ✅ Updated student email to:', realStudentEmail);
  }
}
```

### Change 2: Better Email Validation Logic
```typescript
// Old: Simple check that blocked placeholders
if (studentEmail && !studentEmail.includes('@student.jkkn.ac.in')) {
  // Send emails...
}

// New: Clear validation with logging
const hasValidEmail = studentEmail &&
                     studentEmail.trim() !== '' &&
                     !studentEmail.includes('@student.jkkn.ac.in');

if (hasValidEmail) {
  console.log('[Counseling API] ✅ Valid email found, sending notifications:', studentEmail);
  // Send emails...
} else {
  console.warn('[Counseling API] ⚠️ Skipping emails - no valid email');
  console.warn('[Counseling API] Email details:', {
    studentEmail,
    isPlaceholder: studentEmail?.includes('@student.jkkn.ac.in'),
    realEmailFromJKKN: realStudentEmail,
  });
}
```

### Change 3: Improved Feedback Email Error Handling
```typescript
if (feedbackError) {
  console.error(`[Feedback] Failed to create feedback record:`, feedbackError);
  console.error(`[Feedback] Error code:`, feedbackError.code);
  console.error(`[Feedback] Full error:`, JSON.stringify(feedbackError, null, 2));

  // Even if feedback record creation fails, still send the notification
  console.warn(`[Feedback] Skipping feedback record creation but will still send email`);
} else {
  console.log(`[Feedback] Created feedback record ${feedbackRecord.id}`);
}

// Send email regardless of whether feedback record was created
try {
  const emailSent = await sendFeedbackRequestEmail({...});

  if (emailSent) {
    // Update email_sent_at timestamp only if feedback record exists
    if (feedbackRecord?.id) {
      await supabaseAdmin
        .from('student_feedback')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', feedbackRecord.id);
    }
  }
}
```

## What This Fixes

### Before
1. Create Session 1 for Student A
   - Student doesn't exist → Fetch real email from JKKN API → Create student with real email
   - ✅ Email sent (real email used)

2. Create Session 2 for Student A
   - Student exists with real email → Don't fetch from JKKN API
   - If email was saved as placeholder, validation fails
   - ❌ No email sent

### After
1. Create Session 1 for Student A
   - Student doesn't exist → Fetch real email from JKKN API → Create student with real email
   - ✅ Email sent (real email used)

2. Create Session 2 for Student A
   - Student exists → Fetch real email from JKKN API → Update student email if placeholder
   - ✅ Email sent (real email used)

3. Create Session 3 for Student A
   - Student exists with real email → Fetch from JKKN API → Already has real email
   - ✅ Email sent (real email used)

## Testing

### Test Case 1: New Student
1. Create session for student not in database
2. Check logs for: `[Counseling API] ✅ Got real student email from JKKN API`
3. Check logs for: `[Counseling API] ✅ Valid email found, sending notifications`
4. Verify student receives both emails:
   - Session creation notification
   - Feedback request

### Test Case 2: Existing Student (First Time)
1. Create first session for existing student with placeholder email
2. Check logs for: `[Counseling API] Updating student with real email from JKKN API`
3. Check logs for: `[Counseling API] ✅ Updated student email to: [real-email]`
4. Verify student receives both emails

### Test Case 3: Existing Student (Subsequent Sessions)
1. Create second session for same student
2. Student should now have real email in database
3. Check logs for: `[Counseling API] ✅ Valid email found, sending notifications`
4. Verify student receives both emails again

### Test Case 4: Student Without Real Email
1. Create session for student where JKKN API returns no email
2. Check logs for: `[Counseling API] ⚠️ Skipping emails - no valid email`
3. Check logs for email details showing placeholder
4. Session should still be created successfully (emails skipped)

## Monitoring

Check production logs for these messages:

**Success:**
```
[Counseling API] ✅ Got real student email from JKKN API: student@example.com
[Counseling API] ✅ Updated student email to: student@example.com
[Counseling API] ✅ Valid email found, sending notifications: student@example.com
[Session Email] ✅ Notification sent via Resend successfully!
[Feedback] ✅ Email sent successfully to student@example.com
```

**Warnings (expected for students without emails):**
```
[Counseling API] ⚠️ Skipping emails - no valid email for student [id]
[Counseling API] Email details: {
  studentEmail: "student@student.jkkn.ac.in",
  isPlaceholder: true,
  realEmailFromJKKN: null
}
```

**Errors (investigate these):**
```
[Counseling API] Error fetching student from JKKN API: [error]
[Session Email] ❌ Failed to send notification
[Feedback] ❌ Failed to create feedback record: [error]
```

## Related Files

- [`app/api/mentor/[id]/counseling/route.ts`](../app/api/mentor/[id]/counseling/route.ts) - Main session creation endpoint
- [`lib/email/send-session-notification.ts`](../lib/email/send-session-notification.ts) - Session notification emails
- [`lib/email/send-feedback-request.ts`](../lib/email/send-feedback-request.ts) - Feedback request emails
- [`lib/email/config.ts`](../lib/email/config.ts) - Email configuration

## Database Schema

### Students Table
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,  -- Now updated with real email from JKKN API
  roll_number TEXT,
  department_id UUID,
  institution_id UUID,
  year TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Student Feedback Table (Unique Constraint)
```sql
CREATE TABLE student_feedback (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES counseling_sessions(id),
  student_id UUID NOT NULL REFERENCES students(id),
  -- ... other fields
  UNIQUE (session_id, student_id)  -- Each session = one feedback per student ✅
);
```

## Environment Variables

Ensure these are set in production:

```bash
# JKKN API for fetching real student emails
NEXT_PUBLIC_MYJKKN_API_KEY=jk_...
NEXT_PUBLIC_MYJKKN_BASE_URL=https://www.jkkn.ai/api

# Email sending (Resend)
EMAIL_SERVICE=resend
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@mentor.jkkn.ai  # Must be verified domain
FROM_NAME=JKKN Mentor System
```

## Deployment Checklist

- [ ] Update production environment variables (if needed)
- [ ] Deploy the code changes
- [ ] Monitor logs for successful email sending
- [ ] Create test session for existing student
- [ ] Verify emails are received
- [ ] Create second session for same student
- [ ] Verify second set of emails received
- [ ] Check Resend dashboard for delivery status

## Future Improvements

1. **Email Caching**: Cache real emails from JKKN API to reduce API calls
2. **Bulk Email Updates**: Script to update all placeholder emails in one go
3. **Email Verification**: Add email verification workflow
4. **Retry Logic**: Automatic retry for failed emails
5. **Email Queue**: Use a queue system for more reliable email delivery

## Troubleshooting

### Emails Still Not Sending

**Check 1: JKKN API Response**
```
[Counseling API] Fetching student details from JKKN API: [student-id]
[Counseling API] ✅ Got real student email from JKKN API: [email]
```
If not seeing this, check JKKN API credentials.

**Check 2: Email Update**
```
[Counseling API] Updating student with real email from JKKN API
[Counseling API] ✅ Updated student email to: [email]
```
If not seeing this, student might not have placeholder email.

**Check 3: Email Validation**
```
[Counseling API] ✅ Valid email found, sending notifications: [email]
```
If seeing "⚠️ Skipping emails", check the email details in logs.

**Check 4: Resend Response**
```
[Session Email] ✅ Notification sent via Resend successfully!
```
If seeing errors, check Resend API key and domain verification.

### Student Email Not in JKKN API

If JKKN API doesn't return an email:
1. Contact JKKN admin to add email
2. Or manually update in database:
   ```sql
   UPDATE students
   SET email = 'real-email@example.com'
   WHERE id = 'student-uuid';
   ```
