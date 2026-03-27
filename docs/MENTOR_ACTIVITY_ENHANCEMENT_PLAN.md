# Mentor Activity Page Enhancement — Implementation Plan

## Overview

Enhance the mentor activity tracking system to provide comprehensive visibility into mentor engagement, session statistics, login history, and student attendance patterns.

---

## Current State (What Exists)

| Component | Status | Location |
|-----------|--------|----------|
| `mentor_activity_log` table | ✅ Built | Migration `20250210000000` |
| Activity Logger service | ✅ Built | `lib/services/activity-logger.ts` (12 convenience methods) |
| Activity logging in services | ✅ Integrated | `counseling.ts`, `students.ts` call logger |
| Activity types defined | ✅ Built | `lib/types/activity.ts` (12 types + metadata) |
| Activity API route | ❌ Missing | No `/api/mentor/[id]/activity` |
| Activity hook | ❌ Missing | No `useActivityLog` hook |
| Activity page/UI | ❌ Missing | No dedicated activity page or tab |
| Login history tracking | ❌ Missing | `user_sessions` table unused |
| Session attendance tracking | ❌ Missing | No student attendance for sessions |
| Mentor engagement metrics | ❌ Missing | No aggregated stats |

---

## Feature Requirements

### 1. Mentor Login History
- Track each mentor login event (timestamp, IP, device/user-agent)
- Show login frequency, last login, total logins this month
- Display login history timeline

### 2. Session Statistics (Per Mentor)
- **Total sessions created** — count of all counseling sessions
- **Sessions completed** — sessions with status = 'completed'
- **Sessions scheduled (upcoming)** — sessions with future date, status = 'scheduled'
- **Sessions cancelled** — sessions with status = 'cancelled'
- **Completion rate** — completed / (completed + cancelled) × 100

### 3. Student Attendance Tracking
- **Not yet attended** — students assigned to a session but haven't attended
- **Attendance rate** — attended / total invited × 100
- Track per-session attendance (present, absent, excused)

### 4. Mentor Engagement Flags
- **No sessions created** — mentors who have never created a counseling session
- **Inactive mentors** — mentors with no activity in the last 30 days
- **Low engagement** — mentors with < 3 sessions/month
- **Active mentors** — mentors meeting minimum session thresholds

---

## Database Changes

### Migration 1: `create_mentor_login_history`
```sql
CREATE TABLE mentor_login_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES mentors(id) ON DELETE SET NULL,
  login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  session_duration_minutes INT,
  logout_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_login_history_user ON mentor_login_history(user_id);
CREATE INDEX idx_login_history_mentor ON mentor_login_history(mentor_id);
CREATE INDEX idx_login_history_login_at ON mentor_login_history(login_at DESC);

-- RLS
ALTER TABLE mentor_login_history ENABLE ROW LEVEL SECURITY;
-- Mentors see own logins
CREATE POLICY "Mentors view own login history"
  ON mentor_login_history FOR SELECT
  USING (user_id::text = current_setting('app.user_id', true));
-- Admins see institution logins
CREATE POLICY "Admins view institution login history"
  ON mentor_login_history FOR SELECT
  USING (current_setting('app.user_role', true) IN ('admin', 'super_admin'));
-- Service role inserts
CREATE POLICY "Service role insert login history"
  ON mentor_login_history FOR INSERT
  WITH CHECK (true);
```

### Migration 2: `create_session_attendance`
```sql
CREATE TABLE session_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES counseling_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'present', 'absent', 'excused')),
  marked_by UUID REFERENCES users(id),
  marked_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

CREATE INDEX idx_attendance_session ON session_attendance(session_id);
CREATE INDEX idx_attendance_student ON session_attendance(student_id);
CREATE INDEX idx_attendance_status ON session_attendance(status);

-- RLS
ALTER TABLE session_attendance ENABLE ROW LEVEL SECURITY;
-- Mentors see attendance for their sessions
CREATE POLICY "Mentors view own session attendance"
  ON session_attendance FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM counseling_sessions
      WHERE mentor_id IN (
        SELECT id FROM mentors
        WHERE user_id::text = current_setting('app.user_id', true)
      )
    )
  );
-- Service role full access
CREATE POLICY "Service role manage attendance"
  ON session_attendance FOR ALL
  WITH CHECK (true);
```

