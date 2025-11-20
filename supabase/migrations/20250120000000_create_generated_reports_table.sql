-- Create generated_reports table to track all generated reports
CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id TEXT NOT NULL,
  mentor_name TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'counseling', -- counseling, attendance, exam_results, etc.
  period TEXT NOT NULL, -- weekly, monthly, yearly, custom
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  filename TEXT NOT NULL,
  file_url TEXT, -- Optional: If storing files in Supabase Storage
  session_count INTEGER DEFAULT 0, -- Number of sessions included in report
  generated_by UUID,
  institution_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_generated_reports_mentor_id ON generated_reports(mentor_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_created_at ON generated_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_reports_institution_id ON generated_reports(institution_id);

-- Enable RLS
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Super admins can see all reports
CREATE POLICY "Super admins can view all generated reports"
  ON generated_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Institution admins can see reports from their institution
CREATE POLICY "Institution admins can view their institution's reports"
  ON generated_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'institution_admin'
      AND users.institution_id = generated_reports.institution_id
    )
  );

-- Mentors can see their own reports
CREATE POLICY "Mentors can view their own reports"
  ON generated_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.jkkn_user_id = generated_reports.mentor_id
    )
  );

-- Allow insert for authenticated users (report generation)
CREATE POLICY "Authenticated users can insert reports"
  ON generated_reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow delete for the user who generated the report or admins
CREATE POLICY "Users can delete their own reports or admins can delete any"
  ON generated_reports FOR DELETE
  USING (
    generated_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.is_super_admin = true OR users.role = 'institution_admin')
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_generated_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_generated_reports_updated_at
  BEFORE UPDATE ON generated_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_generated_reports_updated_at();

-- Add comment
COMMENT ON TABLE generated_reports IS 'Tracks all generated reports for mentors including counseling, attendance, and exam results reports';
