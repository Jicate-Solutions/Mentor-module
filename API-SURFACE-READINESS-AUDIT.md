# STEP 7: API Surface Readiness Audit (B2A Gap Analysis)
**Audit Date:** 2026-03-02
**Auditor:** api-auditor
**Status:** COMPLETE

---

## SECTION 7a: ROUTE COVERAGE ANALYSIS

### Service Methods → Routes Mapping

#### Service: `lib/services/mentor/mentors.ts`
| Method | Session Route | API-Management Route | Auth Mode | Status |
|--------|:---:|:---:|:---:|:---:|
| `getMentorById(jkknId)` | ✓ GET `/api/mentor/[id]` | ✗ NONE | inline getUserAccess() | Session-only |
| `getMentorList(filters, userAccess)` | ✓ GET `/api/mentor/list` | ✗ NONE | inline getUserAccess() | Session-only |
| `getCurrentMentorId(userId)` | ✓ GET `/api/mentor/current` | ✗ NONE | inline getUserAccess() | Session-only |

#### Service: `lib/services/mentor/students.ts`
| Method | Session Route | API-Management Route | Auth Mode | Status |
|--------|:---:|:---:|:---:|:---:|
| `getStudentsForMentor(mentorJkknId)` | ✓ GET `/api/mentor/[id]/students` | ✗ NONE | inline getUserAccess() | Session-only |
| `assignStudentsToMentor(mentorId, input, assignedBy)` | ✓ POST `/api/mentor/[id]/students` | ✗ NONE | inline getUserAccess() | Session-only |
| `removeStudentFromMentor(mentorJkknId, studentId)` | ✓ DELETE `/api/mentor/[id]/students/[studentId]` | ✗ NONE | inline getUserAccess() | Session-only |
| `bulkAssignStudents(mentorId, students, assignedBy)` | ✓ POST `/api/mentor/[id]/students/bulk` | ✗ NONE | inline getUserAccess() | Session-only |

#### Service: `lib/services/mentor/counseling.ts`
| Method | Session Route | API-Management Route | Auth Mode | Status |
|--------|:---:|:---:|:---:|:---:|
| `getSessionsForMentor(mentorJkknId)` | ✓ GET `/api/mentor/[id]/counseling` | ✗ NONE | inline getUserAccess() | Session-only |
| `createSession(mentorJkknId, data, createdBy)` | ✓ POST `/api/mentor/[id]/counseling` | ✗ NONE | inline getUserAccess() | Session-only |
| `updateSession(sessionId, mentorJkknId, data)` | ✓ PATCH `/api/mentor/[id]/counseling/[sessionId]` | ✗ NONE | inline getUserAccess() | Session-only |
| `deleteSession(sessionId, mentorJkknId)` | ✓ DELETE `/api/mentor/[id]/counseling/[sessionId]` | ✗ NONE | inline getUserAccess() | Session-only |
| `submitSessionFeedback(sessionId, mentorJkknId, data)` | ✓ POST `/api/mentor/[id]/counseling/[sessionId]/feedback` | ✗ NONE | inline getUserAccess() | Session-only |

#### Service: `lib/services/mentor/feedback.ts`
| Method | Session Route | API-Management Route | Auth Mode | Status |
|--------|:---:|:---:|:---:|:---:|
| `getStudentFeedbackForMentor(mentorJkknId)` | ✓ GET `/api/mentor/[id]/feedback` | ✗ NONE | inline getUserAccess() | Session-only |

#### Service: `lib/services/mentor/resolve.ts`
| Method | Session Route | API-Management Route | Auth Mode | Status |
|--------|:---:|:---:|:---:|:---:|
| `resolveMentorByJkknId(jkknId, supabase)` | ✗ NONE (internal helper) | ✗ NONE | N/A | Internal-only |

### Coverage Summary
- **Total service methods:** 13 (excluding internal helpers)
- **Service methods with /api/mentor/ routes:** 12 of 13 (92.3%)
- **Service methods with /api/api-management/ routes:** 0 of 13 (0%)
- **Duplicate routes (same method, different paths):** 0

---

## SECTION 7b: AUTH READINESS

### Middleware Pattern Analysis

**withAuth Middleware Status:** ✗ **DOES NOT EXIST**

No `withAuth` middleware exists. All routes implement inline auth boilerplate:

```typescript
// Pattern found in ALL /api/mentor routes:
export async function GET(request: NextRequest, ...) {
  const userAccess = await getUserAccess();
  if (!userAccess) return err('Unauthorized', 401);
  // ...
}
```

### Auth Classification per Route

All 10 mentor API routes follow the **Session-only** pattern:

#### Session-only Routes (all mentoring endpoints)
- `GET /api/mentor/[id]` — calls `getUserAccess()`, no API key support
- `GET /api/mentor/list` — calls `getUserAccess()`, no API key support
- `GET /api/mentor/current` — calls `getUserAccess()`, no API key support
- `GET /api/mentor/[id]/students` — calls `getUserAccess()`, no API key support
- `POST /api/mentor/[id]/students` — calls `getUserAccess()`, no API key support
- `DELETE /api/mentor/[id]/students/[studentId]` — calls `getUserAccess()`, no API key support
- `POST /api/mentor/[id]/students/bulk` — calls `getUserAccess()`, no API key support
- `GET /api/mentor/[id]/counseling` — calls `getUserAccess()`, no API key support
- `POST /api/mentor/[id]/counseling` — calls `getUserAccess()`, no API key support
- `PATCH /api/mentor/[id]/counseling/[sessionId]` — calls `getUserAccess()`, no API key support
- `DELETE /api/mentor/[id]/counseling/[sessionId]` — calls `getUserAccess()`, no API key support
- `POST /api/mentor/[id]/counseling/[sessionId]/feedback` — calls `getUserAccess()`, no API key support
- `GET /api/mentor/[id]/feedback` — calls `getUserAccess()`, no API key support

### Token Validation Configuration

**File:** `lib/auth/token-validation.ts`

Configuration found:
```typescript
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const FAILED_CACHE_DURATION = 2 * 1000; // 2 seconds
const TIMEOUT_CACHE_DURATION = 5 * 1000; // 5 seconds
const GRACE_PERIOD = 60 * 1000; // 1 minute
```

**Base URL:** Derived from `lib/auth/config` (via `authConfig`).
**Auth header:** Bearer token validated by `getCurrentUser()`.

---

## SECTION 7c: DEVELOPER PORTAL

### Portal Documentation Status: ✗ **NOT FOUND**

**Search results:**
- No `/api-guidelines` route found
- No `/application-hub` or similar page found
- No dedicated API documentation page found
- No `/docs` portal found in `(dashboard)` layouts

**Internal developer docs found:** `docs/` directory contains 30+ markdown files documenting internal fixes/implementation, but these are not published as public API documentation.

### Documentation Gap
- No OpenAPI/Swagger specification
- No example requests/responses for external consumers
- No API key documentation (since only session auth is supported)
- No integration guide for B2B partners

---

## SECTION 7d: EXTERNAL CONSUMER VERDICT

### Classification: **API-PARTIAL** ⚠️

The Mentor module has partial API exposure suitable for **browser-based internal users only**. External applications and B2B integrations cannot currently consume these endpoints.

### Reasons for API-Partial Classification

#### ✓ STRENGTHS
1. **Good route coverage:** 12 of 13 service methods have HTTP endpoints
2. **Consistent response format:** Uses `ok(data)` and `err(message, status)` helpers uniformly
3. **Proper error handling:** Returns meaningful HTTP status codes (400, 401, 403, 404, 409, 500)
4. **RBAC implemented:** Routes check `canAssignStudents()`, `canManageMentor()`, etc.
5. **Input validation:** Routes validate required fields before processing
6. **Logging:** Routes log errors and important operations

#### ✗ GAPS
1. **No API key auth:** All 13 routes require browser session token only
   - No `Authorization: Bearer <API_KEY>` support
   - No `/api/api-management/` B2B endpoint layer
   - No separate API key management system
2. **No developer portal:** Zero public API documentation or example code
3. **No OAuth/SDK support:** No official client libraries or SDKs
4. **No API versioning:** No `/v1/`, `/v2/` prefixes for backwards compatibility
5. **No rate limiting docs:** No published rate limit headers or quotas
6. **No Swagger/OpenAPI:** No machine-readable API schema
7. **No public key infrastructure:** No public key registration for B2B
8. **Browser-locked:** Token validation hard-codes JKKN OAuth dependency

---

## ROUTE COVERAGE TABLE (Summary)

