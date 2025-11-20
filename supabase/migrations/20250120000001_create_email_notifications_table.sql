-- Create email_notifications table to track all email notifications sent by the system
-- This provides a comprehensive audit log of all email communications

CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Notification classification
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'session_created',
    'session_updated',
    'session_cancelled',
    'feedback_request',
    'reminder',
    'other'
  )),

  -- Recipient information
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('student', 'mentor', 'admin')),
  recipient_email TEXT NOT NULL,
  recipient_id UUID, -- Optional reference to user/student/mentor

  -- Email content
  subject TEXT NOT NULL,
  template_used TEXT NOT NULL,

  -- Related entities (for tracking context)
  session_id UUID REFERENCES counseling_sessions(id) ON DELETE SET NULL,
  mentor_id UUID REFERENCES mentors(id) ON DELETE SET NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,

  -- Delivery status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'delivered')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Email provider information
  email_provider TEXT CHECK (email_provider IN ('resend', 'nodemailer')),
  provider_message_id TEXT, -- Message ID from email provider
  provider_response JSONB,  -- Full response from provider

  -- Metadata
  metadata JSONB, -- Additional flexible data

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_email_notifications_session ON email_notifications(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_email_notifications_recipient ON email_notifications(recipient_email);
CREATE INDEX idx_email_notifications_status ON email_notifications(status);
CREATE INDEX idx_email_notifications_type ON email_notifications(notification_type);
CREATE INDEX idx_email_notifications_created ON email_notifications(created_at DESC);
CREATE INDEX idx_email_notifications_mentor ON email_notifications(mentor_id) WHERE mentor_id IS NOT NULL;
CREATE INDEX idx_email_notifications_student ON email_notifications(student_id) WHERE student_id IS NOT NULL;

-- Composite index for common queries
CREATE INDEX idx_email_notifications_session_type ON email_notifications(session_id, notification_type) WHERE session_id IS NOT NULL;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_notifications_updated_at
  BEFORE UPDATE ON email_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_email_notifications_updated_at();

-- RLS Policies
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can view all email notifications
CREATE POLICY "Admins can view all email notifications"
  ON email_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Mentors can view their own email notifications
CREATE POLICY "Mentors can view their email notifications"
  ON email_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mentors
      WHERE mentors.id = email_notifications.mentor_id
      AND mentors.user_id = auth.uid()
    )
  );

-- Service role can insert/update email notifications
CREATE POLICY "Service role can manage email notifications"
  ON email_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE email_notifications IS 'Comprehensive audit log of all email notifications sent by the system';
COMMENT ON COLUMN email_notifications.notification_type IS 'Type of notification: session_created, session_updated, session_cancelled, feedback_request, reminder, other';
COMMENT ON COLUMN email_notifications.recipient_type IS 'Type of recipient: student, mentor, admin';
COMMENT ON COLUMN email_notifications.status IS 'Delivery status: pending, sent, failed, bounced, delivered';
COMMENT ON COLUMN email_notifications.provider_message_id IS 'Unique message ID from email provider for tracking';
COMMENT ON COLUMN email_notifications.retry_count IS 'Number of retry attempts for failed emails';
