# Complete CRUD Operations for Mentor Module

## Overview

This document describes all available CRUD (Create, Read, Update, Delete) operations for the three main tabs in the Mentor Module:

1. **Counseling Sessions** - Full CRUD ✅
2. **IDP (Individual Development Plans)** - Full CRUD ✅
3. **Student Feedback** - Read-only (by design) ℹ️

---

## 1. Counseling Sessions Tab

### Base Routes
- Collection: `/api/mentor/[id]/counseling`
- Individual: `/api/mentor/[id]/counseling/[sessionId]`

### CREATE - Schedule New Session

**Endpoint:** `POST /api/mentor/[id]/counseling`

**Request:**
```typescript
{
  student: {
    id: string;          // Student UUID
    name: string;
    email?: string;
    rollNumber?: string;
  };
  sessionName: string;   // e.g., "Career Guidance Session"
  date: string;          // YYYY-MM-DD
  time: string;          // HH:MM:SS
  notes?: string;
  attachment?: string;   // URL to file
}
```

**Response:**
```typescript
{
  success: true,
  session: CounselingSession,
  message: "Counseling session created successfully"
}
```

**Features:**
- ✅ Creates session in Supabase
- ✅ Automatically creates student feedback record
- ✅ Sends feedback request email to student
- ✅ Generates unique feedback token
- ✅ Fetches real student email from JKKN API

**Example:**
```typescript
const response = await fetch(`/api/mentor/${mentorId}/counseling`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    student: {
      id: 'student-uuid',
      name: 'John Doe',
      email: 'john@example.com'
    },
    sessionName: 'Career Planning Session',
    date: '2025-12-01',
    time: '10:00:00',
    notes: 'Discuss career goals'
  })
});
```

---

### READ - Get All Sessions

**Endpoint:** `GET /api/mentor/[id]/counseling`

**Response:**
```typescript
{
  success: true,
  sessions: CounselingSession[]
}
```

**Features:**
- ✅ Returns all sessions for the mentor
- ✅ Includes student details
- ✅ Includes feedback status
- ✅ Ordered by date (newest first)

**Example:**
```typescript
const response = await fetch(`/api/mentor/${mentorId}/counseling`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const { sessions } = await response.json();
```

---

### UPDATE - Modify Session Details

**Endpoint:** `PUT /api/mentor/[id]/counseling/[sessionId]`

**Request (all fields optional):**
```typescript
{
  sessionName?: string;
  date?: string;         // YYYY-MM-DD
  time?: string;         // HH:MM:SS
  notes?: string;
  attachment?: string;
  status?: 'scheduled' | 'completed' | 'cancelled';
}
```

**Response:**
```typescript
{
  success: true,
  session: CounselingSession,
  message: "Session updated successfully"
}
```

**Features:**
- ✅ Partial updates supported
- ✅ Only updates provided fields
- ✅ Validates ownership (mentor can only update their sessions)
- ✅ Auto-updates `updated_at` timestamp

**Example:**
```typescript
// Reschedule session
await fetch(`/api/mentor/${mentorId}/counseling/${sessionId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    date: '2025-12-05',
    time: '14:00:00',
    notes: 'Rescheduled at student request'
  })
});

