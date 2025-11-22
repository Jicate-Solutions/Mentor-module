# 🌐 Complete Data Flow - Where Does Each API Get Data?

**Question:** Are all endpoints fetching from JKKN parent API?

**Answer:** ✅ **YES** - All major data endpoints fetch from JKKN API (`https://www.jkkn.ai/api`)

---

## 📊 Data Sources Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    MENTOR MODULE APPLICATION                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐         ┌──────────────────┐               │
│  │  LOCAL DATABASE│         │   JKKN PARENT API│               │
│  │   (Supabase)   │         │  (www.jkkn.ai)   │               │
│  └────────┬───────┘         └────────┬─────────┘               │
│           │                          │                          │
│           │                          │                          │
│           ▼                          ▼                          │
│  ┌─────────────────────────────────────────────────┐           │
│  │          WHAT COMES FROM WHERE?                  │           │
│  ├─────────────────────────────────────────────────┤           │
│  │                                                  │           │
│  │  FROM LOCAL DATABASE (Supabase):                │           │
│  │  ✅ User authentication (email, password)       │           │
│  │  ✅ User roles (mentor, faculty, hod, etc.)     │           │
│  │  ✅ Institution assignments (institution_id)    │           │
│  │  ✅ Mentor records (mentors table)              │           │
│  │  ✅ Student-mentor assignments                  │           │
│  │  ✅ Counseling sessions (local data)            │           │
│  │  ✅ Access control metadata                     │           │
│  │                                                  │           │
│  │  FROM JKKN PARENT API:                          │           │
│  │  ✅ Staff data (304 staff members)              │           │
│  │  ✅ Student data (2,441 students)               │           │
│  │  ✅ Institutions (10 institutions)              │           │
│  │  ✅ Departments                                  │           │
│  │  ✅ Programs/Degrees                             │           │
│  │  ✅ Courses                                      │           │
│  │  ✅ Student profiles (names, contact, etc.)     │           │
│  │  ✅ Staff profiles (names, designation, etc.)   │           │
│  │                                                  │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Detailed Breakdown by Endpoint

### 1. **Staff/Mentor Lists** 👥

**Endpoint:** `/api/jkkn/staff` and `/api/mentor/list`

**Data Source:** ✅ **JKKN Parent API**

```
JKKN API: https://www.jkkn.ai/api/api-management/staff
├─ Fetches: 304 staff members
├─ Includes: Names, emails, designations, departments, institutions
└─ Real-time: Yes (60-second cache)

Local Database: Used for filtering only
├─ getUserAccess() → Get user's institution_id
└─ Filter staff by institution_id
```

