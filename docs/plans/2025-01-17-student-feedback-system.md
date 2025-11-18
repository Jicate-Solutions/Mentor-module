# Student Feedback System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Add a Student Feedback tab in mentor detail page that automatically collects feedback from students after counseling sessions via email, then displays aggregated feedback data.

**Architecture:** Event-driven email notification system triggered on counseling session creation. Students receive unique token-based feedback links (no login required). Feedback stored separately from mentor's session feedback. Tab displays student feedback with filtering and analytics.

**Tech Stack:** Next.js 15 (App Router), Supabase (PostgreSQL + RLS), Resend/Nodemailer for emails, TypeScript, Tailwind CSS, Shadcn/UI

---

## Task 1: Database Schema - Create Student Feedback Table

**Files:**
- Create: Migration via Supabase MCP tool

**Step 1: Create student_feedback table**

```sql
-- Student feedback table (separate from session_feedback which is for mentors)
CREATE TABLE student_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES counseling_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  
  -- Feedback content
  session_helpfulness_rating INTEGER CHECK (session_helpfulness_rating >= 1 AND session_helpfulness_rating <= 5),
  mentor_approachability_rating INTEGER CHECK (mentor_approachability_rating >= 1 AND mentor_approachability_rating <= 5),
  concerns_addressed BOOLEAN,
  what_helped TEXT,
  what_could_improve TEXT,
  additional_comments TEXT,
  
  -- Token for secure public access (no login)
  feedback_token TEXT UNIQUE NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Email tracking
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_opened_at TIMESTAMP WITH TIME ZONE,
  
  -- Submission tracking
  submitted_at TIMESTAMP WITH TIME ZONE,
  is_anonymous BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one feedback per student per session
  UNIQUE(session_id, student_id)
);

-- Add comment
COMMENT ON TABLE student_feedback IS 'Feedback submitted by students about counseling sessions';

-- Create indexes
CREATE INDEX idx_student_feedback_session ON student_feedback(session_id);
CREATE INDEX idx_student_feedback_student ON student_feedback(student_id);
CREATE INDEX idx_student_feedback_mentor ON student_feedback(mentor_id);
CREATE INDEX idx_student_feedback_token ON student_feedback(feedback_token) WHERE submitted_at IS NULL;
CREATE INDEX idx_student_feedback_pending ON student_feedback(session_id) WHERE submitted_at IS NULL;

-- Add RLS policies
ALTER TABLE student_feedback ENABLE ROW LEVEL SECURITY;

-- Mentors can view feedback for their own sessions
CREATE POLICY student_feedback_mentor_view
  ON student_feedback
  FOR SELECT
  USING (
    mentor_id IN (
      SELECT id FROM mentors WHERE user_id = auth.uid()
    )
  );

-- Super admins can view all feedback
CREATE POLICY student_feedback_admin_view
  ON student_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Public can submit feedback with valid token (bypass RLS for public form)
-- This will be handled in API route without RLS
```

**Step 2: Apply migration**

Use Supabase MCP tool: `mcp__supabase__apply_migration`

Expected: Table created successfully with indexes and RLS policies

**Step 3: Verify table structure**

Use Supabase MCP tool: `mcp__supabase__list_tables`

Expected: `student_feedback` table appears in list

---

## Task 2: TypeScript Types - Student Feedback Types

**Files:**
- Modify: `lib/types/mentor.ts` (add to end)

**Step 1: Add StudentFeedback interface**

