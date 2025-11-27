-- =============================================================================
-- MyJKKN Authentication Database Migration
-- =============================================================================
-- This migration creates all tables required for MyJKKN SSO authentication.
-- Run this script in your Supabase SQL editor or as a migration.
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- USERS TABLE
-- =============================================================================
-- Stores user profiles synced from MyJKKN auth server

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- MyJKKN identification
  jkkn_user_id VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  
  -- Profile information
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  phone_number VARCHAR(20),
  gender VARCHAR(10),
  designation VARCHAR(100),
  avatar_url TEXT,
  
  -- Organization
  institution_id UUID,
  department_id UUID,
  
  -- Permissions
  is_super_admin BOOLEAN DEFAULT FALSE,
  profile_completed BOOLEAN DEFAULT FALSE,
  
  -- Tracking
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_jkkn_user_id ON users(jkkn_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_institution ON users(institution_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- USER SESSIONS TABLE
-- =============================================================================
-- Stores active user sessions with tokens

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Tokens (stored securely, used for validation)
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  
  -- Expiry
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(access_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

-- =============================================================================
-- MENTOR INCHARGE ASSIGNMENTS TABLE
-- =============================================================================
-- Tracks which users have Mentor In-Charge elevated permissions

CREATE TABLE IF NOT EXISTS mentor_incharge_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User being assigned as in-charge
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Scope of assignment
  institution_id UUID NOT NULL,
  department_id UUID, -- NULL means institution-wide scope
  
  -- Tracking
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id), -- One assignment per user
  UNIQUE(user_id, institution_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_incharge_user ON mentor_incharge_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_incharge_institution ON mentor_incharge_assignments(institution_id);

-- =============================================================================
-- MENTORS TABLE
-- =============================================================================
-- Stores mentor-specific data for faculty members

CREATE TABLE IF NOT EXISTS mentors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Link to user
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  
  -- Organization
  department_id UUID NOT NULL,
  institution_id UUID NOT NULL,
  
  -- Profile
  designation VARCHAR(100),
  total_students INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mentors_user ON mentors(user_id);
CREATE INDEX IF NOT EXISTS idx_mentors_department ON mentors(department_id);
CREATE INDEX IF NOT EXISTS idx_mentors_institution ON mentors(institution_id);
CREATE INDEX IF NOT EXISTS idx_mentors_active ON mentors(is_active);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_mentors_updated_at ON mentors;
CREATE TRIGGER update_mentors_updated_at
  BEFORE UPDATE ON mentors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- Enable RLS on all tables

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_incharge_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES - USERS TABLE
-- =============================================================================

-- Allow service role full access (for server-side operations)
DROP POLICY IF EXISTS "Service role has full access to users" ON users;
CREATE POLICY "Service role has full access to users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES - USER SESSIONS TABLE
-- =============================================================================

-- Allow service role full access
DROP POLICY IF EXISTS "Service role has full access to sessions" ON user_sessions;
CREATE POLICY "Service role has full access to sessions"
  ON user_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES - MENTOR INCHARGE ASSIGNMENTS TABLE
-- =============================================================================

-- Allow service role full access
DROP POLICY IF EXISTS "Service role has full access to incharge" ON mentor_incharge_assignments;
CREATE POLICY "Service role has full access to incharge"
  ON mentor_incharge_assignments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES - MENTORS TABLE
-- =============================================================================

-- Allow service role full access
DROP POLICY IF EXISTS "Service role has full access to mentors" ON mentors;
CREATE POLICY "Service role has full access to mentors"
  ON mentors
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- OPTIONAL: ORGANIZATIONS TABLES
-- =============================================================================
-- Uncomment if you need to store organization data locally

/*
CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_institution ON departments(institution_id);
*/

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify tables were created
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('users', 'user_sessions', 'mentor_incharge_assignments', 'mentors');
  
  IF table_count = 4 THEN
    RAISE NOTICE '✓ All 4 authentication tables created successfully';
  ELSE
    RAISE NOTICE '✗ Only % of 4 tables found', table_count;
  END IF;
END $$;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
