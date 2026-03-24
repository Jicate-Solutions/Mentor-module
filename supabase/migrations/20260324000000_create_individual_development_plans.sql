-- =====================================================
-- Individual Development Plans (IDP) Table
-- Referenced by: app/api/idp/route.ts, hooks/mentor/useIDPPlans.ts
-- =====================================================

CREATE TABLE IF NOT EXISTS public.individual_development_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  area_of_focus TEXT NOT NULL,
  smart_goal_statement TEXT NOT NULL,
  target_date DATE NOT NULL,
  knowledge_to_develop TEXT,
  knowledge_development_how TEXT,
  skills_to_gain TEXT,
  skills_development_how TEXT,
  detailed_action_plan TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
  progress_percentage INTEGER DEFAULT 0,
  milestones JSONB,
  mentor_notes TEXT,
  student_feedback TEXT,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_idp_mentor ON public.individual_development_plans(mentor_id);
CREATE INDEX idx_idp_student ON public.individual_development_plans(student_id);
CREATE INDEX idx_idp_status ON public.individual_development_plans(status);

ALTER TABLE public.individual_development_plans ENABLE ROW LEVEL SECURITY;

-- Service role full access (used by createAdminClient)
CREATE POLICY "Service role full access on idp"
  ON public.individual_development_plans
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_idp_updated_at
  BEFORE UPDATE ON public.individual_development_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