```typescript
export interface StudentFeedback {
  id: string;
  session_id: string;
  student_id: string;
  mentor_id: string;
  
  // Ratings
  session_helpfulness_rating: number | null;
  mentor_approachability_rating: number | null;
  concerns_addressed: boolean | null;
  
  // Text feedback
  what_helped: string | null;
  what_could_improve: string | null;
  additional_comments: string | null;
  
  // Token info
  feedback_token: string;
  token_expires_at: string;
  
  // Email tracking
  email_sent_at: string | null;
  email_opened_at: string | null;
  
  // Submission
  submitted_at: string | null;
  is_anonymous: boolean;
  
  created_at: string;
  updated_at: string;
  
  // Relations (when populated)
  student?: Student;
  session?: CounselingSession;
}

export interface StudentFeedbackStats {
  total_responses: number;
  response_rate: number;
  avg_helpfulness: number;
  avg_approachability: number;
  concerns_addressed_count: number;
  concerns_addressed_percentage: number;
}

export interface StudentFeedbackSubmission {
  session_helpfulness_rating: number;
  mentor_approachability_rating: number;
  concerns_addressed: boolean;
  what_helped?: string;
  what_could_improve?: string;
  additional_comments?: string;
  is_anonymous?: boolean;
}
```

**Step 2: Commit**

```bash
git add lib/types/mentor.ts
git commit -m "feat(types): add student feedback types"
```

---

## Task 3: Email Service - Setup Email Configuration

**Files:**
- Create: `lib/email/config.ts`
- Create: `lib/email/send-feedback-request.ts`

**Step 1: Create email configuration**

`lib/email/config.ts`:
```typescript
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
```

**Step 2: Create email sender utility**

`lib/email/send-feedback-request.ts`:
```typescript
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
```

**Step 3: Install dependencies**

```bash
npm install resend nodemailer
npm install -D @types/nodemailer
```

**Step 4: Add environment variables to .env.local**

Add to `.env.local`:
```env
# Email Service (resend or nodemailer)
EMAIL_SERVICE=resend

# Resend API Key (recommended)
RESEND_API_KEY=your_resend_api_key_here

# OR SMTP Configuration (fallback)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# Email sender info
FROM_EMAIL=noreply@jkkn.ac.in
FROM_NAME=JKKN Mentor System

# App URL for feedback links
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Step 5: Commit**

```bash
git add lib/email/
git commit -m "feat(email): add email service for feedback requests"
```

---

## Task 4: API - Create Feedback Records After Session Creation

**Files:**
- Modify: `app/api/mentor/[id]/counseling/route.ts` (POST function)

**Step 1: Add helper function to create feedback records**

Add this function before the POST handler in the file:

```typescript
/**
 * Create student feedback records and send emails
 * Called after counseling session creation
 */