### Migration 3: `add_mentor_engagement_view`
```sql
-- Materialized view for mentor engagement stats (refreshed periodically)
CREATE OR REPLACE VIEW mentor_engagement_stats AS
SELECT
  m.id AS mentor_id,
  m.user_id,
  u.full_name AS mentor_name,
  m.department_id,
  m.institution_id,

  -- Session counts
  COUNT(DISTINCT cs.id) AS total_sessions,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.status = 'completed') AS completed_sessions,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.status = 'scheduled' AND cs.date >= CURRENT_DATE) AS upcoming_sessions,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.status = 'cancelled') AS cancelled_sessions,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.status = 'scheduled' AND cs.date < CURRENT_DATE) AS overdue_sessions,

  -- Student counts
  COUNT(DISTINCT ms.student_id) AS assigned_students,

  -- Session this month
  COUNT(DISTINCT cs.id) FILTER (
    WHERE cs.created_at >= date_trunc('month', CURRENT_DATE)
  ) AS sessions_this_month,

  -- Last activity
  MAX(cs.created_at) AS last_session_created,
  MAX(mal.created_at) AS last_activity_at,

  -- Login stats
  COUNT(DISTINCT mlh.id) AS total_logins,
  COUNT(DISTINCT mlh.id) FILTER (
    WHERE mlh.login_at >= date_trunc('month', CURRENT_DATE)
  ) AS logins_this_month,
  MAX(mlh.login_at) AS last_login_at,

  -- Engagement level
  CASE
    WHEN COUNT(DISTINCT cs.id) = 0 THEN 'no_sessions'
    WHEN MAX(mal.created_at) < CURRENT_DATE - INTERVAL '30 days' THEN 'inactive'
    WHEN COUNT(DISTINCT cs.id) FILTER (
      WHERE cs.created_at >= date_trunc('month', CURRENT_DATE)
    ) < 3 THEN 'low'
    ELSE 'active'
  END AS engagement_level

FROM mentors m
LEFT JOIN users u ON m.user_id = u.id
LEFT JOIN counseling_sessions cs ON cs.mentor_id = m.id
LEFT JOIN mentor_students ms ON ms.mentor_id = m.id
LEFT JOIN mentor_activity_log mal ON mal.mentor_id = m.id
LEFT JOIN mentor_login_history mlh ON mlh.mentor_id = m.id
GROUP BY m.id, m.user_id, u.full_name, m.department_id, m.institution_id;
```

---

## Service Layer

### `lib/services/mentor/activity.ts` (NEW)
```
Methods:
- getActivityLog(mentorId, filters?) → MentorActivity[]
- getActivityStats(mentorId) → ActivityStats
- getMentorEngagement(mentorId) → EngagementStats
- getLoginHistory(mentorId, limit?) → LoginHistoryEntry[]
- recordLogin(userId, mentorId, ip, userAgent) → void
- getSessionStats(mentorId) → SessionStats
- getMentorsWithNoSessions(institutionId?) → MentorSummary[]
- getInactiveMentors(days?, institutionId?) → MentorSummary[]
```

### `lib/services/mentor/attendance.ts` (NEW)
```
Methods:
- getSessionAttendance(sessionId) → AttendanceRecord[]
- markAttendance(sessionId, studentId, status, markedBy) → void
- bulkMarkAttendance(sessionId, records[]) → void
- getStudentAttendanceStats(mentorId) → StudentAttendanceStats
- getNotYetAttendedStudents(mentorId) → Student[]
```

---

## API Routes

### Activity Routes (NEW)
```
GET  /api/mentor/[id]/activity           → Activity log with pagination + filters
GET  /api/mentor/[id]/activity/stats     → Aggregated activity statistics
GET  /api/mentor/[id]/activity/login     → Login history
GET  /api/mentor/[id]/activity/sessions  → Session statistics breakdown
```

### Attendance Routes (NEW)
```
GET  /api/mentor/[id]/attendance                     → Student attendance overview
POST /api/mentor/[id]/counseling/[sessionId]/attendance → Mark attendance
GET  /api/mentor/[id]/counseling/[sessionId]/attendance → Get session attendance
```

### Admin/Dashboard Routes (NEW)
```
GET  /api/admin/mentors/engagement       → All mentors engagement stats
GET  /api/admin/mentors/inactive         → Mentors with no recent activity
GET  /api/admin/mentors/no-sessions      → Mentors who never created sessions
```

---

## Hooks (NEW)

```typescript
// hooks/mentor/useActivityLog.ts
useActivityLog(mentorId, filters?) → { activities, stats, loading, error, refresh }

// hooks/mentor/useLoginHistory.ts
useLoginHistory(mentorId) → { logins, totalLogins, lastLogin, loading, error }

// hooks/mentor/useSessionStats.ts
useSessionStats(mentorId) → { stats, loading, error }

// hooks/mentor/useSessionAttendance.ts
useSessionAttendance(sessionId) → { attendance, markAttendance, loading, error }

// hooks/admin/useMentorEngagement.ts (admin only)
useMentorEngagement(filters?) → { mentors, inactive, noSessions, loading, error }
```

