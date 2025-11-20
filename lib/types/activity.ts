/**
 * Mentor Activity Types and Interfaces
 * Defines all activity tracking types for the mentor activity system
 */

export type ActivityType =
  | 'student_assigned'
  | 'student_removed'
  | 'session_created'
  | 'session_updated'
  | 'session_completed'
  | 'session_cancelled'
  | 'idp_created'
  | 'idp_updated'
  | 'idp_completed'
  | 'feedback_submitted'
  | 'report_generated'
  | 'email_sent';

export interface MentorActivity {
  id: string;
  mentorId: string;
  activityType: ActivityType;
  activityDescription: string;
  activityData?: Record<string, any>;
  relatedStudentId?: string;
  relatedSessionId?: string;
  createdBy?: string;
  createdAt: string;

  // Joined data (from queries)
  mentorName?: string;
  studentName?: string;
  sessionName?: string;
}

export interface ActivityStats {
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

export interface ActivityFilters {
  mentorId?: string;
  activityType?: ActivityType[];
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface ActivityTimelineItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  color: string;
  mentorId: string;
  mentorName: string;
  studentName?: string;
  sessionName?: string;
  link?: string;
  metadata?: Record<string, any>;
}

export interface ActivityChartData {
  label: string;
  value: number;
  color?: string;
}

export interface ActivityTrendData {
  date: string;
  count: number;
  type?: ActivityType;
}

// Activity Type Metadata
export interface ActivityTypeMetadata {
  type: ActivityType;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  textColor: string;
}

export const ACTIVITY_TYPE_METADATA: Record<ActivityType, Omit<ActivityTypeMetadata, 'type'>> = {
  student_assigned: {
    label: 'Student Assigned',
    icon: 'UserPlus',
    color: '#0b6d41',
    bgColor: '#d1fae5',
    textColor: '#065f46',
  },
  student_removed: {
    label: 'Student Removed',
    icon: 'UserMinus',
    color: '#dc2626',
    bgColor: '#fee2e2',
    textColor: '#991b1b',
  },
  session_created: {
    label: 'Session Created',
    icon: 'Calendar',
    color: '#2563eb',
    bgColor: '#dbeafe',
    textColor: '#1e40af',
  },
  session_updated: {
    label: 'Session Updated',
    icon: 'CalendarCheck',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    textColor: '#6b21a8',
  },
  session_completed: {
    label: 'Session Completed',
    icon: 'CheckCircle',
    color: '#0b6d41',
    bgColor: '#d1fae5',
    textColor: '#065f46',
  },
  session_cancelled: {
    label: 'Session Cancelled',
    icon: 'XCircle',
    color: '#dc2626',
    bgColor: '#fee2e2',
    textColor: '#991b1b',
  },
  idp_created: {
    label: 'IDP Created',
    icon: 'FileText',
    color: '#0891b2',
    bgColor: '#cffafe',
    textColor: '#155e75',
  },
  idp_updated: {
    label: 'IDP Updated',
    icon: 'Edit',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    textColor: '#6b21a8',
  },
  idp_completed: {
    label: 'IDP Completed',
    icon: 'CheckCircle2',
    color: '#0b6d41',
    bgColor: '#d1fae5',
    textColor: '#065f46',
  },
  feedback_submitted: {
    label: 'Feedback Submitted',
    icon: 'MessageSquare',
    color: '#ea580c',
    bgColor: '#ffedd5',
    textColor: '#9a3412',
  },
  report_generated: {
    label: 'Report Generated',
    icon: 'FileBarChart',
    color: '#4f46e5',
    bgColor: '#e0e7ff',
    textColor: '#3730a3',
  },
  email_sent: {
    label: 'Email Sent',
    icon: 'Mail',
    color: '#059669',
    bgColor: '#d1fae5',
    textColor: '#065f46',
  },
};

// Helper function to get activity type metadata
export function getActivityMetadata(type: ActivityType): ActivityTypeMetadata {
  return {
    type,
    ...ACTIVITY_TYPE_METADATA[type],
  };
}

// Helper function to format activity description
export function formatActivityDescription(activity: MentorActivity): string {
  const { activityType, activityData } = activity;

  switch (activityType) {
    case 'student_assigned':
      return `Assigned to ${activity.studentName || 'student'}`;
    case 'student_removed':
      return `Removed ${activity.studentName || 'student'} from mentorship`;
    case 'session_created':
      return `Created counseling session: ${activity.sessionName || activityData?.sessionName || 'session'}`;
    case 'session_updated':
      return `Updated counseling session: ${activity.sessionName || activityData?.sessionName || 'session'}`;
    case 'session_completed':
      return `Completed counseling session: ${activity.sessionName || activityData?.sessionName || 'session'}`;
    case 'session_cancelled':
      return `Cancelled counseling session: ${activity.sessionName || activityData?.sessionName || 'session'}`;
    case 'idp_created':
      return `Created IDP for ${activity.studentName || 'student'}`;
    case 'idp_updated':
      return `Updated IDP for ${activity.studentName || 'student'}`;
    case 'idp_completed':
      return `Completed IDP for ${activity.studentName || 'student'}`;
    case 'feedback_submitted':
      return `Submitted feedback for ${activity.sessionName || 'session'}`;
    case 'report_generated':
      return `Generated ${activityData?.reportType || 'report'} report`;
    case 'email_sent':
      return `Sent ${activityData?.emailType || 'notification'} email to ${activity.studentName || 'student'}`;
    default:
      return activity.activityDescription;
  }
}

// Time period filter options
export type TimePeriod = 'today' | 'week' | 'month' | 'year' | 'custom' | 'all';

export interface TimePeriodOption {
  value: TimePeriod;
  label: string;
}

export const TIME_PERIOD_OPTIONS: TimePeriodOption[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
  { value: 'all', label: 'All Time' },
];

// Helper function to get date range for time period
export function getDateRangeForPeriod(period: TimePeriod): { startDate: Date; endDate: Date } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'today':
      return {
        startDate: today,
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    case 'week': {
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek;
      const weekStart = new Date(today.setDate(diff));
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      return { startDate: weekStart, endDate: weekEnd };
    }
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { startDate: monthStart, endDate: monthEnd };
    }
    case 'year': {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      return { startDate: yearStart, endDate: yearEnd };
    }
    case 'all':
    case 'custom':
      return null;
    default:
      return null;
  }
}