async function createFeedbackRecordsAndSendEmails(
  session: any,
  studentIds: string[],
  mentor: any,
  supabase: any
): Promise<void> {
  const { sendFeedbackRequestEmail } = await import('@/lib/email/send-feedback-request');
  
  for (const studentId of studentIds) {
    try {
      // Get student details
      const { data: student } = await supabase
        .from('students')
        .select('id, name, email')
        .eq('id', studentId)
        .single();
      
      if (!student || !student.email) {
        console.log(`[Feedback] Skipping student ${studentId} - no email`);
        continue;
      }
      
      // Generate unique token
      const token = crypto.randomUUID() + '-' + Date.now();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
      
      // Create feedback record
      const { data: feedbackRecord, error: feedbackError } = await supabase
        .from('student_feedback')
        .insert({
          session_id: session.id,
          student_id: studentId,
          mentor_id: session.mentor_id,
          feedback_token: token,
          token_expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();
      
      if (feedbackError) {
        console.error(`[Feedback] Error creating record for student ${studentId}:`, feedbackError);
        continue;
      }
      
      // Send email
      const emailSent = await sendFeedbackRequestEmail({
        studentEmail: student.email,
        studentName: student.name,
        mentorName: mentor.name || 'Your Mentor',
        sessionName: session.session_name,
        sessionDate: new Date(session.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        feedbackToken: token,
      });
      
      if (emailSent) {
        // Update email_sent_at timestamp
        await supabase
          .from('student_feedback')
          .update({ email_sent_at: new Date().toISOString() })
          .eq('id', feedbackRecord.id);
        
        console.log(`[Feedback] Email sent successfully to ${student.email}`);
      }
    } catch (error) {
      console.error(`[Feedback] Error processing student ${studentId}:`, error);
    }
  }
}
```

**Step 2: Modify POST handler to call feedback creation**

Find the POST function and add this after sessions are created successfully (around line 200-220):

```typescript
// After all sessions created successfully, before returning response:

// Send feedback request emails (non-blocking)
// Don't await - let it run in background
createFeedbackRecordsAndSendEmails(
  sessions[0], // Use first session as template (all have same session_name, date, time)
  studentIds,
  { name: mentorData.name }, // Mentor info
  supabaseAdmin
).catch(error => {
  console.error('[Counseling API] Error creating feedback records:', error);
});

console.log(`[Counseling API] Created ${sessions.length} sessions and initiated feedback requests`);
```

**Step 3: Import crypto at top of file**

Add to imports:
```typescript
import crypto from 'crypto';
```

**Step 4: Test creating a session**

Manual test: Create a counseling session via UI
Expected: Session created + feedback records created + emails sent (check logs)

**Step 5: Commit**

```bash
git add app/api/mentor/[id]/counseling/route.ts
git commit -m "feat(api): auto-create feedback requests on session creation"
```

---

## Task 5: API - Public Feedback Submission Endpoint

**Files:**
- Create: `app/api/feedback/[token]/route.ts`

**Step 1: Create GET endpoint (verify token and get feedback form data)**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/feedback/[token]
 * Verify feedback token and return session/student info for form
 * Public endpoint - no auth required
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    const supabase = createAdminClient();
    
    // Find feedback record by token
    const { data: feedbackRecord, error } = await supabase
      .from('student_feedback')
      .select(`
        *,
        session:counseling_sessions!session_id (
          id,
          session_name,
          date,
          time,
          notes
        ),
        student:students!student_id (
          id,
          name,
          roll_number
        ),
        mentor:mentors!mentor_id (
          id,
          user:users!user_id (
            full_name
          )
        )
      `)
      .eq('feedback_token', token)
      .single();
    
    if (error || !feedbackRecord) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired feedback link'
      }, { status: 404 });
    }
    
    // Check if already submitted
    if (feedbackRecord.submitted_at) {
      return NextResponse.json({
        valid: false,
        error: 'Feedback already submitted',
        submitted: true
      }, { status: 400 });
    }
    
    // Check if expired
    const now = new Date();
    const expiresAt = new Date(feedbackRecord.token_expires_at);
    if (now > expiresAt) {
      return NextResponse.json({
        valid: false,
        error: 'Feedback link has expired'
      }, { status: 410 });
    }
    
    // Track email opened (if not tracked yet)
    if (!feedbackRecord.email_opened_at) {
      await supabase
        .from('student_feedback')
        .update({ email_opened_at: new Date().toISOString() })
        .eq('id', feedbackRecord.id);
    }
    
    // Return session info for form
    return NextResponse.json({
      valid: true,
      feedback: {
        id: feedbackRecord.id,
        sessionName: feedbackRecord.session?.session_name,
        sessionDate: feedbackRecord.session?.date,
        sessionTime: feedbackRecord.session?.time,
        mentorName: feedbackRecord.mentor?.user?.[0]?.full_name || 'Your Mentor',
        studentName: feedbackRecord.student?.name,
      }
    });
  } catch (error: any) {
    console.error('[Feedback API GET] Error:', error);
    return NextResponse.json({
      valid: false,
      error: 'An error occurred'
    }, { status: 500 });
  }
}

/**
 * POST /api/feedback/[token]
 * Submit student feedback
 * Public endpoint - no auth required
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    
    const {
      session_helpfulness_rating,
      mentor_approachability_rating,
      concerns_addressed,
      what_helped,
      what_could_improve,
      additional_comments,
      is_anonymous
    } = body;
    
    // Validate ratings
    if (!session_helpfulness_rating || !mentor_approachability_rating) {
      return NextResponse.json({
        error: 'Please provide all ratings'
      }, { status: 400 });
    }
    
    if (session_helpfulness_rating < 1 || session_helpfulness_rating > 5 ||
        mentor_approachability_rating < 1 || mentor_approachability_rating > 5) {
      return NextResponse.json({
        error: 'Ratings must be between 1 and 5'
      }, { status: 400 });
    }
    
    const supabase = createAdminClient();
    
    // Verify token exists and not submitted
    const { data: existing, error: checkError } = await supabase
      .from('student_feedback')
      .select('id, submitted_at, token_expires_at')
      .eq('feedback_token', token)
      .single();
    
    if (checkError || !existing) {
      return NextResponse.json({
        error: 'Invalid feedback link'
      }, { status: 404 });
    }
    
    if (existing.submitted_at) {
      return NextResponse.json({
        error: 'Feedback already submitted'
      }, { status: 400 });
    }
    
    // Check expiry
    if (new Date() > new Date(existing.token_expires_at)) {
      return NextResponse.json({
        error: 'Feedback link has expired'
      }, { status: 410 });
    }
    
    // Update feedback record
    const { error: updateError } = await supabase
      .from('student_feedback')
      .update({
        session_helpfulness_rating,
        mentor_approachability_rating,
        concerns_addressed: concerns_addressed ?? null,
        what_helped: what_helped || null,
        what_could_improve: what_could_improve || null,
        additional_comments: additional_comments || null,
        is_anonymous: is_anonymous ?? false,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    
    if (updateError) {
      console.error('[Feedback API POST] Error updating:', updateError);
      return NextResponse.json({
        error: 'Failed to submit feedback'
      }, { status: 500 });
    }
    
    console.log(`[Feedback API] Feedback submitted successfully for token: ${token.substring(0, 8)}...`);
    
    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback!'
    });
  } catch (error: any) {
    console.error('[Feedback API POST] Error:', error);
    return NextResponse.json({
      error: 'An error occurred while submitting feedback'
    }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/feedback/[token]/route.ts
git commit -m "feat(api): add public feedback submission endpoints"
```

---

## Task 6: UI - Public Student Feedback Form Page

**Files:**
- Create: `app/feedback/[token]/page.tsx`
- Create: `app/feedback/[token]/components/FeedbackForm.tsx`

**Step 1: Create feedback form component**

`app/feedback/[token]/components/FeedbackForm.tsx`:
```typescript
'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import { TextArea } from '@/components/ui/Input';
import Card from '@/components/ui/Card';

interface FeedbackFormProps {
  token: string;
  sessionInfo: {
    sessionName: string;
    sessionDate: string;
    mentorName: string;
    studentName?: string;
  };
  onSuccess: () => void;
}

export default function FeedbackForm({ token, sessionInfo, onSuccess }: FeedbackFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    session_helpfulness_rating: 0,
    mentor_approachability_rating: 0,
    concerns_addressed: null as boolean | null,
    what_helped: '',
    what_could_improve: '',
    additional_comments: '',
    is_anonymous: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.session_helpfulness_rating === 0 || formData.mentor_approachability_rating === 0) {
      alert('Please provide all ratings');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`/api/feedback/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
      } else {
        alert(data.error || 'Failed to submit feedback');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <svg
              className={`w-10 h-10 ${value >= star ? 'text-brand-yellow fill-current' : 'text-neutral-300'}`}
              fill={value >= star ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Session Info */}
      <Card className="bg-brand-green/5 border-brand-green/20 p-4">
        <h3 className="font-semibold text-brand-green mb-2">{sessionInfo.sessionName}</h3>
        <p className="text-sm text-neutral-600">
          Date: {new Date(sessionInfo.sessionDate).toLocaleDateString()} <br />
          Mentor: {sessionInfo.mentorName}
        </p>
      </Card>

      {/* Ratings */}
      <StarRating
        label="How helpful was this counseling session?"
        value={formData.session_helpfulness_rating}
        onChange={(v) => setFormData({ ...formData, session_helpfulness_rating: v })}
      />

      <StarRating
        label="How approachable was your mentor?"
        value={formData.mentor_approachability_rating}
        onChange={(v) => setFormData({ ...formData, mentor_approachability_rating: v })}
      />

      {/* Yes/No Question */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Were your concerns addressed?
        </label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, concerns_addressed: true })}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              formData.concerns_addressed === true
                ? 'bg-brand-green text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, concerns_addressed: false })}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              formData.concerns_addressed === false
                ? 'bg-brand-green text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            No
          </button>
        </div>
      </div>

      {/* Text Feedback */}
      <TextArea
        label="What aspects of the session helped you the most?"
        placeholder="Share what worked well..."
        value={formData.what_helped}
        onChange={(e) => setFormData({ ...formData, what_helped: e.target.value })}
        rows={3}
      />

      <TextArea
        label="What could be improved?"
        placeholder="Share your suggestions..."
        value={formData.what_could_improve}
        onChange={(e) => setFormData({ ...formData, what_could_improve: e.target.value })}
        rows={3}
      />

      <TextArea
        label="Additional Comments (Optional)"
        placeholder="Any other thoughts..."
        value={formData.additional_comments}
        onChange={(e) => setFormData({ ...formData, additional_comments: e.target.value })}
        rows={2}
      />

      {/* Anonymous Option */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="anonymous"
          checked={formData.is_anonymous}
          onChange={(e) => setFormData({ ...formData, is_anonymous: e.target.checked })}
          className="w-4 h-4 text-brand-green focus:ring-brand-green rounded"
        />
        <label htmlFor="anonymous" className="text-sm text-neutral-700">
          Submit feedback anonymously
        </label>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        disabled={submitting}
        className="w-full bg-brand-green hover:bg-brand-green/90"
      >
        {submitting ? 'Submitting...' : 'Submit Feedback'}
      </Button>
    </form>
  );
}
```

**Step 2: Create feedback page**

`app/feedback/[token]/page.tsx`:
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';
import FeedbackForm from './components/FeedbackForm';

export default function FeedbackPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/feedback/${token}`);
        const data = await response.json();

        if (response.ok && data.valid) {
          setSessionInfo(data.feedback);
        } else {
          setError(data.error || 'Invalid feedback link');
        }
      } catch (err) {
        setError('Failed to load feedback form');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-cream py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-brand-cream py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Unable to Load Feedback Form</h1>
            <p className="text-neutral-600">{error}</p>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-brand-cream py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-brand-green rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Thank You!</h1>
            <p className="text-neutral-600 mb-6">
              Your feedback has been submitted successfully. We appreciate you taking the time to share your thoughts.
            </p>
            <p className="text-sm text-neutral-500">
              This will help us improve the mentoring experience for everyone.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-green mb-2">
            Counseling Session Feedback
          </h1>
          <p className="text-neutral-600">
            Your feedback helps us improve the mentoring experience
          </p>
        </div>

        <Card className="p-6">
          <FeedbackForm
            token={token}
            sessionInfo={sessionInfo}
            onSuccess={() => setSubmitted(true)}
          />
        </Card>
      </div>
    </div>
  );
}
```

**Step 3: Create components directory**

```bash
mkdir -p app/feedback/[token]/components
```

**Step 4: Commit**

```bash
git add app/feedback/
git commit -m "feat(ui): add public student feedback form"
```

---

## Task 7: API - Get Student Feedback for Mentor

**Files:**
- Create: `app/api/mentor/[id]/student-feedback/route.ts`

**Step 1: Create GET endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { StudentFeedback, StudentFeedbackStats } from '@/lib/types/mentor';

/**
 * GET /api/mentor/[id]/student-feedback
 * Get student feedback for mentor's counseling sessions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: mentorId } = await params;

    const supabase = createAdminClient();

    // Find mentor by JKKN ID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('jkkn_user_id', mentorId)
      .single();

    if (!user) {
      return NextResponse.json({
        success: true,
        feedback: [],
        stats: null
      });
    }

    const { data: mentor } = await supabase
      .from('mentors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!mentor) {
      return NextResponse.json({
        success: true,
        feedback: [],
        stats: null
      });
    }

    // Fetch feedback with relations
    const { data: feedback, error } = await supabase
      .from('student_feedback')
      .select(`
        *,
        student:students!student_id (
          id,
          name,
          roll_number,
          email
        ),
        session:counseling_sessions!session_id (
          id,
          session_name,
          date,
          time
        )
      `)
      .eq('mentor_id', mentor.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Student Feedback API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate stats
    const submittedFeedback = feedback?.filter(f => f.submitted_at) || [];
    const totalRequests = feedback?.length || 0;
    const totalResponses = submittedFeedback.length;

    let stats: StudentFeedbackStats | null = null;

    if (totalResponses > 0) {
      const avgHelpfulness = submittedFeedback.reduce((sum, f) => 
        sum + (f.session_helpfulness_rating || 0), 0) / totalResponses;
      
      const avgApproachability = submittedFeedback.reduce((sum, f) => 
        sum + (f.mentor_approachability_rating || 0), 0) / totalResponses;
      
      const concernsAddressedCount = submittedFeedback.filter(f => 
        f.concerns_addressed === true).length;

      stats = {
        total_responses: totalResponses,
        response_rate: totalRequests > 0 ? (totalResponses / totalRequests) * 100 : 0,
        avg_helpfulness: Math.round(avgHelpfulness * 10) / 10,
        avg_approachability: Math.round(avgApproachability * 10) / 10,
        concerns_addressed_count: concernsAddressedCount,
        concerns_addressed_percentage: (concernsAddressedCount / totalResponses) * 100
      };
    }

    // Transform feedback data (hide student name if anonymous)
    const transformedFeedback = feedback?.map(f => ({
      ...f,
      student: f.is_anonymous ? null : f.student
    })) || [];

    return NextResponse.json({
      success: true,
      feedback: transformedFeedback,
      stats,
      totalRequests,
      totalResponses,
      pendingResponses: totalRequests - totalResponses
    });
  } catch (error: any) {
    console.error('[Student Feedback API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/mentor/[id]/student-feedback/route.ts
git commit -m "feat(api): add student feedback retrieval endpoint"
```

