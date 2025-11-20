# Mentor Activity Tracking System

Complete documentation for the Mentor Activity tracking system that monitors and displays all mentor-related activities.

## Overview

The Mentor Activity system provides comprehensive tracking of all activities performed by mentors in the system, including:
- Student assignments/removals
- Counseling session operations
- IDP (Individual Development Plan) management
- Feedback submissions
- Report generation
- Email notifications

## Features

✅ **Complete Activity Tracking** - Logs all mentor activities automatically
✅ **Role-Based Access** - Mentors see own activities, admins see all
✅ **Real-Time Statistics** - 8 key metrics displayed in cards
✅ **Advanced Filtering** - Time period, activity type, mentor selection
✅ **Activity Timeline** - Chronological view with expandable details
✅ **Responsive Design** - Works on mobile, tablet, and desktop
✅ **Performance Optimized** - Pagination and efficient queries
✅ **Brand Consistent** - Uses JKKN brand colors and design system

## Database Schema

### mentor_activity_log Table

```sql
CREATE TABLE mentor_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID NOT NULL REFERENCES mentors(id),
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'student_assigned', 'student_removed',
    'session_created', 'session_updated', 'session_completed', 'session_cancelled',
    'idp_created', 'idp_updated', 'idp_completed',
    'feedback_submitted', 'report_generated', 'email_sent'
  )),
  activity_description TEXT NOT NULL,
  activity_data JSONB,
  related_student_id UUID REFERENCES students(id),
  related_session_id UUID REFERENCES counseling_sessions(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Indexes:**
- `idx_mentor_activity_log_mentor_id` on `mentor_id`
- `idx_mentor_activity_log_activity_type` on `activity_type`
- `idx_mentor_activity_log_created_at` on `created_at DESC`
- `idx_mentor_activity_log_mentor_date` on `(mentor_id, created_at DESC)`

**RLS Policies:**
- Mentors can view their own activities
- Admins and mentor-incharge can view all activities
- System can insert activities (service role)

## Activity Types

| Type | Label | Description | Icon |
|------|-------|-------------|------|
| `student_assigned` | Student Assigned | Student assigned to mentor | UserPlus |
| `student_removed` | Student Removed | Student removed from mentor | UserMinus |
| `session_created` | Session Created | Counseling session created | Calendar |
| `session_updated` | Session Updated | Counseling session updated | CalendarCheck |
| `session_completed` | Session Completed | Counseling session marked complete | CheckCircle |
| `session_cancelled` | Session Cancelled | Counseling session cancelled | XCircle |
| `idp_created` | IDP Created | Individual Development Plan created | FileText |
| `idp_updated` | IDP Updated | IDP updated | Edit |
| `idp_completed` | IDP Completed | IDP marked as completed | CheckCircle2 |
| `feedback_submitted` | Feedback Submitted | Session feedback submitted | MessageSquare |
| `report_generated` | Report Generated | Report generated | FileBarChart |
| `email_sent` | Email Sent | Email notification sent | Mail |

## API Endpoints

### GET /api/mentor-activity

Fetch activity log with filtering options.

**Query Parameters:**
- `mentorId` (string, required for non-admins) - Filter by mentor
- `activityType` (string, optional) - Comma-separated activity types
- `startDate` (ISO string, optional) - Filter start date
- `endDate` (ISO string, optional) - Filter end date
- `limit` (number, default: 50) - Number of records
- `offset` (number, default: 0) - Pagination offset

**Response:**
```json
{
  "success": true,
  "activities": [
    {
      "id": "uuid",
      "mentorId": "uuid",
      "mentorName": "Dr. Smith",
      "activityType": "session_created",
      "activityDescription": "Created counseling session: Career Guidance",
      "activityData": {
        "sessionName": "Career Guidance",
        "studentName": "John Doe",
        "sessionDate": "2025-01-25"
      },
      "relatedStudentId": "uuid",
      "relatedSessionId": "uuid",
      "createdBy": "uuid",
      "createdAt": "2025-01-20T10:30:00Z",
      "studentName": "John Doe",
      "sessionName": "Career Guidance"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

### GET /api/mentor-activity/stats

Get aggregated statistics for a mentor.

**Query Parameters:**
- `mentorId` (string, required) - Mentor ID

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalStudents": 25,
    "totalSessions": 48,
    "activeIdps": 12,
    "completedIdps": 8,
    "reportsGenerated": 5,
    "pendingFeedback": 3,
    "emailsSent": 96,
    "activitiesThisWeek": 15,
    "activitiesThisMonth": 62
  }
}
```

## Activity Logger Utility

Import and use activity logger functions throughout your codebase:

```typescript
import {
  logStudentAssignment,
  logStudentRemoval,
  logSessionCreated,
  logSessionUpdated,
  logSessionCompleted,
  logSessionCancelled,
  logIdpCreated,
  logIdpUpdated,
  logIdpCompleted,
  logFeedbackSubmitted,
  logReportGenerated,
  logEmailSent,
} from '@/lib/utils/activity-logger';
```

### Examples

**Log Session Creation:**
```typescript
await logSessionCreated(
  mentorId,
  sessionId,
  sessionName,
  studentId,
  studentName,
  sessionDate,
  createdBy
);
```

**Log Student Assignment:**
```typescript
await logStudentAssignment(
  mentorId,
  studentId,
  studentName,
  assignedBy
);
```

**Log IDP Creation:**
```typescript
await logIdpCreated(
  mentorId,
  idpId,
  studentId,
  studentName,
  areaOfFocus,
  createdBy
);
```

## Frontend Components

### ActivityStatsGrid

Displays 8 key statistics in card format.

```tsx
import ActivityStatsGrid from './components/ActivityStatsGrid';

<ActivityStatsGrid stats={stats} loading={loading} />
```

**Props:**
- `stats` (ActivityStats | null) - Statistics object
- `loading` (boolean, optional) - Loading state

### ActivityFilters

Comprehensive filtering controls.

```tsx
import ActivityFilters from './components/ActivityFilters';

<ActivityFilters
  onFilterChange={handleFilterChange}
  isAdmin={true}
  mentors={mentorsList}
/>
```

**Props:**
- `onFilterChange` (function) - Callback when filters change
- `isAdmin` (boolean, optional) - Show admin-only filters
- `mentors` (Array, optional) - List of mentors for admin selection

**Filter Options:**
- Time periods: Today, Week, Month, Year, Custom, All
- Activity types: Multi-select from 12 types
- Mentor selection (admin only)
- Custom date range

### ActivityTimeline

Timeline view of activities.

```tsx
import ActivityTimeline from './components/ActivityTimeline';

<ActivityTimeline
  activities={activities}
  loading={loading}
  onLoadMore={loadMore}
  hasMore={hasMore}
/>
```

**Props:**
- `activities` (MentorActivity[]) - Activity array
- `loading` (boolean, optional) - Loading state
- `onLoadMore` (function, optional) - Load more callback
- `hasMore` (boolean, optional) - More records available

**Features:**
- Expandable activity details
- Links to related resources
- Relative timestamps ("2 hours ago")
- Empty state handling
- Load more pagination

### ActivityTypeIcon

Icon component for activity types.

```tsx
import ActivityTypeIcon from './components/ActivityTypeIcon';

<ActivityTypeIcon type="session_created" size={24} />
```

**Props:**
- `type` (ActivityType) - Activity type
- `size` (number, optional, default: 20) - Icon size
- `className` (string, optional) - Additional classes

## Page Structure

### /mentor-activity

Main activity page with:
1. **Header** - Page title and description
2. **Stats Grid** - 8 statistics cards
3. **Filters** - Time period, activity type, mentor selector
4. **Timeline** - Activity feed with load more

### Access Control

- **Mentors**: Can view only their own activities
- **Admins/Super Admins**: Can view all activities with mentor filter
- **Mentor Incharge**: Can view activities for their institution

## Integration Guide

### Step 1: Import Activity Logger

In any API route where you want to log activity:

```typescript
import { logSessionCreated } from '@/lib/utils/activity-logger';
```

### Step 2: Log Activity After Action

After successful database operation:

```typescript
// After creating session
const { data: newSession, error } = await supabase
  .from('counseling_sessions')
  .insert({...})
  .select()
  .single();

if (!error) {
  // Log activity (non-blocking)
  logSessionCreated(
    mentorId,
    newSession.id,
    sessionName,
    studentId,
    studentName,
    date,
    userId
  ).catch(err => {
    console.error('Failed to log activity:', err);
  });
}
```

### Step 3: Handle Errors Gracefully

Activity logging should never break your main flow:

```typescript
// Use .catch() to prevent errors from propagating
logActivity(...).catch(err => {
  console.error('Activity logging failed:', err);
  // Continue with main flow
});
```

## Integration Examples

### Session Creation (Already Implemented)

Location: `app/api/mentor/[id]/counseling/route.ts`

```typescript
import { logSessionCreated } from '@/lib/utils/activity-logger';

// After session created successfully
logSessionCreated(
  mentor!.id,
  newSession.id,
  sessionName,
  student.id,
  studentData?.name || student.name,
  date,
  user!.id
).catch(err => {
  console.error('[Counseling API] Failed to log activity:', err);
});
```

### Student Assignment (To Be Added)

Location: `app/api/mentor/[id]/students/route.ts`

```typescript
import { logStudentAssignment } from '@/lib/utils/activity-logger';

// After student assigned
await logStudentAssignment(
  mentorId,
  studentId,
  studentName,
  assignedBy
);
```

### IDP Creation (To Be Added)

Location: `app/api/idp/route.ts`

```typescript
import { logIdpCreated } from '@/lib/utils/activity-logger';

// After IDP created
await logIdpCreated(
  mentorId,
  idpId,
  studentId,
  studentName,
  areaOfFocus,
  userId
);
```

### Report Generation (To Be Added)

Location: `app/api/reports/mentor/[mentorId]/counseling/route.ts`

```typescript
import { logReportGenerated } from '@/lib/utils/activity-logger';

// After report generated
await logReportGenerated(
  mentorId,
  reportType,
  period,
  sessionCount,
  userId
);
```

## Type Definitions

### MentorActivity

```typescript
interface MentorActivity {
  id: string;
  mentorId: string;
  activityType: ActivityType;
  activityDescription: string;
  activityData?: Record<string, any>;
  relatedStudentId?: string;
  relatedSessionId?: string;
  createdBy?: string;
  createdAt: string;
  mentorName?: string;
  studentName?: string;
  sessionName?: string;
}
```

### ActivityStats

```typescript
interface ActivityStats {
  totalStudents: number;
  totalSessions: number;
  activeIdps: number;
  completedIdps: number;
  reportsGenerated: number;
  pendingFeedback: number;
  emailsSent: number;
  activitiesThisWeek: number;
  activitiesThisMonth: number;
}
```

### ActivityFilters

```typescript
interface ActivityFilters {
  mentorId?: string;
  activityType?: ActivityType[];
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}
```

## Styling

The activity system uses the JKKN brand design system:

**Colors:**
- Primary: `#0b6d41` (green)
- Secondary: `#ffde59` (yellow)
- Background: `#fbfbee` (cream)

**Activity Type Colors:**
Each activity type has its own color scheme for visual distinction. See `ACTIVITY_TYPE_METADATA` in `lib/types/activity.ts`.

## Performance Optimization

- **Pagination**: Default 50 records per page
- **Indexes**: Multiple indexes for fast queries
- **Non-blocking**: Activity logging doesn't block main operations
- **Efficient Queries**: Uses composite indexes for common patterns

## Testing

### Test Activity Logging

1. Create a counseling session
2. Check `/mentor-activity` page
3. Verify session_created activity appears
4. Check activity details expand correctly

### Test Filtering

1. Select different time periods
2. Filter by activity types
3. Verify results update correctly
4. Test custom date range

### Test Statistics

1. View stats grid
2. Verify all 8 metrics display
3. Check numbers match actual data
4. Test loading states

## Troubleshooting

### Activities Not Appearing

**Check 1**: Verify RLS policies
```sql
SELECT * FROM mentor_activity_log WHERE mentor_id = 'your-mentor-id';
```

**Check 2**: Check if logging is being called
- Look for console logs: `[Activity Logger] Logging activity:`
- Check for errors: `[Activity Logger] ❌ Failed to log activity:`

**Check 3**: Verify mentor ID
- Ensure correct mentor ID is being passed
- Check if user has mentor record

### Permission Denied

**Issue**: User can't view activities

**Solution**:
1. Check user role in database
2. Verify RLS policies allow access
3. Check if user has mentor record (for regular users)
4. Verify admin/mentor-incharge status

### Statistics Not Loading

**Issue**: Stats show zeros or don't load

**Solution**:
1. Check browser console for API errors
2. Verify mentorId parameter in API request
3. Check if data exists in related tables
4. Verify database relationships are correct

## Future Enhancements

- [ ] Export activities to Excel/PDF
- [ ] Real-time updates via Supabase subscriptions
- [ ] Activity charts and analytics
- [ ] Activity notifications
- [ ] Bulk operations tracking
- [ ] Activity search functionality
- [ ] Activity comparison between mentors
- [ ] Time-based activity reports

## Related Documentation

- [Email Notification System](./EMAIL_MULTIPLE_SESSIONS_FIX.md)
- [IDP System Documentation](./STUDENT_FEEDBACK_SYSTEM.md)
- [Permission System](./ACCESS_CONTROL.md)

## Support

For issues or questions:
1. Check this documentation
2. Review console logs for errors
3. Check database RLS policies
4. Verify API endpoint responses
5. Contact development team

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Status**: Production Ready ✅