---

## UI Components

### Mentor Activity Page (`app/(dashboard)/mentor/[id]/activity/page.tsx`)
A dedicated page showing:
1. **Stats Cards Row** — Total sessions, completed, upcoming, cancelled, completion rate, login count
2. **Activity Timeline** — Scrollable timeline of all activities with type icons/colors
3. **Login History Section** — Table of login events with timestamps
4. **Session Breakdown Chart** — Pie/bar chart of session statuses
5. **Student Attendance Summary** — Students who haven't attended sessions

### Components to Build
```
components/mentor/activity/
├── ActivityStatsCards.tsx      — Top-level stat cards
├── ActivityTimeline.tsx        — Chronological activity feed
├── LoginHistoryTable.tsx       — Login events table
├── SessionStatsChart.tsx       — Session status breakdown
├── AttendanceOverview.tsx      — Attendance summary
├── EngagementBadge.tsx         — Shows engagement level (active/low/inactive/no_sessions)
└── MentorEngagementTable.tsx   — Admin view of all mentors engagement
```

### Integration into Existing Pages
- **Mentor Detail Page** (`/mentor/[id]`) — Add "Activity" tab with summary stats
- **Dashboard** — Add mentor engagement overview card for admins
- **Counseling Tab** — Add attendance marking button per session

---

## Types (NEW)

```typescript
// In lib/types/mentor.ts — extend existing

interface LoginHistoryEntry {
  id: string;
  userId: string;
  mentorId: string;
  loginAt: string;
  ipAddress?: string;
  userAgent?: string;
  sessionDurationMinutes?: number;
  logoutAt?: string;
}

interface SessionStats {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  cancelledSessions: number;
  overdueSessions: number;
  completionRate: number;
  sessionsThisMonth: number;
  lastSessionDate?: string;
}

interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  status: 'invited' | 'present' | 'absent' | 'excused';
  markedBy?: string;
  markedAt?: string;
  notes?: string;
}

interface MentorEngagement {
  mentorId: string;
  mentorName: string;
  departmentId: string;
  institutionId: string;
  totalSessions: number;
  completedSessions: number;
  assignedStudents: number;
  totalLogins: number;
  loginsThisMonth: number;
  lastLoginAt?: string;
  lastActivityAt?: string;
  engagementLevel: 'active' | 'low' | 'inactive' | 'no_sessions';
}

type AttendanceStatus = 'invited' | 'present' | 'absent' | 'excused';
```

---

## Implementation Order (Phases)

### Phase 1: Database & Types
1. Create `mentor_login_history` table migration
2. Create `session_attendance` table migration
3. Create `mentor_engagement_stats` view migration
4. Add new TypeScript types

### Phase 2: Service Layer
5. Build `lib/services/mentor/activity.ts`
6. Build `lib/services/mentor/attendance.ts`
7. Integrate login recording into auth flow

### Phase 3: API Routes
8. Build activity API routes
9. Build attendance API routes
10. Build admin engagement routes

### Phase 4: Hooks
11. Build `useActivityLog` hook
12. Build `useLoginHistory` hook
13. Build `useSessionStats` hook
14. Build `useSessionAttendance` hook

### Phase 5: UI Components
15. Build ActivityStatsCards component
16. Build ActivityTimeline component
17. Build LoginHistoryTable component
18. Build SessionStatsChart component
19. Build AttendanceOverview component
20. Build EngagementBadge component
21. Build the Activity page
22. Integrate Activity tab into mentor detail page
23. Add attendance marking to CounselingTab

---

## Auth & Security Considerations

- All new routes use existing `getUserAccess()` pattern
- Login history recording uses admin client (server-side only)
- Attendance marking requires `canManageMentor()` permission
- Admin engagement routes require `admin` or `super_admin` role
- RLS policies on all new tables match existing patterns
- No PII exposure beyond what's already in the system

---

## File Count Estimate

| Layer | New Files | Modified Files |
|-------|-----------|---------------|
| Migrations | 3 | 0 |
| Types | 0 | 1 (mentor.ts) |
| Services | 2 | 1 (counseling.ts) |
| API Routes | ~8 | 0 |
| Hooks | 4-5 | 0 |
| Components | 7 | 2 (page.tsx, CounselingTab) |
| **Total** | **~25** | **~4** |