---

## Task 8: UI - Add Student Feedback Tab to Mentor Page

**Files:**
- Modify: `app/(dashboard)/mentor/[id]/page.tsx` (add new tab type)
- Create: `app/(dashboard)/mentor/[id]/components/StudentFeedbackTab.tsx`

**Step 1: Update tab type in page.tsx**

Find line 26 and update:
```typescript
type TabType = 'students' | 'counseling' | 'attendance' | 'examResults' | 'idp' | 'reports' | 'studentFeedback';
```

**Step 2: Import StudentFeedbackTab**

Add to imports (around line 12):
```typescript
import StudentFeedbackTab from './components/StudentFeedbackTab';
```

**Step 3: Add tab button in UI**

Find the tab buttons section (around line 150-200) and add:
```typescript
<button
  onClick={() => setActiveTab('studentFeedback')}
  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
    activeTab === 'studentFeedback'
      ? 'border-brand-green text-brand-green font-medium'
      : 'border-transparent text-neutral-600 hover:text-brand-green hover:border-neutral-300'
  }`}
>
  <MessageSquare className="w-5 h-5" />
  <span className="hidden sm:inline">Student Feedback</span>
  {mentor?.pendingFeedback && mentor.pendingFeedback > 0 ? (
    <Badge variant="warning" className="ml-1">
      {mentor.pendingFeedback}
    </Badge>
  ) : null}
