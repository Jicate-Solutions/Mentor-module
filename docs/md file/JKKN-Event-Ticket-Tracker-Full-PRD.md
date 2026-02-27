# PRD: JKKN Event Ticket Tracker — Complete Technical Specification

**Version:** 2.1
**Created:** February 21, 2026
**Author:** JKKN Product Team
**Status:** [x] Ready for Build  [ ] In Progress  [ ] Complete
**Companion Document:** `ticket verifier.md` (Core product spec — user stories, flows, wireframes, edge cases)

---

> **How to read this PRD:**
> This document is the **technical integration companion** to the core product PRD (`ticket verifier.md`). It covers everything the core PRD marked as "TBD" — specifically the JKKN Auth System, JKKN Learner API, database schema, and architectural decisions. **Read both documents together** for the complete picture.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [JKKN Authentication System Integration](#2-jkkn-authentication-system-integration)
3. [JKKN Learner API Integration](#3-jkkn-learner-api-integration)
4. [Database Schema (Supabase)](#4-database-schema-supabase)
5. [API Routes Specification](#5-api-routes-specification)
6. [Role-Based Access Control](#6-role-based-access-control)
7. [Real-Time System (Supabase Realtime)](#7-real-time-system-supabase-realtime)
8. [Ticket Allocation Engine](#8-ticket-allocation-engine)
9. [Data Strategy & Caching](#9-data-strategy--caching)
10. [Environment Variables & Configuration](#10-environment-variables--configuration)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Interview Decisions Log](#12-interview-decisions-log)
13. [Open Questions Resolved](#13-open-questions-resolved)

---

## 1. Architecture Overview

### 1.1 System Context Diagram

```
                         +-------------------+
                         |   auth.jkkn.ai    |
                         |  (OAuth 2.0 Server)|
                         +--------+----------+
                                  |
                    OAuth Code Flow (authorize → token → validate)
                                  |
+------------------+    +---------v-----------+    +-------------------+
|                  |    |                     |    |                   |
|   Learner        +--->+  Event Ticket       +--->+  www.jkkn.ai/api  |
|   (Mobile/Web)   |    |  Tracker App        |    |  (Learner API)    |
|                  |    |  (Next.js on Vercel)|    |                   |
+------------------+    +---------+-----------+    +-------------------+
                                  |
+------------------+              |
|   Admin          +--------------+
|   (Desktop/Web)  |              |
+------------------+    +---------v-----------+
                        |  Supabase Project:  |
                        |  "evntly-platform"  |
                        |                     |
                        |  ┌───────────────┐  |
                        |  │ evntly schema  │  |  ← Evntly parent platform
                        |  │ (Evntly auth) │  |
                        |  └───────────────┘  |
                        |  ┌───────────────┐  |
                        |  │ticket_tracker │  |  ← This app (JKKN Auth)
                        |  │   schema      │  |
                        |  └───────────────┘  |
                        +---------------------+
```

### 1.2 Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js (App Router) | 16+ | Turbopack enabled |
| Runtime | React | 19+ | Server + Client Components |
| Language | TypeScript | 5+ | Strict mode |
| Database | Supabase (PostgreSQL) | Latest | **Shared Evntly Supabase project** — uses `ticket_tracker` schema |
| Auth | JKKN OAuth 2.0 | — | External auth server at `auth.jkkn.ai` |
| External API | MyJKKN Learner API | — | `www.jkkn.ai/api` for learner data |
| Styling | Tailwind CSS + shadcn/ui | v4 / Latest | Consistent with JKKN design system |
| Hosting | Vercel | — | Separate Vercel deployment |
| Real-time | Supabase Realtime | — | Channel subscriptions for live dashboard |
| Icons | Lucide React | Latest | — |
| Date handling | date-fns | 4+ | — |
| Forms | React Hook Form | Latest | — |
| Notifications | react-hot-toast | Latest | — |

### 1.3 Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Infrastructure | Shared Supabase (Evntly project), separate schema (`ticket_tracker`), separate Vercel deployment | Same database instance as Evntly parent platform. Schema isolation prevents table conflicts. Evntly uses `evntly` schema with its own auth; Ticket Tracker uses `ticket_tracker` schema with JKKN Auth. |
| Auth pattern | Same OAuth flow, **new APP_ID** | Separate app identity on `auth.jkkn.ai`. Own redirect URI. |
| Role gating | Allow ALL JKKN roles | Students see learner view, staff see admin view. Role determines UI, not access. |
| Learner data | **Hybrid**: fresh fetch for allocation, local cache for search | Allocation accuracy requires fresh data. Search needs speed. |
| Real-time | Supabase Realtime subscriptions | Proven pattern from Mentor Module. Instant dashboard updates. |
| RSVP finality | Truly final, no exceptions | No admin override, no edits. Clean and simple. |
| Event scope | Cross-institution | An event can include learners from multiple JKKN institutions. |
| Ticket allocation | Synchronous with progress bar | One-time action per event. User waits and sees progress. |
| Ticket identity | Generic numbered passes | Tickets are not labeled per parent. RSVP separately tracks Mother/Father. |
| User matching | Match by JKKN user ID (primary) + email fallback | Same proven pattern from Mentor Module |

---

## 2. JKKN Authentication System Integration

### 2.1 OAuth 2.0 Flow (Authorization Code Grant)

The Event Ticket Tracker uses the **same OAuth 2.0 Authorization Code flow** as the Mentor Module, but with a **separate client registration** on `auth.jkkn.ai`.

#### Flow Diagram

```
Learner/Admin                    Event Ticket Tracker               auth.jkkn.ai
    |                                    |                              |
    |  1. Click "Login"                  |                              |
    |----------------------------------->|                              |
    |                                    |                              |
    |  2. Redirect to auth.jkkn.ai       |                              |
    |    /authorize?                     |                              |
    |    client_id={EVENT_APP_ID}        |                              |
    |    redirect_uri={APP_URL}/callback |                              |
    |    scope=read+write+profile        |                              |
    |    state={random_csrf_token}       |                              |
    |<-----------------------------------+----------------------------->|
    |                                    |                              |
    |  3. User authenticates on JKKN     |                              |
    |-------------------------------------------------------------->   |
    |                                    |                              |
    |  4. Redirect back with code        |                              |
    |    /callback?code={auth_code}      |                              |
    |    &state={csrf_token}             |                              |
    |<--------------------------------------------------------------   |
    |                                    |                              |
    |  5. Exchange code for tokens       |                              |
    |----------------------------------->|                              |
    |                                    |  POST /api/auth/token        |
    |                                    |  { code, app_id, api_key }   |
    |                                    |----------------------------->|
    |                                    |                              |
    |                                    |  { access_token,             |
    |                                    |    refresh_token,            |
    |                                    |    expires_in, user }        |
    |                                    |<-----------------------------|
    |                                    |                              |
    |  6. Store session + cookies        |                              |
    |                                    |  Upsert user in Supabase     |
    |                                    |  Set HTTP-only cookies       |
    |                                    |  Store in localStorage       |
    |<-----------------------------------|                              |
    |                                    |                              |
    |  7. Redirect to role-based route   |                              |
    |    Admin → /admin/events           |                              |
    |    Learner → /events               |                              |
    |<-----------------------------------|                              |
```

### 2.2 Auth Server Endpoints (External — auth.jkkn.ai)

| Endpoint | Method | Purpose | Request | Response |
|----------|--------|---------|---------|----------|
| `/authorize` | GET (redirect) | Initiate OAuth flow | `client_id`, `redirect_uri`, `scope`, `state`, `response_type=code` | Redirects to login page, then back with `code` |
| `/api/auth/token` | POST | Exchange code for tokens | `{ code, app_id, api_key, grant_type: "authorization_code" }` | `{ access_token, refresh_token, expires_in, token_type, scope, user }` |
| `/api/auth/token` | POST | Refresh expired token | `{ refresh_token, app_id, api_key, grant_type: "refresh_token" }` | `{ access_token, refresh_token, expires_in, ... }` |
| `/api/auth/validate` | POST | Validate access token | `{ access_token, child_app_id }` | `{ valid: boolean, user?: JKKNUser, error?: string }` |

### 2.3 JKKN User Object (from Auth Server)

The auth server returns a `user` object after token exchange and validation:

```typescript
interface JKKNUser {
  id: string;              // JKKN unique user ID (primary identifier)
  email: string;           // User's email address
  full_name: string;       // Display name
  role: string;            // JKKN role (see Section 6)
  institution_id?: string; // Institution UUID (from JKKN system)
  department_id?: string;  // Department UUID (from JKKN system)
  phone_number?: string;   // Optional
  gender?: string;         // Optional
  designation?: string;    // For staff users
  avatar_url?: string;     // Profile picture URL
  profile_completed?: boolean;
}
```

**JKKN Roles returned by auth server:**

| Role | Type | Access in This App |
|------|------|-------------------|
| `super_admin` | Staff | Admin view — all institutions |
| `administrator` | Staff | Admin view — all institutions |
| `digital_coordinator` | Staff | Admin view — scoped to institution |
| `principal` | Staff | Admin view — scoped to institution |
| `hod` | Staff | Admin view — scoped to institution/department |
| `faculty` | Staff | Admin view — scoped to institution/department |
| `student` | Learner | Learner view — own tickets only |
| `staff` | Staff | Admin view — scoped to institution |

### 2.4 Token Management

#### Storage Strategy (Client-Side)

| Storage | Key | Purpose |
|---------|-----|---------|
| `localStorage` | `access_token` | API calls from client components |
| `localStorage` | `refresh_token` | Token refresh |
| `localStorage` | `user` | User profile JSON |
| `localStorage` | `token_expires_at` | Timestamp for auto-refresh |
| `localStorage` | `session_id` | Session tracking |
| HTTP-only Cookie | `access_token` | Server-side auth (API routes) |
| HTTP-only Cookie | `refresh_token` | Server-side token refresh |

#### Token Lifecycle

```
Token expires_in: ~3600 seconds (1 hour typical)
Refresh buffer: 5 minutes before expiry → auto-refresh
Refresh token lifetime: 30 days (cookie maxAge)
Validation cache: 15 minutes (server-side)
Failed validation cache: 10 seconds (prevent retry storms)
Timeout grace period: 1 minute (use expired cache during auth server outage)
```

#### Token Validation (Server-Side)

Every API route call validates the token:

1. Extract `access_token` from `Authorization: Bearer {token}` header OR HTTP-only cookie
2. Check validation cache (15-minute TTL)
3. If cache miss → POST to `auth.jkkn.ai/api/auth/validate`
4. Cache result
5. Look up user in local `users` table by `jkkn_user_id`
6. Fallback: look up by `email` if JKKN ID changed (handles ID migrations)

### 2.5 Auth Module Files (to implement)

```
lib/
  auth/
    config.ts              # Auth configuration (server URL, APP_ID, redirect URI)
    token-validation.ts    # Token validate, refresh, cache, expiry utilities
    get-current-user.ts    # getCurrentUser(), requireAuth(), requireRole()

app/
  login/
    page.tsx               # Login page — redirect to auth.jkkn.ai
  callback/
    page.tsx               # OAuth callback — exchange code, store session
  api/
    token/
      route.ts             # POST: exchange auth code for tokens (server-side)
    auth/
      store-session/
        route.ts           # POST: upsert user in Supabase, create session, set cookies
      refresh/
        route.ts           # POST: refresh expired access token
      logout/
        route.ts           # POST: clear session, cookies, redirect to login
      validate/
        route.ts           # POST: validate current token (for client health checks)

components/
  providers/
    AuthProvider.tsx        # Context provider — manages auth state, auto-refresh
```

### 2.6 Auth Configuration

```typescript
// lib/auth/config.ts
export const authConfig = {
  authServerUrl: process.env.NEXT_PUBLIC_AUTH_SERVER_URL || 'https://auth.jkkn.ai',
  clientId: process.env.NEXT_PUBLIC_APP_ID || '',          // NEW APP_ID for Event Ticket Tracker
  redirectUri: getRedirectUri(),                            // {APP_URL}/callback
  apiKey: process.env.API_KEY || '',                        // Server-side only
  scopes: 'read write profile',
  tokenExpiryBuffer: 5 * 60 * 1000, // 5 minutes
} as const;
```

### 2.7 Role-Based Routing After Auth

```typescript
// After successful authentication:
function getDefaultRouteForRole(role: string): string {
  // Admin roles → Admin event management
  const adminRoles = ['super_admin', 'administrator', 'digital_coordinator',
                      'principal', 'hod', 'faculty', 'staff'];
  if (adminRoles.includes(role)) {
    return '/admin/events';
  }

  // Student/learner roles → Learner event view
  if (role === 'student') {
    return '/events';
  }

  // Fallback
  return '/events';
}
```

---

## 3. JKKN Learner API Integration

### 3.1 API Overview

| Property | Value |
|----------|-------|
| Base URL | `https://www.jkkn.ai/api` (via `NEXT_PUBLIC_MYJKKN_BASE_URL`) |
| Authentication | Bearer token: `Authorization: Bearer {MYJKKN_API_KEY}` |
| API Key Location | Server-side only (`NEXT_PUBLIC_MYJKKN_API_KEY` — despite the name, used server-side) |
| Max items per page | **200** (hard limit from JKKN API) |
| Response format | `{ data: T[], pagination: { page, totalPages, total } }` |

### 3.2 Endpoints Used by Event Ticket Tracker

#### 3.2.1 Learner Profiles (Primary — for ticket allocation + search)

```
GET /api-management/learners/profiles
  ?lifecycle_status=active
  &page={page}
  &limit={limit}  (max 200)
  &institution_id={institution_id}  (optional filter)
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid-string",
      "first_name": "Ramesh",
      "last_name": "Kumar",
      "roll_number": "22PH045",
      "email": "ramesh@jkkn.ac.in",
      "institution": {
        "id": "inst-uuid",
        "name": "JKKN College of Pharmacy"
      },
      "department": {
        "id": "dept-uuid",
        "name": "B.Pharm"
      },
      "program": {
        "id": "prog-uuid",
        "name": "Bachelor of Pharmacy"
      },
      "is_profile_complete": true
    }
  ],
  "pagination": {
    "page": 1,
    "totalPages": 25,
    "total": 5000
  }
}
```

**Important Notes:**
- The `id` field in the learner API response is the **learner profile ID**, NOT the JKKN auth user ID
- To match an authenticated user to their learner record, match by `email` (auth user email → learner email) or by a linked `user_id` field if available
- The API may return nested objects (`institution`, `department`, `program`) OR flat strings — handle both formats

#### 3.2.2 Institutions (for event creation — institution picker)

```
GET /api-management/institutions
  ?page={page}
  &limit={limit}
```

**Response:**
```json
{
  "data": [
    {
      "id": "inst-uuid",
      "name": "JKKN College of Pharmacy",
      "counselling_code": "1234",
      "category": "Engineering",
      "institution_type": "College",
      "is_active": true
    }
  ],
  "metadata": { "page": 1, "totalPages": 1, "total": 7 }
}
```

#### 3.2.3 Departments (for filtering in admin dashboard)

```
GET /api-management/departments
  ?page={page}
  &limit={limit}
```

### 3.3 API Proxy Pattern (Server-Side Only)

The API key is **never exposed to the client**. All JKKN API calls go through Next.js API routes:

```
Client → /api/jkkn/students?page=1&limit=200  →  Next.js API Route  →  www.jkkn.ai/api/...
                                                   (injects Bearer token)
```

### 3.4 Learner API Module Files (to implement)

```
lib/
  api/
    jkkn-api.ts            # Client-side typed fetch functions
    jkkn-types.ts          # TypeScript interfaces for all JKKN entities

app/
  api/
    jkkn/
      students/
        route.ts           # GET: Proxy learner profiles with pagination
      institutions/
        route.ts           # GET: Proxy institution list
        [id]/
          route.ts         # GET: Single institution
      departments/
        route.ts           # GET: Proxy department list
      test-connection/
        route.ts           # GET: Health check for JKKN API
```

### 3.5 Bulk Fetch Strategy for Ticket Allocation

When an admin creates an event, the system must fetch ALL learners across the selected institutions. Given the 200-per-page limit:

```
Total learners: ~5,000 (across 7 institutions)
Pages needed: 25 (5,000 / 200)
Estimated time: ~15-30 seconds (25 sequential API calls)
```

**Algorithm:**

```
1. Admin selects institutions for event
2. System starts sequential page fetches:
   - Page 1: GET /learners/profiles?page=1&limit=200&institution_id={ids}
   - Page 2: GET /learners/profiles?page=2&limit=200&institution_id={ids}
   - ...continue until page.data.length < 200 OR page >= totalPages
3. Progress UI: "Fetching learners... {currentCount} of ~{estimatedTotal}"
4. Collect all learners into array
5. Sort by roll_number ascending
6. Allocate 2 sequential tickets per learner
7. Bulk insert tickets into Supabase
8. Progress UI: "Allocating tickets... {allocated} of {total}"
```

**Safety limits:**
- Max pages: 75 (75 x 200 = 15,000 learners max)
- Request timeout: 10 seconds per API call
- Overall allocation timeout: 120 seconds
- If JKKN API returns 404: show error, do not fallback to stale data (unlike Mentor Module)

### 3.6 Learner-to-User Matching Strategy

When a learner authenticates via JKKN Auth and needs to see their tickets:

```
Auth token → user.id (JKKN user ID) + user.email
                ↓
Local DB lookup: SELECT * FROM users WHERE jkkn_user_id = {user.id}
                ↓ (if not found)
Fallback: SELECT * FROM users WHERE email = {user.email}
                ↓
Get learner's tickets: SELECT * FROM tickets
                       WHERE learner_jkkn_id = {user.jkkn_user_id}
                       OR learner_email = {user.email}
```

**During ticket allocation, store BOTH identifiers:**
- `learner_jkkn_id` — from JKKN Learner API `id` field (if it maps to auth user ID)
- `learner_email` — from JKKN Learner API `email` field (reliable fallback)
- `learner_roll_number` — for display and admin search

---

## 4. Database Schema (Supabase — `ticket_tracker` Schema)

### 4.0 Schema Isolation Strategy

This app lives inside the **Evntly Supabase project** but uses a **dedicated PostgreSQL schema** called `ticket_tracker`. This keeps all Ticket Tracker tables completely separate from Evntly's own tables.

```
Supabase Project: "evntly-platform"
│
├── evntly schema              ← Evntly parent platform
│   ├── users                    (Evntly's own auth system)
│   ├── events                   (Evntly event data)
│   └── ...                      (Evntly-specific tables)
│
├── ticket_tracker schema      ← THIS APP (JKKN Event Ticket Tracker)
│   ├── users                    (JKKN-authenticated users)
│   ├── user_sessions            (Auth sessions)
│   ├── events                   (Ticket events)
│   ├── event_institutions       (Cross-institution scope)
│   ├── learner_cache            (Cached JKKN learner data)
│   ├── tickets                  (Allocated passes)
│   └── rsvp_responses           (Learner RSVPs)
│
└── public schema              ← Shared/default (avoid using)
```

**Schema setup migration (run once):**

```sql
-- Create the ticket_tracker schema
CREATE SCHEMA IF NOT EXISTS ticket_tracker;

-- Grant usage to Supabase roles
GRANT USAGE ON SCHEMA ticket_tracker TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA ticket_tracker TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA ticket_tracker
  GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- Enable Realtime for the schema
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_tracker.rsvp_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_tracker.events;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_tracker.tickets;
```

**Supabase client configuration (in Next.js app):**

```typescript
// lib/supabase/client.ts — Client-side
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'ticket_tracker' },  // ← All queries target ticket_tracker schema
    }
  );
}

// lib/supabase/server.ts — Server-side (admin)
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: 'ticket_tracker' },  // ← All queries target ticket_tracker schema
    }
  );
}
```

**Key benefits of schema isolation:**
- `ticket_tracker.users` and `evntly.users` are completely independent tables
- No naming conflicts — both schemas can have a `users` table, `events` table, etc.
- RLS policies are per-table, so each schema has independent security
- Supabase Realtime works across schemas (specify schema in subscription)
- Can query cross-schema if ever needed (e.g., `SELECT * FROM evntly.users`)
- One Supabase bill, one project to manage

### 4.1 Entity Relationship Diagram

```
users (1) ────────── (N) events           [Admin creates events]
                          |
                          | (1)
                          |
                          (N)
events (1) ────────── (N) event_institutions  [Cross-institution scope]
                          |
events (1) ────────── (N) tickets          [Auto-allocated passes]
                          |
                          | (N)
                          |
                          (1)
tickets (N) ───────── (1) learner_cache    [Cached learner data]
                          |
events (1) ────────── (N) rsvp_responses   [Mother/Father Yes/No]
                          |
                          | (N)
                          |
                          (1)
users (1) ─────────── (N) rsvp_responses   [Learner submits RSVP]
```

### 4.2 Table Definitions

#### `ticket_tracker.users` — Authenticated users (admin + learner)

```sql
CREATE TABLE ticket_tracker.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jkkn_user_id TEXT UNIQUE NOT NULL,     -- From JKKN Auth
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,                      -- JKKN role (student, faculty, hod, etc.)
  institution_id TEXT,                     -- From JKKN Auth user profile
  department_id TEXT,
  phone_number TEXT,
  gender TEXT,
  designation TEXT,                        -- For staff users
  avatar_url TEXT,
  is_super_admin BOOLEAN DEFAULT false,
  profile_completed BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_users_jkkn_id ON users(jkkn_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_institution ON users(institution_id);
```

#### `ticket_tracker.user_sessions` — Active auth sessions

```sql
CREATE TABLE ticket_tracker.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(access_token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
```

#### `ticket_tracker.events` — Event records

```sql
CREATE TABLE ticket_tracker.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  venue TEXT NOT NULL,
  ticket_pool_total INTEGER NOT NULL CHECK (ticket_pool_total >= 1 AND ticket_pool_total <= 8000),
  tickets_allocated INTEGER DEFAULT 0,
  tickets_remaining INTEGER DEFAULT 0,
  learners_fetched INTEGER DEFAULT 0,          -- Total learners from JKKN API
  allocation_status TEXT DEFAULT 'pending'      -- pending | in_progress | completed | failed
    CHECK (allocation_status IN ('pending', 'in_progress', 'completed', 'failed')),
  rsvp_open BOOLEAN DEFAULT true,              -- Can learners still respond?
  created_by UUID NOT NULL REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT false,            -- Soft delete
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_active ON events(is_deleted, rsvp_open);
```

#### `ticket_tracker.event_institutions` — Cross-institution event scope

```sql
CREATE TABLE ticket_tracker.event_institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  institution_id TEXT NOT NULL,                -- JKKN institution ID
  institution_name TEXT,                       -- Cached name for display
  learner_count INTEGER DEFAULT 0,            -- Learners from this institution
  UNIQUE(event_id, institution_id)
);

CREATE INDEX idx_event_inst_event ON event_institutions(event_id);
CREATE INDEX idx_event_inst_institution ON event_institutions(institution_id);
```

#### `ticket_tracker.learner_cache` — Cached learner data from JKKN API (for search/display)

```sql
CREATE TABLE ticket_tracker.learner_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jkkn_learner_id TEXT NOT NULL,              -- Learner profile ID from JKKN API
  email TEXT,                                  -- For user matching
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  roll_number TEXT NOT NULL,
  institution_id TEXT,
  institution_name TEXT,
  department_id TEXT,
  department_name TEXT,
  program_name TEXT,
  year TEXT,
  section TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(jkkn_learner_id)
);

CREATE INDEX idx_learner_cache_email ON learner_cache(email);
CREATE INDEX idx_learner_cache_roll ON learner_cache(roll_number);
CREATE INDEX idx_learner_cache_institution ON learner_cache(institution_id);
CREATE INDEX idx_learner_cache_search ON learner_cache
  USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || roll_number));
```

#### `ticket_tracker.tickets` — Allocated ticket passes

```sql
CREATE TABLE ticket_tracker.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_number INTEGER NOT NULL,             -- Sequential: 1, 2, 3... (displayed as #0001)
  learner_cache_id UUID REFERENCES learner_cache(id),
  learner_email TEXT,                          -- For matching with auth user
  learner_roll_number TEXT,                    -- For display and search
  learner_name TEXT,                           -- Cached display name
  pass_index SMALLINT NOT NULL CHECK (pass_index IN (1, 2)),  -- Pass 1 or Pass 2 for this learner
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, ticket_number)
);

CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_learner_email ON tickets(learner_email);
CREATE INDEX idx_tickets_learner_roll ON tickets(learner_roll_number);
CREATE INDEX idx_tickets_event_learner ON tickets(event_id, learner_email);
```

#### `ticket_tracker.rsvp_responses` — Learner RSVP submissions

```sql
CREATE TABLE ticket_tracker.rsvp_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),   -- Authenticated learner
  learner_email TEXT NOT NULL,                    -- For matching with tickets
  mother_attending BOOLEAN NOT NULL,              -- Yes/No
  father_attending BOOLEAN NOT NULL,              -- Yes/No
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)                       -- One response per learner per event
);

CREATE INDEX idx_rsvp_event ON rsvp_responses(event_id);
CREATE INDEX idx_rsvp_user ON rsvp_responses(user_id);
CREATE INDEX idx_rsvp_event_email ON rsvp_responses(event_id, learner_email);
```

### 4.3 Row Level Security (RLS) Policies

```sql
-- Events: admins can CRUD, learners can read active events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage events"
  ON events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'administrator', 'principal',
                         'hod', 'faculty', 'digital_coordinator', 'staff')
    )
  );

CREATE POLICY "Learners can view active events"
  ON events FOR SELECT
  USING (is_deleted = false AND rsvp_open = true);

-- Tickets: admins see all, learners see own
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tickets"
  ON tickets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role != 'student'
    )
  );

CREATE POLICY "Learners see own tickets"
  ON tickets FOR SELECT
  USING (
    learner_email = (
      SELECT email FROM users WHERE id = auth.uid()
    )
  );

-- RSVP: learners can insert own, admins can read all
ALTER TABLE rsvp_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can submit own RSVP"
  ON rsvp_responses FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Learners can view own RSVP"
  ON rsvp_responses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all RSVPs"
  ON rsvp_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role != 'student'
    )
  );
```

### 4.4 Database Functions

```sql
-- Function: Get event summary counts (optimized single query)
CREATE OR REPLACE FUNCTION get_event_summary(p_event_id UUID)
RETURNS TABLE (
  total_pool INTEGER,
  tickets_allocated INTEGER,
  tickets_remaining INTEGER,
  confirmed_guests BIGINT,
  declined_count BIGINT,
  pending_responses BIGINT,
  total_learners BIGINT,
  responded_learners BIGINT,
  response_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.ticket_pool_total AS total_pool,
    e.tickets_allocated,
    e.tickets_remaining,
    COALESCE(SUM(CASE WHEN r.mother_attending THEN 1 ELSE 0 END) +
             SUM(CASE WHEN r.father_attending THEN 1 ELSE 0 END), 0) AS confirmed_guests,
    COALESCE(SUM(CASE WHEN NOT r.mother_attending THEN 1 ELSE 0 END) +
             SUM(CASE WHEN NOT r.father_attending THEN 1 ELSE 0 END), 0) AS declined_count,
    (e.tickets_allocated / 2 - COUNT(r.id)) * 2 AS pending_responses,
    (e.tickets_allocated / 2)::BIGINT AS total_learners,
    COUNT(r.id) AS responded_learners,
    CASE WHEN e.tickets_allocated > 0
      THEN ROUND((COUNT(r.id)::NUMERIC / (e.tickets_allocated / 2)) * 100, 1)
      ELSE 0
    END AS response_rate
  FROM events e
  LEFT JOIN rsvp_responses r ON r.event_id = e.id
  WHERE e.id = p_event_id
  GROUP BY e.id, e.ticket_pool_total, e.tickets_allocated, e.tickets_remaining;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. API Routes Specification

### 5.1 Auth Routes

| Route | Method | Purpose | Auth Required |
|-------|--------|---------|--------------|
| `/api/token` | POST | Exchange auth code for tokens | No (code is the auth) |
| `/api/auth/store-session` | POST | Upsert user, create session, set cookies | No (called during auth flow) |
| `/api/auth/refresh` | POST | Refresh expired access token | Refresh token |
| `/api/auth/logout` | POST | Clear session and cookies | Yes |
| `/api/auth/validate` | POST | Check if current token is valid | Yes |

### 5.2 JKKN Proxy Routes

| Route | Method | Purpose | Auth Required |
|-------|--------|---------|--------------|
| `/api/jkkn/students` | GET | Fetch learner profiles (paginated) | Yes (admin) |
| `/api/jkkn/institutions` | GET | Fetch institution list | Yes (admin) |
| `/api/jkkn/departments` | GET | Fetch department list | Yes (admin) |
| `/api/jkkn/test-connection` | GET | Health check for JKKN API | No |

### 5.3 Event Routes

| Route | Method | Purpose | Auth Required |
|-------|--------|---------|--------------|
| `/api/events` | GET | List events (admin: all, learner: active only) | Yes |
| `/api/events` | POST | Create event with ticket pool | Yes (admin) |
| `/api/events/[id]` | GET | Get event details + summary counts | Yes |
| `/api/events/[id]` | PUT | Update event (name, date, close RSVP) | Yes (admin) |
| `/api/events/[id]` | DELETE | Soft-delete event | Yes (admin) |
| `/api/events/[id]/allocate` | POST | Trigger ticket allocation | Yes (admin) |
| `/api/events/[id]/allocation` | GET | Get allocation table (paginated, filterable) | Yes (admin) |
| `/api/events/[id]/summary` | GET | Get real-time event summary counts | Yes |

### 5.4 Ticket Routes

| Route | Method | Purpose | Auth Required |
|-------|--------|---------|--------------|
| `/api/tickets/my-tickets` | GET | Get current learner's tickets across events | Yes (learner) |
| `/api/tickets/my-tickets/[eventId]` | GET | Get learner's tickets for a specific event | Yes (learner) |

### 5.5 RSVP Routes

| Route | Method | Purpose | Auth Required |
|-------|--------|---------|--------------|
| `/api/rsvp/[eventId]` | GET | Get learner's RSVP status for event | Yes (learner) |
| `/api/rsvp/[eventId]` | POST | Submit RSVP (final, no edits) | Yes (learner) |

---

## 6. Role-Based Access Control

### 6.1 Role Classification

All JKKN roles are allowed to access the app. The role determines the UI experience:

```typescript
type UserView = 'admin' | 'learner';

function getUserView(role: string): UserView {
  const adminRoles = [
    'super_admin',
    'administrator',
    'digital_coordinator',
    'principal',
    'hod',
    'faculty',
    'staff',
  ];

  return adminRoles.includes(role) ? 'admin' : 'learner';
}
```

### 6.2 Permission Matrix

| Action | super_admin | administrator | principal | hod | faculty | staff | student |
|--------|-------------|---------------|-----------|-----|---------|-------|---------|
| Create event | Yes | Yes | Yes | Yes | Yes | Yes | No |
| View all events | Yes (all inst.) | Yes (all inst.) | Yes (own inst.) | Yes (own inst.) | Yes (own inst.) | Yes (own inst.) | No |
| View event dashboard | Yes | Yes | Yes | Yes | Yes | Yes | No |
| Search allocation | Yes | Yes | Yes | Yes | Yes | Yes | No |
| Delete event | Yes | Yes | No | No | No | No | No |
| View own tickets | N/A | N/A | N/A | N/A | N/A | N/A | Yes |
| Submit RSVP | N/A | N/A | N/A | N/A | N/A | N/A | Yes |

### 6.3 Institution Scoping

```typescript
function getEventFilter(user: CurrentUser): EventFilter {
  // Super admins and administrators see all institutions
  if (user.is_super_admin || user.role === 'administrator') {
    return { scope: 'all' };
  }

  // Other admin roles see events that include their institution
  return {
    scope: 'institution',
    institution_id: user.institution_id,
  };
}
```

---

## 7. Real-Time System (Supabase Realtime)

### 7.1 Channel Subscriptions

The admin dashboard uses Supabase Realtime to get instant updates when learners submit RSVPs:

```typescript
// Admin Event Dashboard — subscribe to RSVP changes
// NOTE: schema is 'ticket_tracker', NOT 'public'
const channel = supabase
  .channel(`event-${eventId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'ticket_tracker',       // ← Critical: specify our schema
      table: 'rsvp_responses',
      filter: `event_id=eq.${eventId}`,
    },
    (payload) => {
      // Re-fetch summary counts
      refetchEventSummary();
    }
  )
  .subscribe();
```

### 7.2 What Gets Real-Time Updates

| Table | Event | Triggers Update On |
|-------|-------|-------------------|
| `rsvp_responses` | INSERT | Admin dashboard: confirmed/declined/pending counts, response rate |
| `events` | UPDATE | Admin event list: allocation_status changes |
| `tickets` | INSERT | Admin dashboard: allocated count (during allocation progress) |

### 7.3 Cleanup

```typescript
// Unsubscribe when component unmounts
useEffect(() => {
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

## 8. Ticket Allocation Engine

### 8.1 Allocation Flow (Synchronous)

This is the core engine that runs when admin clicks "Create & Allocate Tickets":

```
Step 1: Create event record in Supabase
          ↓
Step 2: Set allocation_status = 'in_progress'
          ↓
Step 3: Fetch ALL learners from JKKN API
        (paginate through 200/page until all fetched)
        Filter by selected institution_ids
        UI shows: "Fetching learners... {count} found"
          ↓
Step 4: Check pool sufficiency
        IF learners × 2 > ticket_pool_total → show warning, wait for confirm
          ↓
Step 5: Sort learners by roll_number ascending
          ↓
Step 6: Cache learners in learner_cache table (upsert)
          ↓
Step 7: Allocate tickets:
        FOR each learner (up to pool limit):
          ticket_number = (index * 2) + 1
          INSERT ticket (pass_index=1, ticket_number)
          INSERT ticket (pass_index=2, ticket_number + 1)
        UI shows: "Allocating tickets... {allocated} of {total}"
          ↓
Step 8: Update event record:
        tickets_allocated = actual_count
        tickets_remaining = ticket_pool_total - actual_count
        learners_fetched = total_learners_from_api
        allocation_status = 'completed'
          ↓
Step 9: Success response → redirect to event dashboard
```

### 8.2 Ticket Number Formatting

```typescript
function formatTicketNumber(num: number, totalPool: number): string {
  // Determine padding based on total pool size
  const digits = Math.max(4, String(totalPool).length);
  return `#${String(num).padStart(digits, '0')}`;
}

// Examples:
// Pool 5,000 → #0001, #0002, ..., #5000
// Pool 100   → #0001, #0002, ..., #0100
// Pool 10,000 → #00001, #00002, ..., #10000
```

### 8.3 Bulk Insert Strategy

```typescript
// Insert tickets in batches of 500 for performance
const BATCH_SIZE = 500;
const ticketRecords = [];

for (let i = 0; i < learnersToAllocate.length; i++) {
  const learner = learnersToAllocate[i];
  const ticketNum1 = (i * 2) + 1;
  const ticketNum2 = (i * 2) + 2;

  ticketRecords.push(
    { event_id, ticket_number: ticketNum1, learner_email: learner.email,
      learner_roll_number: learner.roll_number,
      learner_name: `${learner.first_name} ${learner.last_name}`,
      pass_index: 1, learner_cache_id: learner.cacheId },
    { event_id, ticket_number: ticketNum2, learner_email: learner.email,
      learner_roll_number: learner.roll_number,
      learner_name: `${learner.first_name} ${learner.last_name}`,
      pass_index: 2, learner_cache_id: learner.cacheId }
  );
}

// Batch insert
for (let i = 0; i < ticketRecords.length; i += BATCH_SIZE) {
  const batch = ticketRecords.slice(i, i + BATCH_SIZE);
  await supabase.from('tickets').insert(batch);
}
```

---

## 9. Data Strategy & Caching

### 9.1 Hybrid Approach

| Operation | Data Source | Rationale |
|-----------|-----------|-----------|
| Ticket allocation | Fresh from JKKN API | Accuracy matters — need current active learners |
| Admin search/filter on allocation table | Local `learner_cache` + `tickets` | Speed — no API call per search |
| Learner viewing own tickets | Local `tickets` table (match by email) | Direct DB query |
| Institution list in event form | Fresh from JKKN API (cached 1 hour) | Rarely changes, few records |
| Department filter dropdown | Fresh from JKKN API (cached 1 hour) | Rarely changes |

### 9.2 Cache Refresh

- `learner_cache` is refreshed during every ticket allocation (fresh data from API)
- No scheduled sync job needed — cache is populated as a side effect of allocation
- Stale cache entries (>30 days) can be cleaned up via a cron endpoint

---

## 10. Environment Variables & Configuration

### 10.1 Required Environment Variables

```env
# ── JKKN Auth (OAuth 2.0) ──────────────────────────
NEXT_PUBLIC_AUTH_SERVER_URL=https://auth.jkkn.ai
NEXT_PUBLIC_APP_ID=<new-event-tracker-app-id>       # Register NEW app on auth.jkkn.ai
NEXT_PUBLIC_REDIRECT_URI=<app-url>/callback          # Or constructed from APP_URL
NEXT_PUBLIC_APP_URL=https://tickets.evntly.com       # Production URL (example)
API_KEY=<server-side-api-key>                        # For token exchange (server-only)

# ── JKKN Learner API ──────────────────────────────
NEXT_PUBLIC_MYJKKN_BASE_URL=https://www.jkkn.ai/api
NEXT_PUBLIC_MYJKKN_API_KEY=<jkkn-api-key>           # Server-side use despite NEXT_PUBLIC prefix

# ── Supabase (Shared Evntly Project — ticket_tracker schema) ───
NEXT_PUBLIC_SUPABASE_URL=https://<evntly-project-ref>.supabase.co    # Same as Evntly
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>                              # Same as Evntly
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>                          # Same as Evntly
# NOTE: Schema is configured in Supabase client code, not env vars
# Both Evntly and Ticket Tracker share the same Supabase credentials
# but target different schemas (evntly vs ticket_tracker)
```

### 10.2 Configuration Constants

```typescript
// lib/config/constants.ts
export const APP_CONFIG = {
  // Ticket allocation
  MAX_TICKET_POOL: 8_000,
  MIN_TICKET_POOL: 1,
  TICKETS_PER_LEARNER: 2,
  ALLOCATION_BATCH_SIZE: 500,
  MAX_FETCH_PAGES: 75,
  JKKN_API_PAGE_LIMIT: 200,
  ALLOCATION_TIMEOUT_MS: 120_000,  // 2 minutes

  // Auth
  TOKEN_EXPIRY_BUFFER_MS: 5 * 60 * 1000,  // 5 minutes
  VALIDATION_CACHE_TTL_MS: 15 * 60 * 1000, // 15 minutes

  // UI
  TABLE_PAGE_SIZE: 50,
  SEARCH_DEBOUNCE_MS: 300,
} as const;
```

---

## 11. Deployment Architecture

### 11.1 Infrastructure

```
┌───────────────────────┐     ┌──────────────────────────────┐
│    Vercel Project 1   │     │     Vercel Project 2         │
│    "evntly"           │     │     "event-ticket-tracker"    │
│    (Evntly platform)  │     │     (JKKN Ticket Tracker)    │
│                       │     │                              │
│  ┌─────────────────┐  │     │  ┌──────────────────────┐   │
│  │ Evntly Next.js  │  │     │  │ Ticket Tracker       │   │
│  │ (Evntly Auth)   │  │     │  │ Next.js (JKKN Auth)  │   │
│  └────────┬────────┘  │     │  └──────────┬───────────┘   │
└───────────┼────────────┘     └─────────────┼───────────────┘
            │                                │
            │    ┌───────────────────────┐    │
            └───►│  Supabase Project:    │◄───┘
                 │  "evntly-platform"    │
                 │                       │
                 │  ┌─────────────────┐  │
                 │  │ evntly schema   │  │  ← Evntly's tables + auth
                 │  └─────────────────┘  │
                 │  ┌─────────────────┐  │
                 │  │ ticket_tracker  │  │  ← Ticket Tracker's tables
                 │  │ schema          │  │
                 │  └─────────────────┘  │
                 └──────────┬────────────┘
                            │
              ┌─────────────┼──────────────┐
              │             │              │
              ▼             ▼              ▼
     ┌──────────────┐ ┌──────────┐ ┌───────────────┐
     │ Supabase     │ │ JKKN     │ │ JKKN Learner  │
     │ Realtime     │ │ Auth     │ │ API           │
     │ (both        │ │ Server   │ │ www.jkkn.ai   │
     │  schemas)    │ │ auth.    │ │               │
     │              │ │ jkkn.ai  │ │               │
     └──────────────┘ └──────────┘ └───────────────┘
```

### 11.2 App Comparison

| Aspect | Evntly (Parent Platform) | Event Ticket Tracker (This App) | Mentor Module (Reference Only) |
|--------|-------------------------|--------------------------------|-------------------------------|
| Vercel project | `evntly` | `event-ticket-tracker` (NEW) | `mentor-module` |
| Supabase project | `evntly-platform` | **Same** (`evntly-platform`) | Separate project |
| Supabase schema | `evntly` | `ticket_tracker` | `public` (own project) |
| Auth system | Evntly's own auth | JKKN OAuth 2.0 (new APP_ID) | JKKN OAuth 2.0 (own APP_ID) |
| Domain | `evntly.com` (example) | `tickets.evntly.com` (example) | `mentor.jkkn.ai` (example) |
| JKKN API Key | N/A | Shared with Mentor Module | Shared |
| Codebase | `evntly` repo | New separate repo | `Mentor-module` repo |

### 11.3 Shared Resources

| Resource | Shared Between | Notes |
|----------|---------------|-------|
| Supabase project | Evntly + Ticket Tracker | Same project, **different schemas** (`evntly` vs `ticket_tracker`) |
| Supabase URL + keys | Evntly + Ticket Tracker | Same `NEXT_PUBLIC_SUPABASE_URL` and keys; schema config differentiates |
| JKKN Auth Server | Ticket Tracker + Mentor Module | Same `auth.jkkn.ai`, different APP_IDs per app |
| JKKN Learner API | Ticket Tracker + Mentor Module | Same API, same API key |
| Supabase Realtime | Evntly + Ticket Tracker | Both can subscribe; schema specified in subscription filter |

### 11.4 Schema Isolation Guarantees

| Concern | How It's Handled |
|---------|-----------------|
| Table name conflicts | Each schema has its own namespace — `evntly.users` ≠ `ticket_tracker.users` |
| RLS policy conflicts | Policies are per-table, scoped to schema. Independent. |
| Data leakage | Supabase client configured with `db: { schema: 'ticket_tracker' }` — only sees its own schema |
| Migrations | Each app manages its own migration files targeting its schema |
| Realtime conflicts | Subscriptions specify `schema: 'ticket_tracker'` — only receives events from own tables |
| Future separation | If needed later, can migrate `ticket_tracker` schema to its own Supabase project with `pg_dump --schema=ticket_tracker` |

---

## 12. Interview Decisions Log

All product decisions made during the PRD interview process:

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Role gating | Allow ALL JKKN roles | Students see learner view, staff see admin view. No one is blocked. |
| 2 | Learner data strategy | Hybrid (fresh for allocation, cached for search) | Best of both: accuracy for ticket assignment, speed for admin search. |
| 3 | Event institution scope | Cross-institution events | Supports mega-events like Annual Day across all 7 JKKN institutions. |
| 4 | RSVP finality | Truly final, no exceptions | No admin override, no edits. Forces learners to think before submitting. |
| 5 | Auth pattern | Same OAuth flow, new APP_ID | Reuse proven architecture, but independent app identity on auth server. |
| 6 | Ticket allocation UX | Synchronous with progress bar | One-time action per event. Simple. User sees progress and waits. |
| 7 | Ticket identity | Generic numbered passes | Tickets are not labeled per parent. RSVP separately tracks Mother/Father. |
| 8 | User matching | JKKN user ID (primary) + email fallback | Proven pattern from Mentor Module. Handles JKKN ID migrations. |
| 9 | Real-time strategy | Supabase Realtime subscriptions | Instant dashboard updates. Already proven in Mentor Module. |
| 10 | Infrastructure | Shared Supabase (Evntly project) with `ticket_tracker` schema, separate Vercel | Evntly is the parent platform. Schema isolation gives clean separation without needing a second Supabase project. |
| 11 | Auth coexistence | JKKN Auth only for Ticket Tracker module | Evntly has its own auth. Ticket Tracker exclusively uses JKKN Auth. Two auth systems, same DB, different schemas. |
| 12 | Supabase sharing | Same project, separate PostgreSQL schemas | `evntly` schema for Evntly, `ticket_tracker` schema for Ticket Tracker. Zero table conflicts, independent RLS, can separate later if needed. |

---

## 13. Open Questions Resolved

All previously open questions from the core PRD, now answered:

| Question | Answer | Source |
|----------|--------|--------|
| Exact MyJKKN Auth API endpoint and token format? | `auth.jkkn.ai/api/auth/validate` — POST with `{ access_token, child_app_id }`. Returns `{ valid, user }`. See Section 2. | Extracted from Mentor Module codebase |
| Exact MyJKKN Learner API response schema? | `GET /api-management/learners/profiles` — returns `{ data: Student[], pagination }`. Max 200/page. See Section 3.2.1. | Extracted from Mentor Module codebase |
| Should events auto-close RSVP on event date? | Yes — `rsvp_open` set to `false` when `event_date < now()`. Enforced at API level. | Core PRD (confirmed) |
| Can admin re-open RSVP after closing? | No for v1. | Core PRD (confirmed) |
| Can admin manually allocate remaining tickets? | No for v1 — remaining count is informational only. | Core PRD (confirmed) |
| How does ticket numbering handle re-allocation? | Each event starts from #0001 independently. Ticket numbers are per-event. | Core PRD (confirmed) |
| How to match authenticated learner to their tickets? | Match by `learner_email` in tickets table. JKKN user ID primary, email fallback. See Section 3.6. | Interview decision |
| What happens if JKKN API is down during allocation? | Show error, allow retry. Do NOT fallback to stale data (unlike Mentor Module). | Section 3.5 |

---

## Appendix A: File Structure (Target)

```
event-ticket-tracker/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          # Redirect to /events or /admin/events
│   ├── login/
│   │   └── page.tsx                      # Login page → redirect to auth.jkkn.ai
│   ├── callback/
│   │   └── page.tsx                      # OAuth callback handler
│   ├── events/                            # LEARNER routes
│   │   ├── page.tsx                      # Active events list
│   │   └── [id]/
│   │       └── page.tsx                  # Event detail + RSVP form or read-only
│   ├── admin/                             # ADMIN routes
│   │   └── events/
│   │       ├── page.tsx                  # Event list + "Create Event" CTA
│   │       ├── create/
│   │       │   └── page.tsx              # Event creation form
│   │       └── [id]/
│   │           └── page.tsx              # Event dashboard (summary + allocation)
│   └── api/
│       ├── token/
│       │   └── route.ts
│       ├── auth/
│       │   ├── store-session/route.ts
│       │   ├── refresh/route.ts
│       │   ├── logout/route.ts
│       │   └── validate/route.ts
│       ├── jkkn/
│       │   ├── students/route.ts
│       │   ├── institutions/route.ts
│       │   ├── departments/route.ts
│       │   └── test-connection/route.ts
│       ├── events/
│       │   ├── route.ts                  # GET list, POST create
│       │   └── [id]/
│       │       ├── route.ts              # GET, PUT, DELETE
│       │       ├── allocate/route.ts     # POST trigger allocation
│       │       ├── allocation/route.ts   # GET allocation table
│       │       └── summary/route.ts      # GET counts
│       ├── tickets/
│       │   └── my-tickets/
│       │       ├── route.ts              # GET all learner tickets
│       │       └── [eventId]/route.ts    # GET tickets for event
│       └── rsvp/
│           └── [eventId]/route.ts        # GET status, POST submit
├── components/
│   ├── ui/                                # shadcn/ui components
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── AdminLayout.tsx
│   │   └── LearnerLayout.tsx
│   ├── providers/
│   │   └── AuthProvider.tsx
│   ├── admin/
│   │   ├── EventCard.tsx
│   │   ├── EventForm.tsx
│   │   ├── SummaryCards.tsx
│   │   ├── AllocationTable.tsx
│   │   ├── AllocationProgress.tsx
│   │   └── SearchBar.tsx
│   └── learner/
│       ├── EventCard.tsx
│       ├── TicketPass.tsx
│       ├── RSVPForm.tsx
│       └── RSVPConfirmation.tsx
├── lib/
│   ├── auth/
│   │   ├── config.ts
│   │   ├── token-validation.ts
│   │   └── get-current-user.ts
│   ├── api/
│   │   ├── jkkn-api.ts
│   │   └── jkkn-types.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── auth.ts
│   ├── types/
│   │   ├── event.ts
│   │   ├── ticket.ts
│   │   ├── rsvp.ts
│   │   └── user.ts
│   ├── services/
│   │   ├── allocation-engine.ts
│   │   └── event-service.ts
│   └── config/
│       └── constants.ts
├── supabase/
│   └── migrations/
│       ├── 001_create_users.sql
│       ├── 002_create_events.sql
│       ├── 003_create_tickets.sql
│       ├── 004_create_rsvp.sql
│       └── 005_create_functions.sql
├── public/
├── .env.local
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── CLAUDE.md
```

---

## Appendix B: Quick Reference — Mentor Module Patterns to Reuse

These files from the Mentor Module (`Mentor-module/`) can be used as reference implementations:

| Pattern | Mentor Module File | Adapt For |
|---------|--------------------|-----------|
| OAuth config | `lib/auth/config.ts` | Same structure, new APP_ID |
| Token validation + cache | `lib/auth/token-validation.ts` | Copy directly, adjust cache TTLs |
| getCurrentUser() | `lib/auth/get-current-user.ts` | Simplify — remove mentor-specific logic |
| User upsert | `lib/supabase/auth.ts` | Simplify — remove ensureMentorRecord |
| OAuth callback page | `app/callback/page.tsx` | Same flow, adjust redirect routes |
| Store session API | `app/api/auth/store-session/route.ts` | Adjust role routing |
| Token refresh API | `app/api/auth/refresh/route.ts` | Copy directly |
| JKKN API proxy | `app/api/jkkn/students/route.ts` | Simplify — remove mentor access control |
| JKKN types | `lib/api/jkkn-api.ts` | Reuse Student, Institution, Department interfaces |
| Role mapping | `lib/supabase/auth.ts` → `mapJkknRoleToDbRole` | Adjust — allow student role |

---

*PRD Version: 2.0 — Complete Technical Specification*
*Companion to: ticket verifier.md (Core Product PRD v1.1)*
*Last Updated: February 21, 2026*