**Code Reference:** [app/api/jkkn/staff/route.ts:58-70](../app/api/jkkn/staff/route.ts#L58-L70)

```typescript
// Line 58-70 in app/api/jkkn/staff/route.ts
const possibleEndpoints = [
  `${baseUrl}/api-management/staff?page=${page}&limit=${limit}`,
  `${baseUrl}/api-management/organizations/staff?page=${page}&limit=${limit}`,
  // ... tries multiple endpoints
];
```

**Why some users are missing:**
- JKKN API has 304 staff
- Database has 314 users
- **10 users NOT in JKKN API** = Won't appear in lists ❌

---

### 2. **Student Lists** 🎓

**Endpoint:** `/api/jkkn/students`

**Data Source:** ✅ **JKKN Parent API**

```
JKKN API: https://www.jkkn.ai/api/api-management/students
├─ Fetches: 2,441 students (paginated)
├─ Includes: Names, roll numbers, programs, departments
└─ Real-time: Yes (no cache)

Local Database: Used for filtering only
├─ getUserAccess() → Get user's institution_id
└─ Filter students by institution_id
```

**Code Reference:** [app/api/jkkn/students/route.ts:138-149](../app/api/jkkn/students/route.ts#L138-L149)

```typescript
// Line 138-149 in app/api/jkkn/students/route.ts
const url = `${baseUrl}/api-management/students?page=${currentPage}&limit=${maxLimit}`;

const response = await fetch(url, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  cache: 'no-store', // Real-time, no caching
});
```

---

### 3. **Institutions** 🏛️

**Endpoint:** `/api/jkkn/institutions`

**Data Source:** ✅ **JKKN Parent API**

```
JKKN API: https://www.jkkn.ai/api/api-management/organizations/institutions
├─ Fetches: 10 institutions
├─ Includes: Names, codes, categories
└─ Real-time: Yes (60-second cache)

Local Database: Used for filtering only
├─ getUserAccess() → Get user's institution_id
└─ Filter to show only user's institution (unless super admin)
```

**Code Reference:** [app/api/jkkn/institutions/route.ts:60](../app/api/jkkn/institutions/route.ts#L60)

```typescript
// Line 60 in app/api/jkkn/institutions/route.ts
const url = `${baseUrl}/api-management/organizations/institutions?page=${page}&limit=${limit}`;
```

---

### 4. **Departments** 🏢

**Endpoint:** `/api/jkkn/departments`

**Data Source:** ✅ **JKKN Parent API**

```
JKKN API: https://www.jkkn.ai/api/api-management/organizations/departments
├─ Fetches: All departments
└─ Real-time: Yes (60-second cache)
```

**Code Reference:** [app/api/jkkn/departments/route.ts:60](../app/api/jkkn/departments/route.ts#L60)

---

### 5. **Programs/Degrees** 📚

**Endpoint:** `/api/jkkn/degrees`

**Data Source:** ✅ **JKKN Parent API**

```
JKKN API: https://www.jkkn.ai/api/api-management/organizations/programs
├─ Fetches: All programs/degrees
└─ Real-time: Yes (60-second cache)
```

---

### 6. **Courses** 📖

**Endpoint:** `/api/jkkn/courses`

**Data Source:** ✅ **JKKN Parent API**

```
JKKN API: https://www.jkkn.ai/api/api-management/organizations/courses
├─ Fetches: All courses
└─ Real-time: Yes (60-second cache)
```

---

### 7. **Dashboard Stats** 📊

**Endpoint:** `/api/dashboard/stats`

**Data Source:** ✅ **JKKN Parent API** (for student counts)

```
JKKN API: https://www.jkkn.ai/api/api-management/students?page=1&limit=1
├─ Fetches: Student count from metadata
└─ Real-time: Yes

Local Database: For mentor counts
├─ Count mentors from 'mentors' table
└─ Count counseling sessions
```

**Code Reference:** [app/api/dashboard/stats/route.ts:75-90](../app/api/dashboard/stats/route.ts#L75-L90)

---

### 8. **Authentication & Access Control** 🔐

**Data Source:** ❌ **LOCAL DATABASE ONLY** (Supabase)

```
Local Database (Supabase):
├─ users table
│  ├─ email, password (hashed)
│  ├─ role (mentor, faculty, hod, institution_admin, super_admin)
│  ├─ institution_id (for filtering)
│  └─ department_id (for filtering)
│
├─ mentors table
│  └─ Mentor-specific data
│
└─ student_mentors table
   └─ Student-mentor assignments
```

**Why?** Authentication must be local for security and speed.

---

## 📈 Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        USER REQUEST                           │
│                   (e.g., "Show me mentors")                   │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                   NEXT.JS API ROUTE                           │
│              (e.g., /api/mentor/list)                         │
└───────┬──────────────────────────────────┬───────────────────┘
        │                                  │
        │ ① Get User Access                │ ② Fetch Data
        ▼                                  ▼
┌─────────────────┐              ┌──────────────────────┐
│ LOCAL DATABASE  │              │   JKKN PARENT API    │
│   (Supabase)    │              │  (www.jkkn.ai/api)   │
└────────┬────────┘              └──────────┬───────────┘
         │                                  │
         │ Returns:                         │ Returns:
         │ - User role                      │ - 304 staff members
         │ - institution_id                 │ - Full profiles
         │ - department_id                  │ - Designations
         │                                  │
         └──────────────┬───────────────────┘
                        │
                        │ ③ Filter & Combine
                        ▼
            ┌───────────────────────┐
            │   APPLY FILTERS       │
            │ (institution-based)   │
            └───────────┬───────────┘
                        │
                        │ ④ Return Filtered Data
                        ▼
            ┌───────────────────────┐
            │    USER SEES:         │
            │  - Only their         │
            │    institution's data │
            │  - Real-time from     │
            │    JKKN API           │
            └───────────────────────┘
```

---

## 🎯 Key Findings

### ✅ What Comes from JKKN Parent API (Real-time)

| Data Type | Endpoint | Count | Cache |
|-----------|----------|-------|-------|
| **Staff** | `/api-management/staff` | 304 | 60s |
| **Students** | `/api-management/students` | 2,441 | None |
| **Institutions** | `/api-management/organizations/institutions` | 10 | 60s |
| **Departments** | `/api-management/organizations/departments` | Many | 60s |
| **Programs** | `/api-management/organizations/programs` | Many | 60s |
| **Courses** | `/api-management/organizations/courses` | Many | 60s |

**Total Real-time Data:** ✅ **ALL major data from JKKN API**

---

### ❌ What Comes from Local Database

| Data Type | Purpose | Why Local? |
|-----------|---------|------------|
| **User Auth** | Login, sessions | Security & speed |
| **Roles** | Access control | Custom to this app |
| **Institution Assignments** | Filtering | Custom assignments |
| **Mentor Records** | Mentor metadata | App-specific |
| **Student-Mentor Links** | Assignments | App-specific |
| **Counseling Sessions** | Session tracking | App-specific |

**Total Local Data:** ❌ **Only authentication & app-specific data**

---

## 🔍 Why Users Can't Find Their Names

### The Flow:

```
1. User searches for "John Doe"
   │
   ▼
2. API calls JKKN: https://www.jkkn.ai/api/api-management/staff
   │
   ▼
3. JKKN returns: 304 staff members
   │
   ▼
4. Filter by institution_id
   │
   ▼
5. Return filtered list
```

### If "John Doe" is NOT in JKKN API:

```
1. User searches for "John Doe"
   │
   ▼
2. API calls JKKN: https://www.jkkn.ai/api/api-management/staff
   │
   ▼
3. JKKN returns: 304 staff (John Doe NOT included)
   │
   ▼
4. Filter by institution_id
   │
   ▼
5. Return filtered list (John Doe missing ❌)
```

**Result:** User can't find themselves because **JKKN API doesn't have them**.

---

## ✅ Verification

### Confirm Data Source:

```bash
# Check what's in JKKN API
npm run test:api

# Check what's in local database
npm test

# Compare the two
npm run check:users
```

### Expected Output:

```
✅ JKKN API has 304 staff members
✅ Local database has 314 users
❌ 10 users in database but NOT in JKKN API
```

---

## 📊 Summary

### Question: "Are all endpoints fetching from JKKN parent API?"

**Answer:** ✅ **YES**, for all these data types:
- Staff/Mentors ✅
- Students ✅
- Institutions ✅
- Departments ✅
- Programs ✅
- Courses ✅
- Dashboard stats (student counts) ✅

**Local Database** is only used for:
- Authentication ❌
- Access control metadata ❌
- App-specific features (counseling sessions, assignments) ❌

### The Problem:

```
JKKN API has:     304 staff
Database has:     314 users
Missing from API: 10 users → Won't appear in lists ❌
```

### The Solution:

**Option 1:** Add the 10 missing users to JKKN API
**Option 2:** Create hybrid endpoint (JKKN API + Local Database)

---

**Conclusion:** Yes, you're right! All major data (staff, students, institutions, etc.) is fetching from your JKKN parent API in real-time. The local database is only used for authentication and filtering.