// Mark as completed
await fetch(`/api/mentor/${mentorId}/counseling/${sessionId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'completed'
  })
});
```

---

### DELETE - Cancel/Remove Session

**Endpoint:** `DELETE /api/mentor/[id]/counseling/[sessionId]`

**Response:**
```typescript
{
  success: true,
  message: "Session deleted successfully"
}
```

**Features:**
- ✅ Permanently deletes session
- ✅ CASCADE deletes related feedback
- ✅ CASCADE deletes student feedback records
- ✅ Validates ownership before deletion

**Example:**
```typescript
await fetch(`/api/mentor/${mentorId}/counseling/${sessionId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

**⚠️ Warning:** This operation is irreversible. All related data including feedback will be permanently deleted.

---

## 2. IDP (Individual Development Plans) Tab

### Base Routes
- Collection: `/api/idp`
- Individual: `/api/idp/[id]`

### CREATE - New Development Plan

**Endpoint:** `POST /api/idp`

**Request:**
```typescript
{
  mentor_id: string;                    // UUID
  student_id: string;                   // UUID
  area_of_focus: string;
  smart_goal_statement: string;
  target_date: string;                  // YYYY-MM-DD
  knowledge_to_develop?: string[];
  knowledge_development_how?: string[];
  skills_to_gain?: string[];
  skills_development_how?: string[];
  detailed_action_plan?: string;
  status?: 'draft' | 'active' | 'completed';
  progress_percentage?: number;         // 0-100
  milestones?: any[];
  mentor_notes?: string;
  student_feedback?: string;
}
```

**Response:**
```typescript
{
  success: true,
  data: IDPPlan
}
```

**Example:**
```typescript
await fetch('/api/idp', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    mentor_id: 'mentor-uuid',
    student_id: 'student-uuid',
    area_of_focus: 'Technical Skills',
    smart_goal_statement: 'Master React and TypeScript within 3 months',
    target_date: '2026-03-01',
    skills_to_gain: ['React Hooks', 'TypeScript', 'State Management'],
    status: 'draft'
  })
});
```

---

### READ - Get Single Plan

**Endpoint:** `GET /api/idp/[id]`

**Response:**
```typescript
{
  success: true,
  data: IDPPlan
}
```

**Features:**
- ✅ Includes mentor details
- ✅ Includes student details
- ✅ Full plan data with all fields

**Example:**
```typescript
const response = await fetch(`/api/idp/${planId}`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const { data: plan } = await response.json();
```

---

### READ - Get All Plans for Mentor

**Endpoint:** `GET /api/idp?mentorId={mentorId}`

**Response:**
```typescript
{
  success: true,
  data: IDPPlan[]
}
```

---

### UPDATE - Modify Plan

**Endpoint:** `PUT /api/idp/[id]`

**Request (all fields optional):**
```typescript
{
  area_of_focus?: string;
  smart_goal_statement?: string;
  target_date?: string;
  knowledge_to_develop?: string[];
  knowledge_development_how?: string[];
  skills_to_gain?: string[];
  skills_development_how?: string[];
  detailed_action_plan?: string;
  status?: 'draft' | 'active' | 'completed';
  progress_percentage?: number;
  milestones?: any[];
  mentor_notes?: string;
  student_feedback?: string;
}
```

**Response:**
```typescript
{
  success: true,
  data: IDPPlan
}
```

**Features:**
- ✅ Partial updates supported
- ✅ Auto-sets `completed_at` when status changes to 'completed'
- ✅ Updates `updated_at` timestamp

**Example:**
```typescript
// Update progress
await fetch(`/api/idp/${planId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    progress_percentage: 75,
    mentor_notes: 'Great progress on React Hooks!'
  })
});

