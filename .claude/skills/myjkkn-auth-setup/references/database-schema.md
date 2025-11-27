# Database Schema

## Overview

This document details the Supabase database schema required for MyJKKN authentication.

## Required Tables

### users

Stores user profiles synced from MyJKKN:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jkkn_user_id VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  department_id UUID REFERENCES departments(id),
  institution_id UUID REFERENCES institutions(id),
  phone_number VARCHAR(20),
  gender VARCHAR(10),
  designation VARCHAR(100),
  avatar_url TEXT,
  is_super_admin BOOLEAN DEFAULT FALSE,
  profile_completed BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_jkkn_user_id ON users(jkkn_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_institution ON users(institution_id);
CREATE INDEX idx_users_department ON users(department_id);

-- Trigger for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### user_sessions

Stores active sessions:

```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(access_token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
```

### mentor_incharge_assignments

Stores Mentor In-Charge assignments:

```sql
CREATE TABLE mentor_incharge_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id),
  department_id UUID REFERENCES departments(id),
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id),  -- One assignment per user
  UNIQUE(user_id, institution_id)
);

-- Indexes
CREATE INDEX idx_incharge_user ON mentor_incharge_assignments(user_id);
CREATE INDEX idx_incharge_institution ON mentor_incharge_assignments(institution_id);
```

### mentors

Stores mentor-specific data (faculty members):

```sql
CREATE TABLE mentors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  department_id UUID NOT NULL REFERENCES departments(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  designation VARCHAR(100),
  total_students INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_mentors_user ON mentors(user_id);
CREATE INDEX idx_mentors_department ON mentors(department_id);
CREATE INDEX idx_mentors_institution ON mentors(institution_id);
CREATE INDEX idx_mentors_active ON mentors(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_mentors_updated_at
  BEFORE UPDATE ON mentors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Supporting Tables

### institutions

```sql
CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### departments

```sql
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_departments_institution ON departments(institution_id);
```

## Helper Functions

### update_updated_at_column

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### cleanup_expired_sessions

```sql
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Optional: Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-sessions', '0 * * * *', 'SELECT cleanup_expired_sessions()');
```

## Row Level Security (RLS)

### users table

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Policy: Super admins can read all users
CREATE POLICY "Super admins can read all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND is_super_admin = TRUE
    )
  );

-- Policy: Institution admins can read users in their institution
CREATE POLICY "Institution admins can read institution users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('principal', 'digital_coordinator')
      AND u.institution_id = users.institution_id
    )
  );
```

### user_sessions table

```sql
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own sessions
CREATE POLICY "Users can manage own sessions"
  ON user_sessions
  USING (user_id = auth.uid());
```

### mentor_incharge_assignments table

```sql
ALTER TABLE mentor_incharge_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can manage all assignments
CREATE POLICY "Super admins can manage all assignments"
  ON mentor_incharge_assignments
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND is_super_admin = TRUE
    )
  );

-- Policy: Institution admins can manage assignments in their institution
CREATE POLICY "Institution admins can manage institution assignments"
  ON mentor_incharge_assignments
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('principal', 'digital_coordinator')
      AND u.institution_id = mentor_incharge_assignments.institution_id
    )
  );
```

## Migration Script

Complete migration script for setting up all tables:

```sql
-- Migration: add_auth_tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Updated at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jkkn_user_id VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  department_id UUID,
  institution_id UUID,
  phone_number VARCHAR(20),
  gender VARCHAR(10),
  designation VARCHAR(100),
  avatar_url TEXT,
  is_super_admin BOOLEAN DEFAULT FALSE,
  profile_completed BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_jkkn_user_id ON users(jkkn_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_institution ON users(institution_id);

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(access_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

-- Mentor incharge assignments
CREATE TABLE IF NOT EXISTS mentor_incharge_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  institution_id UUID NOT NULL,
  department_id UUID,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incharge_user ON mentor_incharge_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_incharge_institution ON mentor_incharge_assignments(institution_id);

-- Mentors table
CREATE TABLE IF NOT EXISTS mentors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  department_id UUID NOT NULL,
  institution_id UUID NOT NULL,
  designation VARCHAR(100),
  total_students INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentors_user ON mentors(user_id);
CREATE INDEX IF NOT EXISTS idx_mentors_department ON mentors(department_id);
CREATE INDEX IF NOT EXISTS idx_mentors_institution ON mentors(institution_id);

CREATE TRIGGER update_mentors_updated_at
  BEFORE UPDATE ON mentors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

## TypeScript Types

```typescript
// types/database.ts

export interface User {
  id: string;
  jkkn_user_id: string;
  email: string;
  full_name: string;
  role: string;
  department_id: string | null;
  institution_id: string | null;
  phone_number: string | null;
  gender: string | null;
  designation: string | null;
  avatar_url: string | null;
  is_super_admin: boolean;
  profile_completed: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  created_at: string;
}

export interface MentorInchargeAssignment {
  id: string;
  user_id: string;
  institution_id: string;
  department_id: string | null;
  assigned_by: string | null;
  assigned_at: string;
}

export interface Mentor {
  id: string;
  user_id: string;
  department_id: string;
  institution_id: string;
  designation: string | null;
  total_students: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```
