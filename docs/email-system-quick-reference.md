# Email System Quick Reference

Quick guide for testing and troubleshooting the JKKN Mentor email notification system.

---

## ⚡ Quick Test

Test your email configuration in 30 seconds:

```bash
# Validate configuration
npx tsx scripts/test-email-workflow.ts

# Send a test email
npx tsx scripts/test-email-workflow.ts your-email@example.com
```

---

## 📧 Email Types

| Event | Trigger | Recipient | Template |
|-------|---------|-----------|----------|
| **Session Created** | New counseling session | Student | Session details + View button |
| **Session Updated** | Date/time changed | Student | New schedule + Old schedule |
| **Session Cancelled** | Session deleted | Student | Cancellation notice + Reason |
| **Feedback Request** | Session created | Student | Feedback form link |

---

## 🔧 Configuration Checklist

```bash
# .env.local should have:
EMAIL_SERVICE=resend
RESEND_API_KEY=re_***  # From https://resend.com/api-keys
FROM_EMAIL=noreply@mentor.jkkn.ai
FROM_NAME=JKKN Mentor System
```

**Verify domain in Resend:**
1. Go to https://resend.com/domains
2. Ensure `mentor.jkkn.ai` is verified ✅
3. DNS records (SPF, DKIM, DMARC) should be green

---

## 🐛 Debugging Emails

### Check if email was sent

```sql
-- In Supabase SQL Editor
SELECT
  notification_type,
  recipient_email,
  status,
  subject,
  error_message,
  created_at
FROM email_notifications
WHERE recipient_email = 'student@example.com'
ORDER BY created_at DESC;
```

### Common Status Values

- `pending` - Email queued but not sent yet
- `sent` - Email sent successfully ✅
- `failed` - Email failed to send ❌

### View Recent Failures

```sql
SELECT * FROM email_notifications
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🔍 Troubleshooting

### ❌ "Email not configured"

**Solution:**
```bash
# Check .env.local has RESEND_API_KEY
cat .env.local | grep RESEND_API_KEY

# If missing, add it:
echo "RESEND_API_KEY=re_your_key_here" >> .env.local
```

### ❌ "Invalid API key"

**Solution:**
1. Go to https://resend.com/api-keys
2. Generate new API key
3. Update `.env.local`:
   ```bash
   RESEND_API_KEY=re_new_key_here
   ```

### ❌ "Domain not verified"

**Solution:**
1. Go to https://resend.com/domains
2. Add domain: `mentor.jkkn.ai`
3. Add DNS records shown by Resend
4. Wait for verification (5-10 minutes)

### ❌ Emails not received

**Check these in order:**

1. **Student email is valid**
   ```sql
   SELECT id, name, email FROM students WHERE id = 'student_id';
   ```
   - Email should contain `@`
   - Should not be placeholder (e.g., `@student.jkkn.ac.in`)

2. **Email was sent**
   ```sql
   SELECT * FROM email_notifications
   WHERE student_id = 'student_id'
   ORDER BY created_at DESC LIMIT 1;
   ```
   - Status should be `sent`

3. **Check spam folder**
   - Student should check spam/junk folder
   - Add `noreply@mentor.jkkn.ai` to contacts

4. **Check Resend dashboard**
   - Go to https://resend.com/emails
   - Search for recipient email
   - Check delivery status, bounces, spam

---

## 📊 Monitoring

### Daily Checks

```sql
-- Email stats for today
SELECT
  notification_type,
  status,
  COUNT(*) as count
FROM email_notifications
WHERE created_at >= CURRENT_DATE
GROUP BY notification_type, status
ORDER BY notification_type, status;
```

### Weekly Report

```sql
-- Email performance last 7 days
SELECT
  DATE(created_at) as date,
  notification_type,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'sent')::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as success_rate
FROM email_notifications
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at), notification_type
ORDER BY date DESC, notification_type;
```

---

## 🚀 Manual Email Testing

### Send Test Session Email

```typescript
// In scripts/ or API route
import { sendSessionCreatedEmail } from '@/lib/email/send-session-notification';

await sendSessionCreatedEmail({
  studentEmail: 'test@example.com',
  studentName: 'Test Student',
  studentId: 'test-123',
  mentorName: 'Test Mentor',
  mentorId: 'mentor-123',
  sessionId: 'session-123',
  sessionName: 'Test Session',
  sessionDate: '2025-01-25',
  sessionTime: '10:00 AM',
  sessionNotes: 'This is a test email',
  sessionStatus: 'scheduled',
});
```

---

## 📈 Rate Limits

**Resend Free Tier:**
- 100 emails/day
- 3,000 emails/month

**Check current usage:**
1. Go to https://resend.com/overview
2. View usage statistics

**If limit reached:**
- Upgrade plan in Resend dashboard
- Or wait for daily/monthly reset

---

## 🛠️ API Endpoints

### Debug Email Config

```bash
# Check current email configuration
curl http://localhost:3000/api/debug/email-config
```

**Example response:**
```json
{
  "email_service": "resend",
  "from_email": "noreply@mentor.jkkn.ai",
  "from_name": "JKKN Mentor System",
  "has_resend_key": true,
  "resend_key_preview": "re_YLQp7E...",
  "status": "✅ Correct"
}
```

---

## 📝 Email Template Customization

### Modify Email Content

Edit: [lib/email/send-session-notification.ts](../lib/email/send-session-notification.ts)

**Key sections:**
- `buildHtmlEmail()` - HTML template
- `buildTextEmail()` - Plain text version
- `getStatusBadge()` - Status badges (NEW, UPDATED, CANCELLED)
- `getNotificationNote()` - Help text at bottom

### Brand Colors

```typescript
// From brand-styling skill
cream: '#fbfbee'
yellow: '#ffde59'
green: '#0b6d41'
```

---

## 🎯 Best Practices

### ✅ DO

- Test with real email addresses before production
- Monitor `email_notifications` table regularly
- Check Resend dashboard for delivery issues
- Keep FROM_EMAIL consistent with verified domain
- Log all email attempts (already implemented)

### ❌ DON'T

- Don't send to placeholder emails (e.g., `@student.jkkn.ac.in`)
- Don't expose API key in client-side code
- Don't send test emails to production users
- Don't ignore failed email logs
- Don't exceed rate limits

---

## 🔗 Quick Links

- **Resend Dashboard**: https://resend.com
- **API Keys**: https://resend.com/api-keys
- **Domains**: https://resend.com/domains
- **Emails Log**: https://resend.com/emails
- **Documentation**: https://resend.com/docs

---

## 📞 Support

**Email Issues?**

1. Run diagnostic: `npx tsx scripts/test-email-workflow.ts`
2. Check logs in `email_notifications` table
3. Review Resend dashboard
4. Verify domain settings
5. Check student email validity

**Still stuck?**
- Review [email-setup-fix-summary.md](./email-setup-fix-summary.md)
- Check Resend status page: https://status.resend.com
- Contact Resend support: https://resend.com/support

---

**Last Updated**: 2025-01-24
**Status**: ✅ System Operational
