# Dashboard Role-Based Customization

## Overview

The dashboard now displays **customized, role-specific data** with real-time updates. Each role sees data filtered based on their access level and institution.

---

## Role-Based Data Access

### **Super Admin / Administrator**
**Scope:** All institutions (global)

**Dashboard Features:**
- ✅ Top mentors across ALL institutions
- ✅ Department progress for ALL departments
- ✅ Session distribution across ALL institutions
- ✅ System-wide real-time notifications
- ✅ Overall institution performance metrics

**Data Scope:** Unrestricted - sees complete system data

---

### **Institution Admin / Principal**
**Scope:** Their institution only

**Dashboard Features:**
- ✅ Top mentors in THEIR institution
- ✅ Department progress for THEIR institution's departments
- ✅ Session distribution within THEIR institution
- ✅ Institution-specific notifications
- ✅ Department comparison within institution

**Data Scope:** Filtered by `institution_id`

---

### **Mentor**
**Scope:** Their institution (for peer comparison) + Personal data

**Dashboard Features:**
- ✅ Top mentors in THEIR institution (peer leaderboard)
- ✅ **Personal ranking/position** among institution mentors
- ✅ Their assigned students' progress
- ✅ Their conducted sessions
- ✅ Department-wise session distribution (their institution)
- ✅ Personal + institution notifications
- ✅ Performance comparison with peers

**Data Scope:** Filtered by `institution_id` for leaderboard, `mentor_id` for personal data

---

## API Routes Created

### 1. Top Mentors API
**Endpoint:** `GET /api/dashboard/top-mentors`

**Query Parameters:**
- `limit` (optional, default: 10) - Number of top mentors to return

**Response:**
```json
{
  "success": true,
  "mentors": [
    {
      "id": "uuid",
      "name": "John Doe",
      "avatar": "https://...",
      "sessionCount": 45,
      "institutionId": "uuid",
      "departmentId": "uuid"
    }
  ],
  "currentUserRank": {
    "rank": 3,
    "sessionCount": 32,
    "total": 15
  },
  "scope": "institution" | "all_institutions"
}
```

**Role-Based Filtering:**
- **Super Admin/Administrator:** All mentors across all institutions
- **Institution Admin:** Mentors in their institution
- **Mentor:** Mentors in their institution + their own rank

**Ranking Criteria:**
- Completed sessions count (descending)
- Only completed sessions are counted
- Top 10 mentors by default

---

### 2. Department Progress API
**Endpoint:** `GET /api/dashboard/department-progress`

**Response:**
```json
{
  "success": true,
  "departments": [
    {
      "id": "uuid",
      "name": "Computer Science",
      "totalMentors": 8,
      "activeMentors": 6,
      "totalSessions": 120,
      "completedSessions": 95,
      "progress": 79,
      "color": "#10b981"
    }
  ],
  "scope": "institution" | "all_institutions"
}
```

**Progress Calculation:**
- `progress` = (completedSessions / totalSessions) × 100
- `activeMentors` = mentors with at least one completed session
- Sorted by progress percentage (descending)

**Color Coding:**
- **≥80%:** `#0b6d41` (brand-green) - Excellent
- **60-79%:** `#10b981` (green-500) - Good
- **40-59%:** `#f59e0b` (amber-500) - Average
- **20-39%:** `#f97316` (orange-500) - Below Average
- **<20%:** `#ef4444` (red-500) - Needs Attention

**Role-Based Filtering:**
- **Super Admin/Administrator:** All departments across all institutions
- **Institution Admin/Mentor:** Departments in their institution only

---

### 3. Session Distribution API
**Endpoint:** `GET /api/dashboard/session-distribution`

**Response:**
```json
{
  "success": true,
  "distribution": [
    {
      "name": "Computer Science",
      "total": 120,
      "completed": 95,
      "scheduled": 20,
      "cancelled": 5
    }
  ],
  "totals": {
    "total": 250,
    "completed": 180,
    "scheduled": 55,
    "cancelled": 15
  },
  "scope": "all_institutions" | "institution" | "personal"
}
```

**Session Status Breakdown:**
- **Completed:** Sessions that have been conducted
- **Scheduled:** Upcoming sessions
- **Cancelled:** Sessions that were cancelled

**Role-Based Filtering:**
- **Super Admin/Administrator:** All sessions across all institutions
- **Institution Admin:** Sessions in their institution
- **Mentor:** Only their own sessions

---

## Dashboard Components

### 1. **TopMentorsCard**
**File:** `app/(dashboard)/dashboard/components/TopMentorsCard.tsx`

**Features:**
- Shows top 10 mentors by default
- Medal icons for top 3 (gold, silver, bronze)
- Avatar display with initials fallback
- Session count badges
- Hover effects and transitions
- "View all mentors" link when > 10 mentors

**For Mentors:**
- Shows their position/rank in institution
- Highlights their performance compared to peers

---

### 2. **ProgressCard (Department Progress)**
**File:** `app/(dashboard)/dashboard/components/ProgressCard.tsx`

**Features:**
- Visual progress bars with color coding
- Percentage completion display
- Session completion stats (completed / total)
- Remaining sessions indicator
- Overall progress summary
- Animated progress bars with hover effects

