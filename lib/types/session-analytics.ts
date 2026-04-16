/**
 * Session Completion Analytics — shared type definitions.
 * Used by the service layer, API routes, and UI components.
 */

export interface AnalyticsFilters {
  departmentId?: string;
  institutionId?: string;
  dateFrom?: string; // ISO date
  dateTo?: string; // ISO date
  scopedMentorId?: string; // set for non-admin mentors to limit to own data
}

export interface SessionCompletionSummary {
  totalMentors: number;
  mentorsWithFirstSession: number;
  mentorsWithZeroSessions: number;
  totalAssignedMentees: number;
  menteesWithFirstSession: number;
  menteesNotYetMet: number;
  totalEnrolledStudents: number; // all active students in scope (from jkkn_students)
  studentsNotAssigned: number; // enrolled − assigned (coverage gap)
  assignmentCoverageRate: number; // assigned/enrolled as % (0..100)
  totalCompletedSessions: number;
  totalScheduledSessions: number;
  totalCancelledSessions: number;
  completionRate: number; // 0..100
  mentorFirstSessionRate: number; // 0..100
  menteeMetRate: number; // 0..100
}

export interface PerMentorRow {
  mentorId: string;
  mentorName: string | null;
  departmentId: string | null;
  institutionId: string | null;
  assignedMentees: number;
  uniqueMenteesMet: number;
  completedSessions: number;
  scheduledSessions: number;
  cancelledSessions: number;
  firstSessionCompleted: boolean;
  firstSessionDate: string | null; // ISO
  lastSessionDate: string | null; // ISO
}

export interface PairingRow {
  mentorId: string;
  menteeId: string;
  mentorName: string | null;
  menteeName: string | null;
  menteeRollNo: string | null;
  departmentId: string | null;
  assignedAt: string; // ISO
  hasCompletedSession: boolean;
  completedCount: number;
  lastSessionDate: string | null;
}

/**
 * One row per institution — the cross-college summary shared as a report.
 * Only super_admin can retrieve this view.
 */
export interface InstitutionSummaryRow {
  institutionId: string;
  institutionName: string;
  totalMentors: number;
  mentorsWithFirstSession: number; // mentors who completed ≥1 session
  totalAssignedMentees: number; // unique students assigned
  menteesWithFirstSession: number; // unique students who had ≥1 completed session
  totalEnrolledStudents: number; // from jkkn_students cache
  totalCompletedSessions: number;
  totalScheduledSessions: number;
  totalCancelledSessions: number;
  /** mentorsWithFirstSession / totalMentors × 100 */
  mentorStartRate: number;
  /** menteesWithFirstSession / totalAssignedMentees × 100 */
  menteeMetRate: number;
  /** completed / (completed + cancelled) × 100 — excludes future sessions */
  completionRate: number;
}