| Endpoint | Method | Service Method | Auth Type | Status |
|----------|:------:|:-------------:|:--------:|:-----:|
| `/api/mentor/[id]` | GET | `getMentorById()` | Session | ✓ |
| `/api/mentor/list` | GET | `getMentorList()` | Session | ✓ |
| `/api/mentor/current` | GET | `getCurrentMentorId()` | Session | ✓ |
| `/api/mentor/[id]/students` | GET | `getStudentsForMentor()` | Session | ✓ |
| `/api/mentor/[id]/students` | POST | `assignStudentsToMentor()` | Session | ✓ |
| `/api/mentor/[id]/students/[studentId]` | DELETE | `removeStudentFromMentor()` | Session | ✓ |
| `/api/mentor/[id]/students/bulk` | POST | `bulkAssignStudents()` | Session | ✓ |
| `/api/mentor/[id]/counseling` | GET | `getSessionsForMentor()` | Session | ✓ |
| `/api/mentor/[id]/counseling` | POST | `createSession()` | Session | ✓ |
| `/api/mentor/[id]/counseling/[sessionId]` | PATCH | `updateSession()` | Session | ✓ |
| `/api/mentor/[id]/counseling/[sessionId]` | DELETE | `deleteSession()` | Session | ✓ |
| `/api/mentor/[id]/counseling/[sessionId]/feedback` | POST | `submitSessionFeedback()` | Session | ✓ |
| `/api/mentor/[id]/feedback` | GET | `getStudentFeedbackForMentor()` | Session | ✓ |

---

## PRIORITY GAPS TO REACH API-READY

To upgrade from **API-Partial** → **API-Ready**, implement:

### P0 (Critical)
1. **Create `/api/api-management/` B2B endpoint layer**
   - Alias all session routes under `/api/api-management/mentor/...`
   - Support `Authorization: Bearer <API_KEY>` in addition to sessions
   - Implement API key validation in middleware

2. **Build API key management system**
   - Database schema for `api_keys` table (key_hash, app_name, created_at, revoked_at)
   - Admin dashboard to generate/revoke keys per B2B partner
   - Rate limiting per API key

3. **Create developer portal**
   - `/application-hub` page with API overview
   - Example requests/responses for each endpoint
   - Quick-start guide for B2B integration
   - API key registration flow

### P1 (High)
4. **Implement withAuth middleware**
   - Consolidate session + API key validation logic
   - Reduce boilerplate in 13 route handlers
   - Single source of truth for auth rules

5. **Add OpenAPI/Swagger schema**
   - Machine-readable specification for all mentor endpoints
   - Auto-generate SDK documentation
   - Client-side type generation

6. **API versioning**
   - Move routes to `/api/v1/mentor/...`
   - Reserve `/api/v2/mentor/...` for future changes

### P2 (Medium)
7. **Rate limiting headers**
   - Return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
   - Document quotas per API key tier

8. **Event webhooks**
   - POST to partner URL when session created/updated
   - Reduce polling for external systems

---

## EXTERNAL CONSUMER SCENARIOS (Currently Unsupported)

### ❌ Not Possible Today
```
1. Third-party mentoring platform
   → Cannot call /api/mentor/list without browser session
   → Cannot authenticate with API key

2. Mobile app (non-JKKN OAuth)
   → Cannot obtain browser session token
   → No API key support

3. Reporting system
   → Cannot bulk-export mentor data
   → No scheduled API access

4. Integration partner
   → Cannot build SDK
   → No API documentation
```

---

## FINDINGS SUMMARY

| Metric | Value | Grade |
|--------|:-----:|:-----:|
| Service method → route coverage | 12/13 (92%) | A |
| Auth middleware adoption | 0/13 (0%) | F |
| API-key support | None | F |
| Developer portal | None | F |
| API versioning | None | F |
| OpenAPI specification | None | F |
| Rate limiting | None | F |
| **Overall API Readiness** | **API-Partial** | **C** |

---

## AUDIT SIGN-OFF

**API Surface Status:** ✓ AUDIT COMPLETE

All 10 mentor API routes exist and follow consistent patterns. Auth is session-only with inline boilerplate (no unified middleware). Zero B2B integration infrastructure. Module is **production-ready for internal browser users** but **not suitable for external consumers** without P0 gaps addressed.

**Next Step:** Route findings to development team for B2B gateway implementation (new `/api/api-management/` layer + API key auth).

---

**Report generated by:** api-auditor
**Date:** 2026-03-02 20:15 UTC
**Codebase:** Mentor Module (Next.js 15 + Supabase)