// Mark as completed
await fetch(`/api/idp/${planId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'completed',
    progress_percentage: 100
  })
});
```

---

### DELETE - Remove Plan

**Endpoint:** `DELETE /api/idp/[id]`

**Response:**
```typescript
{
  success: true,
  message: "Plan deleted successfully"
}
```

**Example:**
```typescript
await fetch(`/api/idp/${planId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

---

## 3. Student Feedback Tab

### Base Route
- `/api/mentor/[id]/feedback`

### READ ONLY - Get All Feedback

**Endpoint:** `GET /api/mentor/[id]/feedback`

**Response:**
```typescript
{
  success: true,
  feedback: StudentFeedback[],
  stats: StudentFeedbackStats
}
```

**Feedback Object:**
```typescript
{
  id: string;
  session_id: string;
  student_id: string;
  mentor_id: string;
  session_helpfulness_rating: number;      // 1-5
  mentor_approachability_rating: number;   // 1-5
  concerns_addressed: boolean;
  what_helped?: string;
  what_could_improve?: string;
  additional_comments?: string;
  email_sent_at?: string;
  submitted_at?: string;
  is_anonymous: boolean;
  student?: {
    id: string;
    name: string;
    email: string;
    roll_number: string;
  };
  session?: {
    id: string;
    session_name: string;
    date: string;
    time: string;
  };
}
```

**Stats Object:**
```typescript
{
  total_responses: number;
  response_rate: number;                    // Percentage
  avg_helpfulness: number;                  // 1-5
  avg_approachability: number;              // 1-5
  concerns_addressed_count: number;
  concerns_addressed_percentage: number;
}
```

**Example:**
```typescript
const response = await fetch(`/api/mentor/${mentorId}/feedback`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const { feedback, stats } = await response.json();

console.log(`Response Rate: ${stats.response_rate}%`);
console.log(`Average Helpfulness: ${stats.avg_helpfulness}/5`);
```

---

### Why Student Feedback is Read-Only

Student feedback is **intentionally read-only** for mentors because:

1. **Data Integrity** - Feedback is submitted by students via unique tokens
2. **Trust** - Students must trust their feedback won't be altered
3. **Accountability** - Original feedback must remain unmodified
4. **Audit Trail** - No retrospective changes allowed

**How Students Submit Feedback:**
1. Mentor creates counseling session → Email sent to student
2. Student receives email with unique feedback link
3. Student clicks link → Opens feedback form (no login required)
4. Student submits feedback → Stored in database
5. Mentor views aggregated feedback (read-only)

---

## Error Handling

All endpoints follow consistent error response format:

```typescript
{
  error: string;        // Human-readable error message
  details?: string;     // Technical details (development only)
}
```

### Common Error Codes

| Code | Meaning | Typical Cause |
|------|---------|---------------|
| `401` | Unauthorized | Missing or invalid auth token |
| `404` | Not Found | Resource doesn't exist or access denied |
| `500` | Server Error | Database error, see logs |

**Example Error Handling:**
```typescript
try {
  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  const data = await response.json();
  return data;
} catch (error) {
  console.error('API Error:', error.message);
  toast.error(error.message);
}
```

---

## Frontend Integration Examples

### Counseling Session Management

```typescript
// Complete CRUD example
class CounselingService {
  constructor(private mentorId: string, private token: string) {}

  async getSessions() {
    const res = await fetch(`/api/mentor/${this.mentorId}/counseling`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return res.json();
  }

  async createSession(sessionData: any) {
    const res = await fetch(`/api/mentor/${this.mentorId}/counseling`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sessionData)
    });
    return res.json();
  }

  async updateSession(sessionId: string, updates: any) {
    const res = await fetch(`/api/mentor/${this.mentorId}/counseling/${sessionId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    return res.json();
  }

  async deleteSession(sessionId: string) {
    const res = await fetch(`/api/mentor/${this.mentorId}/counseling/${sessionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return res.json();
  }
}

// Usage
const service = new CounselingService(mentorId, accessToken);

// Create
const newSession = await service.createSession({
  student: { id: 'uuid', name: 'John' },
  sessionName: 'Career Guidance',
  date: '2025-12-01',
  time: '10:00:00'
});

// Read
const sessions = await service.getSessions();

// Update
await service.updateSession(sessionId, {
  status: 'completed',
  notes: 'Session went well'
});

// Delete
await service.deleteSession(sessionId);
```

---

## Database Schema Reference

### counseling_sessions
```sql
CREATE TABLE counseling_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  notes TEXT,
  attachment_url TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### individual_development_plans
```sql
CREATE TABLE individual_development_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  area_of_focus TEXT NOT NULL,
  smart_goal_statement TEXT NOT NULL,
  target_date DATE NOT NULL,
  knowledge_to_develop TEXT[],
  knowledge_development_how TEXT[],
  skills_to_gain TEXT[],
  skills_development_how TEXT[],
  detailed_action_plan TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  milestones JSONB,
  mentor_notes TEXT,
  student_feedback TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### student_feedback
```sql
CREATE TABLE student_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES counseling_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  session_helpfulness_rating INTEGER CHECK (session_helpfulness_rating >= 1 AND session_helpfulness_rating <= 5),
  mentor_approachability_rating INTEGER CHECK (mentor_approachability_rating >= 1 AND mentor_approachability_rating <= 5),
  concerns_addressed BOOLEAN,
  what_helped TEXT,
  what_could_improve TEXT,
  additional_comments TEXT,
  feedback_token TEXT UNIQUE NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  email_sent_at TIMESTAMPTZ,
  email_opened_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);
```

---

## Summary

| Feature | Counseling Sessions | IDP | Student Feedback |
|---------|-------------------|-----|------------------|
| **CREATE** | ✅ POST /api/mentor/[id]/counseling | ✅ POST /api/idp | ❌ (Students only) |
| **READ** | ✅ GET /api/mentor/[id]/counseling | ✅ GET /api/idp/[id] | ✅ GET /api/mentor/[id]/feedback |
| **UPDATE** | ✅ PUT /api/mentor/[id]/counseling/[sessionId] | ✅ PUT /api/idp/[id] | ❌ (Read-only) |
| **DELETE** | ✅ DELETE /api/mentor/[id]/counseling/[sessionId] | ✅ DELETE /api/idp/[id] | ❌ (Protected) |

**All operations are now fully implemented and tested!** ✅

---

## API Route Files Reference

### Counseling Sessions
- **Collection:** [app/api/mentor/[id]/counseling/route.ts](../app/api/mentor/[id]/counseling/route.ts)
  - `POST` - Create new session
  - `GET` - Get all sessions for mentor

- **Individual:** [app/api/mentor/[id]/counseling/[sessionId]/route.ts](../app/api/mentor/[id]/counseling/[sessionId]/route.ts)
  - `PUT` - Update session
  - `DELETE` - Delete session

### IDP Plans
- **Collection:** [app/api/idp/route.ts](../app/api/idp/route.ts)
  - `POST` - Create new plan
  - `GET` - Get all plans (with mentor filter)

- **Individual:** [app/api/idp/[id]/route.ts](../app/api/idp/[id]/route.ts)
  - `GET` - Get single plan
  - `PUT` - Update plan
  - `DELETE` - Delete plan

### Student Feedback
- **Read-Only:** [app/api/mentor/[id]/feedback/route.ts](../app/api/mentor/[id]/feedback/route.ts)
  - `GET` - Get all feedback for mentor (with stats)

---

**Last Updated:** 2025-11-20
**Version:** 1.0.0
**Status:** Production Ready
