/**
 * CSV export helpers for Session Completion Analytics.
 *
 * Pure TypeScript — no third-party dependencies. RFC-4180-ish escaping:
 *   - Values containing commas, double-quotes, CR, or LF are wrapped in
 *     double-quotes.
 *   - Internal double-quotes are escaped by doubling them ("" ).
 *   - `null` / `undefined` render as empty cells.
 *   - Other primitives are coerced via String().
 *
 * Output uses CRLF line terminators (Excel-friendly).
 */

import type {
  PairingRow,
  PerMentorRow,
  SessionCompletionSummary,
} from '@/lib/types/session-analytics';

// ── Core escaping ───────────────────────────────────────────────────────────

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : String(value);
  // Quote when the cell contains a delimiter, quote, CR, or LF.
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert a list of plain objects to a CSV string given a column spec.
 *
 * Header row is built from `columns[].label`. Each subsequent row reads
 * `row[col.key]` for each column and runs it through `escapeCell`.
 */
export function toCSV(
  rows: Record<string, unknown>[],
  columns: { key: string; label: string }[]
): string {
  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const body = rows.map((row) =>
    columns.map((c) => escapeCell(row[c.key])).join(',')
  );
  return [header, ...body].join('\r\n');
}

// ── Convenience builders ────────────────────────────────────────────────────

export function perMentorToCSV(rows: PerMentorRow[]): string {
  const columns: { key: keyof PerMentorRow; label: string }[] = [
    { key: 'mentorId', label: 'Mentor ID' },
    { key: 'mentorName', label: 'Mentor Name' },
    { key: 'departmentId', label: 'Department ID' },
    { key: 'institutionId', label: 'Institution ID' },
    { key: 'assignedMentees', label: 'Assigned Mentees' },
    { key: 'uniqueMenteesMet', label: 'Unique Mentees Met' },
    { key: 'completedSessions', label: 'Completed Sessions' },
    { key: 'scheduledSessions', label: 'Scheduled Sessions' },
    { key: 'cancelledSessions', label: 'Cancelled Sessions' },
    { key: 'firstSessionCompleted', label: 'First Session Done' },
    { key: 'firstSessionDate', label: 'First Session Date' },
    { key: 'lastSessionDate', label: 'Last Session Date' },
  ];
  return toCSV(
    rows as unknown as Record<string, unknown>[],
    columns as { key: string; label: string }[]
  );
}

export function pairingToCSV(rows: PairingRow[]): string {
  const columns: { key: keyof PairingRow; label: string }[] = [
    { key: 'mentorId', label: 'Mentor ID' },
    { key: 'mentorName', label: 'Mentor Name' },
    { key: 'menteeId', label: 'Mentee ID' },
    { key: 'menteeName', label: 'Mentee Name' },
    { key: 'menteeRollNo', label: 'Mentee Roll No' },
    { key: 'departmentId', label: 'Department ID' },
    { key: 'assignedAt', label: 'Assigned At' },
    { key: 'hasCompletedSession', label: 'Has Completed Session' },
    { key: 'completedCount', label: 'Completed Sessions' },
    { key: 'lastSessionDate', label: 'Last Session Date' },
  ];
  return toCSV(
    rows as unknown as Record<string, unknown>[],
    columns as { key: string; label: string }[]
  );
}

/**
 * Summary CSV is rendered as a two-column metric/value sheet — the summary is
 * a single record so a wide one-row table reads poorly in Excel.
 */
export function summaryToCSV(summary: SessionCompletionSummary): string {
  const columns = [
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value' },
  ];
  const rows: Record<string, unknown>[] = [
    { metric: 'Total Mentors', value: summary.totalMentors },
    { metric: 'Mentors With First Session', value: summary.mentorsWithFirstSession },
    { metric: 'Mentors With Zero Sessions', value: summary.mentorsWithZeroSessions },
    { metric: 'Total Assigned Mentees', value: summary.totalAssignedMentees },
    { metric: 'Mentees With First Session', value: summary.menteesWithFirstSession },
    { metric: 'Mentees Not Yet Met', value: summary.menteesNotYetMet },
    { metric: 'Total Completed Sessions', value: summary.totalCompletedSessions },
    { metric: 'Total Scheduled Sessions', value: summary.totalScheduledSessions },
    { metric: 'Total Cancelled Sessions', value: summary.totalCancelledSessions },
    { metric: 'Completion Rate (%)', value: summary.completionRate },
    { metric: 'Mentor First-Session Rate (%)', value: summary.mentorFirstSessionRate },
    { metric: 'Mentee Met Rate (%)', value: summary.menteeMetRate },
  ];
  return toCSV(rows, columns);
}
