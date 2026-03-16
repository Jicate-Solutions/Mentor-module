-- JKKN Data Cache Tables
-- Caches JKKN reference data + learner profiles locally for instant queries.
-- A "Data Sync" tab in Settings lets super_admin manually refresh.

-- Required for GIN trigram indexes on student name/email
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── jkkn_institutions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jkkn_institutions (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  counselling_code TEXT,
  category         TEXT,
  institution_type TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── jkkn_departments ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jkkn_departments (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  code           TEXT,
  institution_id TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  synced_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jkkn_departments_institution ON public.jkkn_departments(institution_id);

-- ── jkkn_degrees ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jkkn_degrees (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  degree_type TEXT,
  synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── jkkn_programs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jkkn_programs (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  code           TEXT,
  department_id  TEXT,
  degree_id      TEXT,
  institution_id TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  synced_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jkkn_programs_department  ON public.jkkn_programs(department_id);
CREATE INDEX IF NOT EXISTS idx_jkkn_programs_institution ON public.jkkn_programs(institution_id);

-- ── jkkn_students ─────────────────────────────────────────────────────────────
-- Caches all learner profiles (15K+) for instant search without JKKN pagination
CREATE TABLE IF NOT EXISTS public.jkkn_students (
  id               TEXT PRIMARY KEY,  -- JKKN UUID
  roll_number      TEXT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  email            TEXT,
  department_id    TEXT,
  institution_id   TEXT,
  year             TEXT,
  section          TEXT,
  academic_year    TEXT,
  lifecycle_status TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jkkn_students_institution ON public.jkkn_students(institution_id);
CREATE INDEX IF NOT EXISTS idx_jkkn_students_roll        ON public.jkkn_students(roll_number);
-- GIN trigram indexes for fast ILIKE on name and email
CREATE INDEX IF NOT EXISTS idx_jkkn_students_name_trgm  ON public.jkkn_students USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jkkn_students_email_trgm ON public.jkkn_students USING gin (email gin_trgm_ops);

-- ── jkkn_sync_log ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jkkn_sync_log (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type    TEXT NOT NULL
                 CHECK (entity_type IN ('institutions','departments','degrees','programs','students','all')),
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ,
  total_records  INTEGER,
  status         TEXT NOT NULL DEFAULT 'running'
                 CHECK (status IN ('running','completed','failed')),
  error_message  TEXT
);
CREATE INDEX IF NOT EXISTS idx_jkkn_sync_log_entity  ON public.jkkn_sync_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_jkkn_sync_log_started ON public.jkkn_sync_log(started_at DESC);

-- ── RLS Policies ──────────────────────────────────────────────────────────────

-- Reference tables (institutions, departments, degrees, programs):
-- SELECT: any authenticated user (app.user_id is set via token validation)
-- ALL write: service_role only

ALTER TABLE public.jkkn_institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jkkn_institutions_select" ON public.jkkn_institutions
  FOR SELECT USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '');
CREATE POLICY "jkkn_institutions_service_all" ON public.jkkn_institutions
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.jkkn_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jkkn_departments_select" ON public.jkkn_departments
  FOR SELECT USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '');
CREATE POLICY "jkkn_departments_service_all" ON public.jkkn_departments
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.jkkn_degrees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jkkn_degrees_select" ON public.jkkn_degrees
  FOR SELECT USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '');
CREATE POLICY "jkkn_degrees_service_all" ON public.jkkn_degrees
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.jkkn_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jkkn_programs_select" ON public.jkkn_programs
  FOR SELECT USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '');
CREATE POLICY "jkkn_programs_service_all" ON public.jkkn_programs
  FOR ALL USING (auth.role() = 'service_role');

-- jkkn_students: institution-scoped for regular users, all for admins
ALTER TABLE public.jkkn_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jkkn_students_select" ON public.jkkn_students
  FOR SELECT USING (
    current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != ''
    AND (
      current_setting('app.user_role', true) IN ('super_admin', 'institution_admin')
      OR institution_id = current_setting('app.user_institution', true)
    )
  );
CREATE POLICY "jkkn_students_service_all" ON public.jkkn_students
  FOR ALL USING (auth.role() = 'service_role');

-- jkkn_sync_log: admin roles only
ALTER TABLE public.jkkn_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jkkn_sync_log_select" ON public.jkkn_sync_log
  FOR SELECT USING (
    current_setting('app.user_role', true) IN ('super_admin', 'institution_admin')
  );
CREATE POLICY "jkkn_sync_log_service_all" ON public.jkkn_sync_log
  FOR ALL USING (auth.role() = 'service_role');