**Display Format:**
```
Department Name                    Progress%
[================================] 79%
95 of 120 sessions completed      25 remaining
```

---

### 3. **DepartmentChart (Session Distribution)**
**File:** `app/(dashboard)/dashboard/components/DepartmentChart.tsx`

**Features:**
- Interactive pie chart using Recharts library
- Color-coded segments per department
- Percentage labels on chart
- Custom tooltips with session counts
- Legend with department names
- Responsive design

**Chart Colors:**
- Brand Green: `#0b6d41`
- Brand Yellow: `#ffde59`
- Mint variants for additional departments

---

### 4. **NotificationsPanel**
**File:** `app/(dashboard)/dashboard/components/NotificationsPanel.tsx`

**Features:**
- Real-time updates via Supabase subscriptions
- Role-specific notifications
- Action buttons for quick responses
- Categorized by type (info, warning, action)
- Unread indicator
- Dismiss functionality

**Notification Types:**
- **Info:** General updates
- **Warning:** Important alerts
- **Action:** Requires user action

---

## Real-Time Updates

### Supabase Subscriptions

The dashboard implements real-time data synchronization using Supabase subscriptions:

```typescript
// Subscribe to counseling sessions changes
const sessionsChannel = supabase
  .channel('dashboard-sessions')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'counseling_sessions'
  }, () => {
    fetchDashboardData();
  })
  .subscribe();

// Subscribe to mentor-student assignments
const assignmentsChannel = supabase
  .channel('dashboard-assignments')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'mentor_students'
  }, () => {
    fetchDashboardData();
  })
  .subscribe();

// Subscribe to feedback changes
const feedbackChannel = supabase
  .channel('dashboard-feedback')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'session_feedback'
  }, () => {
    fetchDashboardData();
  })
  .subscribe();
```

**Subscribed Tables:**
- `counseling_sessions` - Session creation, updates, completion
- `mentor_students` - Mentor-student assignments
- `session_feedback` - Feedback submissions

**Auto-Refresh:** Dashboard data refreshes automatically when changes occur in subscribed tables.

---

## Usage Examples

### For Super Admin:
```typescript
// Dashboard shows
- Top 10 mentors across all 5 institutions
- Progress bars for all 15 departments
- Session distribution pie chart (all departments)
- System-wide notifications
```

### For Principal (Institution Admin):
```typescript
// Dashboard shows
- Top 10 mentors in XYZ Institution
- Progress bars for 3 departments in XYZ Institution
- Session distribution for XYZ Institution only
- Institution-specific notifications
```

### For Mentor:
```typescript
// Dashboard shows
- Top 10 mentors in their institution
- "Your Rank: #3 with 32 sessions" badge
- Their personal session stats
- Department distribution in their institution
- Personal + institution notifications
```

---

## Benefits

### 1. **Motivation & Competition**
- Mentors see peer performance
- Healthy competition encourages more sessions
- Recognition for top performers

### 2. **Performance Tracking**
- Real-time progress monitoring
- Department-wise comparison
- Identify underperforming areas

### 3. **Data-Driven Decisions**
- Institution admins see department trends
- Super admins identify system-wide patterns
- Allocate resources based on data

### 4. **Transparency**
- Everyone sees relevant metrics
- Clear performance indicators
- Fair evaluation system

### 5. **Real-Time Awareness**
- Instant updates on changes
- Quick response to issues
- Stay informed without manual refresh

---

## Security & Access Control

### Server-Side Filtering
All API routes implement server-side role-based filtering:

```typescript
const user = await getCurrentUser();

if (user.role === 'institution_admin' || user.role === 'mentor') {
  query = query.eq('institution_id', user.institution_id);
}

if (user.role === 'mentor') {
  query = query.eq('mentor_id', user.id);
}
```

### Benefits:
- ✅ No data leakage between institutions
- ✅ Mentors cannot see other institutions' data
- ✅ Role checks at API level
- ✅ Uses service role for database access
- ✅ Client receives only authorized data

---

## Performance Optimizations

### 1. **Efficient Queries**
- Single queries with joins
- Aggregations done in database
- Indexed columns for fast filtering

### 2. **Caching Strategy**
- Dashboard data cached client-side
- Real-time subscriptions invalidate cache
- Reduces unnecessary API calls

### 3. **Pagination**
- Top mentors limited to 10 by default
- "Load more" option for full list
- Reduces initial payload size

---

## Future Enhancements

### 1. **Time Range Filters**
- View data for last week, month, quarter
- Compare performance over time
- Trend analysis

### 2. **Export Reports**
- Download dashboard data as PDF/Excel
- Share reports with stakeholders
- Historical data archive

### 3. **Custom Metrics**
- Define custom KPIs
- Weighted scoring system
- Multi-criteria ranking

### 4. **Predictive Analytics**
- Forecast session completion rates
- Identify at-risk students
- Recommend mentor assignments

### 5. **Gamification**
- Badges and achievements
- Leaderboard prizes
- Monthly challenges

---

**Last Updated:** January 18, 2025
**Version:** 1.0.0