</button>
```

**Step 4: Add tab content**

Find the tab content rendering section and add:
```typescript
{activeTab === 'studentFeedback' && (
  <StudentFeedbackTab mentorId={mentorId} />
)}
```

**Step 5: Create StudentFeedbackTab component**

`app/(dashboard)/mentor/[id]/components/StudentFeedbackTab.tsx`:
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { SkeletonCard } from '@/components/ui/Skeleton';
import type { StudentFeedback, StudentFeedbackStats } from '@/lib/types/mentor';

interface StudentFeedbackTabProps {
  mentorId: string;
}

export default function StudentFeedbackTab({ mentorId }: StudentFeedbackTabProps) {
  const { accessToken } = useAuth();
  const [feedback, setFeedback] = useState<StudentFeedback[]>([]);
  const [stats, setStats] = useState<StudentFeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'pending'>('all');

  useEffect(() => {
    if (!accessToken) return;

    const fetchFeedback = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/mentor/${mentorId}/student-feedback`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setFeedback(data.feedback || []);
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Error fetching feedback:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [mentorId, accessToken]);

  const filteredFeedback = feedback.filter(f => {
    if (filter === 'submitted') return f.submitted_at;
    if (filter === 'pending') return !f.submitted_at;
    return true;
  });

  const StarDisplay = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= rating ? 'text-brand-yellow fill-current' : 'text-neutral-300'}`}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-neutral-600">Response Rate</p>
            <p className="text-2xl font-bold text-brand-green mt-1">
              {Math.round(stats.response_rate)}%
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              {stats.total_responses} of {feedback.length} responded
            </p>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-neutral-600">Avg Helpfulness</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold text-brand-green">
                {stats.avg_helpfulness}
              </p>
              <StarDisplay rating={Math.round(stats.avg_helpfulness)} />
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-neutral-600">Avg Approachability</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold text-brand-green">
                {stats.avg_approachability}
              </p>
              <StarDisplay rating={Math.round(stats.avg_approachability)} />
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-neutral-600">Concerns Addressed</p>
            <p className="text-2xl font-bold text-brand-green mt-1">
              {Math.round(stats.concerns_addressed_percentage)}%
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              {stats.concerns_addressed_count} of {stats.total_responses}
            </p>
          </Card>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            filter === 'all'
              ? 'bg-brand-green text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          All ({feedback.length})
        </button>
        <button
          onClick={() => setFilter('submitted')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            filter === 'submitted'
              ? 'bg-brand-green text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          Submitted ({feedback.filter(f => f.submitted_at).length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-brand-green text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          Pending ({feedback.filter(f => !f.submitted_at).length})
        </button>
      </div>

      {/* Feedback List */}
      {filteredFeedback.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-neutral-600">No feedback to display</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFeedback.map(item => (
            <Card key={item.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-neutral-900">
                    {item.session?.session_name}
                  </h3>
                  <p className="text-sm text-neutral-600">
                    {item.student && !item.is_anonymous ? (
                      <>{item.student.name} ({item.student.roll_number})</>
                    ) : (
                      <span className="italic">Anonymous Feedback</span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {new Date(item.session?.date || '').toLocaleDateString()}
                  </p>
                </div>
                {item.submitted_at ? (
                  <Badge variant="success">Submitted</Badge>
                ) : (
                  <Badge variant="warning">Pending</Badge>
                )}
              </div>

              {item.submitted_at && (
                <div className="space-y-3 border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-neutral-600 mb-1">Session Helpfulness</p>
                      <StarDisplay rating={item.session_helpfulness_rating || 0} />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-600 mb-1">Mentor Approachability</p>
                      <StarDisplay rating={item.mentor_approachability_rating || 0} />
                    </div>
                  </div>

                  {item.concerns_addressed !== null && (
                    <div>
                      <p className="text-xs text-neutral-600 mb-1">Concerns Addressed?</p>
                      <Badge variant={item.concerns_addressed ? 'success' : 'error'}>
                        {item.concerns_addressed ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  )}

                  {item.what_helped && (
                    <div>
                      <p className="text-xs text-neutral-600 mb-1">What Helped:</p>
                      <p className="text-sm text-neutral-800">{item.what_helped}</p>
                    </div>
                  )}

                  {item.what_could_improve && (
                    <div>
                      <p className="text-xs text-neutral-600 mb-1">Could Improve:</p>
                      <p className="text-sm text-neutral-800">{item.what_could_improve}</p>
                    </div>
                  )}

                  {item.additional_comments && (
                    <div>
                      <p className="text-xs text-neutral-600 mb-1">Additional Comments:</p>
                      <p className="text-sm text-neutral-800">{item.additional_comments}</p>
                    </div>
                  )}

                  <p className="text-xs text-neutral-500 mt-2">
                    Submitted on {new Date(item.submitted_at).toLocaleString()}
                  </p>
                </div>
              )}

              {!item.submitted_at && (
                <div className="border-t pt-4">
                  <p className="text-sm text-neutral-600">
                    Email sent on {item.email_sent_at ? new Date(item.email_sent_at).toLocaleString() : 'Pending'}
                  </p>
                  {item.email_opened_at && (
                    <p className="text-xs text-neutral-500 mt-1">
                      Opened on {new Date(item.email_opened_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 6: Commit**

```bash
git add app/\(dashboard\)/mentor/[id]/
git commit -m "feat(ui): add student feedback tab to mentor page"
```

---

## Task 9: Testing & Documentation

**Files:**
- Create: `docs/features/student-feedback-system.md`

**Step 1: Create feature documentation**

```markdown
# Student Feedback System

## Overview
Automated student feedback collection system for counseling sessions.

## Workflow
1. Mentor creates counseling session with students
2. System automatically creates feedback records
3. Students receive email with unique feedback link
4. Students submit feedback anonymously or with name
5. Mentor views aggregated feedback in dashboard

## Email Configuration

### Using Resend (Recommended)
1. Get API key from https://resend.com
2. Add to `.env.local`:
   ```
   EMAIL_SERVICE=resend
   RESEND_API_KEY=your_key_here
   ```

### Using SMTP (Fallback)
Add to `.env.local`:
```
EMAIL_SERVICE=nodemailer
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Testing

### Test Email Delivery
1. Create counseling session
2. Check server logs for email status
3. Check student's email inbox
4. Click feedback link

### Test Feedback Submission
1. Open feedback link from email
2. Fill out feedback form
3. Submit
4. Check mentor's Student Feedback tab

## Security
- Unique tokens per student per session
- Tokens expire in 7 days
- RLS policies protect data access
- Anonymous feedback option available

## Database Tables
- `student_feedback` - Feedback records
- Foreign keys to: counseling_sessions, students, mentors
```

**Step 2: Test the complete flow**

Manual testing checklist:
- [ ] Create counseling session with students
- [ ] Verify feedback records created in database
- [ ] Verify emails sent (check logs)
- [ ] Open feedback link in browser
- [ ] Submit feedback
- [ ] View feedback in mentor dashboard
- [ ] Test expired token
- [ ] Test already-submitted token
- [ ] Test anonymous submission

**Step 3: Commit documentation**

```bash
git add docs/features/student-feedback-system.md
git commit -m "docs: add student feedback system documentation"
```

---

**PLAN COMPLETE**

**Summary:**
- ✅ Database schema for student feedback
- ✅ Email service configuration (Resend/SMTP)
- ✅ Auto-create feedback requests on session creation
- ✅ Public feedback submission form
- ✅ Student Feedback tab in mentor dashboard
- ✅ Analytics and stats display
- ✅ Anonymous feedback support
- ✅ Token-based security (no login required)

**Next Steps:**
Execute this plan using executing-plans skill or implement manually following task-by-task.
